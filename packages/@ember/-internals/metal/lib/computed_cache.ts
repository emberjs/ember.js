import { peekMeta } from '@ember/-internals/meta';

export function getCachedValueFor(obj: object, key: string) {
  let meta = peekMeta(obj);

  if (meta) {
    return meta.valueFor(key);
  }
}
