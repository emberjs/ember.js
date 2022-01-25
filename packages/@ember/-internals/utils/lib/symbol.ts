import { DEBUG } from '@glimmer/env';
import { GUID_KEY } from './guid';
import intern from './intern';

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
  let id = GUID_KEY + Math.floor(Math.random() * Date.now()).toString();
  let symbol = intern(`__${debugName}${id}__`);

  if (DEBUG) {
    GENERATED_SYMBOLS.push(symbol);
  }

  return symbol;
}

export const symbol = Symbol;
