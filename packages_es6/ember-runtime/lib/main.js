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

import Ember from "ember-metal/core";
import {compare, copy, isEqual, keys} from "ember-runtime/core";

import {arrayComputed, ArrayComputedProperty} from "ember-runtime/computed/array_computed";
import {reduceComputed, ReduceComputedProperty} from "ember-runtime/computed/reduce_computed";

import {EmberArray, Enumerable, Comparable, Copyable, Freezable, FROZEN_ERROR, Deferred, MutableEnumerable, MutableArray, TargetActionSupport, Evented, PromiseProxyMixin, SortableMixin} from "ember-runtime/mixins";
import {Namespace, EmberObject, TrackedArray, SubArray, Container, Application, ArrayProxy, ObjectProxy, ActionHandler, CoreObject, EachArray, EachProxy, NativeArray, A, Set, EmberStringUtils, Deferred, onLoad, runLoadHooks} from "ember-runtime/system";

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


Ember.arrayComputed = arrayComputed;
Ember.ArrayComputedProperty = ArrayComputedProperty;
Ember.reduceComputed = reduceComputed;
Ember.ReduceComputedProperty = ReduceComputedProperty;

Ember.String = EmberStringUtils;
Ember.Object = EmberObject;
Ember.TrackedArray = TrackedArray;
Ember.SubArray = SubArray;
Ember.Container = Container;
Ember.Application = Application;
Ember.Enumerable = Enumerable;
Ember.ArrayProxy = ArrayProxy;
Ember.ObjectProxy = ObjectProxy;
Ember.ActionHandler = ActionHandler;
Ember.CoreObject = CoreObject;
Ember.EachArray = EachArray;
Ember.EachProxy = EachProxy;
Ember.NativeArray = NativeArray;
Ember.A = A;
Ember.Set = Set;
Ember.Deferred = Deferred;
Ember.onLoad = onLoad;
Ember.runLoadHooks = runLoadHooks;

Ember.ArrayController = ArrayController;
Ember.ObjectController = ObjectController;
Ember.Controller = Controller;
Ember.ControllerMixin = ControllerMixin;
