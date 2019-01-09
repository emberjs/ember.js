import { InstructionEncoderImpl } from '@glimmer/encoder';
import {
  CompileTimeConstants,
  Labels,
  LabelOperand,
  BuilderHandleThunk,
  Operand,
  CompileTimeHeap,
  BuilderOpcode,
  HighLevelBuilderOpcode,
  BuilderOp,
  MachineOp,
  PrimitiveType,
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
} from '@glimmer/interfaces';
import { isMachineOp } from '@glimmer/vm';
import { Stack, dict, expect } from '@glimmer/util';
import { commit } from '../compiler';
import { num } from './operands';

export type OpcodeBuilderLabels = Labels<InstructionEncoder>;

export class LabelsImpl implements Labels<InstructionEncoder> {
  labels = dict<number>();
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
    } else {
      throw new Error(`Exhausted ${name}`);
    }

    if (op1 === undefined) {
      return { type, op: name, op1: undefined } as HighLevelOp;
    } else {
      return { type, op: name, op1 } as HighLevelOp;
    }
  }
}

export class EncoderImpl implements Encoder {
  private labelsStack = new Stack<OpcodeBuilderLabels>();
  private encoder: InstructionEncoder = new InstructionEncoderImpl([]);

  commit(heap: CompileTimeHeap, size: number): number {
    this.encoder.encode(MachineOp.Return, OpcodeSize.MACHINE_MASK);
    return commit(heap, size, this.encoder.buffer);
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
    case 'number':
      return constants.number(operand.value);
    case 'array':
      return constants.array(operand.value);
    case 'string-array':
      return constants.stringArray(operand.value);
    case 'serializable':
      return constants.templateMeta(operand.value);
    case 'other':
      // TODO: Bad cast
      return constants.other(operand.value);
    case 'stdlib':
      return operand;
    case 'primitive': {
      let { primitive, type } = operand.value;
      let encoded = constant(constants, primitive);
      return sizeImmediate(constants, (encoded << 3) | type, primitive);
    }

    default:
      throw new Error(`Exhausted ${operand}`);
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
  return op === 'IfResolved' || op === 'Expr' || op === 'SimpleArgs';
}

function sizeImmediate(
  constants: CompileTimeConstants,
  shifted: number,
  primitive: SingleBuilderOperand
) {
  if (shifted >= OpcodeSize.MAX_SIZE || shifted < 0) {
    if (typeof primitive !== 'number') {
      throw new Error(
        "This condition should only be possible if the primitive isn't already a constant"
      );
    }

    return (constant(constants, num(primitive as number)) << 3) | PrimitiveType.BIG_NUM;
  }

  return shifted;
}
