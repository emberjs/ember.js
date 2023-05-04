import {
  BlockOperand,
  CompilableTemplate,
  DebugSymbolsOperand,
  HighLevelOperand,
  IsStrictModeOperand,
  LabelOperand,
  LayoutOperand,
  NonSmallIntOperand,
  SerializedBlock,
  SerializedInlineBlock,
  StdLibOperand,
  SymbolTable,
  SymbolTableOperand,
} from '@glimmer/interfaces';
import { assert, isSmallInt } from '@glimmer/util';

export function labelOperand(value: string): LabelOperand {
  return { type: HighLevelOperand.Label, value };
}

export function debugSymbolsOperand(): DebugSymbolsOperand {
  return { type: HighLevelOperand.DebugSymbols, value: undefined };
}

export function isStrictMode(): IsStrictModeOperand {
  return { type: HighLevelOperand.IsStrictMode, value: undefined };
}

export function blockOperand(value: SerializedInlineBlock | SerializedBlock): BlockOperand {
  return { type: HighLevelOperand.Block, value };
}

export function stdlibOperand(
  value:
    | 'main'
    | 'trusting-append'
    | 'cautious-append'
    | 'trusting-non-dynamic-append'
    | 'cautious-non-dynamic-append'
): StdLibOperand {
  return { type: HighLevelOperand.StdLib, value };
}

export function nonSmallIntOperand(value: number): NonSmallIntOperand {
  assert(
    !isSmallInt(value),
    'Attempted to make a operand for an int that was not a small int, you should encode this as an immediate'
  );
  return { type: HighLevelOperand.NonSmallInt, value };
}

export function symbolTableOperand(value: SymbolTable): SymbolTableOperand {
  return { type: HighLevelOperand.SymbolTable, value };
}

export function layoutOperand(value: CompilableTemplate): LayoutOperand {
  return { type: HighLevelOperand.Layout, value };
}
