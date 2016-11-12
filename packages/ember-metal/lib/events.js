'no use strict';
// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed

/**
@module ember
@submodule ember-metal
*/
import { applyStr } from 'ember-utils';
import { assert } from './debug';
import { meta as metaFor, peekMeta } from './meta';
import { deprecate } from './debug';

import { ONCE, SUSPENDED } from './meta_listeners';


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
  let index = -1;
  // hashes are added to the end of the event array
  // so it makes sense to start searching at the end
  // of the array and search in reverse
  for (let i = array.length - 3; i >= 0; i -= 3) {
    if (target === array[i] && method === array[i + 1]) {
      index = i;
      break;
    }
  }
  return index;
}

export function accumulateListeners(obj, eventName, otherActions) {
  let meta = peekMeta(obj);
  if (!meta) { return; }
  let actions = meta.matchingListeners(eventName);
  let newActions = [];

  for (let i = actions.length - 3; i >= 0; i -= 3) {
    let target = actions[i];
    let method = actions[i + 1];
    let flags = actions[i + 2];
    let actionIndex = indexOf(otherActions, target, method);

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
  assert('You must pass at least an object and event name to Ember.addListener', !!obj && !!eventName);

  deprecate(
    `didInitAttrs called in ${obj && obj.toString && obj.toString()}.`,
    eventName !== 'didInitAttrs',
    {
      id: 'ember-views.did-init-attrs',
      until: '3.0.0',
      url: 'http://emberjs.com/deprecations/v2.x#toc_ember-component-didinitattrs'
    }
  );

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  let flags = 0;
  if (once) {
    flags |= ONCE;
  }

  metaFor(obj).addToListeners(eventName, target, method, flags);

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
export function removeListener(obj, eventName, target, method) {
  assert('You must pass at least an object and event name to Ember.removeListener', !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  metaFor(obj).removeFromListeners(eventName, target, method, (...args) => {
    if ('function' === typeof obj.didRemoveListener) {
      obj.didRemoveListener(...args);
    }
  });
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
  return suspendListeners(obj, [eventName], target, method, callback);
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
  return metaFor(obj).suspendListeners(eventNames, target, method, callback);
}

/**
  Return a list of currently watched events

  @private
  @method watchedEvents
  @for Ember
  @param obj
*/
export function watchedEvents(obj) {
  return metaFor(obj).watchedEvents();
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
    let meta = peekMeta(obj);
    actions = meta && meta.matchingListeners(eventName);
  }

  if (!actions || actions.length === 0) { return; }

  for (let i = actions.length - 3; i >= 0; i -= 3) { // looping in reverse for once listeners
    let target = actions[i];
    let method = actions[i + 1];
    let flags = actions[i + 2];

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
        method.apply(target, params);
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
  let meta = peekMeta(obj);
  if (!meta) { return false; }
  return meta.matchingListeners(eventName).length > 0;
}

/**
  @private
  @method listenersFor
  @for Ember
  @param obj
  @param {String} eventName
*/
export function listenersFor(obj, eventName) {
  let ret = [];
  let meta = peekMeta(obj);
  let actions = meta && meta.matchingListeners(eventName);

  if (!actions) { return ret; }

  for (let i = 0; i < actions.length; i += 3) {
    let target = actions[i];
    let method = actions[i + 1];
    ret.push([target, method]);
  }

  return ret;
}

/**
  Define a property as a function that should be executed when
  a specified event or events are triggered.


  ``` javascript
  let Job = Ember.Object.extend({
    logCompleted: Ember.on('completed', function() {
      console.log('Job completed!');
    })
  });

  let job = Job.create();

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
  let func = args.pop();
  let events = args;
  func.__ember_listens__ = events;
  return func;
}
