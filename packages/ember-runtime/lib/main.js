/**
@module ember
@submodule ember-runtime
*/

// BEGIN IMPORTS
import Ember from 'ember-metal';

import RSVP from 'ember-runtime/ext/rsvp'; // just for side effect of extending Ember.RSVP
import 'ember-runtime/ext/string';   // just for side effect of extending String.prototype
import 'ember-runtime/ext/function'; // just for side effect of extending Function.prototype
// END IMPORTS

// BEGIN EXPORTS
var reexport = Ember.__reexport;

reexport('ember-runtime/utils', ['isArray', 'typeOf']);
reexport('ember-runtime/compare', 'compare');
reexport('ember-runtime/copy', 'copy');
reexport('ember-runtime/core', ['isEqual']);
reexport('ember-runtime/inject', 'inject');
reexport('ember-runtime/mixins/array', [['default', 'Array']]);
reexport('ember-runtime/mixins/comparable', 'Comparable');
reexport('ember-runtime/mixins/copyable', 'Copyable');
reexport('ember-runtime/mixins/sortable', 'SortableMixin');
reexport('ember-runtime/mixins/freezable', ['Freezable', 'FROZEN_ERROR']);
reexport('ember-runtime/mixins/mutable_enumerable', 'MutableEnumerable');
reexport('ember-runtime/mixins/mutable_array', 'MutableArray');
reexport('ember-runtime/mixins/target_action_support', 'TargetActionSupport');
reexport('ember-runtime/mixins/evented', 'Evented');
reexport('ember-runtime/mixins/promise_proxy', 'PromiseProxyMixin');
reexport('ember-runtime/mixins/observable', 'Observable');
reexport('ember-runtime/mixins/-proxy', '_ProxyMixin');
reexport('ember-runtime/computed/array_computed', ['arrayComputed', 'ArrayComputedProperty']);
reexport('ember-runtime/computed/reduce_computed', ['reduceComputed', 'ReduceComputedProperty']);
reexport('ember-runtime/utils', ['typeOf']);

// ES6TODO: this seems a less than ideal way/place to add properties to Ember.computed
reexport('ember-runtime/computed/reduce_computed_macros', 'computed', [
  'sum',
  'min',
  'max',
  'map',
  'sort',
  'setDiff',
  'mapBy',
  'mapProperty',
  'filter',
  'filterBy',
  'filterProperty',
  'uniq',
  'union',
  'intersect'
]);

reexport('ember-runtime/system/string', [['default', 'String']]);
reexport('ember-runtime/system/object', [['default', 'Object']]);
reexport('ember-runtime/system/container', ['Container', 'Registry']);
reexport('ember-runtime/system/namespace', 'Namespace');
reexport('ember-runtime/mixins/enumerable', 'Enumerable');
reexport('ember-runtime/system/array_proxy', 'ArrayProxy');
reexport('ember-runtime/system/object_proxy', 'ObjectProxy');
reexport('ember-runtime/mixins/action_handler', 'ActionHandler');
reexport('ember-runtime/system/core_object', 'CoreObject');
reexport('ember-runtime/system/native_array', 'NativeArray');
// ES6TODO: Currently we must rely on the global from ember-metal/core to avoid circular deps
// Ember.A = A;
reexport('ember-runtime/system/lazy_load', ['onLoad', 'runLoadHooks']);

reexport('ember-runtime/controllers/array_controller', 'ArrayController');
reexport('ember-runtime/controllers/object_controller', 'ObjectController');
reexport('ember-runtime/controllers/controller', 'Controller');
reexport('ember-runtime/mixins/controller', 'ControllerMixin');
reexport('ember-runtime/system/service', 'Service');
reexport('ember-runtime/mixins/-proxy', '_ProxyMixin');

Ember.RSVP = RSVP;
// END EXPORTS

export default Ember;
