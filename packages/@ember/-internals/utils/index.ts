/*
 This package will be eagerly parsed and should have no dependencies on external
 packages.

 It is intended to be used to share utility methods that will be needed
 by every Ember application (and is **not** a dumping ground of useful utilities).

 Utility methods that are needed in < 80% of cases should be placed
 elsewhere (so they can be lazily evaluated / parsed).
*/
export { symbol, enumerableSymbol, isInternalSymbol } from './lib/symbol';
export { default as dictionary } from './lib/dictionary';
export { default as getDebugName } from './lib/get-debug-name';
export { uuid, GUID_KEY, generateGuid, guidFor } from './lib/guid';
export { default as intern } from './lib/intern';
export {
  checkHasSuper,
  ROOT,
  wrap,
  observerListenerMetaFor,
  setObservers,
  setListeners,
} from './lib/super';
export { default as lookupDescriptor } from './lib/lookup-descriptor';
export { canInvoke } from './lib/invoke';
export { getName, setName } from './lib/name';
export { default as toString } from './lib/to-string';
export { isObject } from './lib/spec';
export { isProxy, setProxy } from './lib/is_proxy';
export { default as Cache } from './lib/cache';
export {
  setupMandatorySetter,
  teardownMandatorySetter,
  setWithMandatorySetter,
} from './lib/mandatory-setter';
