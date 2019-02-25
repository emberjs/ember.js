import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { inspect } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { getCachedValueFor, getCacheFor } from './computed_cache';
import {
  addDependentKeys,
  ComputedDescriptor,
  Decorator,
  makeComputedDecorator,
  removeDependentKeys,
} from './decorator';
import { descriptorForDecorator } from './descriptor_map';
import { defineProperty } from './properties';
import { get } from './property_get';
import { set } from './property_set';

const CONSUMED = Object.freeze({});

export type AliasDecorator = Decorator & PropertyDecorator & AliasDecoratorImpl;

export default function alias(altKey: string): AliasDecorator {
  return makeComputedDecorator(new AliasedProperty(altKey), AliasDecoratorImpl) as AliasDecorator;
}

// TODO: This class can be svelted once `meta` has been deprecated
class AliasDecoratorImpl extends Function {
  readOnly(this: Decorator) {
    (descriptorForDecorator(this) as AliasedProperty).readOnly();
    return this;
  }

  oneWay(this: Decorator) {
    (descriptorForDecorator(this) as AliasedProperty).oneWay();
    return this;
  }

  meta(this: Decorator, meta?: any): any {
    let prop = descriptorForDecorator(this) as AliasedProperty;

    if (arguments.length === 0) {
      return prop._meta || {};
    } else {
      prop._meta = meta;
    }
  }
}

export class AliasedProperty extends ComputedDescriptor {
  readonly altKey: string;

  constructor(altKey: string) {
    super();
    this.altKey = altKey;
    this._dependentKeys = [altKey];
  }

  setup(obj: object, keyName: string, propertyDesc: PropertyDescriptor, meta: Meta): void {
    assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);
    super.setup(obj, keyName, propertyDesc, meta);

    if (meta.peekWatching(keyName) > 0) {
      this.consume(obj, keyName, meta);
    }
  }

  teardown(obj: object, keyName: string, meta: Meta): void {
    this.unconsume(obj, keyName, meta);
    super.teardown(obj, keyName, meta);
  }

  willWatch(obj: object, keyName: string, meta: Meta): void {
    this.consume(obj, keyName, meta);
  }

  get(obj: object, keyName: string): any {
    let ret = get(obj, this.altKey);
    this.consume(obj, keyName, metaFor(obj));
    return ret;
  }

  unconsume(obj: object, keyName: string, meta: Meta): void {
    let wasConsumed = getCachedValueFor(obj, keyName) === CONSUMED;
    if (wasConsumed || meta.peekWatching(keyName) > 0) {
      removeDependentKeys(this, obj, keyName, meta);
    }
    if (wasConsumed) {
      getCacheFor(obj).delete(keyName);
    }
  }

  consume(obj: object, keyName: string, meta: Meta): void {
    let cache = getCacheFor(obj);
    if (cache.get(keyName) !== CONSUMED) {
      cache.set(keyName, CONSUMED);
      addDependentKeys(this, obj, keyName, meta);
    }
  }

  set(obj: object, _keyName: string, value: any): any {
    return set(obj, this.altKey, value);
  }

  readOnly(): void {
    this.set = AliasedProperty_readOnlySet;
  }

  oneWay(): void {
    this.set = AliasedProperty_oneWaySet;
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
