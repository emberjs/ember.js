/**
Ember Runtime

@module ember
@submodule ember-runtime
@requires ember-metal
*/

// require('container');
// require('ember-metal');
// require('ember-runtime/core');
// require('ember-runtime/computed/reduce_computed_macros');
// require('ember-runtime/ext');
// require('ember-runtime/system');
// require('ember-runtime/controllers');

// IMPORTS
import "ember-runtime/ext"; // just for side effect of extending some native prototypes

import Ember from "ember-metal";
import {isEqual} from "ember-runtime/core";
import keys from "ember-runtime/keys";
import compare from "ember-runtime/compare";
import copy from "ember-runtime/copy";

import {Namespace, EmberObject, TrackedArray, SubArray, Container, Application, ArrayProxy, ObjectProxy, CoreObject, EachArray, EachProxy, NativeArray, A, Set, EmberStringUtils, Deferred, onLoad, runLoadHooks} from "ember-runtime/system";
import {EmberArray, Enumerable, Comparable, Copyable, Freezable, FROZEN_ERROR, DeferredMixin, MutableEnumerable, MutableArray, TargetActionSupport, Evented, PromiseProxyMixin, SortableMixin, Observable, ActionHandler} from "ember-runtime/mixins";

import {arrayComputed, ArrayComputedProperty} from "ember-runtime/computed/array_computed";
import {reduceComputed, ReduceComputedProperty} from "ember-runtime/computed/reduce_computed";
import {sum, min, max, map, sort, setDiff, mapBy, mapProperty, filter, filterBy, filterProperty, uniq, union, intersect} from 'ember-runtime/computed/reduce_computed_macros';

import {ArrayController, ObjectController, Controller, ControllerMixin} from "ember-runtime/controllers";


// Exports
Ember.compare = compare;
Ember.copy = copy;
Ember.isEqual = isEqual;
Ember.keys = keys;

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

// ES6TODO: this seems a less than ideal way/place to add properties to Ember.computed
Ember.computed.sum = sum;
Ember.computed.min = min;
Ember.computed.max = max;
Ember.computed.map = map;
Ember.computed.sort = sort;
Ember.computed.setDiff = setDiff;
Ember.computed.mapBy = mapBy;
Ember.computed.mapProperty = mapProperty;
Ember.computed.filter = filter;
Ember.computed.filterBy = filterBy;
Ember.computed.filterProperty = filterProperty;
Ember.computed.uniq = uniq;
Ember.computed.union = union;
Ember.computed.intersect = intersect;

Ember.String = EmberStringUtils;
Ember.Object = EmberObject;
Ember.TrackedArray = TrackedArray;
Ember.SubArray = SubArray;
Ember.Container = Container;
Ember.Namespace = Namespace;
Ember.Application = Application;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.EachArray = EachArray;
Ember.EachProxy = EachProxy;
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
