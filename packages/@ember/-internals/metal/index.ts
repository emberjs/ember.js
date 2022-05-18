export {
  default as computed,
  autoComputed,
  isComputed,
  ComputedProperty,
  ComputedDecorator,
  ComputedPropertyGetter,
  ComputedPropertyObj,
  ComputedPropertySetter,
  ComputedPropertyCallback,
} from './lib/computed';
export { getCachedValueFor } from './lib/computed_cache';
export { default as alias } from './lib/alias';
export { deprecateProperty } from './lib/deprecate_property';
export {
  PROXY_CONTENT,
  _getPath,
  get,
  _getProp,
  HasUnknownProperty,
  hasUnknownProperty,
} from './lib/property_get';
export { set, _setProp, trySet } from './lib/property_set';
export {
  objectAt,
  replace,
  replaceInNativeArray,
  addArrayObserver,
  removeArrayObserver,
} from './lib/array';
export { arrayContentWillChange, arrayContentDidChange } from './lib/array_events';
export { eachProxyArrayWillChange, eachProxyArrayDidChange } from './lib/each_proxy_events';
export { addListener, hasListeners, on, removeListener, sendEvent } from './lib/events';

export {
  beginPropertyChanges,
  changeProperties,
  endPropertyChanges,
  notifyPropertyChange,
  PropertyDidChange,
  PROPERTY_DID_CHANGE,
} from './lib/property_events';
export { defineProperty, defineDecorator, defineValue } from './lib/properties';
export {
  ExtendedMethodDecorator,
  DecoratorPropertyDescriptor,
  ComputedDescriptor,
  ElementDescriptor,
  isElementDescriptor,
  nativeDescDecorator,
  descriptorForDecorator,
  descriptorForProperty,
  isClassicDecorator,
  setClassicDecorator,
  makeComputedDecorator,
} from './lib/decorator';
export { default as libraries, Libraries } from './lib/libraries';
export { default as getProperties } from './lib/get_properties';
export { default as setProperties } from './lib/set_properties';
export { default as expandProperties } from './lib/expand_properties';

export {
  ASYNC_OBSERVERS,
  SYNC_OBSERVERS,
  addObserver,
  activateObserver,
  removeObserver,
  flushAsyncObservers,
  revalidateObservers,
} from './lib/observer';
export { default as inject, DEBUG_INJECTION_FUNCTIONS } from './lib/injected_property';
export { tagForProperty, tagForObject, markObjectAsDirty } from './lib/tags';
export { tracked, TrackedDescriptor } from './lib/tracked';
export { cached } from './lib/cached';
export { createCache, getValue, isConst } from './lib/cache';

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
} from './lib/namespace_search';
