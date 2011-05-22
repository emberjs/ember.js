// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('./core');
require('./platform');
require('./utils');

var o_create = SC.platform.create;
var meta = SC.meta;
var guidFor = SC.guidFor;
var a_slice = Array.prototype.slice;

function objectFor(m, obj, writable) {
  var len = arguments.length, idx, keyName, ret;
  
  for(idx=3; idx<len; idx++) {
    keyName = arguments[idx];
    ret = m[keyName];
    if (writable) {
      if (!ret) {
        ret = m[keyName] = { __scproto__: obj };
      } else if (ret.__scproto__ !== obj) {
        ret = m[keyName] = o_create(ret);
        ret.__scproto__ = obj;
      }
    } else if (!ret || (ret.__scproto__ !== obj)) {
      return undefined;
    }
    
    m = ret;
  }
  
  return ret;
}

function listenerSetFor(obj, eventName, target, writable) {
  return objectFor(meta(obj, writable), obj, writable, 'listeners', eventName, target);
}

var EV_SKIP = { __scproto__: true };

function invokeEvents(targets, params) {
  var tguid, mguid, methods, info, method, target;
  for(tguid in targets) {
    if (EV_SKIP[tguid]) continue;
    methods = targets[tguid];
    
    for(mguid in methods) {
      if (EV_SKIP[mguid] || !(info=methods[mguid])) continue;
      method = info.method;
      target = info.target;
      if (!target) target = params[0];  // object
      if ('string' === typeof method) method = target[method];
      if (info.xform) info.xform(target, method, params);
      else method.apply(target, params);
    }
  }
}

function addListener(obj, eventName, target, method, xform) {
  if (!method && 'function'===typeof target) {
    method = target;
    target = null;
  }

  var set  = listenerSetFor(obj, eventName, target, true), 
      guid = guidFor(method), ret;

  if (!set[guid]) {
    set[guid] = { target: target, method: method, xform: xform };
  } else {
    set[guid].xform = xform; // used by observers etc to map params
  }
  
  if (obj && 'function'===typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
  
  return ret; // return true if this is the first listener.
}

function removeListener(obj, eventName, target, method) {
  if (!method && 'function'===typeof target) {
    method = target;
    target = null;
  }
  
  var set = listenerSetFor(obj, eventName, target, true),
      guid = guidFor(method);
      
  // can't delete since it might be inherited
  if (set && set[guid]) set[guid] = null; 

  if (obj && 'function'===typeof obj.didRemoveListener) {
    obj.didRemoveListener(eventName, target, method);
  }
}

// returns a list of currently watched events
function watchedEvents(obj) {
  var listeners = meta(obj, false).listeners, ret =[];
  if (listeners) {
    for(var eventName in listeners) {
      if (!EV_SKIP[eventName] && listeners[eventName]) ret.push(eventName);
    }
  }
  return ret;
}

function sendEvent(obj, eventName) {
  
  // first give object a change to handle it
  if (obj && 'function' === typeof obj.sendEvent) {
    obj.sendEvent.apply(obj, a_slice.call(arguments, 1));
  }
  
  var set = meta(obj, false).listeners;
  if (set && (set = set[eventName])) {
    invokeEvents(set, arguments);
    return true;
  }
  
  return false;
}

function hasListeners(obj, eventName) {
  var targets = meta(obj, false).listeners;
  if (targets) targets = targets[eventName];
  if (!targets) return false;
  
  var tguid, mguid, methods;
  for(tguid in targets) {
    if (EV_SKIP[tguid] || !targets[tguid]) continue;
    methods = targets[tguid];
    for(mguid in methods) {
      if (EV_SKIP[mguid] || !methods[mguid]) continue;
      return true; // stop as soon as we find a valid listener
    }
  }
  
  // no listeners!  might as well clean this up so it is faster later.
  var set = objectFor(meta(obj, true), obj, true, 'listeners');
  set[eventName] = null;
  
  return false;
}

function listenersFor(obj, eventName) {
  var targets = meta(obj, false).listeners, 
      ret = [];
      
  if (targets) targets = targets[eventName];
  if (!targets) return ret;
  
  var tguid, mguid, methods, info;
  for(tguid in targets) {
    if (EV_SKIP[tguid] || !targets[tguid]) continue;
    methods = targets[tguid];
    for(mguid in methods) {
      if (EV_SKIP[mguid] || !methods[mguid]) continue;
      info = methods[mguid];
      ret.push([info.target, info.method]);
    }
  }
  
  return ret;
}

SC.addListener = addListener;
SC.removeListener = removeListener;
SC.sendEvent = sendEvent;
SC.hasListeners = hasListeners;
SC.watchedEvents = watchedEvents;
SC.listenersFor = listenersFor;
