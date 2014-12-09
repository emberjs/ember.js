import { create } from "ember-metal/platform";
import {
  getFirstKey,
  getTailPath
} from "ember-metal/path_cache";

var NIL = function NIL(){};

function Stream(fn) {
  this.valueFn = fn;
  this.cache = NIL;
  this.subscribers = undefined;
  this.children = undefined;
  this.destroyed = false;
}

Stream.prototype = {
  isStream: true,

  cache: NIL,

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
    if (this.cache !== NIL) {
      return this.cache;
    } else {
      return this.cache = this.valueFn();
    }
  },

  setValue: function() {
    throw new Error("Stream error: setValue not implemented");
  },

  notify: function() {
    this.notifyExcept();
  },

  notifyExcept: function(callbackToSkip, contextToSkip) {
    if (this.cache !== NIL) {
      this.cache = NIL;
      this.notifySubscribers(callbackToSkip, contextToSkip);
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

  notifySubscribers: function(callbackToSkip, contextToSkip) {
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
    if (this.destroyed) return;
    this.destroyed = true;

    var children = this.children;
    for (var key in children) {
      children[key].destroy();
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
