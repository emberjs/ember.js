declare module '@ember/-internals/utils' {
  export { symbol, enumerableSymbol, isInternalSymbol } from '@ember/-internals/utils/lib/symbol';
  export { default as dictionary } from '@ember/-internals/utils/lib/dictionary';
  export { default as getDebugName } from '@ember/-internals/utils/lib/get-debug-name';
  export { uuid, GUID_KEY, generateGuid, guidFor } from '@ember/-internals/utils/lib/guid';
  export { default as intern } from '@ember/-internals/utils/lib/intern';
  export {
    checkHasSuper,
    ROOT,
    wrap,
    observerListenerMetaFor,
    setObservers,
    setListeners,
  } from '@ember/-internals/utils/lib/super';
  export { default as lookupDescriptor } from '@ember/-internals/utils/lib/lookup-descriptor';
  export { canInvoke } from '@ember/-internals/utils/lib/invoke';
  export { getName, setName } from '@ember/-internals/utils/lib/name';
  export { default as toString } from '@ember/-internals/utils/lib/to-string';
  export { isObject } from '@ember/-internals/utils/lib/spec';
  export { isProxy, setProxy } from '@ember/-internals/utils/lib/is_proxy';
  export { default as Cache } from '@ember/-internals/utils/lib/cache';
  export {
    setupMandatorySetter,
    teardownMandatorySetter,
    setWithMandatorySetter,
  } from '@ember/-internals/utils/lib/mandatory-setter';
}
