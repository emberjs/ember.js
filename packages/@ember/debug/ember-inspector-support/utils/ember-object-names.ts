import MutableArray from '@ember/array/mutable';
import Evented from '@ember/object/evented';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import MutableEnumerable from '@ember/enumerable/mutable';
import { NativeArray } from '@ember/array';
import { ControllerMixin } from '@ember/controller';
import Observable from '@ember/object/observable';
import { ActionHandler, TargetActionSupport } from '@ember/-internals/runtime';
import CoreObject from '@ember/object/core';
import EmberObject from '@ember/object';
import Component from '@ember/component';
import {
  ActionSupport,
  ChildViewsSupport,
  ClassNamesSupport,
  CoreView,
  ViewMixin,
  ViewStateSupport,
} from '@ember/-internals/views';
/**
 * Add Known Ember Mixins and Classes so we can label them correctly in the inspector
 */
const emberNames = new Map<any, string>([
  [Evented, 'Evented Mixin'],
  [PromiseProxyMixin, 'PromiseProxy Mixin'],
  [MutableArray, 'MutableArray Mixin'],
  [MutableEnumerable, 'MutableEnumerable Mixin'],
  [NativeArray, 'NativeArray Mixin'],
  [Observable, 'Observable Mixin'],
  [ControllerMixin, 'Controller Mixin'],
  [ActionHandler, 'ActionHandler Mixin'],
  [CoreObject, 'CoreObject'],
  [EmberObject, 'EmberObject'],
  [Component, 'Component'],
  [TargetActionSupport, 'TargetActionSupport Mixin'],
  [ViewStateSupport, 'ViewStateSupport Mixin'],
  [ViewMixin, 'View Mixin'],
  [ActionSupport, 'ActionSupport Mixin'],
  [ClassNamesSupport, 'ClassNamesSupport Mixin'],
  [ChildViewsSupport, 'ChildViewsSupport Mixin'],
  [ViewStateSupport, 'ViewStateSupport  Mixin'],
  [CoreView, 'CoreView'],
]);

export default emberNames;
