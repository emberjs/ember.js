import type {
  BlockOperand,
  BlockOperandType,
  CompilableTemplate,
  DebugSymbolsOperand,
  DebugSymbolsOperandType,
  IsStrictModeOperand,
  IsStrictModeOperandType,
  LabelOperand,
  LabelOperandType,
  LayoutOperand,
  LayoutOperandType,
  NonSmallIntOperand,
  NonSmallIntOperandType,
  SerializedBlock,
  SerializedInlineBlock,
  StdLibOperand,
  StdLibOperandType,
  SymbolTable,
  SymbolTableOperand,
  SymbolTableOperandType,
} from '@glimmer/interfaces';
import { assert } from '@glimmer/debug-util';
import { isSmallInt } from '@glimmer/util';

export const HighLevelOperands = {
  Label: 1 satisfies LabelOperandType,
  IsStrictMode: 2 satisfies IsStrictModeOperandType,
  DebugSymbols: 3 satisfies DebugSymbolsOperandType,
  Block: 4 satisfies BlockOperandType,
  StdLib: 5 satisfies StdLibOperandType,
  NonSmallInt: 6 satisfies NonSmallIntOperandType,
  SymbolTable: 7 satisfies SymbolTableOperandType,
  Layout: 8 satisfies LayoutOperandType,
} as const;

export function labelOperand(value: string): LabelOperand {
  return { type: HighLevelOperands.Label, value };
}

export function debugSymbolsOperand(): DebugSymbolsOperand {
  return { type: HighLevelOperands.DebugSymbols, value: undefined };
}

export function isStrictMode(): IsStrictModeOperand {
  return { type: HighLevelOperands.IsStrictMode, value: undefined };
}

export function blockOperand(value: SerializedInlineBlock | SerializedBlock): BlockOperand {
  return { type: HighLevelOperands.Block, value };
}

export function stdlibOperand(
  value:
    | 'main'
    | 'trusting-append'
    | 'cautious-append'
    | 'trusting-non-dynamic-append'
    | 'cautious-non-dynamic-append'
): StdLibOperand {
  return { type: HighLevelOperands.StdLib, value };
}

export function nonSmallIntOperand(value: number): NonSmallIntOperand {
  assert(
    !isSmallInt(value),
    'Attempted to make a operand for an int that was not a small int, you should encode this as an immediate'
  );
  return { type: HighLevelOperands.NonSmallInt, value };
}

export function symbolTableOperand(value: SymbolTable): SymbolTableOperand {
  return { type: HighLevelOperands.SymbolTable, value };
}

export function layoutOperand(value: CompilableTemplate): LayoutOperand {
  return { type: HighLevelOperands.Layout, value };
}
