import { DEBUG } from '@glimmer/env';
import type {
  BlockMetadata,
  BuilderOp,
  BuilderOpcode,
  CompileTimeConstants,
  Dict,
  Encoder,
  EncoderError,
  EvaluationContext,
  HandleResult,
  HighLevelOp,
  HighLevelResolutionOp,
  ResolutionHandler,
  InstructionEncoder,
  Operand,
  ProgramHeap,
  SingleBuilderOperand,
  STDLib,
  StdlibRoutine,
} from '@glimmer/interfaces';
import { encodeHandle } from '@glimmer/constants/lib/immediate';
import { isMachineOp, VM_RETURN_OP } from '@glimmer/constants/lib/vm-ops';
import { VM_PRIMITIVE_OP } from '@glimmer/constants/lib/syscall-ops';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { isPresentArray } from '@glimmer/debug-util/lib/present';
import assert from '@glimmer/debug-util/lib/assert';
import { InstructionEncoderImpl } from '@glimmer/encoder/lib/encoder';
import { dict, StackImpl as Stack } from '@glimmer/util/lib/collections';
import { ARG_SHIFT, MACHINE_MASK, TYPE_SIZE } from '@glimmer/vm/lib/flags';

import { APPEND_OPCODES } from '@glimmer/runtime/lib/opcodes';

import { compilableBlock } from '../compilable-template';
import { HighLevelBuilderOpcodes, HighLevelResolutionOpcodes } from './opcodes';
import { HighLevelOperands } from './operands';

export class Labels {
  labels: Dict<number> = dict();
  targets: Array<{ at: number; target: string }> = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  target(at: number, target: string) {
    this.targets.push({ at, target });
  }

  patch(heap: ProgramHeap): void {
    let { targets, labels } = this;

    for (const { at, target } of targets) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      let address = labels[target]! - at;

      assert(heap.getbyaddr(at) === -1, 'Expected heap to contain a placeholder, but it did not');

      heap.setbyaddr(at, address);
    }
  }
}

export function encodeOp(
  encoder: Encoder,
  context: EvaluationContext,
  meta: BlockMetadata,
  op: BuilderOp | HighLevelOp
): void {
  let {
    program: { constants },
    resolver,
  } = context;

  let head = op[0];

  if (typeof head === 'object') {
    if ('resolve' in head) {
      (head as ResolutionHandler).resolve(resolver, constants, meta, op as HighLevelResolutionOp);
      return;
    }

    let [, ...operands] = op;
    APPEND_OPCODES.register(head);
    encoder.push(constants, head.type, ...(operands as SingleBuilderOperand[]));
  } else if (isBuilderOpcode(head)) {
    let [, ...operands] = op;
    encoder.push(constants, head, ...(operands as SingleBuilderOperand[]));
  } else {
    switch (op[0]) {
      case HighLevelBuilderOpcodes.Label:
        return encoder.label(op[1]);
      case HighLevelBuilderOpcodes.StartLabels:
        return encoder.startLabels();
      case HighLevelBuilderOpcodes.StopLabels:
        return encoder.stopLabels();

      case HighLevelResolutionOpcodes.Local: {
        let [, freeVar, andThen] = op;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        let name = expect(
          meta.symbols.upvars,
          'BUG: attempted to resolve value but no upvars found'
        )[freeVar]!;

        andThen(name, meta.moduleName);

        break;
      }

      case HighLevelResolutionOpcodes.TemplateLocal: {
        let [, valueIndex, then] = op;
        let value = expect(
          meta.scopeValues,
          'BUG: Attempted to get a template local, but template does not have any'
        )[valueIndex];

        then(constants.value(value), meta.symbols.lexical?.[valueIndex]);

        break;
      }

      default:
        throw new Error(`Unexpected high level opcode ${head as number}`);
    }
  }
}

export class EncoderImpl implements Encoder {
  private labelsStack = new Stack<Labels>();
  private encoder: InstructionEncoder = new InstructionEncoderImpl([]);
  private errors: EncoderError[] = [];
  private handle: number;
  private stdlibFixups: Array<{ at: number; routine: StdlibRoutine }> = [];

  constructor(
    private heap: ProgramHeap,
    private meta: BlockMetadata,
    private stdlib?: STDLib
  ) {
    this.handle = heap.malloc();
  }

  error(error: EncoderError): void {
    this.encoder.encode(VM_PRIMITIVE_OP, 0);
    this.errors.push(error);
  }

  commit(size: number): HandleResult {
    let handle = this.handle;

    this.heap.pushMachine(VM_RETURN_OP);
    this.heap.finishMalloc(handle, size);

    // A stdlib routine compiles into its own heap region, so it must wait
    // until this program's region is closed.
    for (let { at, routine } of this.stdlibFixups) {
      let stdlib = expect(
        this.stdlib,
        `attempted to encode a stdlib operand (${routine.name}), but the encoder did not have a stdlib`
      );
      this.heap.setbyaddr(at, stdlib.handle(routine));
    }

    if (isPresentArray(this.errors)) {
      return { errors: this.errors, handle };
    } else {
      return handle;
    }
  }

  push(
    constants: CompileTimeConstants,
    type: BuilderOpcode,
    ...args: SingleBuilderOperand[]
  ): void {
    let { heap } = this;

    if (DEBUG && (type as number) > TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }

    let machine = isMachineOp(type) ? MACHINE_MASK : 0;
    let first = type | machine | (args.length << ARG_SHIFT);

    heap.pushRaw(first);

    for (let i = 0; i < args.length; i++) {
      let op = args[i];
      heap.pushRaw(this.operand(constants, op));
    }
  }

  private operand(constants: CompileTimeConstants, operand: SingleBuilderOperand): Operand {
    if (typeof operand === 'number') {
      return operand;
    }

    if (typeof operand === 'object' && operand !== null) {
      if (Array.isArray(operand)) {
        return encodeHandle(constants.array(operand));
      } else {
        switch (operand.type) {
          case HighLevelOperands.Label:
            this.currentLabels.target(this.heap.offset, operand.value);
            return -1;

          case HighLevelOperands.IsStrictMode:
            return encodeHandle(constants.value(this.meta.isStrictMode));

          case HighLevelOperands.DebugSymbols:
            return encodeHandle(constants.value(operand.value));

          case HighLevelOperands.Block:
            return encodeHandle(constants.value(compilableBlock(operand.value, this.meta)));

          case HighLevelOperands.StdLib:
            this.stdlibFixups.push({
              at: this.heap.offset,
              routine: operand.value as StdlibRoutine,
            });
            return -1;

          case HighLevelOperands.NonSmallInt:
          case HighLevelOperands.SymbolTable:
          case HighLevelOperands.Layout:
            return constants.value(operand.value);
        }
      }
    }

    return encodeHandle(constants.value(operand));
  }

  private get currentLabels(): Labels {
    return expect(this.labelsStack.current, 'bug: not in a label stack');
  }

  label(name: string) {
    this.currentLabels.label(name, this.heap.offset + 1);
  }

  startLabels() {
    this.labelsStack.push(new Labels());
  }

  stopLabels() {
    let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
    label.patch(this.heap);
  }
}

function isBuilderOpcode(op: number): op is BuilderOpcode {
  return op < HighLevelBuilderOpcodes.Start;
}
