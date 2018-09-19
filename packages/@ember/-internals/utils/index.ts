/*
 This package will be eagerly parsed and should have no dependencies on external
 packages.

 It is intended to be used to share utility methods that will be needed
 by every Ember application (and is **not** a dumping ground of useful utilities).

 Utility methods that are needed in < 80% of cases should be placed
 elsewhere (so they can be lazily evaluated / parsed).
*/
export { default as symbol, isInternalSymbol } from './lib/symbol';
export { default as dictionary } from './lib/dictionary';
export { uuid, GUID_KEY, generateGuid, guidFor } from './lib/guid';
export { default as intern } from './lib/intern';
export {
  checkHasSuper,
  ROOT,
  wrap,
  getObservers,
  getListeners,
  setObservers,
  setListeners,
} from './lib/super';
export { default as inspect } from './lib/inspect';
export { default as lookupDescriptor } from './lib/lookup-descriptor';
export { canInvoke, tryInvoke } from './lib/invoke';
export { default as makeArray } from './lib/make-array';
export { getName, setName } from './lib/name';
export { default as toString } from './lib/to-string';
export { HAS_NATIVE_SYMBOL } from './lib/symbol-utils';
export { HAS_NATIVE_PROXY } from './lib/proxy-utils';
export { isProxy, setProxy } from './lib/is_proxy';
export { default as Cache } from './lib/cache';

import symbol from './lib/symbol';
export const NAME_KEY = symbol('NAME_KEY');
