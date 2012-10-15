/**
  @class Ember.Instrumentation

  The purpose of the Ember Instrumentation module is
  to provide efficient, general-purpose instrumentation
  for Ember.

  Subscribe to a listener by using `Ember.subscribe`:

      Ember.subscribe("render", {
        before: function(name, timestamp, payload) {

        },

        after: function(name, timestamp, payload) {

        }
      });

  If you return a value from the `before` callback, that same
  value will be passed as a fourth parameter to the `after`
  callback.

  Instrument a block of code by using `Ember.instrument`:

      Ember.instrument("render.handlebars", payload, function() {
        // rendering logic
      }, binding);

  Event names passed to `Ember.instrument` are namespaced
  by periods, from more general to more specific. Subscribers
  can listen for events by whatever level of granularity they
  are interested in.

  In the above example, the event is `render.handlebars`,
  and the subscriber listened for all events beginning with
  `render`. It would receive callbacks for events named
  `render`, `render.handlebars`, `render.container`, or
  even `render.handlebars.layout`.
*/
Ember.Instrumentation = {};

var subscribers = [], cache = {};

var populateListeners = function(name) {
  var listeners = [], subscriber;

  for (var i=0, l=subscribers.length; i<l; i++) {
    subscriber = subscribers[i];
    if (subscriber.regex.test(name)) {
      listeners.push(subscriber.object);
    }
  }

  cache[name] = listeners;
  return listeners;
};

Ember.Instrumentation.instrument = function(name, payload, callback, binding) {
  var listeners = cache[name];

  if (!listeners) {
    listeners = populateListeners(name);
  }

  if (listeners.length === 0) { return; }

  var beforeValues = [], listener, i, l;

  try {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      beforeValues[i] = listener.before(name, new Date(), payload);
    }

    callback.call(binding);
  } catch(e) {
    payload = payload || {};
    payload.exception = e;
  } finally {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      listener.after(name, new Date(), payload, beforeValues[i]);
    }
  }
};

Ember.Instrumentation.subscribe = function(pattern, object) {
  var paths = pattern.split("."), path, regex = "^";

  for (var i=0, l=paths.length; i<l; i++) {
    path = paths[i];
    if (path === "*") {
      regex = regex + "[^\\.]*";
    } else {
      regex = regex + path;
    }
  }

  regex = regex + "(\\..*)?";

  var subscriber = {
    pattern: pattern,
    regex: new RegExp(regex + "$"),
    object: object
  };

  subscribers.push(subscriber);
  cache = {};

  return subscriber;
};

Ember.Instrumentation.unsubscribe = function(subscriber) {
  var index;

  for (var i=0, l=subscribers.length; i<l; i++) {
    if (subscribers[i] === subscriber) {
      index = i;
    }
  }

  subscribers.splice(index, 1);
  cache = {};
};

Ember.Instrumentation.reset = function() {
  subscribers = [];
  cache = {};
};

Ember.instrument = Ember.Instrumentation.instrument;
Ember.subscribe = Ember.Instrumentation.subscribe;
