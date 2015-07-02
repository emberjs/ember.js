import Ember from 'ember-metal/core';

import merge from 'ember-metal/merge';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import {
  addObserver,
  removeObserver
} from 'ember-metal/observer';
import Stream from 'ember-metal/streams/stream';
import { isStream  } from 'ember-metal/streams/utils';

function KeyStream(source, key) {
  Ember.assert('KeyStream error: source must be a stream', isStream(source)); // TODO: This isn't necessary.
  Ember.assert('KeyStream error: key must be a non-empty string', typeof key === 'string' && key.length > 0);
  Ember.assert('KeyStream error: key must not have a \'.\'', key.indexOf('.') === -1);

  // used to get the original path for debugging and legacy purposes
  var label = labelFor(source, key);

  this.init(label);
  this.path = label;
  this.sourceDep = this.addMutableDependency(source);
  this.observedObject = null;
  this.key = key;
}

function labelFor(source, key) {
  return source.label ? source.label + '.' + key : key;
}

KeyStream.prototype = Object.create(Stream.prototype);

merge(KeyStream.prototype, {
  compute() {
    var object = this.sourceDep.getValue();
    if (object) {
      return get(object, this.key);
    }
  },

  setValue(value) {
    var object = this.sourceDep.getValue();
    if (object) {
      set(object, this.key, value);
    }
  },

  setSource(source) {
    this.sourceDep.replace(source);
    this.notify();
  },

  _super$revalidate: Stream.prototype.revalidate,

  revalidate(value) {
    this._super$revalidate(value);

    var object = this.sourceDep.getValue();
    if (object !== this.observedObject) {
      this._clearObservedObject();

      var type = typeof object;
      if (object && (type === 'object' || type === 'function')) {
        addObserver(object, this.key, this, this.notify);
        this.observedObject = object;
      }
    }
  },

  _super$deactivate: Stream.prototype.deactivate,

  _clearObservedObject() {
    if (this.observedObject) {
      removeObserver(this.observedObject, this.key, this, this.notify);
      this.observedObject = null;
    }
  },

  deactivate() {
    this._super$deactivate();
    this._clearObservedObject();
  }
});

export default KeyStream;
