declare module '@ember/-internals/metal' {
  export {
    default as computed,
    autoComputed,
    isComputed,
    ComputedProperty,
    type ComputedDecorator,
    type ComputedPropertyGetter,
    type ComputedPropertyObj,
    type ComputedPropertySetter,
    type ComputedPropertyCallback,
  } from '@ember/-internals/metal/lib/computed';
  export { getCachedValueFor } from '@ember/-internals/metal/lib/computed_cache';
  export { default as alias } from '@ember/-internals/metal/lib/alias';
  export { deprecateProperty } from '@ember/-internals/metal/lib/deprecate_property';
  export {
    PROXY_CONTENT,
    _getPath,
    get,
    _getProp,
    type HasUnknownProperty,
    hasUnknownProperty,
  } from '@ember/-internals/metal/lib/property_get';
  export { set, _setProp, trySet } from '@ember/-internals/metal/lib/property_set';
  export {
    objectAt,
    replace,
    replaceInNativeArray,
    addArrayObserver,
    removeArrayObserver,
  } from '@ember/-internals/metal/lib/array';
  export {
    arrayContentWillChange,
    arrayContentDidChange,
  } from '@ember/-internals/metal/lib/array_events';
  export {
    eachProxyArrayWillChange,
    eachProxyArrayDidChange,
  } from '@ember/-internals/metal/lib/each_proxy_events';
  export {
    addListener,
    hasListeners,
    on,
    removeListener,
    sendEvent,
  } from '@ember/-internals/metal/lib/events';
  export {
    beginPropertyChanges,
    changeProperties,
    endPropertyChanges,
    notifyPropertyChange,
    type PropertyDidChange,
    PROPERTY_DID_CHANGE,
  } from '@ember/-internals/metal/lib/property_events';
  export {
    defineProperty,
    defineDecorator,
    defineValue,
  } from '@ember/-internals/metal/lib/properties';
  export {
    type ExtendedMethodDecorator,
    type DecoratorPropertyDescriptor,
    ComputedDescriptor,
    type ElementDescriptor,
    isElementDescriptor,
    nativeDescDecorator,
    descriptorForDecorator,
    descriptorForProperty,
    isClassicDecorator,
    setClassicDecorator,
    makeComputedDecorator,
  } from '@ember/-internals/metal/lib/decorator';
  export { default as libraries, Libraries } from '@ember/-internals/metal/lib/libraries';
  export { default as getProperties } from '@ember/-internals/metal/lib/get_properties';
  export { default as setProperties } from '@ember/-internals/metal/lib/set_properties';
  export { default as expandProperties } from '@ember/-internals/metal/lib/expand_properties';
  export {
    ASYNC_OBSERVERS,
    SYNC_OBSERVERS,
    addObserver,
    activateObserver,
    removeObserver,
    flushAsyncObservers,
    revalidateObservers,
  } from '@ember/-internals/metal/lib/observer';
  export {
    default as inject,
    DEBUG_INJECTION_FUNCTIONS,
  } from '@ember/-internals/metal/lib/injected_property';
  export {
    tagForProperty,
    tagForObject,
    markObjectAsDirty,
  } from '@ember/-internals/metal/lib/tags';
  export { tracked, TrackedDescriptor } from '@ember/-internals/metal/lib/tracked';
  export { cached } from '@ember/-internals/metal/lib/cached';
  export { createCache, getValue, isConst } from '@ember/-internals/metal/lib/cache';
  export {
    NAMESPACES,
    NAMESPACES_BY_ID,
    addNamespace,
    findNamespace,
    findNamespaces,
    processNamespace,
    processAllNamespaces,
    removeNamespace,
    isSearchDisabled as isNamespaceSearchDisabled,
    setSearchDisabled as setNamespaceSearchDisabled,
    setUnprocessedMixins,
  } from '@ember/-internals/metal/lib/namespace_search';
}
