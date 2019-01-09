import { Maybe, SymbolDestroyable, Destroyable, DestroySymbol, Dict } from '@glimmer/interfaces';

export const DESTROY: DestroySymbol = Symbol('DESTROY') as DestroySymbol;

export function isDestroyable(value: Maybe<Dict>): value is SymbolDestroyable {
  return !!(value && DESTROY in value);
}

export function isStringDestroyable(value: Maybe<Partial<Destroyable>>): value is Destroyable {
  return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
}
