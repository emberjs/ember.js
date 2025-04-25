import { trackedData } from '@glimmer/validator';

export function tracked(target: object, key: string) {
  let { getter, setter } = trackedData<any, any>(key);

  Object.defineProperty(target, key, {
    get() {
      return getter(this);
    },

    set(value: unknown) {
      setter(this, value);
    },
  });
}
