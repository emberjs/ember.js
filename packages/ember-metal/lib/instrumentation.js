import Ember from "ember-metal/core";
import { tryCatchFinally } from "ember-metal/utils";

/**
  The purpose of the Ember Instrumentation module is
  to provide efficient, general-purpose instrumentation
  for Ember.

  Subscribe to a listener by using `Ember.subscribe`:

  ```javascript
  Ember.subscribe("render", {
    before: function(name, timestamp, payload) {

    },

    after: function(name, timestamp, payload) {

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
*/
export var subscribers = [];
var cache = {};

var populateListeners = function(name) {
  var listeners = [];
  var subscriber;

  for (var i=0, l=subscribers.length; i<l; i++) {
    subscriber = subscribers[i];
    if (subscriber.regex.test(name)) {
      listeners.push(subscriber.object);
    }
  }

  cache[name] = listeners;
  return listeners;
};

var time = (function() {
  var perf = 'undefined' !== typeof window ? window.performance || {} : {};
  var fn = perf.now || perf.mozNow || perf.webkitNow || perf.msNow || perf.oNow;
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
  @param {Object} payload
  @param {Function} callback Function that you're instrumenting.
  @param {Object} binding Context that instrument function is called with.
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
  var payload = _payload || {};
  var finalizer = _instrumentStart(name, function () {
    return payload;
  });
  if (finalizer) {
    var tryable = function _instrumenTryable() {
      return callback.call(binding);
    };
    var catchable = function _instrumentCatchable(e) {
      payload.exception = e;
    };
    return tryCatchFinally(tryable, catchable, finalizer);
  } else {
    return callback.call(binding);
  }
}

// private for now
export function _instrumentStart(name, _payload) {
  var listeners = cache[name];

  if (!listeners) {
    listeners = populateListeners(name);
  }

  if (listeners.length === 0) {
    return;
  }

  var payload = _payload();

  var STRUCTURED_PROFILE = Ember.STRUCTURED_PROFILE;
  var timeName;
  if (STRUCTURED_PROFILE) {
    timeName = name + ": " + payload.object;
    console.time(timeName);
  }

  var l = listeners.length;
  var beforeValues = new Array(l);
  var i, listener;
  var timestamp = time();
  for (i=0; i<l; i++) {
    listener = listeners[i];
    beforeValues[i] = listener.before(name, timestamp, payload);
  }

  return function _instrumentEnd() {
    var i, l, listener;
    var timestamp = time();
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      listener.after(name, timestamp, payload, beforeValues[i]);
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
*/
export function subscribe(pattern, object) {
  var paths = pattern.split(".");
  var path;
  var regex = [];

  for (var i=0, l=paths.length; i<l; i++) {
    path = paths[i];
    if (path === "*") {
      regex.push("[^\\.]*");
    } else {
      regex.push(path);
    }
  }

  regex = regex.join("\\.");
  regex = regex + "(\\..*)?";

  var subscriber = {
    pattern: pattern,
    regex: new RegExp("^" + regex + "$"),
    object: object
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
*/
export function unsubscribe(subscriber) {
  var index;

  for (var i=0, l=subscribers.length; i<l; i++) {
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
*/
export function reset() {
  subscribers.length = 0;
  cache = {};
}
