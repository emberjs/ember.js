import Ember from 'ember-metal/core';
import merge from 'ember-metal/merge';
import { debugSeal, assert } from 'ember-metal/debug';
import { getFirstKey, getTailPath } from 'ember-metal/path_cache';
import { addObserver, removeObserver } from 'ember-metal/observer';
import { isStream } from 'ember-metal/streams/utils';
import EmptyObject from 'ember-metal/empty_object';
import Subscriber from 'ember-metal/streams/subscriber';
import Dependency from 'ember-metal/streams/dependency';

/**
  @module ember-metal
*/

/**
  @private
  @class Stream
  @namespace Ember.stream
  @constructor
*/
function BasicStream(label) {
  this._init(label);
}

var KeyStream;
var ProxyMixin;

BasicStream.prototype = {
  isStream: true,

  _init(label) {
    this.label = makeLabel(label);
    this.isActive = false;
    this.isDirty = true;
    this.isDestroyed = false;
    this.cache = undefined;
    this.children = undefined;
    this.subscriberHead = null;
    this.subscriberTail = null;
    this.dependencyHead = null;
    this.dependencyTail = null;
    this.observedProxy = null;
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
      this.children = new EmptyObject();
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
      this.children = new EmptyObject();
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
    // TODO: Ensure value is never called on a destroyed stream
    // so that we can uncomment this assertion.
    //
    // assert("Stream error: value was called after the stream was destroyed", !this.isDestroyed);

    // TODO: Remove this block. This will require ensuring we are
    // not treating streams as "volatile" anywhere.
    if (!this.isActive) {
      this.isDirty = true;
    }

    var willRevalidate = false;

    if (!this.isActive && this.subscriberHead) {
      this.activate();
      willRevalidate = true;
    }

    if (this.isDirty) {
      if (this.isActive) {
        willRevalidate = true;
      }

      this.cache = this.compute();
      this.isDirty = false;
    }

    if (willRevalidate) {
      this.revalidate(this.cache);
    }

    return this.cache;
  },

  addMutableDependency(object) {
    var dependency = new Dependency(this, object);

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

  addDependency(object) {
    if (isStream(object)) {
      this.addMutableDependency(object);
    }
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

  maybeDeactivate() {
    if (!this.subscriberHead && this.isActive) {
      this.isActive = false;
      this.unsubscribeDependencies();
      this.deactivate();
    }
  },

  activate() {
    this.isActive = true;
    this.subscribeDependencies();
  },

  revalidate(value) {
    if (value !== this.observedProxy) {
      this._clearObservedProxy();

      ProxyMixin = ProxyMixin || Ember.__loader.require('ember-runtime/mixins/-proxy').default;

      if (ProxyMixin.detect(value)) {
        addObserver(value, 'content', this, this.notify);
        this.observedProxy = value;
      }
    }
  },

  _clearObservedProxy() {
    if (this.observedProxy) {
      removeObserver(this.observedProxy, 'content', this, this.notify);
      this.observedProxy = null;
    }
  },

  deactivate() {
    this._clearObservedProxy();
  },

  compute() {
    throw new Error('Stream error: compute not implemented');
  },

  setValue() {
    throw new Error('Stream error: setValue not implemented');
  },

  notify() {
    this.notifyExcept();
  },

  notifyExcept(callbackToSkip, contextToSkip) {
    if (!this.isDirty) {
      this.isDirty = true;
      this.notifySubscribers(callbackToSkip, contextToSkip);
    }
  },

  subscribe(callback, context) {
    assert('You tried to subscribe to a stream but the callback provided was not a function.', typeof callback === 'function');

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

  notifySubscribers(callbackToSkip, contextToSkip) {
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
    if (!this.isDestroyed) {
      this.isDestroyed = true;

      this.subscriberHead = this.subscriberTail = null;
      this.maybeDeactivate();

      var dependencies = this.dependencies;

      if (dependencies) {
        for (var i = 0, l = dependencies.length; i < l; i++) {
          dependencies[i](prune);
        }
      }

      return true;
    }
  }
};

BasicStream.extend = function(object) {
  let Child = function(...args) {
    this._init();
    this.init(...args);

    debugSeal(this);
  };

  Child.prototype = Object.create(this.prototype);

  merge(Child.prototype, object);
  Child.extend = BasicStream.extend;
  return Child;
};

var Stream = BasicStream.extend({
  init(fn, label) {
    this._compute = fn;
    this.label = label;
  },

  compute() {
    return this._compute();
  }
});

export function wrap(value, Kind, param) {
  if (isStream(value)) {
    return value;
  } else {
    return new Kind(value, param);
  }
}

function makeLabel(label) {
  if (label === undefined) {
    return '(no label)';
  } else {
    return label;
  }
}

export default BasicStream;
export { Stream };
