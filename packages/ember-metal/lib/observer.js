require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils'); // Ember.tryFinally
require('ember-metal/property_get');
require('ember-metal/array');

/**
@module ember-metal
*/

var AFTER_OBSERVERS = ':change',
    BEFORE_OBSERVERS = ':before';

function changeEvent(keyName) {
  return keyName+AFTER_OBSERVERS;
}

function beforeEvent(keyName) {
  return keyName+BEFORE_OBSERVERS;
}

/**
  @method addObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.addObserver = function(obj, _path, target, method) {
  Ember.addListener(obj, changeEvent(_path), target, method);
  Ember.watch(obj, _path);

  return this;
};

Ember.observersFor = function(obj, path) {
  return Ember.listenersFor(obj, changeEvent(path));
};

/**
  @method removeObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.removeObserver = function(obj, _path, target, method) {
  Ember.unwatch(obj, _path);
  Ember.removeListener(obj, changeEvent(_path), target, method);

  return this;
};

/**
  @method addBeforeObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.addBeforeObserver = function(obj, _path, target, method) {
  Ember.addListener(obj, beforeEvent(_path), target, method);
  Ember.watch(obj, _path);

  return this;
};

// Suspend observer during callback.
//
// This should only be used by the target of the observer
// while it is setting the observed path.
Ember._suspendBeforeObserver = function(obj, path, target, method, callback) {
  return Ember._suspendListener(obj, beforeEvent(path), target, method, callback);
};

Ember._suspendObserver = function(obj, path, target, method, callback) {
  return Ember._suspendListener(obj, changeEvent(path), target, method, callback);
};

var map = Ember.ArrayPolyfills.map;

Ember._suspendBeforeObservers = function(obj, paths, target, method, callback) {
  var events = map.call(paths, beforeEvent);
  return Ember._suspendListeners(obj, events, target, method, callback);
};

Ember._suspendObservers = function(obj, paths, target, method, callback) {
  var events = map.call(paths, changeEvent);
  return Ember._suspendListeners(obj, events, target, method, callback);
};

Ember.beforeObserversFor = function(obj, path) {
  return Ember.listenersFor(obj, beforeEvent(path));
};

/**
  @method removeBeforeObserver
  @for Ember
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.removeBeforeObserver = function(obj, _path, target, method) {
  Ember.unwatch(obj, _path);
  Ember.removeListener(obj, beforeEvent(_path), target, method);

  return this;
};
