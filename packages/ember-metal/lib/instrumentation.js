/* eslint no-console:off */
/* global console */

import { ENV } from 'ember-environment';
import { isFeatureEnabled } from 'ember-debug';

/**
  The purpose of the Ember Instrumentation module is
  to provide efficient, general-purpose instrumentation
  for Ember.

  Subscribe to a listener by using `Ember.subscribe`:

  ```javascript
  Ember.subscribe("render", {
    before(name, timestamp, payload) {

    },

    after(name, timestamp, payload) {

    }
  });
  ```

  If you return a value from the `before` callback, that same
  value will be passed as a fourth parameter to the `after`
  callback.

  Instrument a block of code by using `Ember.instrument`:

  ```javascript
  Ember.instrument("render.handlebars", payload, function() {
    // rendering logic
  }, binding);
  ```

  Event names passed to `Ember.instrument` are namespaced
  by periods, from more general to more specific. Subscribers
  can listen for events by whatever level of granularity they
  are interested in.

  In the above example, the event is `render.handlebars`,
  and the subscriber listened for all events beginning with
  `render`. It would receive callbacks for events named
  `render`, `render.handlebars`, `render.container`, or
  even `render.handlebars.layout`.

  @class Instrumentation
  @namespace Ember
  @static
  @private
*/
export let subscribers = [];
let cache = {};

function populateListeners(name) {
  let listeners = [];
  let subscriber;

  for (let i = 0; i < subscribers.length; i++) {
    subscriber = subscribers[i];
    if (subscriber.regex.test(name)) {
      listeners.push(subscriber.object);
    }
  }

  cache[name] = listeners;
  return listeners;
}

const time = (() => {
  let perf = 'undefined' !== typeof window ? window.performance || {} : {};
  let fn = perf.now || perf.mozNow || perf.webkitNow || perf.msNow || perf.oNow;
  // fn.bind will be available in all the browsers that support the advanced window.performance... ;-)
  return fn ? fn.bind(perf) : () => {
    return +new Date();
  };
})();

/**
  Notifies event's subscribers, calls `before` and `after` hooks.

  @method instrument
  @namespace Ember.Instrumentation

  @param {String} [name] Namespaced event name.
  @param {Object} _payload
  @param {Function} callback Function that you're instrumenting.
  @param {Object} binding Context that instrument function is called with.
  @private
*/
export function instrument(name, _payload, callback, binding) {
  if (arguments.length <= 3 && typeof _payload === 'function') {
    binding = callback;
    callback = _payload;
    _payload = undefined;
  }
  if (subscribers.length === 0) {
    return callback.call(binding);
  }
  let payload = _payload || {};
  let finalizer = _instrumentStart(name, () => payload);

  if (finalizer) {
    return withFinalizer(callback, finalizer, payload, binding);
  } else {
    return callback.call(binding);
  }
}

let flaggedInstrument;
if (isFeatureEnabled('ember-improved-instrumentation')) {
  flaggedInstrument = instrument;
} else {
  flaggedInstrument = (name, payload, callback) => callback();
}
export { flaggedInstrument };

function withFinalizer(callback, finalizer, payload, binding) {
  let result;
  try {
    result = callback.call(binding);
  } catch (e) {
    payload.exception = e;
    result = payload;
  } finally {
    finalizer();
  }
  return result;
}

function NOOP() {}

// private for now
export function _instrumentStart(name, _payload, _payloadParam) {
  if (subscribers.length === 0) {
    return NOOP;
  }

  let listeners = cache[name];

  if (!listeners) {
    listeners = populateListeners(name);
  }

  if (listeners.length === 0) {
    return NOOP;
  }

  let payload = _payload(_payloadParam);

  let STRUCTURED_PROFILE = ENV.STRUCTURED_PROFILE;
  let timeName;
  if (STRUCTURED_PROFILE) {
    timeName = `${name}: ${payload.object}`;
    console.time(timeName);
  }

  let beforeValues = new Array(listeners.length);
  let i, listener;
  let timestamp = time();
  for (i = 0; i < listeners.length; i++) {
    listener = listeners[i];
    beforeValues[i] = listener.before(name, timestamp, payload);
  }

  return function _instrumentEnd() {
    let i, listener;
    let timestamp = time();
    for (i = 0; i < listeners.length; i++) {
      listener = listeners[i];
      if (typeof listener.after === 'function') {
        listener.after(name, timestamp, payload, beforeValues[i]);
      }
    }

    if (STRUCTURED_PROFILE) {
      console.timeEnd(timeName);
    }
  };
}

/**
  Subscribes to a particular event or instrumented block of code.

  @method subscribe
  @namespace Ember.Instrumentation

  @param {String} [pattern] Namespaced event name.
  @param {Object} [object] Before and After hooks.

  @return {Subscriber}
  @private
*/
export function subscribe(pattern, object) {
  let paths = pattern.split('.');
  let path;
  let regex = [];

  for (let i = 0; i < paths.length; i++) {
    path = paths[i];
    if (path === '*') {
      regex.push('[^\\.]*');
    } else {
      regex.push(path);
    }
  }

  regex = regex.join('\\.');
  regex = `${regex}(\\..*)?`;

  let subscriber = {
    pattern,
    regex: new RegExp(`^${regex}$`),
    object
  };

  subscribers.push(subscriber);
  cache = {};

  return subscriber;
}

/**
  Unsubscribes from a particular event or instrumented block of code.

  @method unsubscribe
  @namespace Ember.Instrumentation

  @param {Object} [subscriber]
  @private
*/
export function unsubscribe(subscriber) {
  let index;

  for (let i = 0; i < subscribers.length; i++) {
    if (subscribers[i] === subscriber) {
      index = i;
    }
  }

  subscribers.splice(index, 1);
  cache = {};
}

/**
  Resets `Ember.Instrumentation` by flushing list of subscribers.

  @method reset
  @namespace Ember.Instrumentation
  @private
*/
export function reset() {
  subscribers.length = 0;
  cache = {};
}
