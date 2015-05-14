import create from "ember-metal/platform/create";
import {
  getFirstKey,
  getTailPath
} from "ember-metal/path_cache";

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
};

/*
  @public
  @class Stream
  @namespace Ember.stream
  @constructor
*/
function Stream(fn) {
  this.init();
  this.valueFn = fn;
}

Stream.prototype = {
  isStream: true,

  init() {
    this.state = 'dirty';
    this.cache = undefined;
    this.subscriberHead = null;
    this.subscriberTail = null;
    this.children = undefined;
    this._label = undefined;
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
    if (this.state === 'clean') {
      return this.cache;
    } else if (this.state === 'dirty') {
      this.state = 'clean';
      return this.cache = this.valueFn();
    }
    // TODO: Ensure value is never called on a destroyed stream
    // so that we can uncomment this assertion.
    //
    // Ember.assert("Stream error: value was called in an invalid state: " + this.state);
  },

  valueFn() {
    throw new Error("Stream error: valueFn not implemented");
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
    return function() { subscriber.removeFrom(stream); };
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

  destroy() {
    if (this.state !== 'destroyed') {
      this.state = 'destroyed';

      var children = this.children;
      for (var key in children) {
        children[key].destroy();
      }

      this.subscriberHead = this.subscriberTail = null;

      return true;
    }
  },

  isGlobal() {
    var stream = this;
    while (stream !== undefined) {
      if (stream._isRoot) {
        return stream._isGlobal;
      }
      stream = stream.source;
    }
  }
};

export default Stream;
