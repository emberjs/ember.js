export { default as Object, FrameworkObject } from './system/object';
export { default as String } from './system/string';
export {
  default as RegistryProxyMixin,
  buildFakeRegistryWithDeprecations
} from './mixins/registry_proxy';
export {
  default as ContainerProxyMixin
} from './mixins/container_proxy';
export { default as copy } from './copy';
export { default as inject } from './inject';
export { default as compare } from './compare';
export { default as isEqual } from './is-equal';
export {
  default as Array,
  objectAt,
  isEmberArray,
  addArrayObserver,
  removeArrayObserver
} from './mixins/array';
export { default as Comparable } from './mixins/comparable';
export {
  default as Namespace,
  isSearchDisabled as isNamespaceSearchDisabled,
  setSearchDisabled as setNamespaceSearchDisabled
} from './system/namespace';
export { default as ArrayProxy } from './system/array_proxy';
export { default as ObjectProxy } from './system/object_proxy';
export { default as CoreObject } from './system/core_object';
export { default as NativeArray, A } from './system/native_array';
export {
  default as ActionHandler,
  deprecateUnderscoreActions
} from './mixins/action_handler';
export { default as Copyable } from './mixins/copyable';
export { default as Enumerable } from './mixins/enumerable';
export {
  Freezable,
  FROZEN_ERROR
} from './mixins/freezable';
export {
  default as _ProxyMixin
} from './mixins/-proxy';
export {
  onLoad,
  runLoadHooks,
  _loaded
} from './system/lazy_load';
export { default as Observable } from './mixins/observable';
export { default as MutableEnumerable } from './mixins/mutable_enumerable';
export {
  default as MutableArray,
  removeAt
} from './mixins/mutable_array';
export { default as TargetActionSupport } from './mixins/target_action_support';
export { default as Evented } from './mixins/evented';
export { default as PromiseProxyMixin } from './mixins/promise_proxy';

export {
  empty,
  notEmpty,
  none,
  not,
  bool,
  match,
  equal,
  gt,
  gte,
  lt,
  lte,
  oneWay,
  readOnly,
  deprecatingAlias,
  and,
  or
} from './computed/computed_macros';

export {
  sum,
  min,
  max,
  map,
  sort,
  setDiff,
  mapBy,
  filter,
  filterBy,
  uniq,
  uniqBy,
  union,
  intersect,
  collect
} from './computed/reduce_computed_macros';

export { default as Controller } from './controllers/controller';
export { default as ControllerMixin } from './mixins/controller';
export { default as Service } from './system/service';
export {
  default as RSVP,
  onerrorDefault
} from './ext/rsvp';     // just for side effect of extending Ember.RSVP
export { isArray, typeOf } from './utils';
export {
  getStrings,
  setStrings
} from './string_registry';

import './ext/string';   // just for side effect of extending String.prototype
import './ext/function'; // just for side effect of extending Function.prototype
