require('ember-runtime/computed/array_computed');

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get,
    set = Ember.set,
    guidFor = Ember.guidFor,
    a_slice = [].slice,
    forEach = Ember.EnumerableUtils.forEach,
    map = Ember.EnumerableUtils.map;

/**
  A computed property that calculates the maximum value in the
  dependent array. This will return `-Infinity` when the dependent
  array is empty.

  Example

  ```javascript
  App.Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    maxChildAge: Ember.computed.max('childAges')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('maxChildAge'); // -Infinity
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('maxChildAge'); // 7
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('maxChildAge'); // 8
  ```

  @method computed.max
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the largest value in the dependentKey's array
*/
Ember.computed.max = function (dependentKey) {
  return Ember.reduceComputed.call(null, dependentKey, {
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
};

/**
  A computed property that calculates the minimum value in the
  dependent array. This will return `Infinity` when the dependent
  array is empty.

  Example

  ```javascript
  App.Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    minChildAge: Ember.computed.min('childAges')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('minChildAge'); // Infinity
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('minChildAge'); // 7
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('minChildAge'); // 5
  ```

  @method computed.min
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computes the smallest value in the dependentKey's array
*/
Ember.computed.min = function (dependentKey) {
  return Ember.reduceComputed.call(null, dependentKey, {
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
};

/**
  Returns an array mapped via the callback

  The callback method you provide should have the following signature:

  ```javascript
  function(item);
  ```

  - `item` is the current item in the iteration.

  Example

  ```javascript
  App.Hampster = Ember.Object.extend({
    excitingChores: Ember.computed.map('chores', function(chore) {
      return chore.toUpperCase() + '!';
    })
  });

  var hampster = App.Hampster.create({chores: ['cook', 'clean', 'write more unit tests']});
  hampster.get('excitingChores'); // ['COOK!', 'CLEAN!', 'WRITE MORE UNIT TESTS!']
  ```

  @method computed.map
  @for Ember
  @param {String} dependentKey
  @param {Function} callback
  @return {Ember.ComputedProperty} an array mapped via the callback
*/
Ember.computed.map = function(dependentKey, callback) {
  var options = {
    addedItem: function(array, item, changeMeta, instanceMeta) {
      var mapped = callback(item);
      array.insertAt(changeMeta.index, mapped);
      return array;
    },
    removedItem: function(array, item, changeMeta, instanceMeta) {
      array.removeAt(changeMeta.index, 1);
      return array;
    }
  };

  return Ember.arrayComputed(dependentKey, options);
};

/**
  Returns an array mapped to the specified key.

  Example

  ```javascript
  App.Person = Ember.Object.extend({
    childAges: Ember.computed.mapBy('children', 'age'),
    minChildAge: Ember.computed.min('childAges')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('childAge'); // []
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('childAge'); // [7]
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('childAge'); // [7, 5, 8]
  ```

  @method computed.mapBy
  @for Ember
  @param {String} dependentKey
  @param {String} propertyKey
  @return {Ember.ComputedProperty} an array mapped to the specified key
*/
Ember.computed.mapBy = function(dependentKey, propertyKey) {
  var callback = function(item) { return get(item, propertyKey); };
  return Ember.computed.map(dependentKey + '.@each.' + propertyKey, callback);
};

/**
  @method computed.mapProperty
  @for Ember
  @deprecated Use `Ember.computed.mapBy` instead
  @param dependentKey
  @param propertyKey
*/
Ember.computed.mapProperty = Ember.computed.mapBy;

/**
  Filters the array by the callback.

  The callback method you provide should have the following signature:

  ```javascript
  function(item);
  ```

  - `item` is the current item in the iteration.

  Example

  ```javascript
  App.Hampster = Ember.Object.extend({
    remainingChores: Ember.computed.filter('chores', function(chore) {
      return !chore.done;
    })
  });

  var hampster = App.Hampster.create({chores: [
    {name: 'cook', done: true},
    {name: 'clean', done: true},
    {name: 'write more unit tests', done: false}
  ]});
  hampster.get('remainingChores'); // [{name: 'write more unit tests', done: false}]
  ```

  @method computed.filter
  @for Ember
  @param {String} dependentKey
  @param {Function} callback
  @return {Ember.ComputedProperty} the filtered array
*/
Ember.computed.filter = function(dependentKey, callback) {
  var options = {
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.filteredArrayIndexes = new Ember.SubArray();
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var match = !!callback(item),
          filterIndex = instanceMeta.filteredArrayIndexes.addItem(changeMeta.index, match);

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

  return Ember.arrayComputed(dependentKey, options);
};

/**
  Filters the array by the property and value

  Example

  ```javascript
  App.Hampster = Ember.Object.extend({
    remainingChores: Ember.computed.filterBy('chores', 'done', false)
  });

  var hampster = App.Hampster.create({chores: [
    {name: 'cook', done: true},
    {name: 'clean', done: true},
    {name: 'write more unit tests', done: false}
  ]});
  hampster.get('remainingChores'); // [{name: 'write more unit tests', done: false}]
  ```

  @method computed.filterBy
  @for Ember
  @param {String} dependentKey
  @param {String} propertyKey
  @param {String} value
  @return {Ember.ComputedProperty} the filtered array
*/
Ember.computed.filterBy = function(dependentKey, propertyKey, value) {
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

  return Ember.computed.filter(dependentKey + '.@each.' + propertyKey, callback);
};

/**
  @method computed.filterProperty
  @for Ember
  @param dependentKey
  @param propertyKey
  @param value
  @deprecated Use `Ember.computed.filterBy` instead
*/
Ember.computed.filterProperty = Ember.computed.filterBy;

/**
  A computed property which returns a new array with all the unique
  elements from one or more dependent arrays.

  Example

  ```javascript
  App.Hampster = Ember.Object.extend({
    uniqueFruits: Ember.computed.uniq('fruits')
  });

  var hampster = App.Hampster.create({fruits: [
    'banana',
    'grape',
    'kale',
    'banana'
  ]});
  hampster.get('uniqueFruits'); // ['banana', 'grape', 'kale']
  ```

  @method computed.uniq
  @for Ember
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  unique elements from the dependent array
*/
Ember.computed.uniq = function() {
  var args = a_slice.call(arguments);
  args.push({
    initialize: function(array, changeMeta, instanceMeta) {
      instanceMeta.itemCounts = {};
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var guid = guidFor(item);

      if (!instanceMeta.itemCounts[guid]) {
        instanceMeta.itemCounts[guid] = 1;
      } else {
        ++instanceMeta.itemCounts[guid];
      }
      array.addObject(item);
      return array;
    },
    removedItem: function(array, item, _, instanceMeta) {
      var guid = guidFor(item),
          itemCounts = instanceMeta.itemCounts;

      if (--itemCounts[guid] === 0) {
        array.removeObject(item);
      }
      return array;
    }
  });
  return Ember.arrayComputed.apply(null, args);
};

/**
  Alias for [Ember.computed.uniq](/api/#method_computed_uniq).

  @method computed.union
  @for Ember
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  unique elements from the dependent array
*/
Ember.computed.union = Ember.computed.uniq;

/**
  A computed property which returns a new array with all the duplicated
  elements from two or more dependeny arrays.

  Example

  ```javascript
  var obj = Ember.Object.createWithMixins({
    adaFriends: ['Charles Babbage', 'John Hobhouse', 'William King', 'Mary Somerville'],
    charlesFriends: ['William King', 'Mary Somerville', 'Ada Lovelace', 'George Peacock'],
    friendsInCommon: Ember.computed.intersect('adaFriends', 'charlesFriends')
  });

  obj.get('friendsInCommon'); // ['William King', 'Mary Somerville']
  ```

  @method computed.intersect
  @for Ember
  @param {String} propertyKey*
  @return {Ember.ComputedProperty} computes a new array with all the
  duplicated elements from the dependent arrays
*/
Ember.computed.intersect = function () {
  var getDependentKeyGuids = function (changeMeta) {
    return map(changeMeta.property._dependentKeys, function (dependentKey) {
      return guidFor(dependentKey);
    });
  };

  var args = a_slice.call(arguments);
  args.push({
    initialize: function (array, changeMeta, instanceMeta) {
      instanceMeta.itemCounts = {};
    },

    addedItem: function(array, item, changeMeta, instanceMeta) {
      var itemGuid = guidFor(item),
          dependentGuids = getDependentKeyGuids(changeMeta),
          dependentGuid = guidFor(changeMeta.arrayChanged),
          numberOfDependentArrays = changeMeta.property._dependentKeys.length,
          itemCounts = instanceMeta.itemCounts;

      if (!itemCounts[itemGuid]) { itemCounts[itemGuid] = {}; }
      if (itemCounts[itemGuid][dependentGuid] === undefined) { itemCounts[itemGuid][dependentGuid] = 0; }

      if (++itemCounts[itemGuid][dependentGuid] === 1 &&
          numberOfDependentArrays === Ember.keys(itemCounts[itemGuid]).length) {

        array.addObject(item);
      }
      return array;
    },
    removedItem: function(array, item, changeMeta, instanceMeta) {
      var itemGuid = guidFor(item),
          dependentGuids = getDependentKeyGuids(changeMeta),
          dependentGuid = guidFor(changeMeta.arrayChanged),
          numberOfDependentArrays = changeMeta.property._dependentKeys.length,
          numberOfArraysItemAppearsIn,
          itemCounts = instanceMeta.itemCounts;

      if (itemCounts[itemGuid][dependentGuid] === undefined) { itemCounts[itemGuid][dependentGuid] = 0; }
      if (--itemCounts[itemGuid][dependentGuid] === 0) {
        delete itemCounts[itemGuid][dependentGuid];
        numberOfArraysItemAppearsIn = Ember.keys(itemCounts[itemGuid]).length;

        if (numberOfArraysItemAppearsIn === 0) {
          delete itemCounts[itemGuid];
        }
        array.removeObject(item);
      }
      return array;
    }
  });
  return Ember.arrayComputed.apply(null, args);
};

/**
  A computed property which returns a new array with all the
  properties from the first dependent array that are not in the second
  dependent array.

  Example

  ```javascript
  App.Hampster = Ember.Object.extend({
    likes: ['banana', 'grape', 'kale'],
    wants: Ember.computed.setDiff('likes', 'fruits')
  });

  var hampster = App.Hampster.create({fruits: [
    'grape',
    'kale',
  ]});
  hampster.get('wants'); // ['banana']
  ```

  @method computed.setDiff
  @for Ember
  @param {String} setAProperty
  @param {String} setBProperty
  @return {Ember.ComputedProperty} computes a new array with all the
  items from the first dependent array that are not in the second
  dependent array
*/
Ember.computed.setDiff = function (setAProperty, setBProperty) {
  if (arguments.length !== 2) {
    throw new Error("setDiff requires exactly two dependent arrays.");
  }
  return Ember.arrayComputed.call(null, setAProperty, setBProperty, {
    addedItem: function (array, item, changeMeta, instanceMeta) {
      var setA = get(this, setAProperty),
          setB = get(this, setBProperty);

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
      var setA = get(this, setAProperty),
          setB = get(this, setBProperty);

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
};

function binarySearch(array, item, low, high) {
  var mid, midItem, res;

  if (arguments.length < 4) { high = get(array, 'length'); }
  if (arguments.length < 3) { low = 0; }

  if (low === high) {
    return low;
  }

  mid = low + Math.floor((high - low) / 2);
  midItem = array.objectAt(mid);

  if (isProxyContent(item, midItem)) {
    return mid;
  }
  res = this.order(midItem, item);

  if (res < 0) {
    return this.binarySearch(array, item, mid+1, high);
  } else if (res > 0) {
    return this.binarySearch(array, item, low, mid);
  }

  return mid;


  function isProxyContent(searchItem, item) {
    if (Ember.ObjectProxy.detectInstance(searchItem)) {
      return guidFor(get(searchItem, 'content')) === guidFor(item);
    }

    return false;
  }
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

  This function should return `-1` when `itemA` should come before
  `itemB`. It should return `1` when `itemA` should come after
  `itemB`. If the `itemA` and `itemB` are equal this function should return `0`.

  Example

  ```javascript
  var ToDoList = Ember.Object.extend({
    todosSorting: ['name'],
    sortedTodos: Ember.computed.sort('todos', 'todosSorting'),
    priorityTodos: Ember.computed.sort('todos', function(a, b){
      if (a.priority > b.priority) {
        return 1;
      } else if (a.priority < b.priority) {
        return -1;
      }
      return 0;
    }),
  });
  var todoList = ToDoList.create({todos: [
    {name: 'Unit Test', priority: 2},
    {name: 'Documentation', priority: 3},
    {name: 'Release', priority: 1}
  ]});

  todoList.get('sortedTodos'); // [{name:'Documentation', priority:3}, {name:'Release', priority:1}, {name:'Unit Test', priority:2}]
  todoList.get('priroityTodos'); // [{name:'Release', priority:1}, {name:'Unit Test', priority:2}, {name:'Documentation', priority:3}]
  ```

  @method computed.sort
  @for Ember
  @param {String} dependentKey
  @param {String or Function} sortDefinition a dependent key to an
  array of sort properties or a function to use when sorting
  @return {Ember.ComputedProperty} computes a new sorted array based
  on the sort property array or callback function
*/
Ember.computed.sort = function (itemsKey, sortDefinition) {
  Ember.assert("Ember.computed.sort requires two arguments: an array key to sort and either a sort properties key or sort function", arguments.length === 2);

  var initFn, sortPropertiesKey;

  if (typeof sortDefinition === 'function') {
    initFn = function (array, changeMeta, instanceMeta) {
      instanceMeta.order = sortDefinition;
      instanceMeta.binarySearch = binarySearch;
    };
  } else {
    sortPropertiesKey = sortDefinition;
    initFn = function (array, changeMeta, instanceMeta) {
      function setupSortProperties() {
        var sortPropertyDefinitions = get(this, sortPropertiesKey),
            sortProperty,
            sortProperties = instanceMeta.sortProperties = [],
            sortPropertyAscending = instanceMeta.sortPropertyAscending = {},
            idx,
            asc;

        Ember.assert("Cannot sort: '" + sortPropertiesKey + "' is not an array.", Ember.isArray(sortPropertyDefinitions));

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
        Ember.run.once(this, updateSortProperties, changeMeta.propertyName);
      }

      function updateSortProperties(propertyName) {
        setupSortProperties.call(this);
        changeMeta.property.recomputeOnce.call(this, propertyName);
      }

      Ember.addObserver(this, sortPropertiesKey, updateSortPropertiesOnce);

      setupSortProperties.call(this);


      instanceMeta.order = function (itemA, itemB) {
        var sortProperty, result, asc;
        for (var i = 0; i < this.sortProperties.length; ++i) {
          sortProperty = this.sortProperties[i];
          result = Ember.compare(get(itemA, sortProperty), get(itemB, sortProperty));

          if (result !== 0) {
            asc = this.sortPropertyAscending[sortProperty];
            return asc ? result : (-1 * result);
          }
        }

        return 0;
      };

      instanceMeta.binarySearch = binarySearch;
    };
  }

  return Ember.arrayComputed.call(null, itemsKey, {
    initialize: initFn,

    addedItem: function (array, item, changeMeta, instanceMeta) {
      var index = instanceMeta.binarySearch(array, item);
      array.insertAt(index, item);
      return array;
    },

    removedItem: function (array, item, changeMeta, instanceMeta) {
      var proxyProperties, index, searchItem;

      if (changeMeta.keyChanged) {
        proxyProperties = { content: item };
        proxyProperties[changeMeta.keyChanged] = changeMeta.previousValue;

        searchItem = Ember.ObjectProxy.create(proxyProperties);
     } else {
       searchItem = item;
     }

      index = instanceMeta.binarySearch(array, searchItem);
      array.removeAt(index);
      return array;
    }
  });
};
