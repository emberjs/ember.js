/**
@module ember
*/
import { watchKey, unwatchKey } from './watch_key';
import { watchPath, unwatchPath } from './watch_path';
import { isPath } from './path_cache';
import { peekMeta } from './meta';

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
export function watch(obj, keyPath, meta) {
  if (isPath(keyPath)) {
    watchPath(obj, keyPath, meta);
  } else {
    watchKey(obj, keyPath, meta);
  }
}

export function isWatching(obj, key) {
  return watcherCount(obj, key) > 0;
}

export function watcherCount(obj, key) {
  let meta = peekMeta(obj);
  return (meta !== undefined && meta.peekWatching(key)) || 0;
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

export function unwatch(obj, keyPath, meta) {
  if (isPath(keyPath)) {
    unwatchPath(obj, keyPath, meta);
  } else {
    unwatchKey(obj, keyPath, meta);
  }
}
