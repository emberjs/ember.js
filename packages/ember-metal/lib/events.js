// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
//
'REMOVE_USE_STRICT: true';

/**
@module ember
@submodule ember-metal
*/
import Ember from 'ember-metal/core';
import {
  meta as metaFor,
  apply,
  applyStr
} from 'ember-metal/utils';

/* listener flags */
var ONCE = 1;
var SUSPENDED = 2;


/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:changed": [ // variable name: `actions`
            target, method, flags
          ]
        }
      }

*/

function indexOf(array, target, method) {
  var index = -1;
  // hashes are added to the end of the event array
  // so it makes sense to start searching at the end
  // of the array and search in reverse
  for (var i = array.length - 3 ; i >=0; i -= 3) {
    if (target === array[i] && method === array[i + 1]) {
      index = i;
      break;
    }
  }
  return index;
}

function actionsFor(obj, eventName) {
  var meta = metaFor(obj, true);
  var actions;
  var listeners = meta.listeners;

  if (!listeners) {
    listeners = meta.listeners = Object.create(null);
    listeners.__source__ = obj;
  } else if (listeners.__source__ !== obj) {
    // setup inherited copy of the listeners object
    listeners = meta.listeners = Object.create(listeners);
    listeners.__source__ = obj;
  }

  actions = listeners[eventName];

  // if there are actions, but the eventName doesn't exist in our listeners, then copy them from the prototype
  if (actions && actions.__source__ !== obj) {
    actions = listeners[eventName] = listeners[eventName].slice();
    actions.__source__ = obj;
  } else if (!actions) {
    actions = listeners[eventName] = [];
    actions.__source__ = obj;
  }

  return actions;
}

export function accumulateListeners(obj, eventName, otherActions) {
  var meta = obj['__ember_meta__'];
  var actions = meta && meta.listeners && meta.listeners[eventName];

  if (!actions) { return; }

  var newActions = [];

  for (var i = actions.length - 3; i >= 0; i -= 3) {
    var target = actions[i];
    var method = actions[i + 1];
    var flags = actions[i + 2];
    var actionIndex = indexOf(otherActions, target, method);

    if (actionIndex === -1) {
      otherActions.push(target, method, flags);
      newActions.push(target, method, flags);
    }
  }

  return newActions;
}

/**
  Add an event listener

  @method addListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Boolean} once A flag whether a function should only be called once
  @public
*/
export function addListener(obj, eventName, target, method, once) {
  Ember.assert('You must pass at least an object and event name to Ember.addListener', !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName);
  var actionIndex = indexOf(actions, target, method);
  var flags = 0;

  if (once) {
    flags |= ONCE;
  }

  if (actionIndex !== -1) {
    return;
  }

  actions.push(target, method, flags);

  if ('function' === typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
}

/**
  Remove an event listener

  Arguments should match those passed to `Ember.addListener`.

  @method removeListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @public
*/
function removeListener(obj, eventName, target, method) {
  Ember.assert('You must pass at least an object and event name to Ember.removeListener', !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  function _removeListener(target, method) {
    var actions = actionsFor(obj, eventName);
    var actionIndex = indexOf(actions, target, method);

    // action doesn't exist, give up silently
    if (actionIndex === -1) { return; }

    actions.splice(actionIndex, 3);

    if ('function' === typeof obj.didRemoveListener) {
      obj.didRemoveListener(eventName, target, method);
    }
  }

  if (method) {
    _removeListener(target, method);
  } else {
    var meta = obj['__ember_meta__'];
    var actions = meta && meta.listeners && meta.listeners[eventName];

    if (!actions) { return; }
    for (var i = actions.length - 3; i >= 0; i -= 3) {
      _removeListener(actions[i], actions[i + 1]);
    }
  }
}

/**
  Suspend listener during callback.

  This should only be used by the target of the event listener
  when it is taking an action that would cause the event, e.g.
  an object might suspend its property change listener while it is
  setting that property.

  @method suspendListener
  @for Ember

  @private
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
export function suspendListener(obj, eventName, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName);
  var actionIndex = indexOf(actions, target, method);

  if (actionIndex !== -1) {
    actions[actionIndex + 2] |= SUSPENDED; // mark the action as suspended
  }

  try {
    return callback.call(target);
  } finally {
    if (actionIndex !== -1) {
      actions[actionIndex + 2] &= ~SUSPENDED;
    }
  }
}

/**
  Suspends multiple listeners during a callback.

  @method suspendListeners
  @for Ember

  @private
  @param obj
  @param {Array} eventNames Array of event names
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
export function suspendListeners(obj, eventNames, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var suspendedActions = [];
  var actionsList = [];

  for (let i = 0, l = eventNames.length; i < l; i++) {
    let eventName = eventNames[i];
    let actions = actionsFor(obj, eventName);
    let actionIndex = indexOf(actions, target, method);

    if (actionIndex !== -1) {
      actions[actionIndex + 2] |= SUSPENDED;
      suspendedActions.push(actionIndex);
      actionsList.push(actions);
    }
  }

  try {
    return callback.call(target);
  } finally {
    for (let i = 0, l = suspendedActions.length; i < l; i++) {
      let actionIndex = suspendedActions[i];
      actionsList[i][actionIndex + 2] &= ~SUSPENDED;
    }
  }
}

/**
  Return a list of currently watched events

  @private
  @method watchedEvents
  @for Ember
  @param obj
*/
export function watchedEvents(obj) {
  var listeners = obj['__ember_meta__'].listeners;
  var ret = [];

  if (listeners) {
    for (var eventName in listeners) {
      if (eventName !== '__source__' &&
          listeners[eventName]) {
        ret.push(eventName);
      }
    }
  }
  return ret;
}

/**
  Send an event. The execution of suspended listeners
  is skipped, and once listeners are removed. A listener without
  a target is executed on the passed object. If an array of actions
  is not passed, the actions stored on the passed object are invoked.

  @method sendEvent
  @for Ember
  @param obj
  @param {String} eventName
  @param {Array} params Optional parameters for each listener.
  @param {Array} actions Optional array of actions (listeners).
  @return true
  @public
*/
export function sendEvent(obj, eventName, params, actions) {
  if (!actions) {
    var meta = obj['__ember_meta__'];
    actions = meta && meta.listeners && meta.listeners[eventName];
  }

  if (!actions) { return; }

  for (var i = actions.length - 3; i >= 0; i -= 3) { // looping in reverse for once listeners
    var target = actions[i];
    var method = actions[i + 1];
    var flags = actions[i + 2];

    if (!method) { continue; }
    if (flags & SUSPENDED) { continue; }
    if (flags & ONCE) { removeListener(obj, eventName, target, method); }
    if (!target) { target = obj; }
    if ('string' === typeof method) {
      if (params) {
        applyStr(target, method, params);
      } else {
        target[method]();
      }
    } else {
      if (params) {
        apply(target, method, params);
      } else {
        method.call(target);
      }
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
export function hasListeners(obj, eventName) {
  var meta = obj['__ember_meta__'];
  var actions = meta && meta.listeners && meta.listeners[eventName];

  return !!(actions && actions.length);
}

/**
  @private
  @method listenersFor
  @for Ember
  @param obj
  @param {String} eventName
*/
export function listenersFor(obj, eventName) {
  var ret = [];
  var meta = obj['__ember_meta__'];
  var actions = meta && meta.listeners && meta.listeners[eventName];

  if (!actions) { return ret; }

  for (var i = 0, l = actions.length; i < l; i += 3) {
    var target = actions[i];
    var method = actions[i + 1];
    ret.push([target, method]);
  }

  return ret;
}

/**
  Define a property as a function that should be executed when
  a specified event or events are triggered.


  ``` javascript
  var Job = Ember.Object.extend({
    logCompleted: Ember.on('completed', function() {
      console.log('Job completed!');
    })
  });

  var job = Job.create();

  Ember.sendEvent(job, 'completed'); // Logs 'Job completed!'
 ```

  @method on
  @for Ember
  @param {String} eventNames*
  @param {Function} func
  @return func
  @public
*/
export function on(...args) {
  var func = args.pop();
  var events = args;
  func.__ember_listens__ = events;
  return func;
}

export {
  removeListener
};
