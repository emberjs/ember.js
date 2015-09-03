'no use strict';
// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed

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

export function addDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  var idx, len, depKey;
  var depKeys = desc._dependentKeys;
  if (!depKeys) {
    return;
  }

  for (idx = 0, len = depKeys.length; idx < len; idx++) {
    depKey = depKeys[idx];
    // Increment the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, (meta.peekDeps(depKey, keyName)|| 0) + 1);
    // Watch the depKey
    watch(obj, depKey, meta);
  }
}

export function removeDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // remove all of its dependent keys.
  var depKeys = desc._dependentKeys;
  var idx, len, depKey;
  if (!depKeys) {
    return;
  }

  for (idx = 0, len = depKeys.length; idx < len; idx++) {
    depKey = depKeys[idx];
    // Decrement the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, (meta.peekDeps(depKey, keyName) || 0) - 1);
    // Unwatch the depKey
    unwatch(obj, depKey, meta);
  }
}
