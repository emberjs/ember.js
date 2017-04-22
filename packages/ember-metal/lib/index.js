/**
@module ember
@submodule ember-metal
*/

export { default } from './core'; // reexports
export {
  default as computed,
  cacheFor,
  ComputedProperty
} from './computed';
export { default as alias } from './alias';
export { default as merge } from './merge';
export { deprecateProperty } from './deprecate_property';
export {
  instrument,
  flaggedInstrument,
  _instrumentStart,
  reset as instrumentationReset,
  subscribe as instrumentationSubscribe,
  unsubscribe as instrumentationUnsubscribe
} from './instrumentation';
export {
  getOnerror,
  setOnerror,
  dispatchError,
  setDispatchOverride,
  getDispatchOverride
} from './error_handler';
export {
  META_DESC,
  meta,
  peekMeta
} from './meta';
export { default as Cache } from './cache';
export {
  _getPath,
  get,
  getWithDefault
} from './property_get';
export {
  set,
  trySet
} from './property_set';
export { default as WeakMap } from './weak_map';
export {
  accumulateListeners,
  addListener,
  hasListeners,
  listenersFor,
  on,
  removeListener,
  sendEvent,
  suspendListener,
  suspendListeners,
  watchedEvents
} from './events';

export { default as isNone } from './is_none';
export { default as isEmpty } from './is_empty';
export { default as isBlank } from './is_blank';
export { default as isPresent } from './is_present';
export { default as run } from './run_loop';
export { default as ObserverSet } from './observer_set';
export {
  beginPropertyChanges,
  changeProperties,
  endPropertyChanges,
  overrideChains,
  propertyDidChange,
  propertyWillChange,
  PROPERTY_DID_CHANGE
} from './property_events';
export {
  defineProperty,
  Descriptor,
  _hasCachedComputedProperties
} from './properties';
export {
  watchKey,
  unwatchKey
} from './watch_key';
export {
  ChainNode,
  finishChains,
  removeChainWatcher
} from './chains';
export {
  watchPath,
  unwatchPath
} from './watch_path';
export {
  destroy,
  isWatching,
  unwatch,
  watch,
  watcherCount
} from './watching';
export { default as libraries, Libraries } from './libraries';
export {
  Map,
  MapWithDefault,
  OrderedSet
} from './map';
export { default as getProperties } from './get_properties';
export { default as setProperties } from './set_properties';
export { default as expandProperties } from './expand_properties';

export {
  _suspendObserver,
  _suspendObservers,
  addObserver,
  observersFor,
  removeObserver,
  _addBeforeObserver,
  _removeBeforeObserver
} from './observer';
export {
  Mixin,
  aliasMethod,
  _immediateObserver,
  _beforeObserver,
  mixin,
  observer,
  required,
  REQUIRED,
  hasUnprocessedMixins,
  clearUnprocessedMixins,
  detectBinding
} from './mixin';
export {
  Binding,
  bind
} from './binding';
export {
  isGlobalPath
} from './path_cache';
export { default as InjectedProperty } from './injected_property';
export {
  setHasViews,
  tagForProperty,
  tagFor,
  markObjectAsDirty
} from './tags';
export { default as replace } from './replace';
export {
  default as runInTransaction,
  didRender,
  assertNotRendered
} from './transaction';
export {
  isProxy
} from './is_proxy';
export { default as descriptor } from './descriptor';