// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('./core');
require('./platform');
require('./utils');
require('./accessors');

var AFTER_OBSERVERS = ':change';
var BEFORE_OBSERVERS = ':before';
var guidFor = SC.guidFor;
var normalizePath = SC.normalizePath;

var suspended = 0;

var queue = [], queueSet = {};
function notifyObservers(obj, eventName) {
  if (suspended) {
    
    // if suspended add to the queue to send event later - but only send 
    // event once.
    var guid = guidFor(obj);
    if (!queueSet[guid]) queueSet[guid] = {};
    if (!queueSet[guid][eventName]) {
      queueSet[guid][eventName] = true;
      queue.push([obj, eventName]);
    }

  } else {
    SC.sendEvent(obj, eventName);
  }
}

function flushObserverQueue() {
  if (!queue || queue.length===0) return ;
  var q = queue;
  queue = []; queueSet = {};
  q.forEach(function(x){ SC.sendEvent(x[0], x[1]); });
}

SC.beginPropertyChanges = function() {
  suspended++;
  return this;
};

SC.endPropertyChanges = function() {
  suspended--;
  if (suspended<=0) flushObserverQueue();
};

function changeEvent(keyName) {
  return keyName+AFTER_OBSERVERS;
}

function beforeEvent(keyName) {
  return keyName+BEFORE_OBSERVERS;
}

function changeKey(eventName) {
  return eventName.slice(0, -7);
}

function beforeKey(eventName) {
  return eventName.slice(0, -7);
}

function xformChange(target, method, params) {
  var obj = params[0], keyName = changeKey(params[1]), val;
  if (method.length>2) val = SC.getPath(obj, keyName);
  method.call(target, obj, keyName, val);
}

function xformBefore(target, method, params) {
  var obj = params[0], keyName = beforeKey(params[1]), val;
  if (method.length>2) val = SC.getPath(obj, keyName);
  method.call(target, obj, keyName, val);
}

SC.addObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.addListener(obj, changeEvent(path), target, method, xformChange);
  SC.watch(obj, path);
  return this;
};

SC.observersFor = function(obj, path) {
  return SC.listenersFor(obj, changeEvent(path));
};

SC.removeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.unwatch(obj, path);
  SC.removeListener(obj, changeEvent(path), target, method);
  return this;
};

SC.addBeforeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.addListener(obj, beforeEvent(path), target, method, xformBefore);
  SC.watch(obj, path);
  return this;
};

SC.beforeObserversFor = function(obj, path) {
  return SC.listenersFor(obj, beforeEvent(path));
};

SC.removeBeforeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.unwatch(obj, path);
  SC.removeListener(obj, beforeEvent(path), target, method);
  return this;
};


SC.notifyObservers = function(obj, keyName) {
  notifyObservers(obj, changeEvent(keyName));
};

SC.notifyBeforeObservers = function(obj, keyName) {
  notifyObservers(obj, beforeEvent(keyName));
};

