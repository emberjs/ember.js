/**
@module @ember/object
*/
import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import { autoComputed, isElementDescriptor } from '@ember/-internals/metal';
import { computed, get } from '@ember/object';
import { compare } from '@ember/utils';
import EmberArray, { A as emberA, uniqBy as uniqByArray } from '@ember/array';
import type { NativeArray } from '@ember/array';

function isNativeOrEmberArray(obj: unknown): obj is unknown[] | EmberArray<unknown> {
  return Array.isArray(obj) || EmberArray.detect(obj);
}

function reduceMacro(
  dependentKey: string,
  callback: (result: number, item: number) => number,
  initialValue: number,
  name: string
) {
  assert(
    `Dependent key passed to \`${name}\` computed macro shouldn't contain brace expanding pattern.`,
    !/[[\]{}]/g.test(dependentKey)
  );

  return computed(`${dependentKey}.[]`, function () {
    let arr = get(this, dependentKey);
    if (arr === null || typeof arr !== 'object') {
      return initialValue;
    }
    return arr.reduce(callback, initialValue, this);
  }).readOnly() as PropertyDecorator;
}

function arrayMacro(
  dependentKey: string,
  additionalDependentKeys: string[],
  callback: (value: unknown[] | EmberArray<unknown>) => unknown[] | NativeArray<unknown>
) {
  // This is a bit ugly
  let propertyName: string;
  if (/@each/.test(dependentKey)) {
    propertyName = dependentKey.replace(/\.@each.*$/, '');
  } else {
    propertyName = dependentKey;
    dependentKey += '.[]';
  }

  return computed(dependentKey, ...additionalDependentKeys, function () {
    let value = get(this, propertyName);
    if (isNativeOrEmberArray(value)) {
      return emberA(callback.call(this, value));
    } else {
      return emberA();
    }
  }).readOnly() as PropertyDecorator;
}

function multiArrayMacro(
  _dependentKeys: string[],
  callback: (dependentKeys: string[]) => unknown[],
  name: string
): PropertyDecorator {
  assert(
    `Dependent keys passed to \`${name}\` computed macro shouldn't contain brace expanding pattern.`,
    _dependentKeys.every((dependentKey) => !/[[\]{}]/g.test(dependentKey))
  );
  let dependentKeys = _dependentKeys.map((key) => `${key}.[]`);

  return computed(...dependentKeys, function () {
    return emberA(callback.call(this, _dependentKeys));
  }).readOnly() as PropertyDecorator;
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

  @method sum
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @return {ComputedProperty} computes the sum of all values in the
  dependentKey's array
  @since 1.4.0
  @public
*/
export function sum(dependentKey: string) {
  assert(
    'You attempted to use @sum as a decorator directly, but it requires a `dependentKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  return reduceMacro(dependentKey, (sum: number, item: number) => sum + item, 0, 'sum');
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
export function max(dependentKey: string) {
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
export function min(dependentKey: string) {
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
export function map(
  dependentKey: string,
  callback: (value: unknown, index: number) => unknown
): PropertyDecorator;
export function map(
  dependentKey: string,
  additionalDependentKeys: string[],
  callback: (value: unknown, index: number) => unknown
): PropertyDecorator;
export function map(
  dependentKey: string,
  additionalDependentKeysOrCallback: string[] | ((value: unknown, index: number) => unknown),
  callback?: (value: unknown, index: number) => unknown
): PropertyDecorator {
  assert(
    'You attempted to use @map as a decorator directly, but it requires atleast `dependentKey` and `callback` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    'The final parameter provided to map must be a callback function',
    typeof callback === 'function' ||
      (callback === undefined && typeof additionalDependentKeysOrCallback === 'function')
  );

  assert(
    'The second parameter provided to map must either be the callback or an array of additional dependent keys',
    Array.isArray(additionalDependentKeysOrCallback) ||
      typeof additionalDependentKeysOrCallback === 'function'
  );

  let additionalDependentKeys: string[];

  if (typeof additionalDependentKeysOrCallback === 'function') {
    callback = additionalDependentKeysOrCallback;
    additionalDependentKeys = [];
  } else {
    additionalDependentKeys = additionalDependentKeysOrCallback;
  }

  const cCallback = callback;
  assert('[BUG] Missing callback', cCallback);

  return arrayMacro(dependentKey, additionalDependentKeys, function (this: unknown, value) {
    // This is so dumb...
    return Array.isArray(value) ? value.map(cCallback, this) : value.map(cCallback, this);
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

  @method mapBy
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {String} propertyKey
  @return {ComputedProperty} an array mapped to the specified key
  @public
*/
export function mapBy(dependentKey: string, propertyKey: string) {
  assert(
    'You attempted to use @mapBy as a decorator directly, but it requires `dependentKey` and `propertyKey` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    '`mapBy` computed macro expects a property string for its second argument, ' +
      'perhaps you meant to use "map"',
    typeof propertyKey === 'string'
  );
  assert(
    `Dependent key passed to \`mapBy\` computed macro shouldn't contain brace expanding pattern.`,
    !/[[\]{}]/g.test(dependentKey)
  );

  return map(`${dependentKey}.@each.${propertyKey}`, (item) => get(item, propertyKey));
}

/**
  Filters the array by the callback, like the `Array.prototype.filter` method.

  The callback method you provide should have the following signature:
  - `item` is the current item in the iteration.
  - `index` is the integer index of the current item in the iteration.
  - `array` is the dependant array itself.

  ```javascript
  function filterCallback(item, index, array);
  ```

  In the callback, return a truthy value that coerces to true to keep the
  element, or a falsy to reject it.

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
export function filter(
  dependentKey: string,
  callback: (value: unknown, index: number, array: unknown[] | EmberArray<unknown>) => unknown
): PropertyDecorator;
export function filter(
  dependentKey: string,
  additionalDependentKeys: string[],
  callback: (value: unknown, index: number, array: unknown[] | EmberArray<unknown>) => unknown
): PropertyDecorator;
export function filter(
  dependentKey: string,
  additionalDependentKeysOrCallback:
    | string[]
    | ((value: unknown, index: number, array: unknown[] | EmberArray<unknown>) => unknown),
  callback?: (value: unknown, index: number, array: unknown[] | EmberArray<unknown>) => unknown
): PropertyDecorator {
  assert(
    'You attempted to use @filter as a decorator directly, but it requires atleast `dependentKey` and `callback` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    'The final parameter provided to filter must be a callback function',
    typeof callback === 'function' ||
      (callback === undefined && typeof additionalDependentKeysOrCallback === 'function')
  );

  assert(
    'The second parameter provided to filter must either be the callback or an array of additional dependent keys',
    Array.isArray(additionalDependentKeysOrCallback) ||
      typeof additionalDependentKeysOrCallback === 'function'
  );

  let additionalDependentKeys: string[];

  if (typeof additionalDependentKeysOrCallback === 'function') {
    callback = additionalDependentKeysOrCallback;
    additionalDependentKeys = [];
  } else {
    additionalDependentKeys = additionalDependentKeysOrCallback;
  }

  const cCallback = callback;

  return arrayMacro(
    dependentKey,
    additionalDependentKeys,
    function (this: unknown, value: unknown[] | EmberArray<unknown>) {
      // This is a really silly way to keep TS happy
      return Array.isArray(value)
        ? value.filter(
            cCallback as (value: unknown, index: number, array: unknown[]) => unknown,
            this
          )
        : value.filter(
            cCallback as (value: unknown, index: number, array: EmberArray<unknown>) => unknown,
            this
          );
    }
  );
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

  @method filterBy
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {String} propertyKey
  @param {*} value
  @return {ComputedProperty} the filtered array
  @public
*/
export function filterBy(dependentKey: string, propertyKey: string, value?: unknown) {
  assert(
    'You attempted to use @filterBy as a decorator directly, but it requires atleast `dependentKey` and `propertyKey` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    `Dependent key passed to \`filterBy\` computed macro shouldn't contain brace expanding pattern.`,
    !/[[\]{}]/g.test(dependentKey)
  );

  let callback;
  if (arguments.length === 2) {
    callback = (item: unknown) => get(item, propertyKey);
  } else {
    callback = (item: unknown) => get(item, propertyKey) === value;
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

  @method uniq
  @for @ember/object/computed
  @static
  @param {String} propertyKey*
  @return {ComputedProperty} computes a new array with all the
  unique elements from the dependent array
  @public
*/
export function uniq(
  dependentKey: string,
  ...additionalDependentKeys: string[]
): PropertyDecorator {
  assert(
    'You attempted to use @uniq/@union as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  let args = [dependentKey, ...additionalDependentKeys];

  return multiArrayMacro(
    args,
    function (this: unknown, dependentKeys) {
      let uniq = emberA();
      let seen = new Set();

      dependentKeys.forEach((dependentKey) => {
        let value = get(this, dependentKey);
        if (isNativeOrEmberArray(value)) {
          value.forEach((item: unknown) => {
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

  @method uniqBy
  @for @ember/object/computed
  @static
  @param {String} dependentKey
  @param {String} propertyKey
  @return {ComputedProperty} computes a new array with all the
  unique elements from the dependent array
  @public
*/
export function uniqBy(dependentKey: string, propertyKey: string) {
  assert(
    'You attempted to use @uniqBy as a decorator directly, but it requires `dependentKey` and `propertyKey` parameters',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert(
    `Dependent key passed to \`uniqBy\` computed macro shouldn't contain brace expanding pattern.`,
    !/[[\]{}]/g.test(dependentKey)
  );

  return computed(`${dependentKey}.[]`, function () {
    let list = get(this, dependentKey);
    return isNativeOrEmberArray(list) ? uniqByArray(list, propertyKey) : emberA();
  }).readOnly() as PropertyDecorator;
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

    @union('fruits', 'vegetables') uniqueFruits;
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

  @method intersect
  @for @ember/object/computed
  @static
  @param {String} propertyKey*
  @return {ComputedProperty} computes a new array with all the duplicated
  elements from the dependent arrays
  @public
*/
export function intersect(dependentKey: string, ...additionalDependentKeys: string[]) {
  assert(
    'You attempted to use @intersect as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  let args = [dependentKey, ...additionalDependentKeys];

  return multiArrayMacro(
    args,
    function (this: unknown, dependentKeys: string[]) {
      let arrays = dependentKeys.map((dependentKey: string) => {
        let array = get(this, dependentKey);
        return Array.isArray(array) ? array : [];
      });

      let firstArray = arrays.pop();
      assert(
        'Attempted to apply multiArrayMacro for intersect without any dependentKeys',
        firstArray
      );

      let results = firstArray.filter((candidate: unknown) => {
        for (let array of arrays) {
          let found = false;
          for (let item of array) {
            if (item === candidate) {
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

  @method setDiff
  @for @ember/object/computed
  @static
  @param {String} setAProperty
  @param {String} setBProperty
  @return {ComputedProperty} computes a new array with all the items from the
  first dependent array that are not in the second dependent array
  @public
*/
export function setDiff(setAProperty: string, setBProperty: string) {
  assert(
    'You attempted to use @setDiff as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  assert('`setDiff` computed macro requires exactly two dependent arrays.', arguments.length === 2);
  assert(
    `Dependent keys passed to \`setDiff\` computed macro shouldn't contain brace expanding pattern.`,
    !/[[\]{}]/g.test(setAProperty) && !/[[\]{}]/g.test(setBProperty)
  );

  return computed(`${setAProperty}.[]`, `${setBProperty}.[]`, function () {
    let setA = get(this, setAProperty);
    let setB = get(this, setBProperty);

    if (!isNativeOrEmberArray(setA)) {
      return emberA();
    }
    if (!isNativeOrEmberArray(setB)) {
      return setA;
    }

    return setA.filter((x) => setB.indexOf(x) === -1);
  }).readOnly() as PropertyDecorator;
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

  @method collect
  @for @ember/object/computed
  @static
  @param {String} dependentKey*
  @return {ComputedProperty} computed property which maps values of all passed
  in properties to an array.
  @public
*/
export function collect(dependentKey: string, ...additionalDependentKeys: string[]) {
  assert(
    'You attempted to use @collect as a decorator directly, but it requires atleast one dependent key parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  let dependentKeys = [dependentKey, ...additionalDependentKeys];

  return multiArrayMacro(
    dependentKeys,
    function (this: unknown) {
      let res = dependentKeys.map((key) => {
        let val = get(this, key);
        return val === undefined ? null : val;
      });

      return emberA(res);
    },
    'collect'
  );
}

// (UN)SAFETY: we use `any` here to match how TS defines the sorting for arrays.
// Additionally, since we're using it with *decorators*, we don't have any way
// to plumb through the relationship between the types in a way that would be
// variance-safe.
type SortDefinition = (itemA: any, itemB: any) => number;

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
  @param {String|Function|Array} sortDefinitionOrDependentKeys The key of the sort definition (an array of sort properties),
  the sort function, or an array of additional dependent keys
  @param {Function?} sortDefinition the sort function (when used with additional dependent keys)
  @return {ComputedProperty} computes a new sorted array based on the sort
  property array or callback function
  @public
*/
export function sort(itemsKey: string, sortDefinition: SortDefinition | string): PropertyDecorator;
export function sort(
  itemsKey: string,
  additionalDependentKeys: string[],
  sortDefinition: SortDefinition
): PropertyDecorator;
export function sort(
  itemsKey: string,
  additionalDependentKeysOrDefinition: SortDefinition | string | string[],
  sortDefinition?: SortDefinition
): PropertyDecorator {
  assert(
    'You attempted to use @sort as a decorator directly, but it requires atleast an `itemsKey` parameter',
    !isElementDescriptor(Array.prototype.slice.call(arguments))
  );

  if (DEBUG) {
    let argumentsValid = false;

    if (arguments.length === 2) {
      argumentsValid =
        typeof itemsKey === 'string' &&
        (typeof additionalDependentKeysOrDefinition === 'string' ||
          typeof additionalDependentKeysOrDefinition === 'function');
    }

    if (arguments.length === 3) {
      argumentsValid =
        typeof itemsKey === 'string' &&
        Array.isArray(additionalDependentKeysOrDefinition) &&
        typeof sortDefinition === 'function';
    }

    assert(
      'The `sort` computed macro can either be used with an array of sort properties or with a sort function. If used with an array of sort properties, it must receive exactly two arguments: the key of the array to sort, and the key of the array of sort properties. If used with a sort function, it may receive up to three arguments: the key of the array to sort, an optional additional array of dependent keys for the computed property, and the sort function.',
      argumentsValid
    );
  }

  let additionalDependentKeys: string[];
  let sortDefinitionOrString: SortDefinition | string;

  if (Array.isArray(additionalDependentKeysOrDefinition)) {
    additionalDependentKeys = additionalDependentKeysOrDefinition;
    sortDefinitionOrString = sortDefinition!;
  } else {
    additionalDependentKeys = [];
    sortDefinitionOrString = additionalDependentKeysOrDefinition;
  }

  if (typeof sortDefinitionOrString === 'function') {
    return customSort(itemsKey, additionalDependentKeys, sortDefinitionOrString);
  } else {
    return propertySort(itemsKey, sortDefinitionOrString);
  }
}

function customSort(
  itemsKey: string,
  additionalDependentKeys: string[],
  comparator: SortDefinition
) {
  return arrayMacro(itemsKey, additionalDependentKeys, function (this: unknown, value) {
    return value.slice().sort((x, y) => comparator.call(this, x, y));
  });
}

// This one needs to dynamically set up and tear down observers on the itemsKey
// depending on the sortProperties
function propertySort(itemsKey: string, sortPropertiesKey: string): PropertyDecorator {
  let cp = autoComputed(function (this: unknown, key: string) {
    let sortProperties = get(this, sortPropertiesKey);

    assert(
      `The sort definition for '${key}' on ${this} must be a function or an array of strings`,
      (function (arr: unknown): arr is string[] | EmberArray<string> {
        return isNativeOrEmberArray(arr) && arr.every((s) => typeof s === 'string');
      })(sortProperties)
    );

    let itemsKeyIsAtThis = itemsKey === '@this';
    let normalizedSortProperties = normalizeSortProperties(sortProperties);

    let items = itemsKeyIsAtThis ? this : get(this, itemsKey);
    if (!isNativeOrEmberArray(items)) {
      return emberA();
    }

    if (normalizedSortProperties.length === 0) {
      return emberA(items.slice());
    } else {
      return sortByNormalizedSortProperties(items, normalizedSortProperties);
    }
  }).readOnly();

  return cp as PropertyDecorator;
}

function normalizeSortProperties(sortProperties: string[] | EmberArray<string>) {
  let callback = (p: string): [prop: string, direction: string] => {
    let [prop, direction] = p.split(':');
    direction = direction || 'asc';

    // SAFETY: There will always be at least one value returned by split
    return [prop!, direction];
  };
  // This nonsense is necessary since technically the two map implementations diverge.
  return Array.isArray(sortProperties)
    ? sortProperties.map(callback)
    : sortProperties.map(callback);
}

function sortByNormalizedSortProperties(
  items: unknown[] | EmberArray<unknown>,
  normalizedSortProperties: [prop: string, direction: string][]
) {
  return emberA(
    items.slice().sort((itemA: unknown, itemB: unknown) => {
      for (let [prop, direction] of normalizedSortProperties) {
        let result = compare(get(itemA, prop), get(itemB, prop));
        if (result !== 0) {
          return direction === 'desc' ? -1 * result : result;
        }
      }
      return 0;
    })
  );
}
