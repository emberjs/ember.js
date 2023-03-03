import { type EmberArrayLike } from '@ember/array';
import { _WeakSet } from '@glimmer/util';

const EMBER_ARRAYS = new _WeakSet();

export function setEmberArray(obj: object) {
  EMBER_ARRAYS.add(obj);
}

export function isEmberArray(obj: unknown): obj is EmberArrayLike<unknown> {
  return EMBER_ARRAYS.has(obj as object);
}
