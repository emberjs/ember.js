import Ember from 'ember-metal/core';

import merge from "ember-metal/merge";
import create from 'ember-metal/platform/create';
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import {
  addObserver,
  removeObserver
} from "ember-metal/observer";
import Stream from "ember-metal/streams/stream";
import { isStream, read } from "ember-metal/streams/utils";

function KeyStream(source, key) {
  Ember.assert("KeyStream error: source must be a stream", isStream(source));
  Ember.assert("KeyStream error: key must be a non-empty string", typeof key === 'string' && key.length > 0);
  Ember.assert("KeyStream error: key must not have a '.'", key.indexOf('.') === -1);

  // used to get the original path for debugging and legacy purposes
  var label = this.path = labelFor(source, key);

  this.init(label);
  this.source = source;
  this.dependency = this.addDependency(source);
  this.observedObject = undefined;
  this.key = key;
}

function labelFor(source, key) {
  return source.label ? source.label + '.' + key : key;
}

KeyStream.prototype = create(Stream.prototype);

merge(KeyStream.prototype, {
  compute() {
    var object = read(this.source);
    if (object) {
      return get(object, this.key);
    }
  },

  becameActive() {
    var object = read(this.source);
    if (object && typeof object === 'object') {
      addObserver(object, this.key, this, this.notify);
      this.observedObject = object;
    }
  },

  becameInactive() {
    if (this.observedObject) {
      removeObserver(this.observedObject, this.key, this, this.notify);
      this.observedObject = undefined;
    }
  },

  setValue(value) {
    var object = read(this.source);
    if (object) {
      set(object, this.key, value);
    }
  },

  setSource(nextSource) {
    Ember.assert("KeyStream error: source must be a stream", isStream(nextSource));

    var prevSource = this.source;

    if (nextSource !== prevSource) {
      this.update(function() {
        this.dependency.replace(nextSource);
        this.source = nextSource;
        this.label = labelFor(nextSource, this.key);
      });
    }

    this.notify();
  },

  _didChange: function() {
    this.notify();
  },

  _super$destroy: Stream.prototype.destroy,

  destroy() {
    if (this._super$destroy()) {
      if (isStream(this.source)) {
        this.source.unsubscribe(this._didChange, this);
      }

      if (this.obj && typeof this.obj === 'object') {
        removeObserver(this.obj, this.key, this, this._didChange);
      }

      this.source = undefined;
      return true;
    }
  }
});

export default KeyStream;
