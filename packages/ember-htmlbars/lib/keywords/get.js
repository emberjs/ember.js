import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import Stream from 'ember-metal/streams/stream';
import KeyStream from 'ember-metal/streams/key-stream';
import { isStream } from 'ember-metal/streams/utils';
import merge from 'ember-metal/merge';
import subscribe from 'ember-htmlbars/utils/subscribe';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import {
  addObserver,
  removeObserver
} from 'ember-metal/observer';

function labelFor(source, key) {
  const sourceLabel = source.label ? source.label : '';
  const keyLabel = key.label ? key.label : '';
  return `(get ${sourceLabel} ${keyLabel})`;
}

if (isEnabled('ember-htmlbars-get-helper')) {
  const buildStream = function buildStream(params) {
    const [objRef, pathRef] = params;

    Ember.assert('The first argument to {{get}} must be a stream', isStream(objRef));
    Ember.assert('{{get}} requires at least two arguments', params.length > 1);

    const stream = new DynamicKeyStream(objRef, pathRef);

    return stream;
  };

  var getKeyword = function getKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
    if (!morph) {
      return buildStream(params);
    } else {
      let stream;
      if (morph.linkedResult) {
        stream = morph.linkedResult;
      } else {
        stream = buildStream(params);

        subscribe(morph, env, scope, stream);
        env.hooks.linkRenderNode(morph, env, scope, null, params, hash);

        morph.linkedResult = stream;
      }
      env.hooks.range(morph, env, scope, null, stream, visitor);
    }

    return true;
  };

  var DynamicKeyStream = function DynamicKeyStream(source, keySource) {
    if (!isStream(keySource)) {
      return new KeyStream(source, keySource);
    }
    Ember.assert('DynamicKeyStream error: source must be a stream', isStream(source)); // TODO: This isn't necessary.

    // used to get the original path for debugging and legacy purposes
    var label = labelFor(source, keySource);

    this.init(label);
    this.path = label;
    this.sourceDep = this.addMutableDependency(source);
    this.keyDep = this.addMutableDependency(keySource);
    this.observedObject = null;
    this.observedKey = null;
  };

  DynamicKeyStream.prototype = Object.create(KeyStream.prototype);

  merge(DynamicKeyStream.prototype, {
    key() {
      const key = this.keyDep.getValue();
      if (typeof key === 'string') {
        Ember.assert('DynamicKeyStream error: key must not have a \'.\'', key.indexOf('.') === -1);
        return key;
      }
    },

    compute() {
      var object = this.sourceDep.getValue();
      var key = this.key();
      if (object && key) {
        return get(object, key);
      }
    },

    setValue(value) {
      var object = this.sourceDep.getValue();
      var key = this.key();
      if (object) {
        set(object, key, value);
      }
    },

    _super$revalidate: Stream.prototype.revalidate,

    revalidate(value) {
      this._super$revalidate(value);

      var object = this.sourceDep.getValue();
      var key = this.key();
      if (object !== this.observedObject || key !== this.observedKey) {
        this._clearObservedObject();

        if (object && typeof object === 'object' && key) {
          addObserver(object, key, this, this.notify);
          this.observedObject = object;
          this.observedKey = key;
        }
      }
    },

    _clearObservedObject() {
      if (this.observedObject) {
        removeObserver(this.observedObject, this.observedKey, this, this.notify);
        this.observedObject = null;
        this.observedKey = null;
      }
    }
  });
}

export default getKeyword;
