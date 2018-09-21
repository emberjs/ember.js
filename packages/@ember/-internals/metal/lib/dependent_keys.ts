import { Meta } from '@ember/-internals/meta';
import { unwatch, watch } from './watching';

export interface DescriptorWithDependentKeys {
  _dependentKeys?: string[];
}

// ..........................................................
// DEPENDENT KEYS
//

export function addDependentKeys(
  desc: DescriptorWithDependentKeys,
  obj: object,
  keyName: string,
  meta: Meta
): void {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  let depKeys = desc._dependentKeys;
  if (depKeys === null || depKeys === undefined) {
    return;
  }

  for (let idx = 0; idx < depKeys.length; idx++) {
    let depKey = depKeys[idx];
    // Increment the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, meta.peekDeps(depKey, keyName) + 1);
    // Watch the depKey
    watch(obj, depKey, meta);
  }
}

export function removeDependentKeys(
  desc: DescriptorWithDependentKeys,
  obj: object,
  keyName: string,
  meta: Meta
): void {
  // the descriptor has a list of dependent keys, so
  // remove all of its dependent keys.
  let depKeys = desc._dependentKeys;
  if (depKeys === null || depKeys === undefined) {
    return;
  }

  for (let idx = 0; idx < depKeys.length; idx++) {
    let depKey = depKeys[idx];
    // Decrement the number of times depKey depends on keyName.
    meta.writeDeps(depKey, keyName, meta.peekDeps(depKey, keyName) - 1);
    // Unwatch the depKey
    unwatch(obj, depKey, meta);
  }
}
