/**
@module ember
@submodule ember-runtime
*/

import Ember from 'ember-metal/core'; // Ember.assert
import { get } from 'ember-metal/property_get';
import {
  isArray,
  guidFor
} from 'ember-metal/utils';
import EmberError from 'ember-metal/error';
import {
  forEach
} from 'ember-metal/enumerable_utils';
import run from 'ember-metal/run_loop';
import { addObserver } from 'ember-metal/observer';
import { arrayComputed } from 'ember-runtime/computed/array_computed';
import { reduceComputed } from 'ember-runtime/computed/reduce_computed';
import SubArray from 'ember-runtime/system/subarray';
import keys from 'ember-metal/keys';
import compare from 'ember-runtime/compare';

var a_slice = [].slice;

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
  return reduceComputed(dependentKey, {
    initialValue: 0,

    addedItem: function(accumulatedValue, item, changeMeta, instanceMeta) {
      return accumulatedValue + item;
    },

    removedItem: function(accumulatedValue, item, changeMeta, instanceMeta) {
      return accumulatedValue - item;
    }
  });
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
  return reduceComputed(dependentKey, {
    initialValue: -Infinity,

    addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      return Math.max(accumulatedValue, item);
    },

    removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      if (item < accumulatedValue) {
        return accumulatedValue;
      }
    }
  });
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
  return reduceComputed(dependentKey, {
    initialValue: Infinity,

    addedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      return Math.min(accumulatedValue, item);
    },

    removedItem: function (accumulatedValue, item, changeMeta, instanceMeta) {
      if (item > accumulatedValue) {
        return accumulatedValue;
      }
    }
  });
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
  var options = {
    addedItem: function(array, item, changeMeta, instanceMeta) {
      var mapped = callback.call(this, item, changeMeta.index);
      array.insertAt(changeMeta.index, mapped);
      return array;
    },
    removedItem: function(array, item, changeMeta, instanceMeta) {
      array.removeAt(changeMeta.index, 1);
      return array;
    }
  };

  return arrayComputed(dependentKey, options);
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
export var mapProperty = mapBy;

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
  var options = {
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.filteredArrayIndexes = new SubArray();
    },

    addedItem: function (array, item, changeMeta, instanceMeta) {
      var match = !!callback.call(this, item, changeMeta.index, changeMeta.arrayChanged);
      var filterIndex = instanceMeta.filteredArrayIndexes.addItem(changeMeta.index, match);

      if (match) {
        array.insertAt(filterIndex, item);
      }

      return array;
    },

    removedItem: function(array, item, changeMeta, instanceMeta) {
      var filterIndex = instanceMeta.filteredArrayIndexes.removeItem(changeMeta.index);

      if (filterIndex > -1) {
        array.removeAt(filterIndex);
      }

      return array;
    }
  };

  return arrayComputed(dependentKey, options);
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
export var filterProperty = filterBy;

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
  var args = a_slice.call(arguments);

  args.push({
    initialize: function(array, changeMeta, instanceMeta) {
      instanceMeta.itemCounts = {};
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var guid = guidFor(item);

      if (!instanceMeta.itemCounts[guid]) {
        instanceMeta.itemCounts[guid] = 1;
        array.pushObject(item);
      } else {
        ++instanceMeta.itemCounts[guid];
      }
      return array;
    },

    removedItem: function(array, item, _, instanceMeta) {
      var guid = guidFor(item);
      var itemCounts = instanceMeta.itemCounts;

      if (--itemCounts[guid] === 0) {
        array.removeObject(item);
      }

      return array;
    }
  });

  return arrayComputed.apply(null, args);
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
  var args = a_slice.call(arguments);

  args.push({
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.itemCounts = {};
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var itemGuid = guidFor(item);
      var dependentGuid = guidFor(changeMeta.arrayChanged);
      var numberOfDependentArrays = changeMeta.property._dependentKeys.length;
      var itemCounts = instanceMeta.itemCounts;

      if (!itemCounts[itemGuid]) {
        itemCounts[itemGuid] = {};
      }

      if (itemCounts[itemGuid][dependentGuid] === undefined) {
        itemCounts[itemGuid][dependentGuid] = 0;
      }

      if (++itemCounts[itemGuid][dependentGuid] === 1 &&
          numberOfDependentArrays === keys(itemCounts[itemGuid]).length) {
        array.addObject(item);
      }

      return array;
    },

    removedItem: function(array, item, changeMeta, instanceMeta) {
      var itemGuid = guidFor(item);
      var dependentGuid = guidFor(changeMeta.arrayChanged);
      var numberOfArraysItemAppearsIn;
      var itemCounts = instanceMeta.itemCounts;

      if (itemCounts[itemGuid][dependentGuid] === undefined) {
        itemCounts[itemGuid][dependentGuid] = 0;
      }

      if (--itemCounts[itemGuid][dependentGuid] === 0) {
        delete itemCounts[itemGuid][dependentGuid];
        numberOfArraysItemAppearsIn = keys(itemCounts[itemGuid]).length;

        if (numberOfArraysItemAppearsIn === 0) {
          delete itemCounts[itemGuid];
        }

        array.removeObject(item);
      }

      return array;
    }
  });

  return arrayComputed.apply(null, args);
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

  return arrayComputed(setAProperty, setBProperty, {
    addedItem: function (array, item, changeMeta, instanceMeta) {
      var setA = get(this, setAProperty);
      var setB = get(this, setBProperty);

      if (changeMeta.arrayChanged === setA) {
        if (!setB.contains(item)) {
          array.addObject(item);
        }
      } else {
        array.removeObject(item);
      }

      return array;
    },

    removedItem: function (array, item, changeMeta, instanceMeta) {
      var setA = get(this, setAProperty);
      var setB = get(this, setBProperty);

      if (changeMeta.arrayChanged === setB) {
        if (setA.contains(item)) {
          array.addObject(item);
        }
      } else {
        array.removeObject(item);
      }

      return array;
    }
  });
}

/**
  Alias for [Ember.computed.setDiff](/api/#method_computed_setDiff).

  @method difference
  @for Ember.computed
  @param {String} setAProperty
  @param {String} setBProperty
  @return {Ember.ComputedProperty} computes a new array with all the
  items from the first dependent array that are not in the second
  dependent array
*/
export var difference = setDiff;

function binarySearch(array, item, low, high) {
  var mid, midItem, res, guidMid, guidItem;

  if (arguments.length < 4) {
    high = get(array, 'length');
  }

  if (arguments.length < 3) {
    low = 0;
  }

  if (low === high) {
    return low;
  }

  mid = low + Math.floor((high - low) / 2);
  midItem = array.objectAt(mid);

  guidMid = guidFor(midItem);
  guidItem = guidFor(item);

  if (guidMid === guidItem) {
    return mid;
  }

  res = this.order(midItem, item);

  if (res === 0) {
    res = guidMid < guidItem ? -1 : 1;
  }


  if (res < 0) {
    return this.binarySearch(array, item, mid+1, high);
  } else if (res > 0) {
    return this.binarySearch(array, item, low, mid);
  }

  return mid;
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
  return arrayComputed(itemsKey, {
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.order = comparator;
      instanceMeta.binarySearch = binarySearch;
      instanceMeta.waitingInsertions = [];
      instanceMeta.insertWaiting = function() {
        var index, item;
        var waiting = instanceMeta.waitingInsertions;
        instanceMeta.waitingInsertions = [];
        for (var i=0; i<waiting.length; i++) {
          item = waiting[i];
          index = instanceMeta.binarySearch(array, item);
          array.insertAt(index, item);
        }
      };
      instanceMeta.insertLater = function(item) {
        this.waitingInsertions.push(item);
      };
    },

    addedItem: function (array, item, changeMeta, instanceMeta) {
      instanceMeta.insertLater(item);
      return array;
    },

    removedItem: function (array, item, changeMeta, instanceMeta) {
      array.removeObject(item);
      return array;
    },

    flushedChanges: function(array, instanceMeta) {
      instanceMeta.insertWaiting();
    }
  });
}

function propertySort(itemsKey, sortPropertiesKey) {
  return arrayComputed(itemsKey, {
    initialize: function (array, changeMeta, instanceMeta) {
      function setupSortProperties() {
        var sortPropertyDefinitions = get(this, sortPropertiesKey);
        var sortProperties = instanceMeta.sortProperties = [];
        var sortPropertyAscending = instanceMeta.sortPropertyAscending = {};
        var sortProperty, idx, asc;

        Ember.assert('Cannot sort: \'' + sortPropertiesKey + '\' is not an array.',
                     isArray(sortPropertyDefinitions));

        changeMeta.property.clearItemPropertyKeys(itemsKey);

        forEach(sortPropertyDefinitions, function (sortPropertyDefinition) {
          if ((idx = sortPropertyDefinition.indexOf(':')) !== -1) {
            sortProperty = sortPropertyDefinition.substring(0, idx);
            asc = sortPropertyDefinition.substring(idx+1).toLowerCase() !== 'desc';
          } else {
            sortProperty = sortPropertyDefinition;
            asc = true;
          }

          sortProperties.push(sortProperty);
          sortPropertyAscending[sortProperty] = asc;
          changeMeta.property.itemPropertyKey(itemsKey, sortProperty);
        });

        sortPropertyDefinitions.addObserver('@each', this, updateSortPropertiesOnce);
      }

      function updateSortPropertiesOnce() {
        run.once(this, updateSortProperties, changeMeta.propertyName);
      }

      function updateSortProperties(propertyName) {
        setupSortProperties.call(this);
        changeMeta.property.recomputeOnce.call(this, propertyName);
      }

      addObserver(this, sortPropertiesKey, updateSortPropertiesOnce);
      setupSortProperties.call(this);

      instanceMeta.order = function (itemA, itemB) {
        var sortProperty, result, asc;
        var keyA = this.keyFor(itemA);
        var keyB = this.keyFor(itemB);

        for (var i = 0; i < this.sortProperties.length; ++i) {
          sortProperty = this.sortProperties[i];

          result = compare(keyA[sortProperty], keyB[sortProperty]);

          if (result !== 0) {
            asc = this.sortPropertyAscending[sortProperty];
            return asc ? result : (-1 * result);
          }
        }

        return 0;
      };

      instanceMeta.binarySearch = binarySearch;
      setupKeyCache(instanceMeta);
    },

    addedItem: function (array, item, changeMeta, instanceMeta) {
      var index = instanceMeta.binarySearch(array, item);
      array.insertAt(index, item);
      return array;
    },

    removedItem: function (array, item, changeMeta, instanceMeta) {
      var index = instanceMeta.binarySearch(array, item);
      array.removeAt(index);
      instanceMeta.dropKeyFor(item);
      return array;
    }
  });
}

function setupKeyCache(instanceMeta) {
  instanceMeta.keyFor = function(item) {
    var guid = guidFor(item);
    if (this.keyCache[guid]) {
      return this.keyCache[guid];
    }
    var sortProperty;
    var key = {};
    for (var i = 0; i < this.sortProperties.length; ++i) {
      sortProperty = this.sortProperties[i];
      key[sortProperty] = get(item, sortProperty);
    }
    return this.keyCache[guid] = key;
  };

  instanceMeta.dropKeyFor = function(item) {
    var guid = guidFor(item);
    this.keyCache[guid] = null;
  };

  instanceMeta.keyCache = {};
}
