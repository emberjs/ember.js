/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.assert
import { get } from 'ember-metal/property_get';
import { isArray } from 'ember-metal/utils';
import EmberError from 'ember-metal/error';
import {
  forEach,
  addObject,
  indexOf,
  intersection,
  map as utilMap,
  filter as utilFilter
} from 'ember-metal/enumerable_utils';
import { ComputedProperty, computed } from "ember-metal/computed";
import { addObserver, removeObserver } from "ember-metal/observer";
import compare from 'ember-runtime/compare';

var a_slice = [].slice;

// TODO: Consider putting this with other array shims
function reduce(array, callback /*, initialValue*/) {
  if (array.reduce) {
    var args = a_slice.apply(arguments);
    args.shift();

    return array.reduce.apply(array, args);
  }

  if (array == null) {
    throw new TypeError('reduce called on null or undefined');
  }
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  var t = Object(array);
  var len = t.length >>> 0;
  var k = 0;
  var value;

  if (arguments.length === 3) {
    value = arguments[2];
  } else {
    while (k < len && !(k in t)) {
      k++;
    }
    if (k >= len) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    value = t[k++];
  }
  for (; k < len; k++) {
    if (k in t) {
      value = callback(value, t[k], k, t);
    }
  }
  return value;
}

function reduceMacro(dependentKey, callback, initialValue) {
  return computed(dependentKey+'.[]', function() {
    var value = get(this, dependentKey);
    return reduce(value, callback, initialValue);
  });
}

function arrayMacro(dependentKey, callback) {
  // This is a bit ugly
  var fullKey = dependentKey;
  if (/@each/.test(fullKey)) {
    dependentKey = fullKey.replace(/\.@each.*$/, '');
  } else {
    fullKey += '.[]';
  }

  return computed(fullKey, function() {
    var value = get(this, dependentKey);
    if (isArray(value)) {
      return callback(value);
    } else {
      // Is this right?
      return [];
    }
  });
}

function multiArrayMacro(dependentKeys, callback) {
  var args = utilMap(dependentKeys, function(key) { return key + '.[]'; });

  var func = function() {
    return callback.call(this, dependentKeys);
  };

  args.push(func);

  return computed.apply(this, args);
}

/**
 A computed property that returns the sum of the value
 in the dependent array.

 @method sum
 @for Ember.computed
 @param {String} dependentKey
 @return {Ember.ComputedProperty} computes the sum of all values in the dependentKey's array
 @since 1.4.0
*/

export function sum(dependentKey) {
  return reduceMacro(dependentKey, function(sum, item) {
    return sum + item;
  }, 0);
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
*/
export function max(dependentKey) {
  return reduceMacro(dependentKey, function(max, item) {
    return Math.max(max, item);
  }, -Infinity);
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
*/
export function min(dependentKey) {
  return reduceMacro(dependentKey, function(min, item) {
    return Math.min(min, item);
  }, Infinity);
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
*/
export function map(dependentKey, callback) {
  return arrayMacro(dependentKey, function(value) {
    return utilMap(value, callback);
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
*/
export function mapBy(dependentKey, propertyKey) {
  var callback = function(item) { return get(item, propertyKey); };
  return map(dependentKey + '.@each.' + propertyKey, callback);
}

/**
  @method mapProperty
  @for Ember.computed
  @deprecated Use `Ember.computed.mapBy` instead
  @param dependentKey
  @param propertyKey
*/
export function mapProperty() {
  Ember.deprecate('Ember.computed.mapProperty is deprecated. Please use Ember.computed.mapBy.');
  return mapBy.apply(this, arguments);
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
*/
export function filter(dependentKey, callback) {
  return arrayMacro(dependentKey, function(value) {
    return utilFilter(value, callback);
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

  return filter(dependentKey + '.@each.' + propertyKey, callback);
}

/**
  @method filterProperty
  @for Ember.computed
  @param dependentKey
  @param propertyKey
  @param value
  @deprecated Use `Ember.computed.filterBy` instead
*/
export function filterProperty() {
  Ember.deprecate('Ember.computed.filterProperty is deprecated. Please use Ember.computed.filterBy.');
  return filterBy.apply(this, arguments);
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
*/
export function uniq() {
  return multiArrayMacro(a_slice.apply(arguments), function(dependentKeys) {
    var uniq = [];

    forEach(dependentKeys, function(dependentKey) {
      var value = get(this, dependentKey);
      if (isArray(value)) {
        value.forEach(function(item) {
          addObject(uniq, item);
        });
      }
    }, this);

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
*/
export var union = uniq;

/**
  A computed property which returns a new array with all the duplicated
  elements from two or more dependent arrays.

  Example

  ```javascript
  var obj = Ember.Object.createWithMixins({
    adaFriends: ['Charles Babbage', 'John Hobhouse', 'William King', 'Mary Somerville'],
    charlesFriends: ['William King', 'Mary Somerville', 'Ada Lovelace', 'George Peacock'],
    friendsInCommon: Ember.computed.intersect('adaFriends', 'charlesFriends')
  });

  obj.get('friendsInCommon'); // ['William King', 'Mary Somerville']
  ```

  @method intersect
  @for Ember.computed
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  duplicated elements from the dependent arrays
*/
export function intersect() {
  return multiArrayMacro(a_slice.apply(arguments), function(dependentKeys) {
    var arrays = utilMap(dependentKeys, function(dependentKey) {
      var array = get(this, dependentKey);
      return isArray(array) ? array : [];
    }, this);

    return reduce(arrays, function(values, array) {
      return intersection(values, array);
    });
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
*/
export function setDiff(setAProperty, setBProperty) {
  if (arguments.length !== 2) {
    throw new EmberError('setDiff requires exactly two dependent arrays.');
  }

  return computed(setAProperty+'.[]', setBProperty+'.[]', function() {
    var setA = this.get(setAProperty);
    var setB = this.get(setBProperty);

    if (!isArray(setA)) { return []; }
    if (!isArray(setB)) { return setA; }

    var res = [];

    forEach(setA, function(item) {
      if (indexOf(setB, item) === -1) {
        res.push(item);
      }
    });

    return res;
  });
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
  @param {String} dependentKey
  @param {String or Function} sortDefinition a dependent key to an
  array of sort properties (add `:desc` to the arrays sort properties to sort descending) or a function to use when sorting
  @return {Ember.ComputedProperty} computes a new sorted array based
  on the sort property array or callback function
*/
export function sort(itemsKey, sortDefinition) {
  Ember.assert('Ember.computed.sort requires two arguments: an array key to sort and ' +
    'either a sort properties key or sort function', arguments.length === 2);

  if (typeof sortDefinition === 'function') {
    return customSort(itemsKey, sortDefinition);
  } else {
    return propertySort(itemsKey, sortDefinition);
  }
}

function customSort(itemsKey, comparator) {
  return arrayMacro(itemsKey, function(value) {
    return value.slice().sort(comparator);
  });
}

// This one needs to dynamically set up and tear down observers on the itemsKey depending on the sortProperties
function propertySort(itemsKey, sortPropertiesKey) {
  var cp = new ComputedProperty(function(key) {
    function didChange() {
      this.notifyPropertyChange(key);
    }

    var items = itemsKey === '@this' ? this : get(this, itemsKey);
    var sortProperties = get(this, sortPropertiesKey);

    // TODO: Ideally we'd only do this if things have changed
    if (cp._sortPropObservers) {
      forEach(cp._sortPropObservers, function(args) {
        removeObserver.apply(null, args);
      });
    }

    cp._sortPropObservers = [];

    if (!isArray(sortProperties)) { return items; }

    // Normalize properties
    var normalizedSort = utilMap(sortProperties, function(prop) {
      var sortParts = prop.split(':');
      var sortProp = sortParts[0];
      var sortDirection = sortParts[1] || 'asc';
      return [sortProp, sortDirection];
    });

    // TODO: Ideally we'd only do this if things have changed
    // Add observers
    forEach(normalizedSort, function(prop) {
      var args = [this, itemsKey+'.@each.'+prop[0], didChange];
      cp._sortPropObservers.push(args);
      addObserver.apply(null, args);
    }, this);

    return items.slice().sort(function (itemA, itemB) {
      for (var i = 0; i < normalizedSort.length; ++i) {
        var prop = normalizedSort[i];
        var result = compare(get(itemA, prop[0]), get(itemB, prop[0]));
        if (result !== 0) {
          return (prop[1] === 'desc') ? (-1 * result) : result;
        }
      }

      return 0;
    });
  });

  return cp.property(itemsKey+'.[]', sortPropertiesKey+'.[]');
}
