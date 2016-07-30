import { get } from 'ember-metal/property_get';
import { guidFor } from 'ember-metal/utils';
import { tagFor } from 'ember-metal/tags';
import Dict from 'ember-metal/empty_object';
import { objectAt, isEmberArray } from 'ember-runtime/mixins/array';
import { isProxy } from 'ember-runtime/mixins/-proxy';
import { UpdatableReference, UpdatablePrimitiveReference } from './references';
import { isEachIn } from '../helpers/each-in';
import { CONSTANT_TAG, CURRENT_TAG, UpdatableTag, combine } from 'glimmer-reference';

const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

export default function iterableFor(ref, keyPath) {
  return new Iterable(ref, keyFor(keyPath));
}

function keyFor(keyPath) {
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
    this.seen = new Dict();
  }

  isEmpty() {
    return false;
  }

  next() {
    let { array, length, keyFor, position, seen } = this;

    if (position >= length) { return null; }

    let value = array[position];
    let key = ensureUniqueKey(seen, keyFor(value, position));
    let memo = position;

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
    this.seen = new Dict();
  }

  isEmpty() {
    return this.length === 0;
  }

  next() {
    let { array, length, keyFor, position, seen } = this;

    if (position >= length) { return null; }

    let value = objectAt(array, position);
    let key = ensureUniqueKey(seen, keyFor(value, position));
    let memo = position;

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
  }

  isEmpty() {
    return this.keys.length === 0;
  }

  next() {
    let { keys, values, keyFor, position } = this;

    if (position >= keys.length) { return null; }

    let value = values[position];
    let memo = keys[position];
    let key = keyFor(value, memo);

    this.position++;

    return { key, value: memo, memo: value };
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

class Iterable {
  constructor(ref, keyFor) {
    let valueTag = this.valueTag = new UpdatableTag(CONSTANT_TAG);

    this.tag = combine([ref.tag, valueTag]);
    this.ref = ref;
    this.keyFor = keyFor;
  }

  iterate() {
    let { ref, keyFor, valueTag } = this;

    let iterable = ref.value();

    if (isProxy(iterable)) {
      valueTag.update(CURRENT_TAG);
    } else {
      valueTag.update(tagFor(iterable));
    }

    if (iterable === undefined || iterable === null) {
      return EMPTY_ITERATOR;
    } else if (isEachIn(ref)) {
      let keys = Object.keys(iterable);
      let values = keys.map(key => iterable[key]);
      return keys.length > 0 ? new ObjectKeysIterator(keys, values, keyFor) : EMPTY_ITERATOR;
    } else if (isEmberArray(iterable)) {
      return new EmberArrayIterator(iterable, keyFor);
    } else if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (typeof iterable.forEach === 'function') {
      let array = [];
      iterable.forEach(function(item) {
        array.push(item);
      });
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else {
      throw new Error(`Don't know how to {{#each ${iterable}}}`);
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
