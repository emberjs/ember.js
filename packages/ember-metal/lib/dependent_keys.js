import {
  watch,
  unwatch
} from './watching';

/**
@module ember
@submodule ember-metal
*/

// ..........................................................
// DEPENDENT KEYS
//

export function addDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  let idx, depKey;
  let depKeys = desc._dependentKeys;
  if (!depKeys) {
    return;
  }

  for (idx = 0; idx < depKeys.length; idx++) {
    depKey = depKeys[idx];
    // Increment the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, (meta.peekDeps(depKey, keyName) || 0) + 1);
    // Watch the depKey
    watch(obj, depKey, meta);
  }
}

export function removeDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // remove all of its dependent keys.
  let depKeys = desc._dependentKeys;
  if (!depKeys) {
    return;
  }

  for (let idx = 0; idx < depKeys.length; idx++) {
    let depKey = depKeys[idx];
    // Decrement the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, (meta.peekDeps(depKey, keyName) || 0) - 1);
    // Unwatch the depKey
    unwatch(obj, depKey, meta);
  }
}
