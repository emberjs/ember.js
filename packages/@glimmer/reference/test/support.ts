import { trackedData } from '@glimmer/validator';

export function tracked<T extends object, K extends keyof T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: T | { new (...args: any[]): T },
  key: K
): void {
  let target: T;
  let initializer: (() => T[K]) | undefined;

  if (typeof obj === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    target = obj.prototype;
  } else {
    target = obj;
    let initialValue = target[key];
    initializer = () => initialValue;
  }

  let { getter, setter } = trackedData<T, K>(key, initializer);

  Object.defineProperty(target, key, {
    get(this: T) {
      return getter(this);
    },
    set(this: T, value: T[K]) {
      setter(this, value);
    },
  });
}
