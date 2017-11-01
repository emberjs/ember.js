import {
  combine,
  CONSTANT_TAG,
  IterationItem,
  TagWrapper,
  UpdatableTag,
} from '@glimmer/reference';
import { Opaque } from '@glimmer/util';
import { get, isProxy, tagFor, tagForProperty } from 'ember-metal';
import {
  isEmberArray,
  objectAt,
} from 'ember-runtime';
import { guidFor } from 'ember-utils';
import { isEachIn } from '../helpers/each-in';
import {
  UpdatablePrimitiveReference,
  UpdatableReference,
} from './references';

const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

export default function iterableFor(ref: any, keyPath: string) {
  if (isEachIn(ref)) {
    return new EachInIterable(ref, keyForEachIn(keyPath));
  } else {
    return new ArrayIterable(ref, keyForArray(keyPath));
  }
}

function keyForEachIn(keyPath: string | undefined | null) {
  switch (keyPath) {
    case '@index':
    case undefined:
    case null:
      return index;
    case '@identity':
      return identity;
    default:
      return (item: any) => get(item, keyPath);
  }
}

function keyForArray(keyPath: string | undefined | null) {
  switch (keyPath) {
    case '@index':
      return index;
    case '@identity':
    case undefined:
    case null:
      return identity;
    default:
      return (item: any) => get(item, keyPath);
  }
}

function index(_item: any, i: any): string {
  return String(i);
}

function identity(item: any) {
  switch (typeof item) {
    case 'string':
    case 'number':
      return String(item);
    default:
      return guidFor(item);
  }
}

function ensureUniqueKey(seen: any, key: string) {
  let seenCount = seen[key];

  if (seenCount > 0) {
    seen[key]++;
    return `${key}${ITERATOR_KEY_GUID}${seenCount}`;
  } else {
    seen[key] = 1;
  }

  return key;
}

class ArrayIterator {
  public array: any[];
  public length: number;
  public keyFor: (value: any, memo: any) => any;
  public position: number;
  public seen: any;

  constructor(array: any[], keyFor: (value: any, memo: any) => any) {
    this.array = array;
    this.length = array.length;
    this.keyFor = keyFor;
    this.position = 0;
    this.seen = Object.create(null);
  }

  isEmpty() {
    return false;
  }

  getMemo(position: number) {
    return position;
  }

  getValue(position: number) {
    return this.array[position];
  }

  next() {
    let { length, keyFor, position, seen } = this;

    if (position >= length) { return null; }

    let value = this.getValue(position);
    let memo = this.getMemo(position);
    let key = ensureUniqueKey(seen, keyFor(value, memo));

    this.position++;

    return { key, value, memo };
  }
}

class EmberArrayIterator extends ArrayIterator {
  constructor(array: any[], keyFor: (value: any, memo: any) => any) {
    super(array, keyFor);
    this.length = get(array, 'length');
  }

  getValue(position: number) {
    return objectAt(this.array, position);
  }
}

class ObjectKeysIterator extends ArrayIterator {
  public keys: any[];
  public length: number;

  constructor(keys: any[], values: any[], keyFor: (value: any, memo: any) => any) {
    super(values, keyFor);
    this.keys = keys;
  }

  getMemo(position: number) {
    return this.keys[position];
  }
}

class EmptyIterator {
  isEmpty() {
    return true;
  }

  next(): IterationItem<Opaque, Opaque> {
    throw new Error('Cannot call next() on an empty iterator');
  }
}

const EMPTY_ITERATOR = new EmptyIterator();

class EachInIterable {
  public ref: any;
  public keyFor: ((iterable: any) => any) | ((item: any, i: any) => string);
  public valueTag: TagWrapper<UpdatableTag>;
  public tag: any;

  constructor(ref: any, keyFor: ((iterable: any) => any) | ((item: any, i: any) => string)) {
    this.ref = ref;
    this.keyFor = keyFor;

    let valueTag = this.valueTag = UpdatableTag.create(CONSTANT_TAG);

    this.tag = combine([ref.tag, valueTag]);
  }

  iterate() {
    let { ref, keyFor, valueTag } = this;

    let iterable = ref.value();

    valueTag.inner.update(tagFor(iterable));

    if (isProxy(iterable)) {
      iterable = get(iterable, 'content');
    }

    let typeofIterable = typeof iterable;

    if (iterable !== null && (typeofIterable === 'object' || typeofIterable === 'function')) {
      let keys = Object.keys(iterable);
      let values = keys.map((key) => iterable[key]);
      return keys.length > 0 ? new ObjectKeysIterator(keys, values, keyFor) : EMPTY_ITERATOR;
    } else {
      return EMPTY_ITERATOR;
    }
  }

  // {{each-in}} yields |key value| instead of |value key|, so the memo and
  // value are flipped

  valueReferenceFor(item: any): UpdatablePrimitiveReference {
    return new UpdatablePrimitiveReference(item.memo);
  }

  updateValueReference(reference: UpdatableReference, item: any) {
    reference.update(item.memo);
  }

  memoReferenceFor(item: any): UpdatableReference {
    return new UpdatableReference(item.value);
  }

  updateMemoReference(reference: UpdatableReference, item: any) {
    reference.update(item.value);
  }
}

class ArrayIterable {
  public ref: UpdatableReference;
  public keyFor: (value: any, memo: any) => any;
  public valueTag: TagWrapper<UpdatableTag>;
  public tag: any;

  constructor(ref: UpdatableReference, keyFor: (value: any, memo: any) => any) {
    this.ref = ref;
    this.keyFor = keyFor;

    let valueTag = this.valueTag = UpdatableTag.create(CONSTANT_TAG);

    this.tag = combine([ref.tag, valueTag]);
  }

  iterate() {
    let { ref, keyFor, valueTag } = this;

    let iterable = ref.value();

    valueTag.inner.update(tagForProperty(iterable, '[]'));

    if (iterable === null || typeof iterable !== 'object') {
      return EMPTY_ITERATOR;
    }

    if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (isEmberArray(iterable)) {
      return get(iterable, 'length') > 0 ? new EmberArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (typeof iterable.forEach === 'function') {
      let array: any[] = [];
      iterable.forEach((item: any) => {
        array.push(item);
      });
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else {
      return EMPTY_ITERATOR;
    }
  }

  valueReferenceFor(item: any): UpdatableReference {
    return new UpdatableReference(item.value);
  }

  updateValueReference(reference: UpdatableReference, item: any) {
    reference.update(item.value);
  }

  memoReferenceFor(item: any): UpdatablePrimitiveReference {
    return new UpdatablePrimitiveReference(item.memo);
  }

  updateMemoReference(reference: UpdatablePrimitiveReference, item: any) {
    reference.update(item.memo);
  }
}
