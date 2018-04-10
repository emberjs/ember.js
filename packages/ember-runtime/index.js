export { default as Object, FrameworkObject } from './lib/system/object';
export { default as String } from './lib/system/string';
export { default as RegistryProxyMixin } from './lib/mixins/registry_proxy';
export { default as ContainerProxyMixin } from './lib/mixins/container_proxy';
export { default as copy } from './lib/copy';
export { default as inject } from './lib/inject';
export { default as compare } from './lib/compare';
export { default as isEqual } from './lib/is-equal';
export {
  default as Array,
  isEmberArray,
  NativeArray,
  A,
  MutableArray,
  removeAt,
} from './lib/mixins/array';
export { default as Comparable } from './lib/mixins/comparable';
export { default as Namespace } from './lib/system/namespace';
export { default as ArrayProxy } from './lib/system/array_proxy';
export { default as ObjectProxy } from './lib/system/object_proxy';
export { default as CoreObject } from './lib/system/core_object';
export { default as ActionHandler } from './lib/mixins/action_handler';
export { default as Copyable } from './lib/mixins/copyable';
export { default as Enumerable } from './lib/mixins/enumerable';
export { default as _ProxyMixin, contentFor as _contentFor } from './lib/mixins/-proxy';
export { onLoad, runLoadHooks, _loaded } from './lib/system/lazy_load';
export { default as Observable } from './lib/mixins/observable';
export { default as MutableEnumerable } from './lib/mixins/mutable_enumerable';
export { default as TargetActionSupport } from './lib/mixins/target_action_support';
export { default as Evented } from './lib/mixins/evented';
export { default as PromiseProxyMixin } from './lib/mixins/promise_proxy';

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
  or,
} from './lib/computed/computed_macros';

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
  collect,
} from './lib/computed/reduce_computed_macros';

export { default as Controller } from './lib/controllers/controller';
export { default as ControllerMixin } from './lib/mixins/controller';
export { default as Service } from './lib/system/service';
export { default as RSVP, onerrorDefault } from './lib/ext/rsvp'; // just for side effect of extending Ember.RSVP
export { isArray, typeOf } from './lib/utils';
export { getStrings, setStrings } from './lib/string_registry';

import './lib/ext/string'; // just for side effect of extending String.prototype
import './lib/ext/function'; // just for side effect of extending Function.prototype
