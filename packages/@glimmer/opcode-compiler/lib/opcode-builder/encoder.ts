import type {
  BuilderOp,
  BuilderOpcode,
  CompileTimeConstants,
  CompileTimeHeap,
  CompileTimeResolver,
  ContainingMetadata,
  Dict,
  Encoder,
  EncoderError,
  HandleResult,
  HighLevelOp,
  InstructionEncoder,
  Operand,
  ResolutionTimeConstants,
  SingleBuilderOperand,
  STDLib,
} from '@glimmer/interfaces';
import { assert, expect, isPresentArray } from '@glimmer/debug-util';
import { InstructionEncoderImpl } from '@glimmer/encoder';
import { dict, EMPTY_STRING_ARRAY, encodeHandle, Stack } from '@glimmer/util';
import { ARG_SHIFT, isMachineOp, MACHINE_MASK, MachineOp, Op, TYPE_SIZE } from '@glimmer/vm';

import { compilableBlock } from '../compilable-template';
import {
  resolveComponent,
  resolveComponentOrHelper,
  resolveHelper,
  resolveModifier,
  resolveOptionalComponentOrHelper,
} from './helpers/resolution';
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

  patch(heap: CompileTimeHeap): void {
    let { targets, labels } = this;

    for (const { at, target } of targets) {
      let address = labels[target]! - at;

      assert(heap.getbyaddr(at) === -1, 'Expected heap to contain a placeholder, but it did not');

      heap.setbyaddr(at, address);
    }
  }
}

export function encodeOp(
  encoder: Encoder,
  constants: CompileTimeConstants & ResolutionTimeConstants,
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  op: BuilderOp | HighLevelOp
): void {
  if (isBuilderOpcode(op[0])) {
    let [type, ...operands] = op;
    encoder.push(constants, type, ...(operands as SingleBuilderOperand[]));
  } else {
    switch (op[0]) {
      case HighLevelBuilderOpcodes.Label:
        return encoder.label(op[1]);
      case HighLevelBuilderOpcodes.StartLabels:
        return encoder.startLabels();
      case HighLevelBuilderOpcodes.StopLabels:
        return encoder.stopLabels();
      case HighLevelResolutionOpcodes.Component:
        return resolveComponent(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.Modifier:
        return resolveModifier(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.Helper:
        return resolveHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.ComponentOrHelper:
        return resolveComponentOrHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.OptionalComponentOrHelper:
        return resolveOptionalComponentOrHelper(resolver, constants, meta, op);

      case HighLevelResolutionOpcodes.Local: {
        let freeVar = op[1];
        let name = expect(meta.upvars, 'BUG: attempted to resolve value but no upvars found')[
          freeVar
        ]!;

        let andThen = op[2];
        andThen(name, meta.moduleName);

        break;
      }

      case HighLevelResolutionOpcodes.TemplateLocal: {
        let [, valueIndex, then] = op;
        let value = expect(
          meta.scopeValues,
          'BUG: Attempted to get a template local, but template does not have any'
        )[valueIndex];

        then(constants.value(value));

        break;
      }

      default:
        throw new Error(`Unexpected high level opcode ${op[0]}`);
    }
  }
}

export class EncoderImpl implements Encoder {
  private labelsStack = new Stack<Labels>();
  private encoder: InstructionEncoder = new InstructionEncoderImpl([]);
  private errors: EncoderError[] = [];
  private handle: number;

  constructor(
    private heap: CompileTimeHeap,
    private meta: ContainingMetadata,
    private stdlib?: STDLib
  ) {
    this.handle = heap.malloc();
  }

  error(error: EncoderError): void {
    this.encoder.encode(Op.Primitive, 0);
    this.errors.push(error);
  }

  commit(size: number): HandleResult {
    let handle = this.handle;

    this.heap.pushMachine(MachineOp.Return);
    this.heap.finishMalloc(handle, size);

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

    if (import.meta.env.DEV && (type as number) > TYPE_SIZE) {
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
            return encodeHandle(constants.array(this.meta.evalSymbols || EMPTY_STRING_ARRAY));

          case HighLevelOperands.Block:
            return encodeHandle(constants.value(compilableBlock(operand.value, this.meta)));

          case HighLevelOperands.StdLib:
            return expect(
              this.stdlib,
              'attempted to encode a stdlib operand, but the encoder did not have a stdlib. Are you currently building the stdlib?'
            )[operand.value];

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
