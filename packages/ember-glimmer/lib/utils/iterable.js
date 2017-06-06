import { guidFor } from 'ember-utils';
import { get, tagForProperty, tagFor, isProxy } from 'ember-metal';
import {
  objectAt,
  isEmberArray
} from 'ember-runtime';
import {
  UpdatableReference,
  UpdatablePrimitiveReference
} from './references';
import { isEachIn } from '../helpers/each-in';
import {
  CONSTANT_TAG,
  UpdatableTag,
  combine
} from '@glimmer/reference';

const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

export default function iterableFor(ref, keyPath) {
  if (isEachIn(ref)) {
    return new EachInIterable(ref, keyForEachIn(keyPath));
  } else {
    return new ArrayIterable(ref, keyForArray(keyPath));
  }
}

function keyForEachIn(keyPath) {
  switch (keyPath) {
    case '@index':
    case undefined:
    case null:
      return index;
    case '@identity':
      return identity;
    default:
      return (item) => get(item, keyPath);
  }
}

function keyForArray(keyPath) {
  switch (keyPath) {
    case '@index':
      return index;
    case '@identity':
    case undefined:
    case null:
      return identity;
    default:
      return (item) => get(item, keyPath);
  }
}

function index(item, index) {
  return String(index);
}

function identity(item) {
  switch (typeof item) {
    case 'string':
    case 'number':
      return String(item);
    default:
      return guidFor(item);
  }
}

function ensureUniqueKey(seen, key) {
  let seenCount = seen[key];

  if (seenCount) {
    seen[key]++;
    return `${key}${ITERATOR_KEY_GUID}${seenCount}`;
  } else {
    seen[key] = 1;
  }

  return key;
}

class ArrayIterator {
  constructor(array, keyFor) {
    this.array = array;
    this.length = array.length;
    this.keyFor = keyFor;
    this.position = 0;
    this.seen = Object.create(null);
  }

  isEmpty() {
    return false;
  }

  next() {
    let { array, length, keyFor, position, seen } = this;

    if (position >= length) { return null; }

    let value = array[position];
    let memo = position;
    let key = ensureUniqueKey(seen, keyFor(value, memo));

    this.position++;

    return { key, value, memo };
  }
}

class EmberArrayIterator {
  constructor(array, keyFor) {
    this.array = array;
    this.length = get(array, 'length');
    this.keyFor = keyFor;
    this.position = 0;
    this.seen = Object.create(null);
  }

  isEmpty() {
    return this.length === 0;
  }

  next() {
    let { array, length, keyFor, position, seen } = this;

    if (position >= length) { return null; }

    let value = objectAt(array, position);
    let memo = position;
    let key = ensureUniqueKey(seen, keyFor(value, memo));

    this.position++;

    return { key, value, memo };
  }
}

class ObjectKeysIterator {
  constructor(keys, values, keyFor) {
    this.keys = keys;
    this.values = values;
    this.keyFor = keyFor;
    this.position = 0;
    this.seen = Object.create(null);
  }

  isEmpty() {
    return this.keys.length === 0;
  }

  next() {
    let { keys, values, keyFor, position, seen } = this;

    if (position >= keys.length) { return null; }

    let value = values[position];
    let memo = keys[position];
    let key = ensureUniqueKey(seen, keyFor(value, memo));

    this.position++;

    return { key, value, memo };
  }
}

class EmptyIterator {
  isEmpty() {
    return true;
  }

  next() {
    throw new Error('Cannot call next() on an empty iterator');
  }
}

const EMPTY_ITERATOR = new EmptyIterator();

class EachInIterable {
  constructor(ref, keyFor) {
    this.ref = ref;
    this.keyFor = keyFor;

    let valueTag = this.valueTag = new UpdatableTag(CONSTANT_TAG);

    this.tag = combine([ref.tag, valueTag]);
  }

  iterate() {
    let { ref, keyFor, valueTag } = this;

    let iterable = ref.value();

    valueTag.update(tagFor(iterable));

    if (isProxy(iterable)) {
      iterable = get(iterable, 'content');
    }

    let typeofIterable = typeof iterable;

    if (iterable && (typeofIterable === 'object' || typeofIterable === 'function')) {
      let keys = Object.keys(iterable);
      let values = keys.map(key => iterable[key]);
      return keys.length > 0 ? new ObjectKeysIterator(keys, values, keyFor) : EMPTY_ITERATOR;
    } else {
      return EMPTY_ITERATOR;
    }
  }

  // {{each-in}} yields |key value| instead of |value key|, so the memo and
  // value are flipped

  valueReferenceFor(item) {
    return new UpdatablePrimitiveReference(item.memo);
  }

  updateValueReference(reference, item) {
    reference.update(item.memo);
  }

  memoReferenceFor(item) {
    return new UpdatableReference(item.value);
  }

  updateMemoReference(reference, item) {
    reference.update(item.value);
  }
}

class ArrayIterable {
  constructor(ref, keyFor) {
    this.ref = ref;
    this.keyFor = keyFor;

    let valueTag = this.valueTag = new UpdatableTag(CONSTANT_TAG);

    this.tag = combine([ref.tag, valueTag]);
  }

  iterate() {
    let { ref, keyFor, valueTag } = this;

    let iterable = ref.value();

    valueTag.update(tagForProperty(iterable, '[]'));

    if (!iterable || typeof iterable !== 'object') {
      return EMPTY_ITERATOR;
    }

    if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (isEmberArray(iterable)) {
      return get(iterable, 'length') > 0 ? new EmberArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (typeof iterable.forEach === 'function') {
      let array = [];
      iterable.forEach(function(item) {
        array.push(item);
      });
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else {
      return EMPTY_ITERATOR;
    }
  }

  valueReferenceFor(item) {
    return new UpdatableReference(item.value);
  }

  updateValueReference(reference, item) {
    reference.update(item.value);
  }

  memoReferenceFor(item) {
    return new UpdatablePrimitiveReference(item.memo);
  }

  updateMemoReference(reference, item) {
    reference.update(item.memo);
  }
}
