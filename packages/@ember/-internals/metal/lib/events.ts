/**
@module @ember/object
*/
import { Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { setListeners } from '@ember/-internals/utils';
import { assert } from '@ember/debug';

/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:change": [ // variable name: `actions`
            target, method, once
          ]
        }
      }

*/

/**
  Add an event listener

  @method addListener
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Boolean} once A flag whether a function should only be called once
  @public
*/
export function addListener(
  obj: object,
  eventName: string,
  target: object | Function | null,
  method?: Function | string,
  once?: boolean
) {
  assert('You must pass at least an object and event name to addListener', !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  metaFor(obj).addToListeners(eventName, target, method!, once === true);
}

/**
  Remove an event listener

  Arguments should match those passed to `addListener`.

  @method removeListener
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @public
*/
export function removeListener(
  obj: object,
  eventName: string,
  target: object | null,
  method?: Function | string
) {
  assert('You must pass at least an object and event name to removeListener', !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  metaFor(obj).removeFromListeners(eventName, target, method!);
}

/**
  Send an event. The execution of suspended listeners
  is skipped, and once listeners are removed. A listener without
  a target is executed on the passed object. If an array of actions
  is not passed, the actions stored on the passed object are invoked.

  @method sendEvent
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @param {Array} params Optional parameters for each listener.
  @return true
  @public
*/
export function sendEvent(
  obj: object,
  eventName: string,
  params: any[],
  actions?: any[],
  _meta?: Meta
) {
  if (actions === undefined) {
    let meta = _meta === undefined ? peekMeta(obj) : _meta;
    actions = typeof meta === 'object' && meta !== null && meta.matchingListeners(eventName);
  }

  if (actions === undefined || actions.length === 0) {
    return false;
  }

  for (let i = actions.length - 3; i >= 0; i -= 3) {
    // looping in reverse for once listeners
    let target = actions[i] as any | null;
    let method = actions[i + 1] as string | Function;
    let once = actions[i + 2] as boolean;

    if (!method) {
      continue;
    }
    if (once) {
      removeListener(obj, eventName, target, method);
    }
    if (!target) {
      target = obj;
    }
    if ('string' === typeof method) {
      method = target[method] as Function;
    }

    method.apply(target, params);
  }
  return true;
}

/**
  @private
  @method hasListeners
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
*/
export function hasListeners(obj: object, eventName: string) {
  let meta = peekMeta(obj);
  if (meta === null) {
    return false;
  }
  let matched = meta.matchingListeners(eventName);
  return matched !== undefined && matched.length > 0;
}

/**
  Define a property as a function that should be executed when
  a specified event or events are triggered.

  ``` javascript
  import EmberObject from '@ember/object';
  import { on } from '@ember/object/evented';
  import { sendEvent } from '@ember/object/events';

  let Job = EmberObject.extend({
    logCompleted: on('completed', function() {
      console.log('Job completed!');
    })
  });

  let job = Job.create();

  sendEvent(job, 'completed'); // Logs 'Job completed!'
 ```

  @method on
  @static
  @for @ember/object/evented
  @param {String} eventNames*
  @param {Function} func
  @return func
  @public
*/
export function on(...args: Array<string | Function>) {
  let func = args.pop() as Function;
  let events = args as string[];

  assert('on expects function as last argument', typeof func === 'function');
  assert(
    'on called without valid event names',
    events.length > 0 && events.every(p => typeof p === 'string' && p.length > 0)
  );

  setListeners(func, events);
  return func;
}
