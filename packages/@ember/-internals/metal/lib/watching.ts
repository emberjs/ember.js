/**
@module ember
*/
import { Meta, peekMeta } from '@ember/-internals/meta';
import { isPath } from './path_cache';
import { unwatchKey, watchKey } from './watch_key';
import { unwatchPath, watchPath } from './watch_path';

/**
  Starts watching a property on an object. Whenever the property changes,
  invokes `Ember.notifyPropertyChange`. This is the primitive used by observers
  and dependent keys; usually you will never call this method directly but instead
  use higher level methods like `addObserver()`.

  @private
  @method watch
  @for Ember
  @param obj
  @param {String} keyPath
  @param {Object} meta
*/
export function watch(obj: any, keyPath: string, meta?: Meta): void {
  if (isPath(keyPath)) {
    watchPath(obj, keyPath, meta);
  } else {
    watchKey(obj, keyPath, meta);
  }
}

export function isWatching(obj: any, key: string): boolean {
  return watcherCount(obj, key) > 0;
}

export function watcherCount(obj: any, key: string): number {
  let meta = peekMeta(obj);
  return (meta !== null && meta.peekWatching(key)) || 0;
}

/**
  Stops watching a property on an object. Usually you will never call this method directly but instead
  use higher level methods like `removeObserver()`.

  @private
  @method unwatch
  @for Ember
  @param obj
  @param {String} keyPath
  @param {Object} meta
*/

export function unwatch(obj: object, keyPath: string, meta?: Meta): void {
  if (isPath(keyPath)) {
    unwatchPath(obj, keyPath, meta);
  } else {
    unwatchKey(obj, keyPath, meta);
  }
}
