import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { inspect } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import EmberError from '@ember/error';
import {
  consumeTag,
  tagFor,
  tagMetaFor,
  untrack,
  UpdatableTag,
  updateTag,
  validateTag,
  valueForTag,
} from '@glimmer/validator';
import { CHAIN_PASS_THROUGH, finishLazyChains, getChainTagsForKey } from './chain-tags';
import {
  ComputedDescriptor,
  ExtendedMethodDecorator,
  descriptorForDecorator,
  isElementDescriptor,
  makeComputedDecorator,
} from './decorator';
import { defineProperty } from './properties';
import { get } from './property_get';
import { set } from './property_set';

export type AliasDecorator = ExtendedMethodDecorator & PropertyDecorator & AliasDecoratorImpl;

export default function alias(altKey: string): AliasDecorator {
  assert(
    'You attempted to use @alias as a decorator directly, but it requires a `altKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  // SAFETY: We passed in the impl for this class
  return makeComputedDecorator(new AliasedProperty(altKey), AliasDecoratorImpl) as AliasDecorator;
}

// TODO: This class can be svelted once `meta` has been deprecated
class AliasDecoratorImpl extends Function {
  readOnly(this: ExtendedMethodDecorator) {
    (descriptorForDecorator(this) as AliasedProperty).readOnly();
    return this;
  }

  oneWay(this: ExtendedMethodDecorator) {
    (descriptorForDecorator(this) as AliasedProperty).oneWay();
    return this;
  }

  meta(this: ExtendedMethodDecorator, meta?: any): any {
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
    CHAIN_PASS_THROUGH.add(this);
  }

  get(obj: object, keyName: string): any {
    let ret: any;

    let meta = metaFor(obj);
    let tagMeta = tagMetaFor(obj);
    let propertyTag = tagFor(obj, keyName, tagMeta) as UpdatableTag;

    // We don't use the tag since CPs are not automatic, we just want to avoid
    // anything tracking while we get the altKey
    untrack(() => {
      ret = get(obj, this.altKey);
    });

    let lastRevision = meta.revisionFor(keyName);

    if (lastRevision === undefined || !validateTag(propertyTag, lastRevision)) {
      updateTag(propertyTag, getChainTagsForKey(obj, this.altKey, tagMeta, meta));
      meta.setRevisionFor(keyName, valueForTag(propertyTag));
      finishLazyChains(meta, keyName, ret);
    }

    consumeTag(propertyTag);

    return ret;
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
  throw new EmberError(`Cannot set read-only property '${keyName}' on object: ${inspect(obj)}`);
}

function AliasedProperty_oneWaySet(obj: object, keyName: string, value: any): any {
  defineProperty(obj, keyName, null);
  return set(obj, keyName, value);
}
