import { trackedData } from '@glimmer/validator';

export function tracked<T extends object, K extends keyof T>(obj: T, key: K): void;
export function tracked<T extends object, K extends keyof T>(
  k: { new (...args: any[]): T },
  key: K
): void;
export function tracked<T extends object, K extends keyof T>(
  obj: T | { new (...args: unknown[]): T },
  key: K
): void {
  let target: T;
  let initializer: (() => T[K]) | undefined;

  if (typeof obj === 'function') {
    target = obj.prototype;
  } else {
    target = obj;
    let initialValue = target[key];
    initializer = () => initialValue;
  }

  let { getter, setter } = trackedData<T, K>(key, initializer);

  Object.defineProperty(target, key, {
    get() {
      return getter(this);
    },
    set(value) {
      return setter(this, value);
    },
  });
}
