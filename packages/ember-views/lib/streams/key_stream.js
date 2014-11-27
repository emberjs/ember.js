import Ember from 'ember-metal/core';

import merge from "ember-metal/merge";
import { create } from "ember-metal/platform";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import {
  addObserver,
  removeObserver
} from "ember-metal/observer";
import Stream from "ember-metal/streams/stream";
import { read } from "ember-metal/streams/utils";

function KeyStream(source, key) {
  Ember.assert("KeyStream error: key must be a non-empty string", typeof key === 'string' && key.length > 0);
  Ember.assert("KeyStream error: key must not have a '.'", key.indexOf('.') === -1);

  this.init();
  this.source = source;
  this.obj = undefined;
  this.key = key;

  if (source && source.isStream) {
    source.subscribe(this._didChange, this);
  }
}

KeyStream.prototype = create(Stream.prototype);

merge(KeyStream.prototype, {
  valueFn: function() {
    var prevObj = this.obj;
    var nextObj = read(this.source);

    if (nextObj !== prevObj) {
      if (prevObj && typeof prevObj === 'object') {
        removeObserver(prevObj, this.key, this, this._didChange);
      }

      if (nextObj && typeof nextObj === 'object') {
        addObserver(nextObj, this.key, this, this._didChange);
      }

      this.obj = nextObj;
    }

    if (nextObj) {
      return get(nextObj, this.key);
    }
  },

  setValue: function(value) {
    if (this.obj) {
      set(this.obj, this.key, value);
    }
  },

  setSource: function(nextSource) {
    Ember.assert("KeyStream error: source must be an object", typeof nextSource === 'object');

    var prevSource = this.source;

    if (nextSource !== prevSource) {
      if (prevSource && prevSource.isStream) {
        prevSource.unsubscribe(this._didChange, this);
      }

      if (nextSource && nextSource.isStream) {
        nextSource.subscribe(this._didChange, this);
      }

      this.source = nextSource;
      this.notify();
    }
  },

  _didChange: function() {
    this.notify();
  },

  _super$destroy: Stream.prototype.destroy,

  destroy: function() {
    if (this._super$destroy()) {
      if (this.source && this.source.isStream) {
        this.source.unsubscribe(this._didChange, this);
      }

      if (this.obj && typeof this.obj === 'object') {
        removeObserver(this.obj, this.key, this, this._didChange);
      }

      this.source = undefined;
      this.obj = undefined;
      return true;
    }
  }
});

export default KeyStream;

// The transpiler does not resolve cycles, so we export
// the `_makeChildStream` method onto `Stream` here.

Stream.prototype._makeChildStream = function(key) {
  return new KeyStream(this, key);
};
