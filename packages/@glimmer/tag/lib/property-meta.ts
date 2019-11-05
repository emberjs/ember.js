import { createTag, dirty } from './tags';
import { dirtyTag } from './object-meta';

type Privates<T> = { [K in keyof T]?: T[K] };

const PRIVATES = new WeakMap<object, Privates<object>>();

function privatesFor<O extends object>(object: O): Privates<O> {
  let privates = PRIVATES.get(object);

  if (privates === undefined) {
    privates = Object.create(null) as Privates<O>;
    PRIVATES.set(object, privates);
  }

  return privates;
}

export const EPOCH = createTag();

export function setStateFor<O extends object, K extends keyof O>(
  object: O,
  key: K,
  value: O[K]
): void {
  dirty(EPOCH);
  dirtyTag(object, key);
  privatesFor(object)[key] = value;
}

export function getStateFor<O extends object, K extends keyof O>(
  object: O,
  key: K
): O[K] | undefined {
  return privatesFor(object)[key];
}
