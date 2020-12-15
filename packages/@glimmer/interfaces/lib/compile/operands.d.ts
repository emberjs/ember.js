import * as WireFormat from './wire-format';
import { SymbolTable } from '../tier1/symbol-table';
import { CompilableTemplate } from '../template';

export const enum HighLevelOperand {
  Label = 1,
  IsStrictMode = 2,
  EvalSymbols = 3,
  Block = 4,
  StdLib = 5,
  NonSmallInt = 6,
  SymbolTable = 7,
  Layout = 8,
}

export interface LabelOperand {
  type: HighLevelOperand.Label;
  value: string;
}

export interface IsStrictModeOperand {
  type: HighLevelOperand.IsStrictMode;
  value: undefined;
}

export interface EvalSymbolsOperand {
  type: HighLevelOperand.EvalSymbols;
  value: undefined;
}

export interface BlockOperand {
  type: HighLevelOperand.Block;
  value: WireFormat.SerializedInlineBlock | WireFormat.SerializedBlock;
}

export interface StdLibOperand {
  type: HighLevelOperand.StdLib;
  value:
    | 'main'
    | 'trusting-append'
    | 'cautious-append'
    | 'trusting-non-dynamic-append'
    | 'cautious-non-dynamic-append';
}

export interface NonSmallIntOperand {
  type: HighLevelOperand.NonSmallInt;
  value: number;
}

export interface SymbolTableOperand {
  type: HighLevelOperand.SymbolTable;
  value: SymbolTable;
}

export interface LayoutOperand {
  type: HighLevelOperand.Layout;
  value: CompilableTemplate;
}

export type HighLevelBuilderOperand =
  | LabelOperand
  | IsStrictModeOperand
  | EvalSymbolsOperand
  | StdLibOperand
  | BlockOperand
  | NonSmallIntOperand
  | SymbolTableOperand
  | LayoutOperand;

export type SingleBuilderOperand =
  | HighLevelBuilderOperand
  | number
  | string
  | boolean
  | undefined
  | null
  | number[]
  | string[];

export type Operand = number;

export type EncoderOperands = [] | [Operand] | [Operand, Operand] | [Operand, Operand, Operand];
