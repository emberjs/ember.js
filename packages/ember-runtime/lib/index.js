/**
@module ember
@submodule ember-runtime
*/

export { default as String } from './system/string';

// BEGIN IMPORTS
import Ember from 'ember-metal'; // reexports
import isEqual from './is-equal';
import compare from './compare';
import copy from './copy';
import inject from './inject';

import Namespace, {
  isSearchDisabled as isNamespaceSearchDisabled,
  setSearchDisabled as setNamespaceSearchDisabled
} from './system/namespace';
import EmberObject from './system/object';
import { Container, Registry, getOwner, setOwner } from './system/container';
import ArrayProxy from './system/array_proxy';
import ObjectProxy from './system/object_proxy';
import CoreObject from './system/core_object';

import NativeArray from './system/native_array';
import {
  onLoad,
  runLoadHooks
} from './system/lazy_load';

import EmberArray from './mixins/array';
import Comparable from './mixins/comparable';
import Copyable from './mixins/copyable';
import Enumerable from './mixins/enumerable';
import {
  Freezable,
  FROZEN_ERROR
} from './mixins/freezable';
import _ProxyMixin from './mixins/-proxy';

import Observable from './mixins/observable';
import ActionHandler from './mixins/action_handler';
import MutableEnumerable from './mixins/mutable_enumerable';
import MutableArray from './mixins/mutable_array';
import TargetActionSupport from './mixins/target_action_support';
import Evented from './mixins/evented';
import PromiseProxyMixin from './mixins/promise_proxy';

import isEnabled from 'ember-metal/features';

import {
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
  oneWay as computedOneWay,
  readOnly,
  defaultTo,
  deprecatingAlias,
  and,
  or,
  any
} from './computed/computed_macros';

import {
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

import Controller from './controllers/controller';
import ControllerMixin from './mixins/controller';

import Service from './system/service';

import RSVP from './ext/rsvp';     // just for side effect of extending Ember.RSVP
import './ext/string';   // just for side effect of extending String.prototype
import './ext/function'; // just for side effect of extending Function.prototype

import { isArray, typeOf } from './utils';

import RegistryProxyMixin from './mixins/registry_proxy';
import ContainerProxyMixin from './mixins/container_proxy';

import {
  getStrings,
  setStrings
} from './string_registry';

// END IMPORTS

// BEGIN EXPORTS
Ember.compare = compare;
Ember.copy = copy;
Ember.isEqual = isEqual;

Ember.inject = inject;

Ember.Array = EmberArray;

Ember.Comparable = Comparable;
Ember.Copyable = Copyable;

Ember.Freezable = Freezable;
Ember.FROZEN_ERROR = FROZEN_ERROR;

Ember.MutableEnumerable = MutableEnumerable;
Ember.MutableArray = MutableArray;

Ember.TargetActionSupport = TargetActionSupport;
Ember.Evented = Evented;

Ember.PromiseProxyMixin = PromiseProxyMixin;

Ember.Observable = Observable;

Ember.typeOf = typeOf;
Ember.isArray = isArray;

// ES6TODO: this seems a less than ideal way/place to add properties to Ember.computed
var EmComputed = Ember.computed;

EmComputed.empty = empty;
EmComputed.notEmpty = notEmpty;
EmComputed.none = none;
EmComputed.not = not;
EmComputed.bool = bool;
EmComputed.match = match;
EmComputed.equal = equal;
EmComputed.gt = gt;
EmComputed.gte = gte;
EmComputed.lt = lt;
EmComputed.lte = lte;
EmComputed.oneWay = computedOneWay;
EmComputed.reads = computedOneWay;
EmComputed.readOnly = readOnly;
EmComputed.defaultTo = defaultTo;
EmComputed.deprecatingAlias = deprecatingAlias;
EmComputed.and = and;
EmComputed.or = or;
EmComputed.any = any;

EmComputed.sum = sum;
EmComputed.min = min;
EmComputed.max = max;
EmComputed.map = map;
EmComputed.sort = sort;
EmComputed.setDiff = setDiff;
EmComputed.mapBy = mapBy;
EmComputed.filter = filter;
EmComputed.filterBy = filterBy;
EmComputed.uniq = uniq;

if (isEnabled('ember-runtime-computed-uniq-by')) {
  EmComputed.uniqBy = uniqBy;
}

EmComputed.union = union;
EmComputed.intersect = intersect;
EmComputed.collect = collect;

Ember.Object = EmberObject;
Ember.Container = Container;
Ember.Registry = Registry;

Ember.getOwner = getOwner;
Ember.setOwner = setOwner;

Ember._RegistryProxyMixin = RegistryProxyMixin;
Ember._ContainerProxyMixin = ContainerProxyMixin;

Ember.Namespace = Namespace;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.NativeArray = NativeArray;
// ES6TODO: Currently we must rely on the global from ember-metal/core to avoid circular deps
// Ember.A = A;
Ember.onLoad = onLoad;
Ember.runLoadHooks = runLoadHooks;

Ember.Controller = Controller;
Ember.ControllerMixin = ControllerMixin;

Ember.Service = Service;

Ember._ProxyMixin = _ProxyMixin;

Ember.RSVP = RSVP;
// END EXPORTS

/**
  Defines the hash of localized strings for the current language. Used by
  the `Ember.String.loc()` helper. To localize, add string values to this
  hash.

  @property STRINGS
  @for Ember
  @type Object
  @private
*/
Object.defineProperty(Ember, 'STRINGS', {
  configurable: false,
  get: getStrings,
  set: setStrings
});

/**
  Whether searching on the global for new Namespace instances is enabled.

  This is only exported here as to not break any addons.  Given the new
  visit API, you will have issues if you treat this as a indicator of
  booted.

  Internally this is only exposing a flag in Namespace.

  @property BOOTED
  @for Ember
  @type Boolean
  @private
 */
Object.defineProperty(Ember, 'BOOTED', {
  configurable: false,
  enumerable: false,
  get: isNamespaceSearchDisabled,
  set: setNamespaceSearchDisabled
});

export default Ember;
