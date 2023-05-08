import { peekMeta } from '@ember/-internals/meta';

export function getCachedValueFor<T, K extends keyof T>(obj: T, key: K): T[K] | undefined;
export function getCachedValueFor(obj: object, key: string): unknown;
export function getCachedValueFor(obj: object, key: string): unknown {
  let meta = peekMeta(obj);

  if (meta) {
    return meta.valueFor(key);
  } else {
    return undefined;
  }
}
