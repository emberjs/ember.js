import create from "ember-metal/platform/create";
import {
  getFirstKey,
  getTailPath
} from "ember-metal/path_cache";

/**
@module ember-metal
*/

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

  init: function() {
    this.state = 'dirty';
    this.cache = undefined;
    this.subscribers = undefined;
    this.children = undefined;
    this._label = undefined;
  },

  get: function(path) {
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

  value: function() {
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

  valueFn: function() {
    throw new Error("Stream error: valueFn not implemented");
  },

  setValue: function() {
    throw new Error("Stream error: setValue not implemented");
  },

  notify: function() {
    this.notifyExcept();
  },

  notifyExcept: function(callbackToSkip, contextToSkip) {
    if (this.state === 'clean') {
      this.state = 'dirty';
      this._notifySubscribers(callbackToSkip, contextToSkip);
    }
  },

  subscribe: function(callback, context) {
    if (this.subscribers === undefined) {
      this.subscribers = [callback, context];
    } else {
      this.subscribers.push(callback, context);
    }
  },

  unsubscribe: function(callback, context) {
    var subscribers = this.subscribers;

    if (subscribers !== undefined) {
      for (var i = 0, l = subscribers.length; i < l; i += 2) {
        if (subscribers[i] === callback && subscribers[i+1] === context) {
          subscribers.splice(i, 2);
          return;
        }
      }
    }
  },

  _notifySubscribers: function(callbackToSkip, contextToSkip) {
    var subscribers = this.subscribers;

    if (subscribers !== undefined) {
      for (var i = 0, l = subscribers.length; i < l; i += 2) {
        var callback = subscribers[i];
        var context = subscribers[i+1];

        if (callback === callbackToSkip && context === contextToSkip) {
          continue;
        }

        if (context === undefined) {
          callback(this);
        } else {
          callback.call(context, this);
        }
      }
    }
  },

  destroy: function() {
    if (this.state !== 'destroyed') {
      this.state = 'destroyed';

      var children = this.children;
      for (var key in children) {
        children[key].destroy();
      }

      return true;
    }
  },

  isGlobal: function() {
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
