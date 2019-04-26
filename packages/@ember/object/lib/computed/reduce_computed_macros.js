/**
@module @ember/object
*/
import { DEBUG } from '@glimmer/env';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { assert } from '@ember/debug';
import {
  addObserver,
  computed,
  descriptorForDecorator,
  get,
  isElementDescriptor,
  notifyPropertyChange,
  removeObserver,
} from '@ember/-internals/metal';
import { compare, isArray, A as emberA, uniqBy as uniqByArray } from '@ember/-internals/runtime';

function reduceMacro(dependentKey, callback, initialValue, name) {
  assert(
    `Dependent key passed to \`computed.${name}\` shouldn't contain brace expanding pattern.`,
    !/[\[\]\{\}]/g.test(dependentKey)
  );

  return computed(`${dependentKey}.[]`, function() {
    let arr = get(this, dependentKey);
    if (arr === null || typeof arr !== 'object') {
      return initialValue;
    }
    return arr.reduce(callback, initialValue, this);
  }).readOnly();
}

function arrayMacro(dependentKey, additionalDependentKeys, callback) {
  // This is a bit ugly
  let propertyName;
  if (/@each/.test(dependentKey)) {
    propertyName = dependentKey.replace(/\.@each.*$/, '');
  } else {
    propertyName = dependentKey;
    dependentKey += '.[]';
  }

  return computed(dependentKey, ...additionalDependentKeys, function() {
    let value = get(this, propertyName);
    if (isArray(value)) {
      return emberA(callback.call(this, value));
    } else {
      return emberA();
    }
  }).readOnly();
}

function multiArrayMacro(_dependentKeys, callback, name) {
  assert(
    `Dependent keys passed to \`computed.${name}\` shouldn't contain brace expanding pattern.`,
    _dependentKeys.every(dependentKey => !/[\[\]\{\}]/g.test(dependentKey))
  );
  let dependentKeys = _dependentKeys.map(key => `${key}.[]`);

  return computed(...dependentKeys, function() {
    return emberA(callback.call(this, _dependentKeys));
  }).readOnly();
}

/**
  A computed property that returns the sum of the values in the dependent array.

  Example:

  ```javascript
  import { sum } from '@ember/object/computed';

  class Invoice {
    lineItems = [1.00, 2.50, 9.99];

    @sum('lineItems') total;
  }

  let invoice = new Invoice();

  invoice.total; // 13.49
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { sum } from '@ember/object/computed';

  let Invoice = EmberObject.extend({
    lineItems: [1.00, 2.50, 9.99],

    total: sum('lineItems')
  })

  let invoice = Invoice.create();

  invoice.total; // 13.49
  ```

  @method sum
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @return {ComputedProperty} computes the sum of all values in the
  dependentKey's array
  @since 1.4.0
  @public
*/
export function sum(dependentKey) {
  assert(
    'You attempted to use @sum as a decorator directly, but it requires a `dependentKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return reduceMacro(dependentKey, (sum, item) => sum + item, 0, 'sum');
}

/**
  A computed property that calculates the maximum value in the dependent array.
  This will return `-Infinity` when the dependent array is empty.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { mapBy, max } from '@ember/object/computed';

  class Person {
    children = [];

    @mapBy('children', 'age') childAges;
    @max('childAges') maxChildAge;
  }

  let lordByron = new Person();

  lordByron.maxChildAge; // -Infinity

  set(lordByron, 'children', [
    {
      name: 'Augusta Ada Byron',
      age: 7
    }
  ]);
  lordByron.maxChildAge; // 7

  set(lordByron, 'children', [
    ...lordByron.children,
    {
      name: 'Allegra Byron',
      age: 5
    }, {
      name: 'Elizabeth Medora Leigh',
      age: 8
    }
  ]);
  lordByron.maxChildAge; // 8
  ```

  Classic Class Example:

  ```javascript
  import EmberObject, { set } from '@ember/object';
  import { mapBy, max } from '@ember/object/computed';

  let Person = EmberObject.extend({
    childAges: mapBy('children', 'age'),
    maxChildAge: max('childAges')
  });

  let lordByron = Person.create({ children: [] });

  lordByron.maxChildAge; // -Infinity

  set(lordByron, 'children', [
    {
      name: 'Augusta Ada Byron',
      age: 7
    }
  ]);
  lordByron.maxChildAge; // 7

  set(lordByron, 'children', [
    ...lordByron.children,
    {
      name: 'Allegra Byron',
      age: 5
    }, {
      name: 'Elizabeth Medora Leigh',
      age: 8
    }
  ]);
  lordByron.maxChildAge; // 8
  ```

  If the types of the arguments are not numbers, they will be converted to
  numbers and the type of the return value will always be `Number`. For example,
  the max of a list of Date objects will be the highest timestamp as a `Number`.
  This behavior is consistent with `Math.max`.

  @method max
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @return {ComputedProperty} computes the largest value in the dependentKey's
  array
  @public
*/
export function max(dependentKey) {
  assert(
    'You attempted to use @max as a decorator directly, but it requires a `dependentKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return reduceMacro(dependentKey, (max, item) => Math.max(max, item), -Infinity, 'max');
}

/**
  A computed property that calculates the minimum value in the dependent array.
  This will return `Infinity` when the dependent array is empty.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { mapBy, min } from '@ember/object/computed';

  class Person {
    children = [];

    @mapBy('children', 'age') childAges;
    @min('childAges') minChildAge;
  }

  let lordByron = Person.create({ children: [] });

  lordByron.minChildAge; // Infinity

  set(lordByron, 'children', [
    {
      name: 'Augusta Ada Byron',
      age: 7
    }
  ]);
  lordByron.minChildAge; // 7

  set(lordByron, 'children', [
    ...lordByron.children,
    {
      name: 'Allegra Byron',
      age: 5
    }, {
      name: 'Elizabeth Medora Leigh',
      age: 8
    }
  ]);
  lordByron.minChildAge; // 5
  ```

  Classic Class Example:

  ```javascript
  import EmberObject, { set } from '@ember/object';
  import { mapBy, min } from '@ember/object/computed';

  let Person = EmberObject.extend({
    childAges: mapBy('children', 'age'),
    minChildAge: min('childAges')
  });

  let lordByron = Person.create({ children: [] });

  lordByron.minChildAge; // Infinity

  set(lordByron, 'children', [
    {
      name: 'Augusta Ada Byron',
      age: 7
    }
  ]);
  lordByron.minChildAge; // 7

  set(lordByron, 'children', [
    ...lordByron.children,
    {
      name: 'Allegra Byron',
      age: 5
    }, {
      name: 'Elizabeth Medora Leigh',
      age: 8
    }
  ]);
  lordByron.minChildAge; // 5
  ```

  If the types of the arguments are not numbers, they will be converted to
  numbers and the type of the return value will always be `Number`. For example,
  the min of a list of Date objects will be the lowest timestamp as a `Number`.
  This behavior is consistent with `Math.min`.

  @method min
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @return {ComputedProperty} computes the smallest value in the dependentKey's array
  @public
*/
export function min(dependentKey) {
  assert(
    'You attempted to use @min as a decorator directly, but it requires a `dependentKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return reduceMacro(dependentKey, (min, item) => Math.min(min, item), Infinity, 'min');
}

/**
  Returns an array mapped via the callback

  The callback method you provide should have the following signature:
  - `item` is the current item in the iteration.
  - `index` is the integer index of the current item in the iteration.

  ```javascript
  function mapCallback(item, index);
  ```

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { map } from '@ember/object/computed';

  class Hamster {
    constructor(chores) {
      set(this, 'chores', chores);
    }

    @map('chores', function(chore, index) {
      return `${chore.toUpperCase()}!`;
    })
    excitingChores;
  });

  let hamster = new Hamster(['clean', 'write more unit tests']);

  hamster.excitingChores; // ['CLEAN!', 'WRITE MORE UNIT TESTS!']
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { map } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    excitingChores: map('chores', function(chore, index) {
      return `${chore.toUpperCase()}!`;
    })
  });

  let hamster = Hamster.create({
    chores: ['clean', 'write more unit tests']
  });

  hamster.excitingChores; // ['CLEAN!', 'WRITE MORE UNIT TESTS!']
  ```

  You can optionally pass an array of additional dependent keys as the second
  parameter to the macro, if your map function relies on any external values:

  ```javascript
  import { set } from '@ember/object';
  import { map } from '@ember/object/computed';

  class Hamster {
    shouldUpperCase = false;

    constructor(chores) {
      set(this, 'chores', chores);
    }

    @map('chores', ['shouldUpperCase'], function(chore, index) {
      if (this.shouldUpperCase) {
        return `${chore.toUpperCase()}!`;
      } else {
        return `${chore}!`;
      }
    })
    excitingChores;
  }

  let hamster = new Hamster(['clean', 'write more unit tests']);

  hamster.excitingChores; // ['clean!', 'write more unit tests!']

  set(hamster, 'shouldUpperCase', true);
  hamster.excitingChores; // ['CLEAN!', 'WRITE MORE UNIT TESTS!']
  ```

  @method map
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {Array} [additionalDependentKeys] optional array of additional
  dependent keys
  @param {Function} callback
  @return {ComputedProperty} an array mapped via the callback
  @public
*/
export function map(dependentKey, additionalDependentKeys, callback) {
  assert(
    'You attempted to use @map as a decorator directly, but it requires atleast `dependentKey` and `callback` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  if (callback === undefined && typeof additionalDependentKeys === 'function') {
    callback = additionalDependentKeys;
    additionalDependentKeys = [];
  }

  assert(
    'The final parameter provided to map must be a callback function',
    typeof callback === 'function'
  );

  assert(
    'The second parameter provided to map must either be the callback or an array of additional dependent keys',
    Array.isArray(additionalDependentKeys)
  );

  return arrayMacro(dependentKey, additionalDependentKeys, function(value) {
    return value.map(callback, this);
  });
}

/**
  Returns an array mapped to the specified key.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { mapBy } from '@ember/object/computed';

  class Person {
    children = [];

    @mapBy('children', 'age') childAges;
  }

  let lordByron = new Person();

  lordByron.childAges; // []

  set(lordByron, 'children', [
    {
      name: 'Augusta Ada Byron',
      age: 7
    }
  ]);
  lordByron.childAges; // [7]

  set(lordByron, 'children', [
    ...lordByron.children,
    {
      name: 'Allegra Byron',
      age: 5
    }, {
      name: 'Elizabeth Medora Leigh',
      age: 8
    }
  ]);
  lordByron.childAges; // [7, 5, 8]
  ```

  Classic Class Example:

  ```javascript
  import EmberObject, { set } from '@ember/object';
  import { mapBy } from '@ember/object/computed';

  let Person = EmberObject.extend({
    childAges: mapBy('children', 'age')
  });

  let lordByron = Person.create({ children: [] });

  lordByron.childAges; // []

  set(lordByron, 'children', [
    {
      name: 'Augusta Ada Byron',
      age: 7
    }
  ]);
  lordByron.childAges; // [7]

  set(lordByron, 'children', [
    ...lordByron.children,
    {
      name: 'Allegra Byron',
      age: 5
    }, {
      name: 'Elizabeth Medora Leigh',
      age: 8
    }
  ]);
  lordByron.childAges; // [7, 5, 8]
  ```

  @method mapBy
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {String} propertyKey
  @return {ComputedProperty} an array mapped to the specified key
  @public
*/
export function mapBy(dependentKey, propertyKey) {
  assert(
    'You attempted to use @mapBy as a decorator directly, but it requires `dependentKey` and `propertyKey` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    '`computed.mapBy` expects a property string for its second argument, ' +
      'perhaps you meant to use "map"',
    typeof propertyKey === 'string'
  );
  assert(
    `Dependent key passed to \`computed.mapBy\` shouldn't contain brace expanding pattern.`,
    !/[\[\]\{\}]/g.test(dependentKey)
  );

  return map(`${dependentKey}.@each.${propertyKey}`, item => get(item, propertyKey));
}

/**
  Filters the array by the callback.

  The callback method you provide should have the following signature:
  - `item` is the current item in the iteration.
  - `index` is the integer index of the current item in the iteration.
  - `array` is the dependant array itself.

  ```javascript
  function filterCallback(item, index, array);
  ```

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { filter } from '@ember/object/computed';

  class Hamster {
    constructor(chores) {
      set(this, 'chores', chores);
    }

    @filter('chores', function(chore, index, array) {
      return !chore.done;
    })
    remainingChores;
  }

  let hamster = Hamster.create([
    { name: 'cook', done: true },
    { name: 'clean', done: true },
    { name: 'write more unit tests', done: false }
  ]);

  hamster.remainingChores; // [{name: 'write more unit tests', done: false}]
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { filter } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    remainingChores: filter('chores', function(chore, index, array) {
      return !chore.done;
    })
  });

  let hamster = Hamster.create({
    chores: [
      { name: 'cook', done: true },
      { name: 'clean', done: true },
      { name: 'write more unit tests', done: false }
    ]
  });

  hamster.remainingChores; // [{name: 'write more unit tests', done: false}]
  ```

  You can also use `@each.property` in your dependent key, the callback will
  still use the underlying array:

  ```javascript
  import { set } from '@ember/object';
  import { filter } from '@ember/object/computed';

  class Hamster {
    constructor(chores) {
      set(this, 'chores', chores);
    }

    @filter('chores.@each.done', function(chore, index, array) {
      return !chore.done;
    })
    remainingChores;
  }

  let hamster = new Hamster([
    { name: 'cook', done: true },
    { name: 'clean', done: true },
    { name: 'write more unit tests', done: false }
  ]);
  hamster.remainingChores; // [{name: 'write more unit tests', done: false}]

  set(hamster.chores[2], 'done', true);
  hamster.remainingChores; // []
  ```

  Finally, you can optionally pass an array of additional dependent keys as the
  second parameter to the macro, if your filter function relies on any external
  values:

  ```javascript
  import { filter } from '@ember/object/computed';

  class Hamster {
    constructor(chores) {
      set(this, 'chores', chores);
    }

    doneKey = 'finished';

    @filter('chores', ['doneKey'], function(chore, index, array) {
      return !chore[this.doneKey];
    })
    remainingChores;
  }

  let hamster = new Hamster([
    { name: 'cook', finished: true },
    { name: 'clean', finished: true },
    { name: 'write more unit tests', finished: false }
  ]);

  hamster.remainingChores; // [{name: 'write more unit tests', finished: false}]
  ```

  @method filter
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {Array} [additionalDependentKeys] optional array of additional dependent keys
  @param {Function} callback
  @return {ComputedProperty} the filtered array
  @public
*/
export function filter(dependentKey, additionalDependentKeys, callback) {
  assert(
    'You attempted to use @filter as a decorator directly, but it requires atleast `dependentKey` and `callback` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  if (callback === undefined && typeof additionalDependentKeys === 'function') {
    callback = additionalDependentKeys;
    additionalDependentKeys = [];
  }

  assert(
    'The final parameter provided to filter must be a callback function',
    typeof callback === 'function'
  );

  assert(
    'The second parameter provided to filter must either be the callback or an array of additional dependent keys',
    Array.isArray(additionalDependentKeys)
  );

  return arrayMacro(dependentKey, additionalDependentKeys, function(value) {
    return value.filter(callback, this);
  });
}

/**
  Filters the array by the property and value.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { filterBy } from '@ember/object/computed';

  class Hamster {
    constructor(chores) {
      set(this, 'chores', chores);
    }

    @filterBy('chores', 'done', false) remainingChores;
  }

  let hamster = new Hamster([
    { name: 'cook', done: true },
    { name: 'clean', done: true },
    { name: 'write more unit tests', done: false }
  ]);

  hamster.remainingChores; // [{ name: 'write more unit tests', done: false }]
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { filterBy } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    remainingChores: filterBy('chores', 'done', false)
  });

  let hamster = Hamster.create({
    chores: [
      { name: 'cook', done: true },
      { name: 'clean', done: true },
      { name: 'write more unit tests', done: false }
    ]
  });

  hamster.remainingChores; // [{ name: 'write more unit tests', done: false }]
  ```

  @method filterBy
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {String} propertyKey
  @param {*} value
  @return {ComputedProperty} the filtered array
  @public
*/
export function filterBy(dependentKey, propertyKey, value) {
  assert(
    'You attempted to use @filterBy as a decorator directly, but it requires atleast `dependentKey` and `propertyKey` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    `Dependent key passed to \`computed.filterBy\` shouldn't contain brace expanding pattern.`,
    !/[\[\]\{\}]/g.test(dependentKey)
  );

  let callback;
  if (arguments.length === 2) {
    callback = item => get(item, propertyKey);
  } else {
    callback = item => get(item, propertyKey) === value;
  }

  return filter(`${dependentKey}.@each.${propertyKey}`, callback);
}

/**
  A computed property which returns a new array with all the unique elements
  from one or more dependent arrays.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { uniq } from '@ember/object/computed';

  class Hamster {
    constructor(fruits) {
      set(this, 'fruits', fruits);
    }

    @uniq('fruits') uniqueFruits;
  }

  let hamster = new Hamster([
    'banana',
    'grape',
    'kale',
    'banana'
  ]);

  hamster.uniqueFruits; // ['banana', 'grape', 'kale']
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { uniq } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    uniqueFruits: uniq('fruits')
  });

  let hamster = Hamster.create({
    fruits: [
      'banana',
      'grape',
      'kale',
      'banana'
    ]
  });

  hamster.uniqueFruits; // ['banana', 'grape', 'kale']
  ```

  @method uniq
  @for @ember/object/computed
  @static
  @param {String} propertyKey*
  @return {ComputedProperty} computes a new array with all the
  unique elements from the dependent array
  @public
*/
export function uniq(...args) {
  assert(
    'You attempted to use @uniq/@union as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return multiArrayMacro(
    args,
    function(dependentKeys) {
      let uniq = emberA();
      let seen = new Set();

      dependentKeys.forEach(dependentKey => {
        let value = get(this, dependentKey);
        if (isArray(value)) {
          value.forEach(item => {
            if (!seen.has(item)) {
              seen.add(item);
              uniq.push(item);
            }
          });
        }
      });

      return uniq;
    },
    'uniq'
  );
}

/**
  A computed property which returns a new array with all the unique elements
  from an array, with uniqueness determined by specific key.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { uniqBy } from '@ember/object/computed';

  class Hamster {
    constructor(fruits) {
      set(this, 'fruits', fruits);
    }

    @uniqBy('fruits', 'id') uniqueFruits;
  }

  let hamster = new Hamster([
    { id: 1, 'banana' },
    { id: 2, 'grape' },
    { id: 3, 'peach' },
    { id: 1, 'banana' }
  ]);

  hamster.uniqueFruits; // [ { id: 1, 'banana' }, { id: 2, 'grape' }, { id: 3, 'peach' }]
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { uniqBy } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    uniqueFruits: uniqBy('fruits', 'id')
  });

  let hamster = Hamster.create({
    fruits: [
      { id: 1, 'banana' },
      { id: 2, 'grape' },
      { id: 3, 'peach' },
      { id: 1, 'banana' }
    ]
  });

  hamster.uniqueFruits; // [ { id: 1, 'banana' }, { id: 2, 'grape' }, { id: 3, 'peach' }]
  ```

  @method uniqBy
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {String} propertyKey
  @return {ComputedProperty} computes a new array with all the
  unique elements from the dependent array
  @public
*/
export function uniqBy(dependentKey, propertyKey) {
  assert(
    'You attempted to use @uniqBy as a decorator directly, but it requires `dependentKey` and `propertyKey` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    `Dependent key passed to \`computed.uniqBy\` shouldn't contain brace expanding pattern.`,
    !/[\[\]\{\}]/g.test(dependentKey)
  );

  return computed(`${dependentKey}.[]`, function() {
    let list = get(this, dependentKey);
    return isArray(list) ? uniqByArray(list, propertyKey) : emberA();
  }).readOnly();
}

/**
  A computed property which returns a new array with all the unique elements
  from one or more dependent arrays.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { union } from '@ember/object/computed';

  class Hamster {
    constructor(fruits, vegetables) {
      set(this, 'fruits', fruits);
      set(this, 'vegetables', vegetables);
    }

    @union('fruits', 'vegetables') ediblePlants;
  });

  let hamster = new, Hamster(
    [
      'banana',
      'grape',
      'kale',
      'banana',
      'tomato'
    ],
    [
      'tomato',
      'carrot',
      'lettuce'
    ]
  );

  hamster.uniqueFruits; // ['banana', 'grape', 'kale', 'tomato', 'carrot', 'lettuce']
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { union } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    uniqueFruits: union('fruits', 'vegetables')
  });

  let hamster = Hamster.create({
    fruits: [
      'banana',
      'grape',
      'kale',
      'banana',
      'tomato'
    ],
    vegetables: [
      'tomato',
      'carrot',
      'lettuce'
    ]
  });

  hamster.uniqueFruits; // ['banana', 'grape', 'kale', 'tomato', 'carrot', 'lettuce']
  ```

  @method union
  @for @ember/object/computed
  @static
  @param {String} propertyKey*
  @return {ComputedProperty} computes a new array with all the unique elements
  from one or more dependent arrays.
  @public
*/
export let union = uniq;

/**
  A computed property which returns a new array with all the elements
  two or more dependent arrays have in common.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { intersect } from '@ember/object/computed';

  class FriendGroups {
    constructor(adaFriends, charlesFriends) {
      set(this, 'adaFriends', adaFriends);
      set(this, 'charlesFriends', charlesFriends);
    }

    @intersect('adaFriends', 'charlesFriends') friendsInCommon;
  }

  let groups = new FriendGroups(
    ['Charles Babbage', 'John Hobhouse', 'William King', 'Mary Somerville'],
    ['William King', 'Mary Somerville', 'Ada Lovelace', 'George Peacock']
  );

  groups.friendsInCommon; // ['William King', 'Mary Somerville']
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { intersect } from '@ember/object/computed';

  let FriendGroups = EmberObject.extend({
    friendsInCommon: intersect('adaFriends', 'charlesFriends')
  });

  let groups = FriendGroups.create({
    adaFriends: ['Charles Babbage', 'John Hobhouse', 'William King', 'Mary Somerville'],
    charlesFriends: ['William King', 'Mary Somerville', 'Ada Lovelace', 'George Peacock']
  });

  groups.friendsInCommon; // ['William King', 'Mary Somerville']
  ```

  @method intersect
  @for @ember/object/computed
  @static
  @param {String} propertyKey*
  @return {ComputedProperty} computes a new array with all the duplicated
  elements from the dependent arrays
  @public
*/
export function intersect(...args) {
  assert(
    'You attempted to use @intersect as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return multiArrayMacro(
    args,
    function(dependentKeys) {
      let arrays = dependentKeys.map(dependentKey => {
        let array = get(this, dependentKey);
        return isArray(array) ? array : [];
      });

      let results = arrays.pop().filter(candidate => {
        for (let i = 0; i < arrays.length; i++) {
          let found = false;
          let array = arrays[i];
          for (let j = 0; j < array.length; j++) {
            if (array[j] === candidate) {
              found = true;
              break;
            }
          }

          if (found === false) {
            return false;
          }
        }

        return true;
      });

      return emberA(results);
    },
    'intersect'
  );
}

/**
  A computed property which returns a new array with all the properties from the
  first dependent array that are not in the second dependent array.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { setDiff } from '@ember/object/computed';

  class Hamster {
    constructor(likes, fruits) {
      set(this, 'likes', likes);
      set(this, 'fruits', fruits);
    }

    @setDiff('likes', 'fruits') wants;
  }

  let hamster = new Hamster(
    [
      'banana',
      'grape',
      'kale'
    ],
    [
      'grape',
      'kale',
    ]
  );

  hamster.wants; // ['banana']
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { setDiff } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    wants: setDiff('likes', 'fruits')
  });

  let hamster = Hamster.create({
    likes: [
      'banana',
      'grape',
      'kale'
    ],
    fruits: [
      'grape',
      'kale',
    ]
  });

  hamster.wants; // ['banana']
  ```

  @method setDiff
  @for @ember/object/computed
  @static
  @param {String} setAProperty
  @param {String} setBProperty
  @return {ComputedProperty} computes a new array with all the items from the
  first dependent array that are not in the second dependent array
  @public
*/
export function setDiff(setAProperty, setBProperty) {
  assert(
    'You attempted to use @setDiff as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert('`computed.setDiff` requires exactly two dependent arrays.', arguments.length === 2);
  assert(
    `Dependent keys passed to \`computed.setDiff\` shouldn't contain brace expanding pattern.`,
    !/[\[\]\{\}]/g.test(setAProperty) && !/[\[\]\{\}]/g.test(setBProperty)
  );

  return computed(`${setAProperty}.[]`, `${setBProperty}.[]`, function() {
    let setA = this.get(setAProperty);
    let setB = this.get(setBProperty);

    if (!isArray(setA)) {
      return emberA();
    }
    if (!isArray(setB)) {
      return emberA(setA);
    }

    return setA.filter(x => setB.indexOf(x) === -1);
  }).readOnly();
}

/**
  A computed property that returns the array of values for the provided
  dependent properties.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { collect } from '@ember/object/computed';

  class Hamster {
    @collect('hat', 'shirt') clothes;
  }

  let hamster = new Hamster();

  hamster.clothes; // [null, null]

  set(hamster, 'hat', 'Camp Hat');
  set(hamster, 'shirt', 'Camp Shirt');
  hamster.clothes; // ['Camp Hat', 'Camp Shirt']
  ```

  Classic Class Example:

  ```javascript
  import EmberObject, { set } from '@ember/object';
  import { collect } from '@ember/object/computed';

  let Hamster = EmberObject.extend({
    clothes: collect('hat', 'shirt')
  });

  let hamster = Hamster.create();

  hamster.clothes; // [null, null]

  set(hamster, 'hat', 'Camp Hat');
  set(hamster, 'shirt', 'Camp Shirt');
  hamster.clothes; // ['Camp Hat', 'Camp Shirt']
  ```

  @method collect
  @for @ember/object/computed
  @static
  @param {String} dependentKey*
  @return {ComputedProperty} computed property which maps values of all passed
  in properties to an array.
  @public
*/
export function collect(...dependentKeys) {
  assert(
    'You attempted to use @collect as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return multiArrayMacro(
    dependentKeys,
    function() {
      let res = dependentKeys.map(key => {
        let val = get(this, key);
        return val === undefined ? null : val;
      });

      return emberA(res);
    },
    'collect'
  );
}

/**
  A computed property which returns a new array with all the properties from the
  first dependent array sorted based on a property or sort function. The sort
  macro can be used in two different ways:

  1. By providing a sort callback function
  2. By providing an array of keys to sort the array

  In the first form, the callback method you provide should have the following
  signature:

  ```javascript
  function sortCallback(itemA, itemB);
  ```

  - `itemA` the first item to compare.
  - `itemB` the second item to compare.

  This function should return negative number (e.g. `-1`) when `itemA` should
  come before `itemB`. It should return positive number (e.g. `1`) when `itemA`
  should come after `itemB`. If the `itemA` and `itemB` are equal this function
  should return `0`.

  Therefore, if this function is comparing some numeric values, simple `itemA -
  itemB` or `itemA.get( 'foo' ) - itemB.get( 'foo' )` can be used instead of
  series of `if`.

  Example:

  ```javascript
  import { set } from '@ember/object';
  import { sort } from '@ember/object/computed';

  class ToDoList {
    constructor(todos) {
      set(this, 'todos', todos);
    }

    // using a custom sort function
    @sort('todos', function(a, b){
      if (a.priority > b.priority) {
        return 1;
      } else if (a.priority < b.priority) {
        return -1;
      }

      return 0;
    })
    priorityTodos;
  }

  let todoList = new ToDoList([
    { name: 'Unit Test', priority: 2 },
    { name: 'Documentation', priority: 3 },
    { name: 'Release', priority: 1 }
  ]);

  todoList.priorityTodos; // [{ name:'Release', priority:1 }, { name:'Unit Test', priority:2 }, { name:'Documentation', priority:3 }]
  ```

  Classic Class Example:

  ```javascript
  import EmberObject from '@ember/object';
  import { sort } from '@ember/object/computed';

  let ToDoList = EmberObject.extend({
    // using a custom sort function
    priorityTodos: sort('todos', function(a, b){
      if (a.priority > b.priority) {
        return 1;
      } else if (a.priority < b.priority) {
        return -1;
      }

      return 0;
    })
  });

  let todoList = ToDoList.create({
    todos: [
      { name: 'Unit Test', priority: 2 },
      { name: 'Documentation', priority: 3 },
      { name: 'Release', priority: 1 }
    ]
  });

  todoList.priorityTodos; // [{ name:'Release', priority:1 }, { name:'Unit Test', priority:2 }, { name:'Documentation', priority:3 }]
  ```

  You can also optionally pass an array of additional dependent keys as the
  second parameter, if your sort function is dependent on additional values that
  could changes:

  ```js
  import EmberObject, { set } from '@ember/object';
  import { sort } from '@ember/object/computed';

  class ToDoList {
    sortKey = 'priority';

    constructor(todos) {
      set(this, 'todos', todos);
    }

    // using a custom sort function
    @sort('todos', ['sortKey'], function(a, b){
      if (a[this.sortKey] > b[this.sortKey]) {
        return 1;
      } else if (a[this.sortKey] < b[this.sortKey]) {
        return -1;
      }

      return 0;
    })
    sortedTodos;
  });

  let todoList = new ToDoList([
    { name: 'Unit Test', priority: 2 },
    { name: 'Documentation', priority: 3 },
    { name: 'Release', priority: 1 }
  ]);

  todoList.priorityTodos; // [{ name:'Release', priority:1 }, { name:'Unit Test', priority:2 }, { name:'Documentation', priority:3 }]
  ```

  In the second form, you should provide the key of the array of sort values as
  the second parameter:

  ```javascript
  import { set } from '@ember/object';
  import { sort } from '@ember/object/computed';

  class ToDoList {
    constructor(todos) {
      set(this, 'todos', todos);
    }

    // using standard ascending sort
    todosSorting = ['name'];
    @sort('todos', 'todosSorting') sortedTodos;

    // using descending sort
    todosSortingDesc = ['name:desc'];
    @sort('todos', 'todosSortingDesc') sortedTodosDesc;
  }

  let todoList = new ToDoList([
    { name: 'Unit Test', priority: 2 },
    { name: 'Documentation', priority: 3 },
    { name: 'Release', priority: 1 }
  ]);

  todoList.sortedTodos; // [{ name:'Documentation', priority:3 }, { name:'Release', priority:1 }, { name:'Unit Test', priority:2 }]
  todoList.sortedTodosDesc; // [{ name:'Unit Test', priority:2 }, { name:'Release', priority:1 }, { name:'Documentation', priority:3 }]
  ```

  @method sort
  @for @ember/object/computed
  @static
  @param {String} itemsKey
  @param {Array} [additionalDependentKeys] optional array of additional
  dependent keys
  @param {String or Function} sortDefinition a dependent key to an array of sort
  properties (add `:desc` to the arrays sort properties to sort descending) or a
  function to use when sorting
  @return {ComputedProperty} computes a new sorted array based on the sort
  property array or callback function
  @public
*/
export function sort(itemsKey, additionalDependentKeys, sortDefinition) {
  assert(
    'You attempted to use @sort as a decorator directly, but it requires atleast an `itemsKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  if (DEBUG) {
    let argumentsValid = false;

    if (arguments.length === 2) {
      argumentsValid =
        typeof itemsKey === 'string' &&
        (typeof additionalDependentKeys === 'string' ||
          typeof additionalDependentKeys === 'function');
    }

    if (arguments.length === 3) {
      argumentsValid =
        typeof itemsKey === 'string' &&
        Array.isArray(additionalDependentKeys) &&
        typeof sortDefinition === 'function';
    }

    assert(
      '`computed.sort` can either be used with an array of sort properties or with a sort function. If used with an array of sort properties, it must receive exactly two arguments: the key of the array to sort, and the key of the array of sort properties. If used with a sort function, it may recieve up to three arguments: the key of the array to sort, an optional additional array of dependent keys for the computed property, and the sort function.',
      argumentsValid
    );
  }

  if (sortDefinition === undefined && !Array.isArray(additionalDependentKeys)) {
    sortDefinition = additionalDependentKeys;
    additionalDependentKeys = [];
  }

  if (typeof sortDefinition === 'function') {
    return customSort(itemsKey, additionalDependentKeys, sortDefinition);
  } else {
    return propertySort(itemsKey, sortDefinition);
  }
}

function customSort(itemsKey, additionalDependentKeys, comparator) {
  return arrayMacro(itemsKey, additionalDependentKeys, function(value) {
    return value.slice().sort((x, y) => comparator.call(this, x, y));
  });
}

// This one needs to dynamically set up and tear down observers on the itemsKey
// depending on the sortProperties
function propertySort(itemsKey, sortPropertiesKey) {
  let activeObserversMap = new WeakMap();
  let sortPropertyDidChangeMap = new WeakMap();

  if (EMBER_METAL_TRACKED_PROPERTIES) {
    let cp = computed(`${itemsKey}.[]`, `${sortPropertiesKey}.[]`, function(key) {
      let sortProperties = get(this, sortPropertiesKey);

      assert(
        `The sort definition for '${key}' on ${this} must be a function or an array of strings`,
        isArray(sortProperties) && sortProperties.every(s => typeof s === 'string')
      );

      let itemsKeyIsAtThis = itemsKey === '@this';
      let normalizedSortProperties = normalizeSortProperties(sortProperties);

      let items = itemsKeyIsAtThis ? this : get(this, itemsKey);
      if (!isArray(items)) {
        return emberA();
      }

      if (normalizedSortProperties.length === 0) {
        return emberA(items.slice());
      } else {
        return sortByNormalizedSortProperties(items, normalizedSortProperties);
      }
    }).readOnly();

    descriptorForDecorator(cp).auto();

    return cp;
  } else {
    return computed(`${sortPropertiesKey}.[]`, function(key) {
      let sortProperties = get(this, sortPropertiesKey);

      assert(
        `The sort definition for '${key}' on ${this} must be a function or an array of strings`,
        isArray(sortProperties) && sortProperties.every(s => typeof s === 'string')
      );

      // Add/remove property observers as required.
      let activeObservers = activeObserversMap.get(this);

      if (!sortPropertyDidChangeMap.has(this)) {
        sortPropertyDidChangeMap.set(this, function() {
          notifyPropertyChange(this, key);
        });
      }

      let sortPropertyDidChange = sortPropertyDidChangeMap.get(this);

      if (activeObservers !== undefined) {
        activeObservers.forEach(path => removeObserver(this, path, sortPropertyDidChange));
      }

      let itemsKeyIsAtThis = itemsKey === '@this';
      let normalizedSortProperties = normalizeSortProperties(sortProperties);
      if (normalizedSortProperties.length === 0) {
        let path = itemsKeyIsAtThis ? `[]` : `${itemsKey}.[]`;
        addObserver(this, path, sortPropertyDidChange);
        activeObservers = [path];
      } else {
        activeObservers = normalizedSortProperties.map(([prop]) => {
          let path = itemsKeyIsAtThis ? `@each.${prop}` : `${itemsKey}.@each.${prop}`;
          addObserver(this, path, sortPropertyDidChange);
          return path;
        });
      }

      activeObserversMap.set(this, activeObservers);

      let items = itemsKeyIsAtThis ? this : get(this, itemsKey);
      if (!isArray(items)) {
        return emberA();
      }

      if (normalizedSortProperties.length === 0) {
        return emberA(items.slice());
      } else {
        return sortByNormalizedSortProperties(items, normalizedSortProperties);
      }
    }).readOnly();
  }
}

function normalizeSortProperties(sortProperties) {
  return sortProperties.map(p => {
    let [prop, direction] = p.split(':');
    direction = direction || 'asc';

    return [prop, direction];
  });
}

function sortByNormalizedSortProperties(items, normalizedSortProperties) {
  return emberA(
    items.slice().sort((itemA, itemB) => {
      for (let i = 0; i < normalizedSortProperties.length; i++) {
        let [prop, direction] = normalizedSortProperties[i];
        let result = compare(get(itemA, prop), get(itemB, prop));
        if (result !== 0) {
          return direction === 'desc' ? -1 * result : result;
        }
      }
      return 0;
    })
  );
}
