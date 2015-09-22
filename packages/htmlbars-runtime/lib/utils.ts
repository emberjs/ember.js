import { intern } from 'htmlbars-util';

export const EMPTY_ARRAY = [];
export const EMPTY_OBJECT = {};

const KEY = intern(`__glimmer${+ new Date()}`);

export function symbol(debugName): string {
  let num = Math.floor(Math.random() * (+new Date()));
  return intern(`${debugName} [id=${KEY}${num}]`);
}

export function turbocharge(object: Object): Object {
  function Constructor() {}
  Constructor.prototype = object;
  return object;
}

interface EnumerableCallback<T> {
  (item: T): void;
}

export interface Enumerable<T> {
  forEach(callback: EnumerableCallback<T>);
}

export interface Destroyable {
  destroy();
}