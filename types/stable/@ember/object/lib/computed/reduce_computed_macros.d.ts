declare module '@ember/object/lib/computed/reduce_computed_macros' {
  import EmberArray from '@ember/array';
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
  export function sum(dependentKey: string): PropertyDecorator;
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
  export function max(dependentKey: string): PropertyDecorator;
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
  export function min(dependentKey: string): PropertyDecorator;
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
  export function mapBy(dependentKey: string, propertyKey: string): PropertyDecorator;
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
  export function filterBy(
    dependentKey: string,
    propertyKey: string,
    value?: unknown
  ): PropertyDecorator;
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
  ): PropertyDecorator;
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
  export function uniqBy(dependentKey: string, propertyKey: string): PropertyDecorator;
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
  export let union: typeof uniq;
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
  export function intersect(
    dependentKey: string,
    ...additionalDependentKeys: string[]
  ): PropertyDecorator;
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
  export function setDiff(setAProperty: string, setBProperty: string): PropertyDecorator;
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
  export function collect(
    dependentKey: string,
    ...additionalDependentKeys: string[]
  ): PropertyDecorator;
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
  export function sort(
    itemsKey: string,
    sortDefinition: SortDefinition | string
  ): PropertyDecorator;
  export function sort(
    itemsKey: string,
    additionalDependentKeys: string[],
    sortDefinition: SortDefinition
  ): PropertyDecorator;
  export {};
}
