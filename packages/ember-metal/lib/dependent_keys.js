// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
//
'REMOVE_USE_STRICT: true';

import {
  watch,
  unwatch
} from 'ember-metal/watching';

/**
@module ember
@submodule ember-metal
*/

// ..........................................................
// DEPENDENT KEYS
//

// data structure:
//  meta.deps = {
//    'depKey': {
//      'keyName': count,
//    }
//  }

/*
  This function returns a map of unique dependencies for a
  given object and key.
*/
function keysForDep(depsMeta, depKey) {
  var keys = depsMeta[depKey];
  if (!keys) {
    // if there are no dependencies yet for a the given key
    // create a new empty list of dependencies for the key
    keys = depsMeta[depKey] = {};
  } else if (!depsMeta.hasOwnProperty(depKey)) {
    // otherwise if the dependency list is inherited from
    // a superclass, clone the hash
    keys = depsMeta[depKey] = Object.create(keys);
  }
  return keys;
}

function metaForDeps(meta) {
  return keysForDep(meta, 'deps');
}

export function addDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  var depsMeta, idx, len, depKey, keys;
  var depKeys = desc._dependentKeys;
  if (!depKeys) {
    return;
  }

  depsMeta = metaForDeps(meta);

  for (idx = 0, len = depKeys.length; idx < len; idx++) {
    depKey = depKeys[idx];
    // Lookup keys meta for depKey
    keys = keysForDep(depsMeta, depKey);
    // Increment the number of times depKey depends on keyName.
    keys[keyName] = (keys[keyName] || 0) + 1;
    // Watch the depKey
    watch(obj, depKey, meta);
  }
}

export function removeDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // remove all of its dependent keys.
  var depKeys = desc._dependentKeys;
  var depsMeta, idx, len, depKey, keys;
  if (!depKeys) {
    return;
  }

  depsMeta = metaForDeps(meta);

  for (idx = 0, len = depKeys.length; idx < len; idx++) {
    depKey = depKeys[idx];
    // Lookup keys meta for depKey
    keys = keysForDep(depsMeta, depKey);
    // Decrement the number of times depKey depends on keyName.
    keys[keyName] = (keys[keyName] || 0) - 1;
    // Unwatch the depKey
    unwatch(obj, depKey, meta);
  }
}
