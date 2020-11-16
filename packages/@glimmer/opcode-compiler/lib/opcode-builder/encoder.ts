import { InstructionEncoderImpl } from '@glimmer/encoder';
import {
  CompileTimeConstants,
  Operand,
  CompileTimeHeap,
  Op,
  BuilderOpcode,
  HighLevelBuilderOpcode,
  MachineOp,
  SingleBuilderOperand,
  Encoder,
  HighLevelResolutionOpcode,
  HighLevelOp,
  OpcodeSize,
  InstructionEncoder,
  Dict,
  EncoderError,
  HandleResult,
  BuilderOp,
  CompileTimeResolver,
  ContainingMetadata,
  HighLevelOperand,
  STDLib,
} from '@glimmer/interfaces';
import { isMachineOp } from '@glimmer/vm';
import { Stack, dict, expect, EMPTY_STRING_ARRAY, encodeHandle, assert } from '@glimmer/util';
import {
  resolveComponent,
  resolveComponentOrHelper,
  resolveHelper,
  resolveModifier,
  resolveOptionalComponentOrHelper,
  resolveOptionalHelper,
} from './helpers/resolution';
import { compilableBlock } from '../compilable-template';
import { DEBUG } from '@glimmer/env';

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
    for (let i = 0; i < targets.length; i++) {
      let { at, target } = targets[i];
      let address = labels[target] - at;

      assert(heap.getbyaddr(at) === -1, 'Expected heap to contain a placeholder, but it did not');

      heap.setbyaddr(at, address);
    }
  }
}

export function encodeOp(
  encoder: Encoder,
  constants: CompileTimeConstants,
  resolver: CompileTimeResolver,
  meta: ContainingMetadata,
  op: BuilderOp | HighLevelOp
): void {
  if (isBuilderOpcode(op[0])) {
    let [type, ...operands] = op;
    encoder.push(constants, type, ...(operands as SingleBuilderOperand[]));
  } else {
    switch (op[0]) {
      case HighLevelBuilderOpcode.Label:
        return encoder.label(op[1]);
      case HighLevelBuilderOpcode.StartLabels:
        return encoder.startLabels();
      case HighLevelBuilderOpcode.StopLabels:
        return encoder.stopLabels();

      case HighLevelResolutionOpcode.ResolveComponent:
        return resolveComponent(resolver, constants, meta, op);
      case HighLevelResolutionOpcode.ResolveModifier:
        return resolveModifier(resolver, constants, meta, op);
      case HighLevelResolutionOpcode.ResolveHelper:
        return resolveHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcode.ResolveComponentOrHelper:
        return resolveComponentOrHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcode.ResolveOptionalHelper:
        return resolveOptionalHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper:
        return resolveOptionalComponentOrHelper(resolver, constants, meta, op);

      case HighLevelResolutionOpcode.ResolveLocal:
        let freeVar = op[1];
        let name = expect(meta.upvars, 'attempted to resolve value but no upvars found')[freeVar];

        if (meta.asPartial === true) {
          encoder.push(constants, Op.ResolveMaybeLocal, name);
        } else {
          let then = op[2];

          then(name);
        }

        break;

      case HighLevelResolutionOpcode.ResolveFree:
        throw new Error('Strict Mode: Unimplemented HighLevelResolutionOpcode.ResolveFree');

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

    this.heap.push(MachineOp.Return | OpcodeSize.MACHINE_MASK);
    this.heap.finishMalloc(handle, size);

    if (this.errors.length) {
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

    if (DEBUG && (type as number) > OpcodeSize.TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }

    let machine = isMachineOp(type) ? OpcodeSize.MACHINE_MASK : 0;
    let first = type | machine | (args.length << OpcodeSize.ARG_SHIFT);

    heap.push(first);

    for (let i = 0; i < args.length; i++) {
      let op = args[i];
      heap.push(this.operand(constants, op));
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
          case HighLevelOperand.Label:
            this.currentLabels.target(this.heap.offset, operand.value);
            return -1;

          case HighLevelOperand.Owner:
            return encodeHandle(constants.value(this.meta.owner));

          case HighLevelOperand.EvalSymbols:
            return encodeHandle(constants.array(this.meta.evalSymbols || EMPTY_STRING_ARRAY));

          case HighLevelOperand.Block:
            return encodeHandle(constants.value(compilableBlock(operand.value, this.meta)));

          case HighLevelOperand.StdLib:
            return expect(
              this.stdlib,
              'attempted to encode a stdlib operand, but the encoder did not have a stdlib. Are you currently building the stdlib?'
            )[operand.value];

          case HighLevelOperand.NonSmallInt:
          case HighLevelOperand.SymbolTable:
          case HighLevelOperand.Layout:
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
  return op < HighLevelBuilderOpcode.Start;
}
