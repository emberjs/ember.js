import { DEBUG } from '@glimmer/env';
import { enumerableSymbol as _enumerateSymbol } from '@glimmer/util';

const GENERATED_SYMBOLS: string[] = [];

export function isInternalSymbol(possibleSymbol: string) {
  return GENERATED_SYMBOLS.indexOf(possibleSymbol) !== -1;
}

// Some legacy symbols still need to be enumerable for a variety of reasons.
// This code exists for that, and as a fallback in IE11. In general, prefer
// `symbol` below when creating a new symbol.
export function enumerableSymbol(debugName: string): string {
  // TODO: Investigate using platform symbols, but we do not
  // want to require non-enumerability for this API, which
  // would introduce a large cost.
  let symbol = _enumerateSymbol(debugName);

  if (DEBUG) {
    GENERATED_SYMBOLS.push(symbol);
  }

  return symbol;
}
