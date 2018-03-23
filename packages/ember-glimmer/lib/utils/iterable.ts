import {
  combine,
  CONSTANT_TAG,
  IterationItem,
  TagWrapper,
  UpdatableTag,
} from '@glimmer/reference';
import { Opaque } from '@glimmer/util';
import {
  get,
  isProxy,
  objectAt,
  tagFor,
  tagForProperty
} from 'ember-metal';
import {
  _contentFor,
  isEmberArray
} from 'ember-runtime';
import { guidFor, HAS_NATIVE_SYMBOL } from 'ember-utils';
import { isEachIn } from '../helpers/each-in';
import {
  UpdatablePrimitiveReference,
  UpdatableReference,
} from './references';

const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

type KeyFor = (value: any, memo: any) => any;

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

interface Iterator {
  isEmpty(): boolean;
  next(): any;
}

class ArrayIterator implements Iterator {
  static from(array: any[], keyFor: KeyFor): Iterator {
    let { length } = array;

    if (length > 0) {
      return new this(array, length, keyFor);
    } else {
      return EMPTY_ITERATOR;
    }
  }

  public position = 0;
  public seen: any = Object.create(null);

  constructor(public array: any[], public length: number, public keyFor: KeyFor) {
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
  static from(array: any[], keyFor: KeyFor): Iterator {
    let length = get(array, 'length');

    if (length > 0) {
      return new this(array, length, keyFor);
    } else {
      return EMPTY_ITERATOR;
    }
  }

  getValue(position: number) {
    return objectAt(this.array, position);
  }
}

class ObjectKeysIterator extends ArrayIterator {
  static from(obj: object, keyFor: KeyFor): Iterator {
    let keys = Object.keys(obj);
    let { length } = keys;

    if (length > 0) {
      return new this(keys, keys.map((key) => obj[key]), length, keyFor);
    } else{
      return EMPTY_ITERATOR;
    }
  }

  constructor(public keys: any[], values: any[], length: number, keyFor: KeyFor) {
    super(values, length, keyFor);
  }

  getMemo(position: number) {
    return this.keys[position];
  }
}

class EmptyIterator implements Iterator {
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
    let tag = tagFor(iterable);

    if (isProxy(iterable)) {
      // this is because the each-in doesn't actually get(proxy, 'key') but bypasses it
      // and the proxy's tag is lazy updated on access
      iterable = _contentFor(iterable);
    }

    valueTag.inner.update(tag);

    let typeofIterable = typeof iterable;

    if (iterable !== null && (typeofIterable === 'object' || typeofIterable === 'function')) {
      return ObjectKeysIterator.from(iterable, keyFor);
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
  public keyFor: KeyFor;
  public valueTag: TagWrapper<UpdatableTag>;
  public tag: any;

  constructor(ref: UpdatableReference, keyFor: KeyFor) {
    this.ref = ref;
    this.keyFor = keyFor;

    let valueTag = this.valueTag = UpdatableTag.create(CONSTANT_TAG);

    this.tag = combine([ref.tag, valueTag]);
  }

  iterate(): Iterator {
    let { ref, keyFor, valueTag } = this;

    let iterable = ref.value();

    valueTag.inner.update(tagForProperty(iterable, '[]'));

    if (iterable === null || typeof iterable !== 'object') {
      return EMPTY_ITERATOR;
    }

    if (Array.isArray(iterable)) {
      return ArrayIterator.from(iterable, keyFor);
    } else if (isEmberArray(iterable)) {
      return EmberArrayIterator.from(iterable, keyFor);
    } else if (typeof iterable.forEach === 'function') {
      let array: any[] = [];
      iterable.forEach((item: any) => array.push(item));
      return ArrayIterator.from(array, keyFor);
    } else if (HAS_NATIVE_SYMBOL && typeof iterable[Symbol.iterator] === 'function') {
      return ArrayIterator.from(Array.from(iterable), keyFor);
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
