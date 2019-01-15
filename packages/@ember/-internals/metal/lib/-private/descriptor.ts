// import { DEBUG } from '@glimmer/env';
// import { HAS_NATIVE_COMPUTED_GETTERS, HAS_DESCRIPTOR_TRAP, gte } from 'ember-compatibility-helpers';

import { assert } from '@ember/debug';

// const DESCRIPTOR = '__DESCRIPTOR__';

function isCPGetter(getter) {
  // Hack for descriptor traps, we want to be able to tell if the function
  // is a descriptor trap before we call it at all
  return (
    getter !== null &&
    typeof getter === 'function' &&
    getter.toString().indexOf('CPGETTER_FUNCTION') !== -1
  );
}

function isDescriptorTrap(possibleDesc) {
  // if (HAS_DESCRIPTOR_TRAP && DEBUG) {
  //   return possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc[DESCRIPTOR] !== undefined;
  // } else {
  throw new Error('Cannot call `isDescriptorTrap` in production');
  // }
}

export function isComputedDescriptor(possibleDesc) {
  return possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;
}

export function computedDescriptorFor(obj, keyName) {
  assert('Cannot call `descriptorFor` on null', obj !== null);
  assert('Cannot call `descriptorFor` on undefined', obj !== undefined);
  assert(
    `Cannot call \`descriptorFor\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  // if (HAS_NATIVE_COMPUTED_GETTERS) {
  let meta = Ember.meta(obj);

  if (meta !== undefined && typeof meta._descriptors === 'object') {
    // TODO: Just return the standard descriptor
    // if (gte('3.8.0')) {
    return meta._descriptors.get(keyName);
    // } else {
    //   return meta._descriptors[keyName];
    // }
  }
  // } else if (Object.hasOwnProperty.call(obj, keyName)) {
  //   let { value: possibleDesc, get: possibleCPGetter } = Object.getOwnPropertyDescriptor(obj, keyName);

  //   if (DEBUG && HAS_DESCRIPTOR_TRAP && isCPGetter(possibleCPGetter)) {
  //     possibleDesc = possibleCPGetter.call(obj);

  //     if(isDescriptorTrap(possibleDesc)) {
  //       return possibleDesc[DESCRIPTOR];
  //     }
  //   }

  //   return isComputedDescriptor(possibleDesc) ? possibleDesc : undefined;
  // }
}
