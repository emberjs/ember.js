import { dict } from '@glimmer/util';
import { dirtyTag } from './autotrack';
import { DirtyableTag } from './validators';

type Privates<T> = { [K in keyof T]?: Private<T[K]> };

interface Private<T> {
  get(): T | undefined;
  set(value: T): void;
}

class PrivateImpl<T> implements Private<T> {
  private inner: T | undefined = undefined;

  get(): T | undefined {
    return this.inner;
  }

  set(value: T): void {
    this.inner = value;
  }
}

const PRIVATES = new WeakMap<object, Privates<object>>();

function privateFor<O extends object, K extends keyof O>(object: O, key: K): Private<O[K]> {
  let privates: Privates<O>;

  if (PRIVATES.has(object)) {
    privates = PRIVATES.get(object)! as Privates<O>;
  } else {
    privates = dict() as Privates<O>;
    PRIVATES.set(object, privates);
  }

  if (key in privates) {
    return privates[key]!;
  } else {
    let p = new PrivateImpl<O[K]>();
    privates[key] = p;
    return p;
  }
}

export const EPOCH = DirtyableTag.create();

export function setStateFor<O extends object, K extends keyof O>(
  object: O,
  key: K,
  value: O[K]
): void {
  EPOCH.inner.dirty();
  dirtyTag(object, key);
  privateFor(object, key).set(value);
}

export function getStateFor<O extends object, K extends keyof O>(
  object: O,
  key: K
): O[K] | undefined {
  return privateFor(object, key).get();
}
