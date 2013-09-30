require('ember-runtime/computed/array_computed');

/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get,
    set = Ember.set,
    guidFor = Ember.guidFor,
    merge = Ember.merge,
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
      var mapped = callback.call(this, item);
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
    childAges: Ember.computed.mapBy('children', 'age')
  });

  var lordByron = App.Person.create({children: []});
  lordByron.get('childAges'); // []
  lordByron.get('children').pushObject({name: 'Augusta Ada Byron', age: 7});
  lordByron.get('childAges'); // [7]
  lordByron.get('children').pushObjects([{name: 'Allegra Byron', age: 5}, {name: 'Elizabeth Medora Leigh', age: 8}]);
  lordByron.get('childAges'); // [7, 5, 8]
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
      var match = !!callback.call(this, item),
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
  var mid, midItem, res, guidMid, guidItem;

  if (arguments.length < 4) { high = get(array, 'length'); }
  if (arguments.length < 3) { low = 0; }

  if (low === high) {
    return low;
  }

  mid = low + Math.floor((high - low) / 2);
  midItem = array.objectAt(mid);

  guidMid = _guidFor(midItem);
  guidItem = _guidFor(item);

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

  function _guidFor(item) {
    if (Ember.ObjectProxy.detectInstance(item)) {
      return guidFor(get(item, 'content'));
    }
    return guidFor(item);
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
  todoList.get('priorityTodos'); // [{name:'Release', priority:1}, {name:'Unit Test', priority:2}, {name:'Documentation', priority:3}]
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

      if (changeMeta.previousValues) {
        proxyProperties = merge({ content: item }, changeMeta.previousValues);

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

/**
  A computed property which takes an array of arrays, flatten single
  level of them and returns the result.

  Optionally, it can take a list of objects, get a property from
  each object (which is expected to be an array) and return one
  array being a concatenation of those partial ones.

  Example

  ```javascript
  var item1 = Ember.Object.create({
    tags: [ 'important', 'bug', 'task' ],
  });

  var item2 = Ember.Object.create({
    tags: [ 'urgent', 'feature', 'task' ],
  });

  App.ItemList = Ember.ArrayProxy.extend({
    allTags: Ember.computed.flattenArray( 'content', 'tags' )
  });

  var myList = App.ItemList.create({ content: [ item1, item2 ] });
  myList.get( 'allTags' );
  // -> ["important", "bug", "task", "urgent", "feature", "task"]
  ```

  To use without a key:

  ```javascript
  App.ItemList = Ember.ArrayProxy.extend({
    tagMap: Ember.computed.mapBy( 'content', 'tags' );
    allTags: Ember.computed.flattenArray( 'tagMap' )
  });

  var myList = App.ItemList.create({ content: [ item1, item2 ] });
  myList.get( 'allTags' );
  // -> ["important", "bug", "task", "urgent", "feature", "task"]
  ```

  @method computed.flattenArray
  @for Ember
  @param {String} sourceArrayProperty
  @param {String} (optional) if given, values from sourceArray are
  treated as objects, and property named by the `key` will be extracted
  from them. If `key` is not given, the values from sourceArray are
  expected to be the arrays to be flattened.
  @return {Ember.ComputedProperty} computes a new flattened array from
  the input
*/

Ember.computed.flattenArray = function(nestedArray, key) {
  return Ember.arrayComputed(nestedArray, {
    initialize: function(array, changeMeta, instanceMeta) {
      instanceMeta.lengths = [];
      instanceMeta.listeners = [];
      return array;
    },
    addedItem: function(array, item, changeMeta, instanceMeta) {
      var args, flat, i, len, listener, localIndex;

      if (item != null) {
        if (key != null) {
          flat = item.get( key );
        } else {
          flat = item;
        }
      } else {
        flat = null;
      }
      if (flat != null) {
        listener = Ember.Object.create({
          flat: flat,
          arrayWillChange: function() {},
          arrayDidChange: function(source_list, start, remove_count, add_count) {
            var args, i, idx, lidx, rem_amt, source_slice, len;
            idx = 0;
            lidx = 0;
            for (i = 0, len = instanceMeta.listeners.length; i < len; i++) {
              if (instanceMeta.listeners[i] === this) {
                break;
              }
              lidx += 1;
              idx += instanceMeta.lengths[i];
            }

            source_slice = [];
            if (add_count < 0) {
              source_slice = source_list.slice(0);
            } else {
              if (add_count > 0) {
                source_slice = source_list.slice(start, start + add_count);
              }
            }

            rem_amt = 0;
            if (remove_count < 0) {
              rem_amt = instanceMeta.lengths[lidx];
            } else {
              rem_amt = remove_count;
            }
            instanceMeta.lengths[lidx] += source_slice.length - rem_amt;
            args = [ idx + start, rem_amt ].concat( source_slice );

            array.arrayContentWillChange(idx + start, rem_amt, source_slice.length);
            array.splice.apply(array, args);
            array.arrayContentDidChange(idx + start, rem_amt, source_slice.length);
          }
        });
        flat.addArrayObserver(listener);
      }
      localIndex = 0;
      for (i = 0; i < changeMeta.index; i++ ) {
        localIndex += instanceMeta.lengths[i];
      }
      if (flat != null) {
        len = flat.get('length');
      } else {
        len = 0;
      }
      instanceMeta.lengths.splice(changeMeta.index, 0, len);
      instanceMeta.listeners.splice(changeMeta.index, 0, listener);
      args = [localIndex, 0];
      if (flat != null) {
        args = args.concat(flat);
      }

      array.arrayContentWillChange(localIndex, 0, len);
      array.splice.apply(array, args);
      array.arrayContentDidChange(localIndex, 0, len);

      return array;
    },
    removedItem: function(array, item, changeMeta, instanceMeta) {
      var i, listener, localIndex, old_len, flat;
      localIndex = 0;
      for (i = 0; i < changeMeta.index; i++ ) {
        localIndex += instanceMeta.lengths[i];
      }
      old_len = instanceMeta.lengths[changeMeta.index];
      instanceMeta.lengths.splice(changeMeta.index, 1);
      listener = instanceMeta.listeners[changeMeta.index];
      if (listener != null) {
        if ((flat = listener.get('flat')) != null) {
          flat.removeArrayObserver(listener);
        }
      }
      instanceMeta.listeners.splice(changeMeta.index, 1);

      array.arrayContentWillChange(localIndex, old_len, 0);
      array.splice(localIndex, old_len);
      array.arrayContentDidChange(localIndex, old_len, 0);

      return array;
    }
  });
};
