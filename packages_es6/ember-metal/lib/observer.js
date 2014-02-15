/*
require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils'); // Ember.tryFinally
require('ember-metal/property_get');
require('ember-metal/array');
require('ember-metal/events');
*/

import {watch, unwatch} from "ember-metal/watching";
import ArrayPolyfills from "ember-metal/array";
import {listenersFor, addListener, removeListener, suspendListeners, suspendListener} from "ember-metal/events";
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
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
function addObserver(obj, _path, target, method) {
  addListener(obj, changeEvent(_path), target, method);
  watch(obj, _path);

  return this;
};

function observersFor(obj, path) {
  return Ember.listenersFor(obj, changeEvent(path));
};

/**
  @method removeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
function removeObserver(obj, _path, target, method) {
  unwatch(obj, _path);
  removeListener(obj, changeEvent(_path), target, method);

  return this;
};

/**
  @method addBeforeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
function addBeforeObserver(obj, _path, target, method) {
  addListener(obj, beforeEvent(_path), target, method);
  watch(obj, _path);

  return this;
};

// Suspend observer during callback.
//
// This should only be used by the target of the observer
// while it is setting the observed path.
function _suspendBeforeObserver(obj, path, target, method, callback) {
  return suspendListener(obj, beforeEvent(path), target, method, callback);
};

function _suspendObserver(obj, path, target, method, callback) {
  return suspendListener(obj, changeEvent(path), target, method, callback);
};

var map = ArrayPolyfills.map;

function _suspendBeforeObservers(obj, paths, target, method, callback) {
  var events = map.call(paths, beforeEvent);
  return suspendListeners(obj, events, target, method, callback);
};

function _suspendObservers(obj, paths, target, method, callback) {
  var events = map.call(paths, changeEvent);
  return suspendListeners(obj, events, target, method, callback);
};

function beforeObserversFor(obj, path) {
  return listenersFor(obj, beforeEvent(path));
};

/**
  @method removeBeforeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
function removeBeforeObserver(obj, _path, target, method) {
  unwatch(obj, _path);
  removeListener(obj, beforeEvent(_path), target, method);

  return this;
};

export {addObserver, observersFor, removeObserver, addBeforeObserver, _suspendBeforeObserver, _suspendObserver,_suspendBeforeObserver, _suspendObservers, beforeObserversFor, removeBeforeObserver};
