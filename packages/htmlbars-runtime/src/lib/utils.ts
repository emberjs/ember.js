export const EMPTY_ARRAY = [];
export const EMPTY_OBJECT = {};

const KEY = intern(`__glimmer${+ new Date()}`);

export const TRUSTED_STRING = symbol("trusted string");

export function symbol(debugName): string {
  let num = Math.floor(Math.random() * (+new Date()));
  return intern(`${debugName} [id=${KEY}${num}]`);
}

export function intern(string: string): string {
  var obj = {};
  obj[string] = 1;
  return string;
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

export interface Dict<T> {
  [index: string]: T;
}

export interface Destroyable {
  destroy();
}