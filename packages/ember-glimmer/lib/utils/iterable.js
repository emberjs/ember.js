import { get } from 'ember-metal/property_get';
import { guidFor } from 'ember-metal/utils';
import { objectAt, isEmberArray } from 'ember-runtime/mixins/array';
import { UpdatableReference, UpdatablePrimitiveReference } from './references';
import { isEachIn } from '../helpers/each-in';

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
      return function (item)  {
        return this.generateUniqueKey(get(item, keyPath));
      };
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

/*
  Base class for iterators.
  Provides the `generateKey` method, which detects collisions when
  iteratoting over objects in a list.
  For instance, you may be using the `{{#each}}` helper with the `key=` option:

  ```javascript
  this.set('data', [
    {
      name: 'Yehuda' }
    },
    {
      name: 'Jenn'
    },
    {
      name: 'Yehuda'
    }
  ])
  ```

  and the following template:

  ```handlebars
  {{#each data key="name" as |person|}}
    {{person.name}}
  {{/each}}
  ```

  In the above example, we want each item in the list to render, even though two objects have the same
  value for the key (Notice there are two "Yehuda"'s above.

  As the iterator goes through the array, it will cache value of the `key` `name`.
  In order to make sure the cache updates correctly, we assign it a unique key.
*/
class CollisionDetectionIterator {
  constructor() {
    this.collisions = undefined;
  }

  // implementation stolen from https://github.com/tildeio/htmlbars/pull/393/files
  generateUniqueKey(key) {
    if (!this.collisions) {
      this.collisions = Object.create(null);
    }

    let { collisions } = this;

    let count = collisions[key] | 0;
    collisions[key] = ++count;
    // I'm not sure why this UUID is this particular UUID.
    // TODO: ask @krisselden
    return `${key}-${count}_11c3fd46-300c-11e5-932c-5cf9388a6f6c`;
  }
}

class ArrayIterator extends CollisionDetectionIterator {
  constructor(array, keyFor) {
    super();
    this.array = array;
    this.length = array.length;
    this.keyFor = keyFor;
    this.position = 0;
  }

  isEmpty() {
    return false;
  }

  next() {
    let { array, length, position } = this;

    if (position >= length) { return null; }

    let value = array[position];
    let key = this.keyFor(value, position);
    let memo = position;

    this.position++;

    return { key, value, memo };
  }
}

class EmberArrayIterator extends CollisionDetectionIterator {
  constructor(array, keyFor) {
    super();
    this.array = array;
    this.length = get(array, 'length');
    this.keyFor = keyFor;
    this.position = 0;
  }

  isEmpty() {
    return this.length === 0;
  }

  next() {
    let { array, length, position } = this;

    if (position >= length) { return null; }

    let value = objectAt(array, position);
    let key = this.keyFor(value, position);
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
    let { keys, values, position } = this;

    if (position >= keys.length) { return null; }

    let value = values[position];
    let memo = keys[position];
    let key = this.keyFor(value, memo);

    this.position++;

    return { key, value: memo, memo: value };
  }

  // Because an Object or an Ember.Object can only have
  // one value per key, we don't need to detect collisions.
  // Just return the key given instead to appease the interface.
  generateUniqueKey(key) {
    return key;
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
    this.ref = ref;
    this.keyFor = keyFor;
  }

  iterate() {
    let { ref, keyFor } = this;

    let iterable = ref.value();

    if (iterable === undefined || iterable === null) {
      return EMPTY_ITERATOR;
    } else if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (isEmberArray(iterable)) {
      return new EmberArrayIterator(iterable, keyFor);
    } else if (isEachIn(ref)) {
      let keys = Object.keys(iterable);
      let values = keys.map(key => iterable[key]);
      return keys.length > 0 ? new ObjectKeysIterator(keys, values, keyFor) : EMPTY_ITERATOR;
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
