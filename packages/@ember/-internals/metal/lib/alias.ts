import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { inspect } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { ComputedProperty } from './computed';
import { getCacheFor } from './computed_cache';
import {
  addDependentKeys,
  DescriptorWithDependentKeys,
  removeDependentKeys,
} from './dependent_keys';
import { defineProperty, Descriptor } from './properties';
import { get } from './property_get';
import { set } from './property_set';

const CONSUMED = Object.freeze({});

export default function alias(altKey: string): AliasedProperty {
  return new AliasedProperty(altKey);
}

export class AliasedProperty extends Descriptor implements DescriptorWithDependentKeys {
  readonly _dependentKeys: string[];
  readonly altKey: string;

  constructor(altKey: string) {
    super();
    this.altKey = altKey;
    this._dependentKeys = [altKey];
  }

  setup(obj: object, keyName: string): void {
    assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);
    super.setup(obj, keyName);
    let meta = metaFor(obj);
    if (meta.peekWatching(keyName) > 0) {
      addDependentKeys(this, obj, keyName, meta);
    }
  }

  teardown(obj: object, keyName: string, meta: Meta): void {
    if (meta.peekWatching(keyName) > 0) {
      removeDependentKeys(this, obj, keyName, meta);
    }
  }

  willWatch(obj: object, keyName: string, meta: Meta): void {
    addDependentKeys(this, obj, keyName, meta);
  }

  didUnwatch(obj: object, keyName: string, meta: Meta) {
    removeDependentKeys(this, obj, keyName, meta);
  }

  get(obj: object, keyName: string) {
    let ret = get(obj, this.altKey);
    let cache = getCacheFor(obj);
    if (cache.get(keyName) !== CONSUMED) {
      let meta = metaFor(obj);
      cache.set(keyName, CONSUMED);
      addDependentKeys(this, obj, keyName, meta);
    }
    return ret;
  }

  set(obj: object, _keyName: string, value: any) {
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

function AliasedProperty_readOnlySet(obj: object, keyName: string): never {
  // eslint-disable-line no-unused-vars
  throw new EmberError(`Cannot set read-only property '${keyName}' on object: ${inspect(obj)}`);
}

function AliasedProperty_oneWaySet(obj: object, keyName: string, value: any): any {
  defineProperty(obj, keyName, null);
  return set(obj, keyName, value);
}

// Backwards compatibility with Ember Data.
(AliasedProperty.prototype as any)._meta = undefined;
(AliasedProperty.prototype as any).meta = ComputedProperty.prototype.meta;
