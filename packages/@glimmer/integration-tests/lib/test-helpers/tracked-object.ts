import { consumeTag, tagFor, dirtyTagFor } from '@glimmer/validator';

export function trackedObj<T extends Record<string, unknown>>(
  obj: T = {} as T
): Record<string, unknown> {
  let trackedObj = {};

  for (let key in obj) {
    Object.defineProperty(trackedObj, key, {
      enumerable: true,

      get() {
        consumeTag(tagFor(obj, key));

        return (obj as any)[key];
      },

      set(value: unknown) {
        dirtyTagFor(obj, key);
        return ((obj as any)[key] = value);
      },
    });
  }

  return trackedObj;
}
