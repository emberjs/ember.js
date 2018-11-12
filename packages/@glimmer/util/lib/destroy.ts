import { Opaque, Maybe } from '@glimmer/interfaces';

export const DESTROY = Symbol('DESTROY');

export interface Destroyable {
  destroy(): void;
}

export interface SymbolDestroyable {
  [DESTROY](): void;
}

export function isDestroyable(value: Opaque): value is SymbolDestroyable {
  return !!(value && DESTROY in value);
}

export function isStringDestroyable(value: Maybe<Partial<Destroyable>>): value is Destroyable {
  return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
}
