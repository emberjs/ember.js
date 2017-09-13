import { inspect } from 'ember-utils';
import { assert, Error as EmberError } from 'ember-debug';
import { get } from './property_get';
import { set } from './property_set';
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

const CONSUMED = {};

export default function alias(altKey) {
  return new AliasedProperty(altKey);
}

export class AliasedProperty extends Descriptor {
  constructor(altKey) {
    super();
    this.isDescriptor = true;
    this.altKey = altKey;
    this._dependentKeys = [altKey];
  }

  setup(obj, keyName) {
    assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);
    let meta = metaFor(obj);
    if (meta.peekWatching(keyName)) {
      addDependentKeys(this, obj, keyName, meta);
    }
  }

  teardown(obj, keyName, meta) {
    if (meta.peekWatching(keyName)) {
      removeDependentKeys(this, obj, keyName, meta);
    }
  }

  willWatch(obj, keyName) {
    addDependentKeys(this, obj, keyName, metaFor(obj));
  }

  didUnwatch(obj, keyName) {
    removeDependentKeys(this, obj, keyName, metaFor(obj));
  }

  get(obj, keyName) {
    let ret = get(obj, this.altKey);
    let meta = metaFor(obj);
    let cache = meta.writableCache();
    if (cache[keyName] !== CONSUMED) {
      cache[keyName] = CONSUMED;
      addDependentKeys(this, obj, keyName, meta);
    }
    return ret;
  }

  set(obj, keyName, value) {
    return set(obj, this.altKey, value);
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
