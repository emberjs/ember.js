import { Option } from '../core';
import * as WireFormat from './wire-format';
import { NamedBlocks } from '../template';
import {
  HighLevelCompileOp,
  HighLevelBuilderOp,
  HighLevelBuilderOpcode,
  BuilderOp,
  HighLevelCompileOpcode,
  CompileActions,
  ArgsOptions,
} from './encoder';

export const enum PrimitiveType {
  NUMBER = 0b000,
  FLOAT = 0b001,
  STRING = 0b010,
  // 0=false 1=true 2=null 3=undefined
  BOOLEAN_OR_VOID = 0b011,
  NEGATIVE = 0b100,
  BIG_NUM = 0b101,
}

// For numbers that don't fit inside the operand size
export interface NumberOperand {
  type: 'number';
  value: number;
}

export interface ArrayOperand {
  type: 'array';
  value: number[];
}

export interface StringArrayOperand {
  type: 'string-array';
  value: string[];
}

export interface LabelOperand {
  type: 'label';
  value: string;
}

export interface SerializableOperand {
  type: 'serializable';
  value: unknown;
}

export interface OtherOperand {
  type: 'other';
  value: unknown;
}

export interface StdlibOperand {
  type: 'stdlib';
  value: 'main' | 'trusting-append' | 'cautious-append';
}

export interface LookupHandleOperand {
  type: 'lookup';
  value: {
    kind: 'helper';
    value: string;
  };
}

export interface ExpressionOperand {
  type: 'expr';
  value: WireFormat.Expression;
}

export interface ArgsOperand {
  type: 'args';
  value: ArgsOptions;
}

export interface OptionOperand {
  type: 'option';
  value: Option<CompileActions>;
}

export interface InlineBlockOperand {
  type: 'inline-block';
  value: WireFormat.SerializedInlineBlock;
}

export interface PrimitiveOperand {
  type: 'primitive';
  value: {
    type: PrimitiveType;
    primitive: NonlabelBuilderOperand;
  };
}

export type NonlabelBuilderOperand =
  | NumberOperand
  | ArrayOperand
  | StringArrayOperand
  | SerializableOperand
  | OtherOperand
  | StdlibOperand
  | LookupHandleOperand
  | PrimitiveOperand
  | number
  | string
  | boolean
  | null;

export type SingleBuilderOperand = NonlabelBuilderOperand | LabelOperand | BuilderHandleThunk;
export type BuilderOperand = SingleBuilderOperand | HighLevelBuilderOp;
export type CompileOperand = InlineBlockOperand;

export type SingleBuilderOperandsTuple =
  | []
  | [SingleBuilderOperand]
  | [SingleBuilderOperand, SingleBuilderOperand]
  | [SingleBuilderOperand, SingleBuilderOperand, SingleBuilderOperand];

export type BuilderOperandsTuple =
  | []
  | [BuilderOperand]
  | [BuilderOperand, BuilderOperand]
  | [BuilderOperand, BuilderOperand, BuilderOperand];

export type SingleBuilderOperands = SingleBuilderOperandsTuple & SingleBuilderOperand[];

export type BuilderHandleThunk = (() => number);

export type Operand = number | BuilderHandleThunk | StdlibOperand;

export type EncoderOperands = [] | [Operand] | [Operand, Operand] | [Operand, Operand, Operand];
