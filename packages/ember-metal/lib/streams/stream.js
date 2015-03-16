import create from "ember-metal/platform/create";
import {
  getFirstKey,
  getTailPath
} from "ember-metal/path_cache";
import Ember from "ember-metal/core";

/**
@module ember-metal
*/

function Subscriber(callback, context) {
  this.next = null;
  this.prev = null;
  this.callback = callback;
  this.context = context;
}

Subscriber.prototype.removeFrom = function(stream) {
  var next = this.next;
  var prev = this.prev;

  if (prev) {
    prev.next = next;
  } else {
    stream.subscriberHead = next;
  }

  if (next) {
    next.prev = prev;
  } else {
    stream.subscriberTail = prev;
  }

  stream.maybeDeactivate();
};

function Dependency(dependent, stream, callback, context) {
  this.next = null;
  this.prev = null;
  this.dependent = dependent;
  this.stream = stream;
  this.callback = callback;
  this.context = context;
  this.unsubscription = null;
}

Dependency.prototype.subscribe = function() {
  this.unsubscribe = this.stream.subscribe(this.callback, this.context);
};

Dependency.prototype.unsubscribe = function() {
  this.unsubscription();
  this.unsubscription = null;
};

Dependency.prototype.removeFrom = function(stream) {
  var next = this.next;
  var prev = this.prev;

  if (prev) {
    prev.next = next;
  } else {
    stream.dependencyHead = next;
  }

  if (next) {
    next.prev = prev;
  } else {
    stream.dependencyTail = prev;
  }

  if (this.unsubscription) {
    this.unsubscribe();
  }
};

Dependency.prototype.replace = function(stream, callback, context) {
  if (!stream.isStream) {
    this.stream = null;
    this.callback = null;
    this.context = null;
    this.removeFrom(this.dependent);
    return null;
  }

  this.stream = stream;
  this.callback = callback;
  this.context = context;

  if (this.unsubscription) {
    this.unsubscribe();
    this.subscribe();
  }

  return this;
};

/**
  @public
  @class Stream
  @namespace Ember.stream
  @constructor
*/
function Stream(fn) {
  this.init();
  this.compute = fn;
}

var KeyStream;

Stream.prototype = {
  isStream: true,

  init() {
    this.state = 'inactive';
    this.cache = undefined;
    this.subscriberHead = null;
    this.subscriberTail = null;
    this.children = undefined;
    this.dependencies = undefined;
    this._label = undefined;
  },

  _makeChildStream(key) {
    KeyStream = KeyStream || Ember.__loader.require('ember-metal/streams/key-stream').default;
    return new KeyStream(this, key);
  },

  removeChild(key) {
    delete this.children[key];
  },

  getKey(key) {
    if (this.children === undefined) {
      this.children = create(null);
    }

    var keyStream = this.children[key];

    if (keyStream === undefined) {
      keyStream = this._makeChildStream(key);
      this.children[key] = keyStream;
    }

    return keyStream;
  },

  get(path) {
    var firstKey = getFirstKey(path);
    var tailPath = getTailPath(path);

    if (this.children === undefined) {
      this.children = create(null);
    }

    var keyStream = this.children[firstKey];

    if (keyStream === undefined) {
      keyStream = this._makeChildStream(firstKey, path);
      this.children[firstKey] = keyStream;
    }

    if (tailPath === undefined) {
      return keyStream;
    } else {
      return keyStream.get(tailPath);
    }
  },

  value() {
    if (this.state === 'inactive') {
      return this.compute();
    } else if (this.state === 'clean') {
      return this.cache;
    } else if (this.state === 'dirty') {
      var value = this.compute();
      this.state = 'clean';
      return this.cache = this.valueFn();
    }
    // TODO: Ensure value is never called on a destroyed stream
    // so that we can uncomment this assertion.
    //
    // Ember.assert("Stream error: value was called in an invalid state: " + this.state);
  },

  addDependency(stream, callback, context) {
    if (!stream || !stream.isStream) {
      return null;
    }

    if (callback === undefined) {
      callback = this.notify;
      context = this;
    }

    var dependency = new Dependency(this, stream, callback, context);

    if (this.isActive) {
      dependency.subscribe();
    }

    if (this.dependencyHead === null) {
      this.dependencyHead = this.dependencyTail = dependency;
    } else {
      var tail = this.dependencyTail;
      tail.next = dependency;
      dependency.prev = tail;
      this.dependencyTail = dependency;
    }

    return dependency;
  },

  subscribeDependencies() {
    var dependency = this.dependencyHead;
    while (dependency) {
      var next = dependency.next;
      dependency.subscribe();
      dependency = next;
    }
  },

  unsubscribeDependencies() {
    var dependency = this.dependencyHead;
    while (dependency) {
      var next = dependency.next;
      dependency.unsubscribe();
      dependency = next;
    }
  },

  becameActive() {},
  becameInactive() {},

  maybeActivate() {
    if (this.subscriberHead && !this.isActive) {
      this.subscribeDependencies();
      this.state = 'dirty';
      this.becameActive();
    }
  },

  maybeDeactivate() {
    if (!this.subscriberHead && this.isActive) {
      this.isActive = false;
      this.unsubscribeDependencies();
      this.state = 'inactive';
      this.becameInactive();
    }
  },

  update(callback) {
    if (this.state !== 'inactive') {
      this.becameInactive();
    }

    callback.call(this);

    if (this.state !== 'inactive') {
      this.becameActive();
    }
  },

  compute() {
    throw new Error("Stream error: compute not implemented");
  },

  setValue() {
    throw new Error("Stream error: setValue not implemented");
  },

  notify() {
    this.notifyExcept();
  },

  notifyExcept(callbackToSkip, contextToSkip) {
    if (this.state === 'clean') {
      this.state = 'dirty';
      this._notifySubscribers(callbackToSkip, contextToSkip);
    }
  },

  subscribe(callback, context) {
    Ember.assert("You tried to subscribe to a stream but the callback provided was not a function.", typeof callback === 'function');

    var subscriber = new Subscriber(callback, context, this);
    if (this.subscriberHead === null) {
      this.subscriberHead = this.subscriberTail = subscriber;
    } else {
      var tail = this.subscriberTail;
      tail.next = subscriber;
      subscriber.prev = tail;
      this.subscriberTail = subscriber;
    }

    var stream = this;
    return function(prune) {
      subscriber.removeFrom(stream);
      if (prune) { stream.prune(); }
    };
  },

  prune() {
    if (this.subscriberHead === null) {
      this.destroy(true);
    }
  },

  unsubscribe(callback, context) {
    var subscriber = this.subscriberHead;

    while (subscriber) {
      var next = subscriber.next;
      if (subscriber.callback === callback && subscriber.context === context) {
        subscriber.removeFrom(this);
      }
      subscriber = next;
    }
  },

  _notifySubscribers(callbackToSkip, contextToSkip) {
    var subscriber = this.subscriberHead;

    while (subscriber) {
      var next = subscriber.next;

      var callback = subscriber.callback;
      var context = subscriber.context;

      subscriber = next;

      if (callback === callbackToSkip && context === contextToSkip) {
        continue;
      }

      if (context === undefined) {
        callback(this);
      } else {
        callback.call(context, this);
      }
    }
  },

  destroy(prune) {
    if (this.state !== 'destroyed') {
      this.state = 'destroyed';

      this.subscriberHead = this.subscriberTail = null;
      this.maybeDeactivate();

      var dependencies = this.dependencies;

      if (dependencies) {
        for (var i=0, l=dependencies.length; i<l; i++) {
          dependencies[i](prune);
        }
      }

      this.dependencies = null;
      return true;
    }
  }
};

Stream.wrap = function(value, Kind, param) {
  if (value.isStream) {
    return value;
  } else {
    return new Kind(value, param);
  }
};

export default Stream;
