import {
  LabelOperand,
  OwnerOperand,
  SerializedInlineBlock,
  EvalSymbolsOperand,
  HighLevelOperand,
  BlockOperand,
  StdLibOperand,
  NonSmallIntOperand,
  SerializedBlock,
  SymbolTable,
  SymbolTableOperand,
  CompilableTemplate,
  LayoutOperand,
} from '@glimmer/interfaces';
import { assert, isSmallInt } from '@glimmer/util';

export function labelOperand(value: string): LabelOperand {
  return { type: HighLevelOperand.Label, value };
}

export function evalSymbolsOperand(): EvalSymbolsOperand {
  return { type: HighLevelOperand.EvalSymbols, value: undefined };
}

export function ownerOperand(): OwnerOperand {
  return { type: HighLevelOperand.Owner, value: undefined };
}

export function blockOperand(value: SerializedInlineBlock | SerializedBlock): BlockOperand {
  return { type: HighLevelOperand.Block, value };
}

export function stdlibOperand(
  value: 'main' | 'trusting-append' | 'cautious-append'
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
