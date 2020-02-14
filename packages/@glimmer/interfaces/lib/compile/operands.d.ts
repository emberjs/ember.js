import { Option } from '../core';
import * as WireFormat from './wire-format';
import { HandleResult } from '../template';
import { HighLevelBuilderOp, CompileActions, ArgsOptions } from './encoder';

export const enum PrimitiveType {
  IMMEDIATE = 0,
  STRING = 1,
  NUMBER = 2,
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

export interface TemplateMetaOperand {
  type: 'template-meta';
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

export interface PrimitiveOperand<TValue extends PrimitiveOperandValue = PrimitiveOperandValue> {
  type: 'primitive';
  value: TValue;
}

export type PrimitiveOperandValue =
  | PrimitiveOperandStringValue
  | PrimitiveOperandNumberValue
  | PrimitiveOperandImmediateValue;

export interface PrimitiveOperandStringValue {
  type: PrimitiveType.STRING;
  primitive: string;
}

export interface PrimitiveOperandNumberValue {
  type: PrimitiveType.NUMBER;
  primitive: number;
}

export interface PrimitiveOperandImmediateValue {
  type: PrimitiveType.IMMEDIATE;
  primitive: number | boolean | null | undefined;
}

export type NonlabelBuilderOperand =
  | ArrayOperand
  | StringArrayOperand
  | SerializableOperand
  | TemplateMetaOperand
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

export type BuilderHandleThunk = () => HandleResult;

export type Operand = number | BuilderHandleThunk | StdlibOperand;

export type EncoderOperands = [] | [Operand] | [Operand, Operand] | [Operand, Operand, Operand];
