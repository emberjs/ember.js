/**
@module ember
*/
import {
  watchKey,
  unwatchKey
} from './watch_key';
import {
  watchPath,
  unwatchPath
} from './watch_path';
import {
  isPath
} from './path_cache';
import {
  peekMeta
} from './meta';

/**
  Starts watching a property on an object. Whenever the property changes,
  invokes `Ember.propertyWillChange` and `Ember.propertyDidChange`. This is the
  primitive used by observers and dependent keys; usually you will never call
  this method directly but instead use higher level methods like
  `Ember.addObserver()`

  @private
  @method watch
  @for Ember
  @param obj
  @param {String} _keyPath
*/
export function watch(obj, _keyPath, m) {
  if (isPath(_keyPath)) {
    watchPath(obj, _keyPath, m);
  } else {
    watchKey(obj, _keyPath, m);
  }
}

export function isWatching(obj, key) {
  return watcherCount(obj, key) > 0;
}

export function watcherCount(obj, key) {
  let meta = peekMeta(obj);
  return (meta !== undefined && meta.peekWatching(key)) || 0;
}

export function unwatch(obj, _keyPath, m) {
  if (isPath(_keyPath)) {
    unwatchPath(obj, _keyPath, m);
  } else {
    unwatchKey(obj, _keyPath, m);
  }
}
