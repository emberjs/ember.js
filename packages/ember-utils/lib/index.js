/*
 This package will be eagerly parsed and should have no dependencies on external
 packages.

 It is intended to be used to share utility methods that will be needed
 by every Ember application (and is **not** a dumping ground of useful utilities).

 Utility methods that are needed in < 80% of cases should be placed
 elsewhere (so they can be lazily evaluated / parsed).
*/
export { default as symbol } from './symbol';
export { getOwner, setOwner, OWNER } from './owner';
export { default as assign } from './assign';
export { default as dictionary } from './dictionary';
export {
  uuid,
  GUID_KEY,
  GUID_DESC,
  GUID_KEY_PROPERTY,
  generateGuid,
  guidFor
} from './guid';
export { default as intern } from './intern';
export { checkHasSuper, ROOT, wrap } from './super';
export { default as inspect } from './inspect';
export { default as lookupDescriptor } from './lookup-descriptor';
export { canInvoke, tryInvoke } from './invoke';
export { default as makeArray } from './make-array';
export { default as applyStr } from './apply-str';
export { default as NAME_KEY } from './name';
export { default as toString } from './to-string';
export { HAS_NATIVE_WEAKMAP } from './weak-map-utils';
export { HAS_NATIVE_PROXY } from './proxy-utils';
