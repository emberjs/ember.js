import { Opaque, Maybe } from '@glimmer/interfaces';

export const DESTROY = Symbol('DESTROY');

export interface StringDestroyable {
  destroy(): void;
}

export interface Destroyable {
  [DESTROY](): void;
}

export function isDestroyable(value: Opaque): value is Destroyable {
  return !!(value && DESTROY in value);
}

export function isStringDestroyable(
  value: Maybe<Partial<StringDestroyable>>
): value is StringDestroyable {
  return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
}
