import { InstructionEncoderImpl } from '@glimmer/encoder';
import {
  CompileTimeConstants,
  Labels,
  LabelOperand,
  BuilderHandleThunk,
  Operand,
  CompileTimeHeap,
  Op,
  BuilderOpcode,
  HighLevelBuilderOpcode,
  BuilderOp,
  MachineOp,
  SingleBuilderOperand,
  SingleBuilderOperands,
  Encoder,
  HighLevelCompileOpcode,
  HighLevelResolutionOpcode,
  HighLevelOp,
  OpcodeSize,
  InstructionEncoder,
  AllOpcode,
  AllOpMap,
  Operands,
  NonlabelBuilderOperand,
  Dict,
  ErrorOpcode,
  EncoderError,
  HandleResult,
  CompileErrorOp,
  PrimitiveType,
} from '@glimmer/interfaces';
import { isMachineOp } from '@glimmer/vm';
import {
  Stack,
  dict,
  expect,
  encodeImmediate,
  exhausted,
  unreachable,
  encodeHandle,
  HandleConstants,
} from '@glimmer/util';
import { commit } from '../compiler';

export type OpcodeBuilderLabels = Labels<InstructionEncoder>;

export class LabelsImpl implements Labels<InstructionEncoder> {
  labels: Dict<number> = dict();
  targets: Array<{ at: number; target: string }> = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  target(at: number, target: string) {
    this.targets.push({ at, target });
  }

  patch(encoder: InstructionEncoder): void {
    let { targets, labels } = this;
    for (let i = 0; i < targets.length; i++) {
      let { at, target } = targets[i];
      let address = labels[target] - at;
      encoder.patch(at, address);
    }
  }
}

export function error(problem: string, start: number, end: number): CompileErrorOp {
  return op('Error', {
    problem,
    start,
    end,
  });
}

export function op(name: BuilderOpcode, ...ops: SingleBuilderOperands): BuilderOp;
export function op<K extends AllOpcode>(name: K, ...operands: Operands<AllOpMap[K]>): AllOpMap[K];
export function op<K extends AllOpcode>(
  name: K | BuilderOpcode,
  op1?: AllOpMap[K]['op1'] | SingleBuilderOperand,
  op2?: SingleBuilderOperand,
  op3?: SingleBuilderOperand
): AllOpMap[K] | BuilderOp {
  if (typeof name === 'number') {
    if (op3 !== undefined) {
      return { type: 'Number', op: name, op1, op2, op3 } as BuilderOp;
    } else if (op2 !== undefined) {
      return { type: 'Number', op: name, op1, op2 } as BuilderOp;
    } else if (op1 !== undefined) {
      return { type: 'Number', op: name, op1: op1 } as BuilderOp;
    } else {
      return { type: 'Number', op: name };
    }
  } else {
    let type: HighLevelOp['type'];

    if (isCompileOpcode(name)) {
      type = 'Compile';
    } else if (isResolutionOpcode(name)) {
      type = 'Resolution';
    } else if (isSimpleOpcode(name)) {
      type = 'Simple';
    } else if (isErrorOpcode(name)) {
      type = 'Error';
    } else {
      throw new Error(`Exhausted ${name}`);
    }

    if (op1 === undefined) {
      return { type, op: name, op1: undefined } as any;
    } else {
      return { type, op: name, op1 } as any;
    }
  }
}

export class EncoderImpl implements Encoder {
  private labelsStack = new Stack<OpcodeBuilderLabels>();
  private encoder: InstructionEncoder = new InstructionEncoderImpl([]);
  private errors: EncoderError[] = [];

  error(error: EncoderError): void {
    this.encoder.encode(Op.Primitive, 0);
    this.errors.push(error);
  }

  commit(heap: CompileTimeHeap, size: number): HandleResult {
    this.encoder.encode(MachineOp.Return, OpcodeSize.MACHINE_MASK);
    let handle = commit(heap, size, this.encoder.buffer);

    if (this.errors.length) {
      return { errors: this.errors, handle };
    } else {
      return handle;
    }
  }

  push(constants: CompileTimeConstants, name: BuilderOpcode, ...args: SingleBuilderOperands): void {
    if (isMachineOp(name)) {
      let operands = args.map((operand, i) => this.operand(constants, operand, i));
      return this.encoder.encode(name, OpcodeSize.MACHINE_MASK, ...operands);
    } else {
      let operands = args.map((operand, i) => this.operand(constants, operand, i));
      return this.encoder.encode(name, 0, ...operands);
    }
  }

  private operand(constants: CompileTimeConstants, operand: LabelOperand, index: number): number;
  private operand(
    constants: CompileTimeConstants,
    operand: BuilderHandleThunk,
    index?: number
  ): BuilderHandleThunk;
  private operand(
    constants: CompileTimeConstants,
    operand: SingleBuilderOperand,
    index?: number
  ): number;
  private operand(
    constants: CompileTimeConstants,
    operand: SingleBuilderOperand | BuilderHandleThunk,
    index?: number
  ): Operand {
    if (operand && typeof operand === 'object' && operand.type === 'label') {
      this.currentLabels.target(this.encoder.size + index!, operand.value);
      return -1;
    }

    return constant(constants, operand as NonlabelBuilderOperand);
  }

  private get currentLabels(): OpcodeBuilderLabels {
    return expect(this.labelsStack.current, 'bug: not in a label stack');
  }

  label(name: string) {
    this.currentLabels.label(name, this.encoder.size);
  }

  startLabels() {
    this.labelsStack.push(new LabelsImpl());
  }

  stopLabels() {
    let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
    label.patch(this.encoder);
  }
}

function constant(constants: CompileTimeConstants, operand: BuilderHandleThunk): BuilderHandleThunk;
function constant(constants: CompileTimeConstants, operand: NonlabelBuilderOperand): number;
function constant(
  constants: CompileTimeConstants,
  operand: NonlabelBuilderOperand | BuilderHandleThunk
): Operand {
  if (typeof operand === 'number' || typeof operand === 'function') {
    return operand;
  }

  if (typeof operand === 'boolean') {
    return operand === true ? 1 : 0;
  }

  if (typeof operand === 'string') {
    return constants.string(operand);
  }

  if (operand === null) {
    return 0;
  }

  switch (operand.type) {
    case 'array':
      return constants.array(operand.value);
    case 'string-array':
      return constants.stringArray(operand.value);
    case 'serializable':
      return constants.serializable(operand.value);
    case 'template-meta':
      return constants.templateMeta(operand.value);
    case 'other':
      // TODO: Bad cast
      return constants.other(operand.value);
    case 'stdlib':
      return operand;
    case 'primitive': {
      switch (operand.value.type) {
        case PrimitiveType.STRING:
          return encodeHandle(
            constants.string(operand.value.primitive),
            HandleConstants.STRING_MAX_INDEX,
            HandleConstants.STRING_MAX_HANDLE
          );
        case PrimitiveType.NUMBER:
          return encodeHandle(
            constants.number(operand.value.primitive),
            HandleConstants.NUMBER_MAX_INDEX,
            HandleConstants.NUMBER_MAX_HANDLE
          );
        case PrimitiveType.IMMEDIATE:
          return encodeImmediate(operand.value.primitive);
        default:
          return exhausted(operand.value);
      }
    }
    case 'lookup':
      throw unreachable('lookup not reachable');
    default:
      return exhausted(operand);
  }
}

function isSimpleOpcode(op: AllOpcode): op is HighLevelBuilderOpcode {
  return (
    op === 'Label' ||
    op === 'Option' ||
    op === 'GetComponentLayout' ||
    op === 'StartLabels' ||
    op === 'StopLabels' ||
    op === 'SimpleArgs' ||
    op === 'JitCompileBlock' ||
    op === 'SetBlock'
  );
}

function isCompileOpcode(op: AllOpcode): op is HighLevelCompileOpcode {
  return (
    op === 'CompileInline' ||
    op === 'CompileBlock' ||
    op === 'InvokeStatic' ||
    op === 'PushCompilable' ||
    op === 'Args' ||
    op === 'IfResolvedComponent' ||
    op === 'DynamicComponent'
  );
}

function isResolutionOpcode(op: AllOpcode): op is HighLevelResolutionOpcode {
  return (
    op === 'IfResolved' ||
    op === 'Expr' ||
    op === 'SimpleArgs' ||
    op === 'ResolveFree' ||
    op === 'ResolveContextualFree'
  );
}

function isErrorOpcode(op: AllOpcode): op is ErrorOpcode {
  return op === 'Error';
}
