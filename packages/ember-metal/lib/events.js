// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');

var o_create = Ember.create,
    meta = Ember.meta,
    metaPath = Ember.metaPath,
    guidFor = Ember.guidFor,
    a_slice = [].slice;

/**
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {               // variable name: `listenerSet`
          "foo:changed": {         // variable name: `targetSet`
            [targetGuid]: {        // variable name: `actionSet`
              [methodGuid]: {      // variable name: `action`
                target: [Object object],
                method: [Function function]
              }
            }
          }
        }
      }

*/

// Gets the set of all actions, keyed on the guid of each action's
// method property.
/** @private */
function actionSetFor(obj, eventName, target, writable) {
  return metaPath(obj, ['listeners', eventName, guidFor(target)], writable);
}

// Gets the set of all targets, keyed on the guid of each action's
// target property.
/** @private */
function targetSetFor(obj, eventName) {
  var listenerSet = meta(obj, false).listeners;
  if (!listenerSet) { return false; }

  return listenerSet[eventName] || false;
}

// TODO: This knowledge should really be a part of the
// meta system.
var SKIP_PROPERTIES = { __ember_source__: true };

/** @private */
function iterateSet(obj, eventName, callback, params) {
  var targetSet = targetSetFor(obj, eventName);
  if (!targetSet) { return false; }
  // Iterate through all elements of the target set
  for(var targetGuid in targetSet) {
    if (SKIP_PROPERTIES[targetGuid]) { continue; }

    var actionSet = targetSet[targetGuid];
    if (actionSet) {
      // Iterate through the elements of the action set
      for(var methodGuid in actionSet) {
        if (SKIP_PROPERTIES[methodGuid]) { continue; }

        var action = actionSet[methodGuid];
        if (action) {
          if (callback(action, params, obj) === true) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/** @private */
function invokeAction(action, params, sender) {
  var method = action.method, target = action.target;
  // If there is no target, the target is the object
  // on which the event was fired.
  if (!target) { target = sender; }
  if ('string' === typeof method) { method = target[method]; }
  if (params) {
    method.apply(target, params);
  } else {
    method.apply(target);
  }
}

/**
  The sendEvent arguments > 2 are passed to an event listener.

  @memberOf Ember
*/
function addListener(obj, eventName, target, method) {
  Ember.assert("You must pass at least an object and event name to Ember.addListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actionSet = actionSetFor(obj, eventName, target, true),
      methodGuid = guidFor(method);

  if (!actionSet[methodGuid]) {
    actionSet[methodGuid] = { target: target, method: method };
  }

  if ('function' === typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
}

/** @memberOf Ember */
function removeListener(obj, eventName, target, method) {
  Ember.assert("You must pass at least an object and event name to Ember.removeListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actionSet = actionSetFor(obj, eventName, target, true),
      methodGuid = guidFor(method);

  // we can't simply delete this parameter, because if we do, we might
  // re-expose the property from the prototype chain.
  if (actionSet && actionSet[methodGuid]) { actionSet[methodGuid] = null; }

  if ('function' === typeof obj.didRemoveListener) {
    obj.didRemoveListener(eventName, target, method);
  }
}

// Suspend listener during callback.
//
// This should only be used by the target of the event listener
// when it is taking an action that would cause the event, e.g.
// an object might suspend its property change listener while it is
// setting that property.
/** @private */
function suspendListener(obj, eventName, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actionSet = actionSetFor(obj, eventName, target, true),
      methodGuid = guidFor(method),
      action = actionSet && actionSet[methodGuid];

  actionSet[methodGuid] = null;
  try {
    return callback.call(target);
  } finally {
    actionSet[methodGuid] = action;
  }
}

function suspendListeners(obj, eventNames, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var oldActions = [],
      actionSets = [],
      eventName, actionSet, methodGuid, action, i, l;

  for (i=0, l=eventNames.length; i<l; i++) {
    eventName = eventNames[i];
    actionSet = actionSetFor(obj, eventName, target, true),
    methodGuid = guidFor(method);

    oldActions.push(actionSet && actionSet[methodGuid]);
    actionSets.push(actionSet);

    actionSet[methodGuid] = null;
  }

  try {
    return callback.call(target);
  } finally {
    for (i=0, l=oldActions.length; i<l; i++) {
      eventName = eventNames[i];
      actionSets[i][methodGuid] = oldActions[i];
    }
  }
}

// returns a list of currently watched events
/** @memberOf Ember */
function watchedEvents(obj) {
  var listeners = meta(obj, false).listeners, ret = [];

  if (listeners) {
    for(var eventName in listeners) {
      if (!SKIP_PROPERTIES[eventName] && listeners[eventName]) {
        ret.push(eventName);
      }
    }
  }
  return ret;
}

/** @memberOf Ember */
function sendEvent(obj, eventName, params) {
  // first give object a chance to handle it
  if (obj !== Ember && 'function' === typeof obj.sendEvent) {
    obj.sendEvent(eventName, params);
  }

  iterateSet(obj, eventName, invokeAction, params);
  return true;
}

/** @memberOf Ember */
function deferEvent(obj, eventName, params) {
  var actions = [];
  iterateSet(obj, eventName, function (action) {
    actions.push(action);
  });

  return function() {
    if (obj.isDestroyed) { return; }

    if (obj !== Ember && 'function' === typeof obj.sendEvent) {
      obj.sendEvent(eventName, params);
    }

    for (var i=0, len=actions.length; i < len; ++i) {
      invokeAction(actions[i], params, obj);
    }
  };
}

/** @memberOf Ember */
function hasListeners(obj, eventName) {
  if (iterateSet(obj, eventName, function() { return true; })) {
    return true;
  }

  // no listeners!  might as well clean this up so it is faster later.
  var set = metaPath(obj, ['listeners'], true);
  set[eventName] = null;

  return false;
}

/** @memberOf Ember */
function listenersFor(obj, eventName) {
  var ret = [];
  iterateSet(obj, eventName, function (action) {
    ret.push([action.target, action.method]);
  });
  return ret;
}

Ember.addListener = addListener;
Ember.removeListener = removeListener;
Ember._suspendListener = suspendListener;
Ember._suspendListeners = suspendListeners;
Ember.sendEvent = sendEvent;
Ember.hasListeners = hasListeners;
Ember.watchedEvents = watchedEvents;
Ember.listenersFor = listenersFor;
Ember.deferEvent = deferEvent;
