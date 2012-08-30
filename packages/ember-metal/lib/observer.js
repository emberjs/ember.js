// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');
require('ember-metal/accessors');
require('ember-metal/array');

/**
@module ember-metal
*/

var AFTER_OBSERVERS = ':change';
var BEFORE_OBSERVERS = ':before';
var guidFor = Ember.guidFor;

var deferred = 0;
var array_Slice = [].slice;

var ObserverSet = function () {
  this.targetSet = {};
};
ObserverSet.prototype.add = function (target, path) {
  var targetSet = this.targetSet,
    targetGuid = Ember.guidFor(target),
    pathSet = targetSet[targetGuid];
  if (!pathSet) {
    targetSet[targetGuid] = pathSet = {};
  }
  if (pathSet[path]) {
    return false;
  } else {
    return pathSet[path] = true;
  }
};
ObserverSet.prototype.clear = function () {
  this.targetSet = {};
};

var DeferredEventQueue = function() {
  this.targetSet = {};
  this.queue = [];
};

DeferredEventQueue.prototype.push = function(target, eventName, keyName) {
  var targetSet = this.targetSet,
    queue = this.queue,
    targetGuid = Ember.guidFor(target),
    eventNameSet = targetSet[targetGuid],
    index;

  if (!eventNameSet) {
    targetSet[targetGuid] = eventNameSet = {};
  }
  index = eventNameSet[eventName];
  if (index === undefined) {
    eventNameSet[eventName] = queue.push(Ember.deferEvent(target, eventName, [target, keyName])) - 1;
  } else {
    queue[index] = Ember.deferEvent(target, eventName, [target, keyName]);
  }
};

DeferredEventQueue.prototype.flush = function() {
  var queue = this.queue;
  this.queue = [];
  this.targetSet = {};
  for (var i=0, len=queue.length; i < len; ++i) {
    queue[i]();
  }
};

var queue = new DeferredEventQueue(), beforeObserverSet = new ObserverSet();

function notifyObservers(obj, eventName, keyName, forceNotification) {
  if (deferred && !forceNotification) {
    queue.push(obj, eventName, keyName);
  } else {
    Ember.sendEvent(obj, eventName, [obj, keyName]);
  }
}

function flushObserverQueue() {
  beforeObserverSet.clear();

  queue.flush();
}

/**
  @method beginPropertyChanges
  @chainable
*/
Ember.beginPropertyChanges = function() {
  deferred++;
  return this;
};

/**
  @method endPropertyChanges
*/
Ember.endPropertyChanges = function() {
  deferred--;
  if (deferred<=0) flushObserverQueue();
};

/**
  Make a series of property changes together in an
  exception-safe way.

      Ember.changeProperties(function() {
        obj1.set('foo', mayBlowUpWhenSet);
        obj2.set('bar', baz);
      });

  @method changeProperties
  @param {Function} callback
  @param [binding]
*/
Ember.changeProperties = function(cb, binding){
  Ember.beginPropertyChanges();
  try {
    cb.call(binding);
  } finally {
    Ember.endPropertyChanges();
  }
};

/**
  Set a list of properties on an object. These properties are set inside
  a single `beginPropertyChanges` and `endPropertyChanges` batch, so
  observers will be buffered.

  @method setProperties
  @param target
  @param {Hash} properties
  @return target
*/
Ember.setProperties = function(self, hash) {
  Ember.changeProperties(function(){
    for(var prop in hash) {
      if (hash.hasOwnProperty(prop)) Ember.set(self, prop, hash[prop]);
    }
  });
  return self;
};


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
Ember.addObserver = function(obj, path, target, method) {
  Ember.addListener(obj, changeEvent(path), target, method);
  Ember.watch(obj, path);
  return this;
};

Ember.observersFor = function(obj, path) {
  return Ember.listenersFor(obj, changeEvent(path));
};

/**
  @method removeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.removeObserver = function(obj, path, target, method) {
  Ember.unwatch(obj, path);
  Ember.removeListener(obj, changeEvent(path), target, method);
  return this;
};

/**
  @method addBeforeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.addBeforeObserver = function(obj, path, target, method) {
  Ember.addListener(obj, beforeEvent(path), target, method);
  Ember.watch(obj, path);
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
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.removeBeforeObserver = function(obj, path, target, method) {
  Ember.unwatch(obj, path);
  Ember.removeListener(obj, beforeEvent(path), target, method);
  return this;
};

Ember.notifyObservers = function(obj, keyName) {
  if (obj.isDestroying) { return; }

  notifyObservers(obj, changeEvent(keyName), keyName);
};

Ember.notifyBeforeObservers = function(obj, keyName) {
  if (obj.isDestroying) { return; }

  var guid, set, forceNotification = false;

  if (deferred) {
    if (beforeObserverSet.add(obj, keyName)) {
      forceNotification = true;
    } else {
      return;
    }
  }

  notifyObservers(obj, beforeEvent(keyName), keyName, forceNotification);
};

