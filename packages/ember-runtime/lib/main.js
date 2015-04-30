/**
Ember Runtime

@module ember
@submodule ember-runtime
@requires ember-metal
*/

// BEGIN IMPORTS
import Ember from 'ember-metal';
import { isEqual } from 'ember-runtime/core';
import compare from 'ember-runtime/compare';
import copy from 'ember-runtime/copy';
import inject from 'ember-runtime/inject';

import Namespace from 'ember-runtime/system/namespace';
import EmberObject from 'ember-runtime/system/object';
import TrackedArray from 'ember-runtime/system/tracked_array';
import SubArray from 'ember-runtime/system/subarray';
import { Container, Registry } from "ember-runtime/system/container";
import ArrayProxy from 'ember-runtime/system/array_proxy';
import ObjectProxy from 'ember-runtime/system/object_proxy';
import CoreObject from 'ember-runtime/system/core_object';

import NativeArray from 'ember-runtime/system/native_array';
import Set from 'ember-runtime/system/set';
import EmberStringUtils from 'ember-runtime/system/string';
import Deferred from 'ember-runtime/system/deferred';
import {
  onLoad,
  runLoadHooks
} from 'ember-runtime/system/lazy_load';

import EmberArray from 'ember-runtime/mixins/array';
import Comparable from 'ember-runtime/mixins/comparable';
import Copyable from 'ember-runtime/mixins/copyable';
import Enumerable from 'ember-runtime/mixins/enumerable';
import {
  Freezable,
  FROZEN_ERROR
} from 'ember-runtime/mixins/freezable';
import _ProxyMixin from 'ember-runtime/mixins/-proxy';

import Observable from 'ember-runtime/mixins/observable';
import ActionHandler from 'ember-runtime/mixins/action_handler';
import DeferredMixin from 'ember-runtime/mixins/deferred';
import MutableEnumerable from 'ember-runtime/mixins/mutable_enumerable';
import MutableArray from 'ember-runtime/mixins/mutable_array';
import TargetActionSupport from 'ember-runtime/mixins/target_action_support';
import Evented from 'ember-runtime/mixins/evented';
import PromiseProxyMixin from 'ember-runtime/mixins/promise_proxy';
import SortableMixin from 'ember-runtime/mixins/sortable';
import {
  arrayComputed,
  ArrayComputedProperty
} from 'ember-runtime/computed/array_computed';

import {
  reduceComputed,
  ReduceComputedProperty
} from 'ember-runtime/computed/reduce_computed';

import {
  sum,
  min,
  max,
  map,
  sort,
  setDiff,
  mapBy,
  mapProperty,
  filter,
  filterBy,
  filterProperty,
  uniq,
  union,
  intersect
} from 'ember-runtime/computed/reduce_computed_macros';

import ArrayController from 'ember-runtime/controllers/array_controller';
import ObjectController from 'ember-runtime/controllers/object_controller';
import Controller from 'ember-runtime/controllers/controller';
import ControllerMixin from 'ember-runtime/mixins/controller';

import Service from 'ember-runtime/system/service';

import RSVP from 'ember-runtime/ext/rsvp';     // just for side effect of extending Ember.RSVP
import 'ember-runtime/ext/string';   // just for side effect of extending String.prototype
import 'ember-runtime/ext/function'; // just for side effect of extending Function.prototype

import { typeOf, isArray } from 'ember-runtime/utils';
// END IMPORTS

// BEGIN EXPORTS
Ember.compare = compare;
Ember.copy = copy;
Ember.isEqual = isEqual;

Ember.inject = inject;

Ember.Array = EmberArray;

Ember.Comparable = Comparable;
Ember.Copyable = Copyable;

Ember.SortableMixin = SortableMixin;

Ember.Freezable = Freezable;
Ember.FROZEN_ERROR = FROZEN_ERROR;

Ember.DeferredMixin = DeferredMixin;

Ember.MutableEnumerable = MutableEnumerable;
Ember.MutableArray = MutableArray;

Ember.TargetActionSupport = TargetActionSupport;
Ember.Evented = Evented;

Ember.PromiseProxyMixin = PromiseProxyMixin;

Ember.Observable = Observable;

Ember.arrayComputed = arrayComputed;
Ember.ArrayComputedProperty = ArrayComputedProperty;
Ember.reduceComputed = reduceComputed;
Ember.ReduceComputedProperty = ReduceComputedProperty;

Ember.typeOf    = typeOf;
Ember.isArray   = isArray;

// ES6TODO: this seems a less than ideal way/place to add properties to Ember.computed
var EmComputed = Ember.computed;

EmComputed.sum = sum;
EmComputed.min = min;
EmComputed.max = max;
EmComputed.map = map;
EmComputed.sort = sort;
EmComputed.setDiff = setDiff;
EmComputed.mapBy = mapBy;
EmComputed.mapProperty = mapProperty;
EmComputed.filter = filter;
EmComputed.filterBy = filterBy;
EmComputed.filterProperty = filterProperty;
EmComputed.uniq = uniq;
EmComputed.union = union;
EmComputed.intersect = intersect;

Ember.String = EmberStringUtils;
Ember.Object = EmberObject;
Ember.TrackedArray = TrackedArray;
Ember.SubArray = SubArray;
Ember.Container = Container;
Ember.Registry = Registry;
Ember.Namespace = Namespace;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.NativeArray = NativeArray;
// ES6TODO: Currently we must rely on the global from ember-metal/core to avoid circular deps
// Ember.A = A;
Ember.Set = Set;
Ember.Deferred = Deferred;
Ember.onLoad = onLoad;
Ember.runLoadHooks = runLoadHooks;

Ember.ArrayController = ArrayController;
Ember.ObjectController = ObjectController;
Ember.Controller = Controller;
Ember.ControllerMixin = ControllerMixin;

Ember.Service = Service;

Ember._ProxyMixin = _ProxyMixin;

Ember.RSVP = RSVP;
// END EXPORTS

export default Ember;
