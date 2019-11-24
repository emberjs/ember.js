import { Meta } from '@ember/-internals/meta';
import { inspect } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import { combine, UpdatableTag, update, validate, value } from '@glimmer/reference';
import { finishLazyChains, getChainTagsForKey } from './chain-tags';
import {
  getCachedValueFor,
  getCacheFor,
  getLastRevisionFor,
  setLastRevisionFor,
} from './computed_cache';
import {
  addDependentKeys,
  ComputedDescriptor,
  Decorator,
  isElementDescriptor,
  makeComputedDecorator,
  removeDependentKeys,
} from './decorator';
import { descriptorForDecorator } from './descriptor_map';
import { defineProperty } from './properties';
import { get } from './property_get';
import { set } from './property_set';
import { tagForProperty } from './tags';
import { consume, untrack } from './tracked';

const CONSUMED = Object.freeze({});

export type AliasDecorator = Decorator & PropertyDecorator & AliasDecoratorImpl;

export default function alias(altKey: string): AliasDecorator {
  assert(
    'You attempted to use @alias as a decorator directly, but it requires a `altKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

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
  }

  setup(obj: object, keyName: string, propertyDesc: PropertyDescriptor, meta: Meta): void {
    assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);
    super.setup(obj, keyName, propertyDesc, meta);
  }

  teardown(obj: object, keyName: string, meta: Meta): void {
    super.teardown(obj, keyName, meta);
  }

  willWatch(): void {}

  get(obj: object, keyName: string): any {
    let ret: any;

    let propertyTag = tagForProperty(obj, keyName) as UpdatableTag;

    // We don't use the tag since CPs are not automatic, we just want to avoid
    // anything tracking while we get the altKey
    untrack(() => {
      ret = get(obj, this.altKey);
    });

    let lastRevision = getLastRevisionFor(obj, keyName);

    if (!validate(propertyTag, lastRevision)) {
      update(propertyTag, combine(getChainTagsForKey(obj, this.altKey)));
      setLastRevisionFor(obj, keyName, value(propertyTag));
      finishLazyChains(obj, keyName, ret);
    }

    consume(propertyTag);

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
