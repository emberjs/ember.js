/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core';
import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import EmberError from 'ember-metal/error';
import { ComputedProperty, computed } from 'ember-metal/computed';
import { addObserver, removeObserver } from 'ember-metal/observer';
import compare from 'ember-runtime/compare';
import { isArray } from 'ember-runtime/utils';

function reduceMacro(dependentKey, callback, initialValue) {
  return computed(`${dependentKey}.[]`, function() {
    const arr = get(this, dependentKey);

    if (arr === null || typeof arr !== 'object') { return initialValue; }

    return arr.reduce((previousValue, currentValue, index, array) => {
      return callback.call(this, previousValue, currentValue, index, array);
    }, initialValue);
  }).readOnly();
}

function arrayMacro(dependentKey, callback) {
  // This is a bit ugly
  var propertyName;
  if (/@each/.test(dependentKey)) {
    propertyName = dependentKey.replace(/\.@each.*$/, '');
  } else {
    propertyName = dependentKey;
    dependentKey += '.[]';
  }

  return computed(dependentKey, function() {
    var value = get(this, propertyName);
    if (isArray(value)) {
      return Ember.A(callback.call(this, value));
    } else {
      return Ember.A();
    }
  }).readOnly();
}

function multiArrayMacro(dependentKeys, callback) {
  var args = dependentKeys.map(key => `${key}.[]`);

  args.push(function() {
    return Ember.A(callback.call(this, dependentKeys));
  });

  return computed.apply(this, args).readOnly();
}

/**
  A computed property that returns the sum of the value
  in the dependent array.

  @method sum
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the sum of all values in the dependentKey's array
  @since 1.4.0
  @public
*/
export function sum(dependentKey) {
  return reduceMacro(dependentKey, (sum, item) => sum + item, 0);
}

/**
  A computed property that calculates the maximum value in the
  dependent array. This will return `-Infinity` when the dependent
  array is empty.

  ```javascript
  var Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    maxChildAge: Ember.computed.max('childAges')
  });

  var lordByron = Person.create({ children: [] });

  lordByron.get('maxChildAge'); // -Infinity
  lordByron.get('children').pushObject({
    name: 'Augusta Ada Byron', age: 7
  });
  lordByron.get('maxChildAge'); // 7
  lordByron.get('children').pushObjects([{
    name: 'Allegra Byron',
    age: 5
  }, {
    name: 'Elizabeth Medora Leigh',
    age: 8
  }]);
  lordByron.get('maxChildAge'); // 8
  ```

  @method max
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the largest value in the dependentKey's array
  @public
*/
export function max(dependentKey) {
  return reduceMacro(dependentKey, (max, item) => Math.max(max, item), -Infinity);
}

/**
  A computed property that calculates the minimum value in the
  dependent array. This will return `Infinity` when the dependent
  array is empty.

  ```javascript
  var Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    minChildAge: Ember.computed.min('childAges')
  });

  var lordByron = Person.create({ children: [] });

  lordByron.get('minChildAge'); // Infinity
  lordByron.get('children').pushObject({
    name: 'Augusta Ada Byron', age: 7
  });
  lordByron.get('minChildAge'); // 7
  lordByron.get('children').pushObjects([{
    name: 'Allegra Byron',
    age: 5
  }, {
    name: 'Elizabeth Medora Leigh',
    age: 8
  }]);
  lordByron.get('minChildAge'); // 5
  ```

  @method min
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the smallest value in the dependentKey's array
  @public
*/
export function min(dependentKey) {
  return reduceMacro(dependentKey, (min, item) => Math.min(min, item), Infinity);
}

/**
  Returns an array mapped via the callback

  The callback method you provide should have the following signature.
  `item` is the current item in the iteration.
  `index` is the integer index of the current item in the iteration.

  ```javascript
  function(item, index);
  ```

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    excitingChores: Ember.computed.map('chores', function(chore, index) {
      return chore.toUpperCase() + '!';
    })
  });

  var hamster = Hamster.create({
    chores: ['clean', 'write more unit tests']
  });

  hamster.get('excitingChores'); // ['CLEAN!', 'WRITE MORE UNIT TESTS!']
  ```

  @method map
  @for Ember.computed
  @param {String} dependentKey
  @param {Function} callback
  @return {Ember.ComputedProperty} an array mapped via the callback
  @public
*/
export function map(dependentKey, callback) {
  return arrayMacro(dependentKey, function(value) {
    return value.map(callback, this);
  });
}

/**
  Returns an array mapped to the specified key.

  ```javascript
  var Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age')
  });

  var lordByron = Person.create({ children: [] });

  lordByron.get('childAges'); // []
  lordByron.get('children').pushObject({ name: 'Augusta Ada Byron', age: 7 });
  lordByron.get('childAges'); // [7]
  lordByron.get('children').pushObjects([{
    name: 'Allegra Byron',
    age: 5
  }, {
    name: 'Elizabeth Medora Leigh',
    age: 8
  }]);
  lordByron.get('childAges'); // [7, 5, 8]
  ```

  @method mapBy
  @for Ember.computed
  @param {String} dependentKey
  @param {String} propertyKey
  @return {Ember.ComputedProperty} an array mapped to the specified key
  @public
*/
export function mapBy(dependentKey, propertyKey) {
  assert(
    'Ember.computed.mapBy expects a property string for its second argument, ' +
    'perhaps you meant to use "map"',
    typeof propertyKey === 'string'
  );

  return map(`${dependentKey}.@each.${propertyKey}`, item => get(item, propertyKey));
}

/**
  Filters the array by the callback.

  The callback method you provide should have the following signature.
  `item` is the current item in the iteration.
  `index` is the integer index of the current item in the iteration.
  `array` is the dependant array itself.

  ```javascript
  function(item, index, array);
  ```

  ```javascript
  var Hamster = Ember.Object.extend({
    remainingChores: Ember.computed.filter('chores', function(chore, index, array) {
      return !chore.done;
    })
  });

  var hamster = Hamster.create({
    chores: [
      { name: 'cook', done: true },
      { name: 'clean', done: true },
      { name: 'write more unit tests', done: false }
    ]
  });

  hamster.get('remainingChores'); // [{name: 'write more unit tests', done: false}]
  ```

  @method filter
  @for Ember.computed
  @param {String} dependentKey
  @param {Function} callback
  @return {Ember.ComputedProperty} the filtered array
  @public
*/
export function filter(dependentKey, callback) {
  return arrayMacro(dependentKey, function(value) {
    return value.filter(callback, this);
  });
}

/**
  Filters the array by the property and value

  ```javascript
  var Hamster = Ember.Object.extend({
    remainingChores: Ember.computed.filterBy('chores', 'done', false)
  });

  var hamster = Hamster.create({
    chores: [
      { name: 'cook', done: true },
      { name: 'clean', done: true },
      { name: 'write more unit tests', done: false }
    ]
  });

  hamster.get('remainingChores'); // [{ name: 'write more unit tests', done: false }]
  ```

  @method filterBy
  @for Ember.computed
  @param {String} dependentKey
  @param {String} propertyKey
  @param {*} value
  @return {Ember.ComputedProperty} the filtered array
  @public
*/
export function filterBy(dependentKey, propertyKey, value) {
  var callback;

  if (arguments.length === 2) {
    callback = function(item) {
      return get(item, propertyKey);
    };
  } else {
    callback = function(item) {
      return get(item, propertyKey) === value;
    };
  }

  return filter(`${dependentKey}.@each.${propertyKey}`, callback);
}

/**
  A computed property which returns a new array with all the unique
  elements from one or more dependent arrays.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    uniqueFruits: Ember.computed.uniq('fruits')
  });

  var hamster = Hamster.create({
    fruits: [
      'banana',
      'grape',
      'kale',
      'banana'
    ]
  });

  hamster.get('uniqueFruits'); // ['banana', 'grape', 'kale']
  ```

  @method uniq
  @for Ember.computed
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  unique elements from the dependent array
  @public
*/
export function uniq(...args) {
  return multiArrayMacro(args, function(dependentKeys) {
    var uniq = Ember.A();

    dependentKeys.forEach(dependentKey => {
      var value = get(this, dependentKey);
      if (isArray(value)) {
        value.forEach(item => {
          if (uniq.indexOf(item) === -1) {
            uniq.push(item);
          }
        });
      }
    });

    return uniq;
  });
}

/**
  Alias for [Ember.computed.uniq](/api/#method_computed_uniq).

  @method union
  @for Ember.computed
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  unique elements from the dependent array
  @public
*/
export var union = uniq;

/**
  A computed property which returns a new array with all the duplicated
  elements from two or more dependent arrays.

  Example

  ```javascript
  var obj = Ember.Object.extend({
    friendsInCommon: Ember.computed.intersect('adaFriends', 'charlesFriends')
  }).create({
    adaFriends: ['Charles Babbage', 'John Hobhouse', 'William King', 'Mary Somerville'],
    charlesFriends: ['William King', 'Mary Somerville', 'Ada Lovelace', 'George Peacock']
  });

  obj.get('friendsInCommon'); // ['William King', 'Mary Somerville']
  ```

  @method intersect
  @for Ember.computed
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  duplicated elements from the dependent arrays
  @public
*/
export function intersect(...args) {
  return multiArrayMacro(args, function(dependentKeys) {
    var arrays = dependentKeys.map(dependentKey => {
      var array = get(this, dependentKey);

      return isArray(array) ? array : [];
    });

    var results = arrays.pop().filter(candidate => {
      for (var i = 0; i < arrays.length; i++) {
        var found = false;
        var array = arrays[i];
        for (var j = 0; j < array.length; j++) {
          if (array[j] === candidate) {
            found = true;
            break;
          }
        }

        if (found === false) { return false; }
      }

      return true;
    });


    return Ember.A(results);
  });
}


/**
  A computed property which returns a new array with all the
  properties from the first dependent array that are not in the second
  dependent array.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    likes: ['banana', 'grape', 'kale'],
    wants: Ember.computed.setDiff('likes', 'fruits')
  });

  var hamster = Hamster.create({
    fruits: [
      'grape',
      'kale',
    ]
  });

  hamster.get('wants'); // ['banana']
  ```

  @method setDiff
  @for Ember.computed
  @param {String} setAProperty
  @param {String} setBProperty
  @return {Ember.ComputedProperty} computes a new array with all the
  items from the first dependent array that are not in the second
  dependent array
  @public
*/
export function setDiff(setAProperty, setBProperty) {
  if (arguments.length !== 2) {
    throw new EmberError('setDiff requires exactly two dependent arrays.');
  }

  return computed(`${setAProperty}.[]`, `${setBProperty}.[]`, function() {
    var setA = this.get(setAProperty);
    var setB = this.get(setBProperty);

    if (!isArray(setA)) { return Ember.A(); }
    if (!isArray(setB)) { return Ember.A(setA); }

    return setA.filter(x => setB.indexOf(x) === -1);
  }).readOnly();
}

/**
  A computed property which returns a new array with all the
  properties from the first dependent array sorted based on a property
  or sort function.

  The callback method you provide should have the following signature:

  ```javascript
  function(itemA, itemB);
  ```

  - `itemA` the first item to compare.
  - `itemB` the second item to compare.

  This function should return negative number (e.g. `-1`) when `itemA` should come before
  `itemB`. It should return positive number (e.g. `1`) when `itemA` should come after
  `itemB`. If the `itemA` and `itemB` are equal this function should return `0`.

  Therefore, if this function is comparing some numeric values, simple `itemA - itemB` or
  `itemA.get( 'foo' ) - itemB.get( 'foo' )` can be used instead of series of `if`.

  Example

  ```javascript
  var ToDoList = Ember.Object.extend({
    // using standard ascending sort
    todosSorting: ['name'],
    sortedTodos: Ember.computed.sort('todos', 'todosSorting'),

    // using descending sort
    todosSortingDesc: ['name:desc'],
    sortedTodosDesc: Ember.computed.sort('todos', 'todosSortingDesc'),

    // using a custom sort function
    priorityTodos: Ember.computed.sort('todos', function(a, b){
      if (a.priority > b.priority) {
        return 1;
      } else if (a.priority < b.priority) {
        return -1;
      }

      return 0;
    })
  });

  var todoList = ToDoList.create({todos: [
    { name: 'Unit Test', priority: 2 },
    { name: 'Documentation', priority: 3 },
    { name: 'Release', priority: 1 }
  ]});

  todoList.get('sortedTodos');      // [{ name:'Documentation', priority:3 }, { name:'Release', priority:1 }, { name:'Unit Test', priority:2 }]
  todoList.get('sortedTodosDesc');  // [{ name:'Unit Test', priority:2 }, { name:'Release', priority:1 }, { name:'Documentation', priority:3 }]
  todoList.get('priorityTodos');    // [{ name:'Release', priority:1 }, { name:'Unit Test', priority:2 }, { name:'Documentation', priority:3 }]
  ```

  @method sort
  @for Ember.computed
  @param {String} itemsKey
  @param {String or Function} sortDefinition a dependent key to an
  array of sort properties (add `:desc` to the arrays sort properties to sort descending) or a function to use when sorting
  @return {Ember.ComputedProperty} computes a new sorted array based
  on the sort property array or callback function
  @public
*/
export function sort(itemsKey, sortDefinition) {
  assert(
    'Ember.computed.sort requires two arguments: an array key to sort and ' +
    'either a sort properties key or sort function',
    arguments.length === 2
  );

  if (typeof sortDefinition === 'function') {
    return customSort(itemsKey, sortDefinition);
  } else {
    return propertySort(itemsKey, sortDefinition);
  }
}

function customSort(itemsKey, comparator) {
  return arrayMacro(itemsKey, function(value) {
    return value.slice().sort((x, y) => comparator.call(this, x, y));
  });
}

// This one needs to dynamically set up and tear down observers on the itemsKey
// depending on the sortProperties
function propertySort(itemsKey, sortPropertiesKey) {
  var cp = new ComputedProperty(function(key) {
    function didChange() {
      this.notifyPropertyChange(key);
    }

    var items = itemsKey === '@this' ? this : get(this, itemsKey);
    var sortProperties = get(this, sortPropertiesKey);

    if (items === null || typeof items !== 'object') { return Ember.A(); }

    // TODO: Ideally we'd only do this if things have changed
    if (cp._sortPropObservers) {
      cp._sortPropObservers.forEach(args => removeObserver.apply(null, args));
    }

    cp._sortPropObservers = [];

    if (!isArray(sortProperties)) { return items; }

    // Normalize properties
    var normalizedSort = sortProperties.map(p => {
      let [prop, direction] = p.split(':');
      direction = direction || 'asc';

      return [prop, direction];
    });

    // TODO: Ideally we'd only do this if things have changed
    // Add observers
    normalizedSort.forEach(prop => {
      var args = [this, `${itemsKey}.@each.${prop[0]}`, didChange];
      cp._sortPropObservers.push(args);
      addObserver.apply(null, args);
    });

    return Ember.A(items.slice().sort((itemA, itemB) => {
      for (var i = 0; i < normalizedSort.length; ++i) {
        var [prop, direction] = normalizedSort[i];
        var result = compare(get(itemA, prop), get(itemB, prop));
        if (result !== 0) {
          return (direction === 'desc') ? (-1 * result) : result;
        }
      }

      return 0;
    }));
  });

  return cp.property(`${itemsKey}.[]`, `${sortPropertiesKey}.[]`).readOnly();
}
