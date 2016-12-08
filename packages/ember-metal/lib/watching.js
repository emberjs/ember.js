/**
@module ember-metal
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
  peekMeta,
  deleteMeta
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
function watch(obj, _keyPath, m) {
  if (!isPath(_keyPath)) {
    watchKey(obj, _keyPath, m);
  } else {
    watchPath(obj, _keyPath, m);
  }
}

export { watch };

export function isWatching(obj, key) {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  let meta = peekMeta(obj);
  return (meta && meta.peekWatching(key)) > 0;
}

export function watcherCount(obj, key) {
  let meta = peekMeta(obj);
  return (meta && meta.peekWatching(key)) || 0;
}

export function unwatch(obj, _keyPath, m) {
  if (!isPath(_keyPath)) {
    unwatchKey(obj, _keyPath, m);
  } else {
    unwatchPath(obj, _keyPath, m);
  }
}

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.

  @method destroy
  @for Ember
  @param {Object} obj  the object to destroy
  @return {void}
  @private
*/
export function destroy(obj) {
  deleteMeta(obj);
}
