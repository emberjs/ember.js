import * as WireFormat from './wire-format';
import { SymbolTable } from '../tier1/symbol-table';
import { CompilableTemplate } from '../template';

export const enum HighLevelOperand {
  Label = 1,
  Owner = 2,
  IsStrictMode = 3,
  EvalSymbols = 4,
  Block = 5,
  StdLib = 6,
  NonSmallInt = 7,
  SymbolTable = 8,
  Layout = 9,
}

export interface LabelOperand {
  type: HighLevelOperand.Label;
  value: string;
}

export interface OwnerOperand {
  type: HighLevelOperand.Owner;
  value: undefined;
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
  value: 'main' | 'trusting-append' | 'cautious-append';
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
  | OwnerOperand
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
