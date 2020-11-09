import { Option } from '../core';
import * as WireFormat from './wire-format';
import { HandleResult } from '../template';
import { HighLevelBuilderOp, CompileActions, ArgsOptions } from './encoder';

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
  value: string | number | boolean | null | undefined;
}

export interface ImmediateOperand {
  type: 'immediate';
  value: number;
}

export type NonlabelBuilderOperand =
  | ArrayOperand
  | StringArrayOperand
  | SerializableOperand
  | OtherOperand
  | StdlibOperand
  | LookupHandleOperand
  | PrimitiveOperand
  | ImmediateOperand
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

export type BuilderHandleThunk = () => HandleResult;

export type Operand = number | BuilderHandleThunk | StdlibOperand;

export type EncoderOperands = [] | [Operand] | [Operand, Operand] | [Operand, Operand, Operand];
