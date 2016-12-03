import { inspect } from 'ember-utils';
import { assert } from './debug';
import { get } from './property_get';
import { set } from './property_set';
import EmberError from './error';
import {
  Descriptor,
  defineProperty
} from './properties';
import { ComputedProperty } from './computed';
import { meta as metaFor } from './meta';
import {
  addDependentKeys,
  removeDependentKeys
} from './dependent_keys';

export default function alias(altKey) {
  return new AliasedProperty(altKey);
}

export class AliasedProperty extends Descriptor {
  constructor(altKey) {
    super();
    this.altKey = altKey;
    this._dependentKeys = [altKey];
  }

  setup(obj, keyName, isWatching, meta) {
    assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);

    super.setup(obj, keyName, isWatching);

    if (isWatching) {
      addDependentKeys(this, obj, keyName, meta);
    }
  }

  teardown(obj, keyName, isWatching, meta) {
    if (isWatching) {
      removeDependentKeys(this, obj, keyName, meta);
    }
  }

  get(obj, keyName) {
    return get(obj, this.altKey);
  }

  set(obj, keyName, value) {
    return set(obj, this.altKey, value);
  }

  willWatch(obj, keyName) {
    addDependentKeys(this, obj, keyName, meta(obj));
  }

  didUnwatch(obj, keyName) {
    removeDependentKeys(this, obj, keyName, meta(obj));
  }

  readOnly() {
    this.set = AliasedProperty_readOnlySet;
    return this;
  }

  oneWay() {
    this.set = AliasedProperty_oneWaySet;
    return this;
  }
}

function AliasedProperty_readOnlySet(obj, keyName, value) {
  throw new EmberError(`Cannot set read-only property '${keyName}' on object: ${inspect(obj)}`);
}

function AliasedProperty_oneWaySet(obj, keyName, value) {
  defineProperty(obj, keyName, null);
  return set(obj, keyName, value);
}

// Backwards compatibility with Ember Data.
AliasedProperty.prototype._meta = undefined;
AliasedProperty.prototype.meta = ComputedProperty.prototype.meta;
