import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import EmberError from 'ember-metal/error';
import {
  Descriptor,
  defineProperty
} from 'ember-metal/properties';
import { ComputedProperty } from 'ember-metal/computed';
import { inspect } from 'ember-metal/utils';
import { meta } from 'ember-metal/meta';
import {
  addDependentKeys,
  removeDependentKeys
} from 'ember-metal/dependent_keys';

export default function alias(altKey) {
  return new AliasedProperty(altKey);
}

export function AliasedProperty(altKey) {
  this.isDescriptor = true;
  this.altKey = altKey;
  this._dependentKeys = [altKey];
}

AliasedProperty.prototype = Object.create(Descriptor.prototype);

AliasedProperty.prototype.get = function AliasedProperty_get(obj, keyName) {
  return get(obj, this.altKey);
};

AliasedProperty.prototype.set = function AliasedProperty_set(obj, keyName, value) {
  return set(obj, this.altKey, value);
};

AliasedProperty.prototype.willWatch = function(obj, keyName) {
  addDependentKeys(this, obj, keyName, meta(obj));
};

AliasedProperty.prototype.didUnwatch = function(obj, keyName) {
  removeDependentKeys(this, obj, keyName, meta(obj));
};

AliasedProperty.prototype.setup = function(obj, keyName) {
  assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);
  var m = meta(obj);
  if (m.peekWatching(keyName)) {
    addDependentKeys(this, obj, keyName, m);
  }
};

AliasedProperty.prototype.teardown = function(obj, keyName) {
  var m = meta(obj);
  if (m.peekWatching(keyName)) {
    removeDependentKeys(this, obj, keyName, m);
  }
};

AliasedProperty.prototype.readOnly = function() {
  this.set = AliasedProperty_readOnlySet;
  return this;
};

function AliasedProperty_readOnlySet(obj, keyName, value) {
  throw new EmberError(`Cannot set read-only property '${keyName}' on object: ${inspect(obj)}`);
}

AliasedProperty.prototype.oneWay = function() {
  this.set = AliasedProperty_oneWaySet;
  return this;
};

function AliasedProperty_oneWaySet(obj, keyName, value) {
  defineProperty(obj, keyName, null);
  return set(obj, keyName, value);
}

// Backwards compatibility with Ember Data
AliasedProperty.prototype._meta = undefined;
AliasedProperty.prototype.meta = ComputedProperty.prototype.meta;
