require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');

/**
@module ember-metal
*/

var o_create = Ember.create,
    metaFor = Ember.meta,
    metaPath = Ember.metaPath,
    META_KEY = Ember.META_KEY;

/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:changed": [ // variable name: `actions`
            [target, method, onceFlag, suspendedFlag]
          ]
        }
      }

*/

function indexOf(array, target, method) {
  var index = -1;
  for (var i = 0, l = array.length; i < l; i++) {
    if (target === array[i][0] && method === array[i][1]) { index = i; break; }
  }
  return index;
}

function actionsFor(obj, eventName) {
  var meta = metaFor(obj, true),
      actions;

  if (!meta.listeners) { meta.listeners = {}; }

  if (!meta.hasOwnProperty('listeners')) {
    // setup inherited copy of the listeners object
    meta.listeners = o_create(meta.listeners);
  }

  actions = meta.listeners[eventName];

  // if there are actions, but the eventName doesn't exist in our listeners, then copy them from the prototype
  if (actions && !meta.listeners.hasOwnProperty(eventName)) {
    actions = meta.listeners[eventName] = meta.listeners[eventName].slice();
  } else if (!actions) {
    actions = meta.listeners[eventName] = [];
  }

  return actions;
}

function actionsUnion(obj, eventName, otherActions) {
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName];

  if (!actions) { return; }
  for (var i = actions.length - 1; i >= 0; i--) {
    var target = actions[i][0],
        method = actions[i][1],
        once = actions[i][2],
        suspended = actions[i][3],
        actionIndex = indexOf(otherActions, target, method);

    if (actionIndex === -1) {
      otherActions.push([target, method, once, suspended]);
    }
  }
}

function actionsDiff(obj, eventName, otherActions) {
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName],
      diffActions = [];

  if (!actions) { return; }
  for (var i = actions.length - 1; i >= 0; i--) {
    var target = actions[i][0],
        method = actions[i][1],
        once = actions[i][2],
        suspended = actions[i][3],
        actionIndex = indexOf(otherActions, target, method);

    if (actionIndex !== -1) { continue; }

    otherActions.push([target, method, once, suspended]);
    diffActions.push([target, method, once, suspended]);
  }

  return diffActions;
}

/**
  Add an event listener

  @method addListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
*/
function addListener(obj, eventName, target, method, once) {
  Ember.assert("You must pass at least an object and event name to Ember.addListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName),
      actionIndex = indexOf(actions, target, method);

  if (actionIndex !== -1) { return; }

  actions.push([target, method, once, undefined]);

  if ('function' === typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
}

/**
  Remove an event listener

  Arguments should match those passed to {{#crossLink "Ember/addListener"}}{{/crossLink}}

  @method removeListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
*/
function removeListener(obj, eventName, target, method) {
  Ember.assert("You must pass at least an object and event name to Ember.removeListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  function _removeListener(target, method, once) {
    var actions = actionsFor(obj, eventName),
        actionIndex = indexOf(actions, target, method);

    // action doesn't exist, give up silently
    if (actionIndex === -1) { return; }

    actions.splice(actionIndex, 1);

    if ('function' === typeof obj.didRemoveListener) {
      obj.didRemoveListener(eventName, target, method);
    }
  }

  if (method) {
    _removeListener(target, method);
  } else {
    var meta = obj[META_KEY],
        actions = meta && meta.listeners && meta.listeners[eventName];

    if (!actions) { return; }
    for (var i = actions.length - 1; i >= 0; i--) {
      _removeListener(actions[i][0], actions[i][1]);
    }
  }
}

/**
  @private

  Suspend listener during callback.

  This should only be used by the target of the event listener
  when it is taking an action that would cause the event, e.g.
  an object might suspend its property change listener while it is
  setting that property.

  @method suspendListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
function suspendListener(obj, eventName, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName),
      actionIndex = indexOf(actions, target, method),
      action;

  if (actionIndex !== -1) {
    action = actions[actionIndex].slice(); // copy it, otherwise we're modifying a shared object
    action[3] = true; // mark the action as suspended
    actions[actionIndex] = action; // replace the shared object with our copy
  }

  function tryable()   { return callback.call(target); }
  function finalizer() { if (action) { action[3] = undefined; } }

  return Ember.tryFinally(tryable, finalizer);
}

/**
  @private

  Suspend listener during callback.

  This should only be used by the target of the event listener
  when it is taking an action that would cause the event, e.g.
  an object might suspend its property change listener while it is
  setting that property.

  @method suspendListener
  @for Ember
  @param obj
  @param {Array} eventName Array of event names
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
function suspendListeners(obj, eventNames, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var suspendedActions = [],
      eventName, actions, action, i, l;

  for (i=0, l=eventNames.length; i<l; i++) {
    eventName = eventNames[i];
    actions = actionsFor(obj, eventName);
    var actionIndex = indexOf(actions, target, method);

    if (actionIndex !== -1) {
      action = actions[actionIndex].slice();
      action[3] = true;
      actions[actionIndex] = action;
      suspendedActions.push(action);
    }
  }

  function tryable() { return callback.call(target); }

  function finalizer() {
    for (i = 0, l = suspendedActions.length; i < l; i++) {
      suspendedActions[i][3] = undefined;
    }
  }

  return Ember.tryFinally(tryable, finalizer);
}

/**
  @private

  Return a list of currently watched events

  @method watchedEvents
  @for Ember
  @param obj
*/
function watchedEvents(obj) {
  var listeners = obj[META_KEY].listeners, ret = [];

  if (listeners) {
    for(var eventName in listeners) {
      if (listeners[eventName]) { ret.push(eventName); }
    }
  }
  return ret;
}

/**
  @method sendEvent
  @for Ember
  @param obj
  @param {String} eventName
  @param {Array} params
  @return true
*/
function sendEvent(obj, eventName, params, actions) {
  // first give object a chance to handle it
  if (obj !== Ember && 'function' === typeof obj.sendEvent) {
    obj.sendEvent(eventName, params);
  }

  if (!actions) {
    var meta = obj[META_KEY];
    actions = meta && meta.listeners && meta.listeners[eventName];
  }

  if (!actions) { return; }

  for (var i = actions.length - 1; i >= 0; i--) { // looping in reverse for once listeners
    if (!actions[i] || actions[i][3] === true) { continue; }

    var target = actions[i][0],
        method = actions[i][1],
        once = actions[i][2];

    if (once) { removeListener(obj, eventName, target, method); }
    if (!target) { target = obj; }
    if ('string' === typeof method) { method = target[method]; }
    if (params) {
      method.apply(target, params);
    } else {
      method.apply(target);
    }
  }
  return true;
}

/**
  @private
  @method hasListeners
  @for Ember
  @param obj
  @param {String} eventName
*/
function hasListeners(obj, eventName) {
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName];

  return !!(actions && actions.length);
}

/**
  @private
  @method listenersFor
  @for Ember
  @param obj
  @param {String} eventName
*/
function listenersFor(obj, eventName) {
  var ret = [];
  var meta = obj[META_KEY],
      actions = meta && meta.listeners && meta.listeners[eventName];

  if (!actions) { return ret; }

  for (var i = 0, l = actions.length; i < l; i++) {
    var target = actions[i][0],
        method = actions[i][1];
    ret.push([target, method]);
  }

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
Ember.listenersDiff = actionsDiff;
Ember.listenersUnion = actionsUnion;
