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
  OpcodeWrapperOp,
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
  HighLevelErrorOpcode,
  EncoderError,
  HandleResult,
  CompileErrorOp,
  HighLevelOpcodeType,
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
  return op(HighLevelErrorOpcode.Error, {
    problem,
    start,
    end,
  });
}

export function op(name: BuilderOpcode, ...ops: SingleBuilderOperands): OpcodeWrapperOp;
export function op<K extends AllOpcode>(name: K, ...operands: Operands<AllOpMap[K]>): AllOpMap[K];
export function op<K extends AllOpcode>(
  name: K | BuilderOpcode,
  op1?: AllOpMap[K]['op1'] | SingleBuilderOperand,
  op2?: SingleBuilderOperand,
  op3?: SingleBuilderOperand
): AllOpMap[K] | OpcodeWrapperOp {
  if (!isHighLevelOpcode(name)) {
    if (op3 !== undefined) {
      return {
        type: HighLevelOpcodeType.OpcodeWrapper,
        op: name,
        op1,
        op2,
        op3,
      } as OpcodeWrapperOp;
    } else if (op2 !== undefined) {
      return { type: HighLevelOpcodeType.OpcodeWrapper, op: name, op1, op2 } as OpcodeWrapperOp;
    } else if (op1 !== undefined) {
      return { type: HighLevelOpcodeType.OpcodeWrapper, op: name, op1: op1 } as OpcodeWrapperOp;
    } else {
      return { type: HighLevelOpcodeType.OpcodeWrapper, op: name };
    }
  } else {
    let type: HighLevelOp['type'];

    if (isCompileOpcode(name)) {
      type = HighLevelOpcodeType.Compile;
    } else if (isResolutionOpcode(name)) {
      type = HighLevelOpcodeType.Resolution;
    } else if (isBuilderOpcode(name)) {
      type = HighLevelOpcodeType.Builder;
    } else if (isErrorOpcode(name)) {
      type = HighLevelOpcodeType.Error;
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
    return constants.value(operand);
  }

  if (operand === null) {
    return 0;
  }

  switch (operand.type) {
    case 'string-array':
      return constants.array(operand.value);
    case 'serializable':
      return constants.serializable(operand.value);
    case 'stdlib':
      return operand;
    case 'immediate':
      return encodeImmediate(operand.value);
    case 'primitive':
    case 'array':
    case 'other':
      return encodeHandle(constants.value(operand.value));
    case 'lookup':
      throw unreachable('lookup not reachable');
    default:
      return exhausted(operand);
  }
}

function isHighLevelOpcode(op: number): op is AllOpcode {
  return op >= HighLevelBuilderOpcode.Start;
}

function isBuilderOpcode(op: AllOpcode): op is HighLevelBuilderOpcode {
  return op >= HighLevelBuilderOpcode.Start && op <= HighLevelBuilderOpcode.End;
}

function isCompileOpcode(op: AllOpcode): op is HighLevelCompileOpcode {
  return op >= HighLevelCompileOpcode.Start && op <= HighLevelCompileOpcode.End;
}

function isResolutionOpcode(op: AllOpcode): op is HighLevelResolutionOpcode {
  return op >= HighLevelResolutionOpcode.Start && op <= HighLevelResolutionOpcode.End;
}

function isErrorOpcode(op: AllOpcode): op is HighLevelErrorOpcode {
  return op === HighLevelErrorOpcode.Error;
}
