import { setStateFor, trackedData } from '@glimmer/reference';

export function tracked<T extends object, K extends keyof T>(
  k: { new (...args: any): T },
  key: K
): void;
export function tracked<T extends object, K extends keyof T>(obj: object, key: K): void;
export function tracked<T extends object, K extends keyof T>(
  obj: T | { new (...args: any): T },
  key: K
): void {
  let target: T;

  if (typeof obj === 'function') {
    target = obj.prototype;
  } else {
    target = obj;
    setStateFor(target, key, target[key]);
  }

  let { getter, setter } = trackedData<T, K>(key);

  Object.defineProperty(target, key, {
    get() {
      return getter(this);
    },
    set(value) {
      return setter(this, value);
    },
  });
}
