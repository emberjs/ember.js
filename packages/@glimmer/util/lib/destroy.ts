import { Maybe, SymbolDestroyable, Destroyable, DestroySymbol } from '@glimmer/interfaces';

export const DESTROY: DestroySymbol = 'DESTROY [fc611582-3742-4845-88e1-971c3775e0b8]';

export function isDestroyable(
  value: Maybe<object> | SymbolDestroyable
): value is SymbolDestroyable {
  return !!(value && DESTROY in value);
}

export function isStringDestroyable(value: Maybe<Partial<Destroyable>>): value is Destroyable {
  return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
}
