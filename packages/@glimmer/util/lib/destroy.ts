import { Maybe, SymbolDestroyable, Destroyable, DestroySymbol } from '@glimmer/interfaces';
import { symbol } from './platform-utils';

export const DESTROY: DestroySymbol = symbol('DESTROY');

export function isDestroyable(
  value: Maybe<object> | SymbolDestroyable
): value is SymbolDestroyable {
  return !!(value && DESTROY in value);
}

export function isStringDestroyable(value: Maybe<Partial<Destroyable>>): value is Destroyable {
  return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
}
