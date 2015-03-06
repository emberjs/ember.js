import Ember from "ember-metal/core";
import EmberObject from 'ember-runtime/system/object';
import setProperties from "ember-metal/set_properties";
import ObjectProxy from 'ember-runtime/system/object_proxy';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import { addObserver } from "ember-metal/observer";
import {
  beginPropertyChanges,
  endPropertyChanges
} from "ember-metal/property_events";
import { forEach } from "ember-metal/array";
import { observer } from 'ember-metal/mixin';
import {
  sum as computedSum,
  min as computedMin,
  max as computedMax,
  map as computedMap,
  sort as computedSort,
  setDiff as computedSetDiff,
  mapBy as computedMapBy,
  filter as computedFilter,
  filterBy as computedFilterBy,
  uniq as computedUniq,
  union as computedUnion,
  intersect as computedIntersect
} from 'ember-runtime/computed/reduce_computed_macros';
import * as enumUtils from 'ember-metal/enumerable_utils';

var obj, sortProps, items, userFnCalls, union;

function mappedGet(obj, propKey, mapKey) {
  return enumUtils.map(get(obj, propKey), function(val) { return get(val, mapKey); });
}

// we don't guarantee sorting. This makes it easier for comparisons
function sortedGet(obj, key) {
  return get(obj, key).sort(function(a, b) { return a - b; });
}

QUnit.module('computedMap', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        array: Ember.A([{ v: 1 }, { v: 3 }, { v: 2 }, { v: 1 }]),

        mapped: computedMap('array.@each.v', function(item) {
          return item.v;
        }),

        arrayObjects: Ember.A([
          EmberObject.create({ v: { name: 'Robert' } }),
          EmberObject.create({ v: { name: 'Leanna' } })]),
        mappedObjects: computedMap('arrayObjects.@each.v', function (item) {
          return {
            name: item.v.name
          };
        })
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it maps simple properties", function() {
  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1]);

  run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1, 5]);

  run(function() {
    obj.get('array').removeAt(3);
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 5]);
});

QUnit.test("it maps simple unshifted properties", function() {
  var array = Ember.A([]);

  run(function() {
    obj = EmberObject.createWithMixins({
      array: array,
      mapped: computedMap('array', function (item) { return item.toUpperCase(); })
    });
    get(obj, 'mapped');
  });

  run(function() {
    array.unshiftObject('c');
    array.unshiftObject('b');
    array.unshiftObject('a');

    array.popObject();
  });

  deepEqual(get(obj, 'mapped'), ['A', 'B'], "properties unshifted in sequence are mapped correctly");
});

QUnit.test("it passes the index to the callback", function() {
  var array = Ember.A(['a', 'b', 'c']);

  run(function() {
    obj = EmberObject.createWithMixins({
      array: array,
      mapped: computedMap('array', function (item, index) { return index; })
    });
    get(obj, 'mapped');
  });

  deepEqual(get(obj, 'mapped'), [0, 1, 2], "index is passed to callback correctly");
});

QUnit.test("it maps objects", function() {
  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Robert' }, { name: 'Leanna' }]);

  run(function() {
    obj.get('arrayObjects').pushObject({ v: { name: 'Eddard' } });
  });

  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Robert' }, { name: 'Leanna' }, { name: 'Eddard' }]);

  run(function() {
    obj.get('arrayObjects').removeAt(1);
  });

  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Robert' }, { name: 'Eddard' }]);

  run(function() {
    obj.get('arrayObjects').objectAt(0).set('v', { name: 'Stannis' });
  });

  deepEqual(get(obj, 'mappedObjects'), [{ name: 'Stannis' }, { name: 'Eddard' }]);
});

QUnit.test("it maps unshifted objects with property observers", function() {
  var array = Ember.A([]);
  var cObj = { v: 'c' };

  run(function() {
    obj = EmberObject.createWithMixins({
      array: array,
      mapped: computedMap('array.@each.v', function (item) {
        return get(item, 'v').toUpperCase();
      })
    });
    get(obj, 'mapped');
  });

  run(function() {
    array.unshiftObject(cObj);
    array.unshiftObject({ v: 'b' });
    array.unshiftObject({ v: 'a' });

    set(cObj, 'v', 'd');
  });

  deepEqual(array.mapBy('v'), ['a', 'b', 'd'], "precond - unmapped array is correct");
  deepEqual(get(obj, 'mapped'), ['A', 'B', 'D'], "properties unshifted in sequence are mapped correctly");
});

QUnit.module('computedMapBy', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        array: Ember.A([{ v: 1 }, { v: 3 }, { v: 2 }, { v: 1 }]),
        mapped: computedMapBy('array', 'v')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it maps properties", function() {
  get(obj, 'mapped');

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1]);

  run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1, 5]);

  run(function() {
    obj.get('array').removeAt(3);
  });

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 5]);
});

QUnit.test("it is observable", function() {
  get(obj, 'mapped');
  var calls = 0;

  deepEqual(get(obj, 'mapped'), [1, 3, 2, 1]);

  addObserver(obj, 'mapped.@each', function() {
    calls++;
  });

  run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  equal(calls, 1, 'computedMapBy is observable');
});


QUnit.module('computedFilter', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        array: Ember.A([1, 2, 3, 4, 5, 6, 7, 8]),
        filtered: computedFilter('array', function(item) {
          return item % 2 === 0;
        })
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it filters according to the specified filter function", function() {
  var filtered = get(obj, 'filtered');

  deepEqual(filtered, [2,4,6,8], "computedFilter filters by the specified function");
});

QUnit.test("it passes the index to the callback", function() {
  var array = Ember.A(['a', 'b', 'c']);

  run(function() {
    obj = EmberObject.createWithMixins({
      array: array,
      filtered: computedFilter('array', function (item, index) { return index === 1; })
    });
    get(obj, 'filtered');
  });

  deepEqual(get(obj, 'filtered'), ['b'], "index is passed to callback correctly");
});

QUnit.test("it passes the array to the callback", function() {
  var array = Ember.A(['a', 'b', 'c']);

  run(function() {
    obj = EmberObject.createWithMixins({
      array: array,
      filtered: computedFilter('array', function (item, index, array) { return index === array.get('length') - 2; })
    });
    get(obj, 'filtered');
  });

  deepEqual(get(obj, 'filtered'), ['b'], "array is passed to callback correctly");
});

QUnit.test("it updates as the array is modified", function() {
  var array = get(obj, 'array');

  deepEqual(get(obj, 'filtered'), [2,4,6,8], "precond - filtered array is initially correct");

  run(function() {
    array.addObject(11);
  });
  deepEqual(get(obj, 'filtered'), [2,4,6,8], "objects not passing the filter are not added");

  run(function() {
    array.addObject(12);
  });
  deepEqual(get(obj, 'filtered'), [2,4,6,8,12], "objects passing the filter are added");

  run(function() {
    array.removeObject(3);
    array.removeObject(4);
  });
  deepEqual(get(obj, 'filtered'), [2,6,8,12], "objects removed from the dependent array are removed from the computed array");
});

QUnit.test("the dependent array can be cleared one at a time", function() {
  var array = get(obj, 'array');

  deepEqual(get(obj, 'filtered'), [2,4,6,8], "precond - filtered array is initially correct");

  run(function() {
    // clear 1-8 but in a random order
    array.removeObject(3);
    array.removeObject(1);
    array.removeObject(2);
    array.removeObject(4);
    array.removeObject(8);
    array.removeObject(6);
    array.removeObject(5);
    array.removeObject(7);
  });

  deepEqual(get(obj, 'filtered'), [], "filtered array cleared correctly");
});

QUnit.test("the dependent array can be `clear`ed directly (#3272)", function() {
  var array = get(obj, 'array');

  deepEqual(get(obj, 'filtered'), [2,4,6,8], "precond - filtered array is initially correct");

  run(function() {
    array.clear();
  });

  deepEqual(get(obj, 'filtered'), [], "filtered array cleared correctly");
});

QUnit.test("it updates as the array is replaced", function() {
  get(obj, 'array');

  deepEqual(get(obj, 'filtered'), [2,4,6,8], "precond - filtered array is initially correct");

  run(function() {
    set(obj, 'array', Ember.A([20,21,22,23,24]));
  });
  deepEqual(get(obj, 'filtered'), [20,22,24], "computed array is updated when array is changed");
});

QUnit.module('computedFilterBy', {
  setup() {
    obj = EmberObject.createWithMixins({
      array: Ember.A([
        { name: "one", a: 1, b: false },
        { name: "two", a: 2, b: false },
        { name: "three", a: 1, b: true },
        { name: "four", b: true }
      ]),
      a1s: computedFilterBy('array', 'a', 1),
      as: computedFilterBy('array', 'a'),
      bs: computedFilterBy('array', 'b')
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("properties can be filtered by truthiness", function() {
  var array = get(obj, 'array');

  deepEqual(mappedGet(obj, 'as', 'name'), ['one', 'two', 'three'], "properties can be filtered by existence");
  deepEqual(mappedGet(obj, 'bs', 'name'), ['three', 'four'], "booleans can be filtered");

  run(function() {
    set(array.objectAt(0), 'a', undefined);
    set(array.objectAt(3), 'a', true);

    set(array.objectAt(0), 'b', true);
    set(array.objectAt(3), 'b', false);
  });
  deepEqual(mappedGet(obj, 'as', 'name'), ['two', 'three', 'four'], "arrays computed by filter property respond to property changes");
  deepEqual(mappedGet(obj, 'bs', 'name'), ['one', 'three'], "arrays computed by filtered property respond to property changes");

  run(function() {
    array.pushObject({ name: "five", a: 6, b: true });
  });
  deepEqual(mappedGet(obj, 'as', 'name'), ['two', 'three', 'four', 'five'], "arrays computed by filter property respond to added objects");
  deepEqual(mappedGet(obj, 'bs', 'name'), ['one', 'three', 'five'], "arrays computed by filtered property respond to added objects");

  run(function() {
    array.popObject();
  });
  deepEqual(mappedGet(obj, 'as', 'name'), ['two', 'three', 'four'], "arrays computed by filter property respond to removed objects");
  deepEqual(mappedGet(obj, 'bs', 'name'), ['one', 'three'], "arrays computed by filtered property respond to removed objects");

  run(function() {
    set(obj, 'array', Ember.A([{ name: "six", a: 12, b: true }]));
  });
  deepEqual(mappedGet(obj, 'as', 'name'), ['six'], "arrays computed by filter property respond to array changes");
  deepEqual(mappedGet(obj, 'bs', 'name'), ['six'], "arrays computed by filtered property respond to array changes");
});

QUnit.test("properties can be filtered by values", function() {
  var array = get(obj, 'array');

  deepEqual(mappedGet(obj, 'a1s', 'name'), ['one', 'three'], "properties can be filtered by matching value");

  run(function() {
    array.pushObject({ name: "five", a: 1 });
  });
  deepEqual(mappedGet(obj, 'a1s', 'name'), ['one', 'three', 'five'], "arrays computed by matching value respond to added objects");

  run(function() {
    array.popObject();
  });
  deepEqual(mappedGet(obj, 'a1s', 'name'), ['one', 'three'], "arrays computed by matching value respond to removed objects");

  run(function() {
    set(array.objectAt(1), 'a', 1);
    set(array.objectAt(2), 'a', 2);
  });
  deepEqual(mappedGet(obj, 'a1s', 'name'), ['one', 'two'], "arrays computed by matching value respond to modified properties");
});

QUnit.test("properties values can be replaced", function() {
  obj = EmberObject.createWithMixins({
      array: Ember.A([]),
      a1s: computedFilterBy('array', 'a', 1),
      a1bs: computedFilterBy('a1s', 'b')
    });

  deepEqual(mappedGet(obj, 'a1bs', 'name'), [], "properties can be filtered by matching value");

  run(function() {
    set(obj, 'array', Ember.A([{ name: 'item1', a: 1, b: true }]));
  });

  deepEqual(mappedGet(obj, 'a1bs', 'name'), ['item1'], "properties can be filtered by matching value");
});

forEach.call([['uniq', computedUniq], ['union', computedUnion]], function (tuple) {
  var alias  = tuple[0];
  var testedFunc = tuple[1];

  QUnit.module('computed.' + alias, {
    setup() {
      run(function() {
        union = testedFunc('array', 'array2', 'array3');
        obj = EmberObject.createWithMixins({
          array: Ember.A([1,2,3,4,5,6]),
          array2: Ember.A([4,5,6,7,8,9,4,5,6,7,8,9]),
          array3: Ember.A([1,8,10]),
          union: union
        });
      });
    },
    teardown() {
      run(function() {
        obj.destroy();
      });
    }
  });

  QUnit.test("does not include duplicates", function() {
    var array = get(obj, 'array');
    var array2 = get(obj, 'array2');
    //get(obj, 'array3');

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,7,8,9,10], alias + " does not include duplicates");

    run(function() {
      array.pushObject(8);
    });

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,7,8,9,10], alias + " does not add existing items");

    run(function() {
      array.pushObject(11);
    });

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,7,8,9,10,11], alias + " adds new items");

    run(function() {
      array2.removeAt(6); // remove 7
    });

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,7,8,9,10,11], alias + " does not remove items that are still in the dependent array");

    run(function() {
      array2.removeObject(7);
    });

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,8,9,10,11], alias + " removes items when their last instance is gone");
  });

  QUnit.test("has set-union semantics", function() {
    var array = get(obj, 'array');
    // get(obj, 'array2');
    // get(obj, 'array3');

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,7,8,9,10], alias + " is initially correct");

    run(function() {
      array.removeObject(6);
    });

    deepEqual(sortedGet(obj, 'union'), [1,2,3,4,5,6,7,8,9,10], "objects are not removed if they exist in other dependent arrays");

    run(function() {
      array.clear();
    });

    deepEqual(sortedGet(obj, 'union'), [1,4,5,6,7,8,9,10], "objects are removed when they are no longer in any dependent array");
  });

});

QUnit.module('computed.intersect', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        array: Ember.A([1,2,3,4,5,6]),
        array2: Ember.A([3,3,3,4,5]),
        array3: Ember.A([3,5,6,7,8]),
        intersection: computedIntersect('array', 'array2', 'array3')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it has set-intersection semantics", function() {
  var array2 = get(obj, 'array2');
  var array3 = get(obj, 'array3');

  deepEqual(get(obj, 'intersection'), [3,5], "intersection is initially correct");

  run(function() {
    array2.shiftObject();
  });
  deepEqual(get(obj, 'intersection'), [3,5], "objects are not removed when they are still in all dependent arrays");

  run(function() {
    array2.shiftObject();
  });
  deepEqual(get(obj, 'intersection'), [3,5], "objects are not removed when they are still in all dependent arrays");

  run(function() {
    array2.shiftObject();
  });
  deepEqual(get(obj, 'intersection'), [5], "objects are removed once they are gone from all dependent arrays");

  run(function() {
    array2.pushObject(1);
  });
  deepEqual(get(obj, 'intersection'), [5], "objects are not added as long as they are missing from any dependent array");

  run(function() {
    array3.pushObject(1);
  });
  deepEqual(get(obj, 'intersection'), [1,5], "objects added once they belong to all dependent arrays");
});


QUnit.module('computedSetDiff', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        array: Ember.A([1,2,3,4,5,6,7]),
        array2: Ember.A([3,4,5,10]),
        diff: computedSetDiff('array', 'array2')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it throws an error if given fewer or more than two dependent properties", function() {
  throws(function () {
    EmberObject.createWithMixins({
        array: Ember.A([1,2,3,4,5,6,7]),
        array2: Ember.A([3,4,5]),
        diff: computedSetDiff('array')
    });
  }, /requires exactly two dependent arrays/, "setDiff requires two dependent arrays");

  throws(function () {
    EmberObject.createWithMixins({
        array: Ember.A([1,2,3,4,5,6,7]),
        array2: Ember.A([3,4,5]),
        array3: Ember.A([7]),
        diff: computedSetDiff('array', 'array2', 'array3')
    });
  }, /requires exactly two dependent arrays/, "setDiff requires two dependent arrays");
});


QUnit.test("it has set-diff semantics", function() {
  var array1 = get(obj, 'array');
  var array2 = get(obj, 'array2');

  deepEqual(sortedGet(obj, 'diff'), [1, 2, 6, 7], "set-diff is initially correct");

  run(function() {
    array2.popObject();
  });
  deepEqual(sortedGet(obj, 'diff'), [1,2,6,7], "removing objects from the remove set has no effect if the object is not in the keep set");

  run(function() {
    array2.shiftObject();
  });
  deepEqual(sortedGet(obj, 'diff'), [1, 2, 3, 6, 7], "removing objects from the remove set adds them if they're in the keep set");

  run(function() {
    array1.removeObject(3);
  });
  deepEqual(sortedGet(obj, 'diff'), [1, 2, 6, 7], "removing objects from the keep array removes them from the computed array");

  run(function() {
    array1.pushObject(5);
  });
  deepEqual(sortedGet(obj, 'diff'), [1, 2, 6, 7], "objects added to the keep array that are in the remove array are not added to the computed array");

  run(function() {
    array1.pushObject(22);
  });
  deepEqual(sortedGet(obj, 'diff'), [1, 2, 6, 7, 22], "objects added to the keep array not in the remove array are added to the computed array");
});


function commonSortTests() {
  QUnit.test("arrays are initially sorted", function() {
    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "array is initially sorted");
  });

  QUnit.test("changing the dependent array updates the sorted array", function() {
    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    run(function() {
      set(obj, 'items', Ember.A([{
        fname: 'Roose', lname: 'Bolton'
      }, {
        fname: 'Theon', lname: 'Greyjoy'
      }, {
        fname: 'Ramsey', lname: 'Bolton'
      }, {
        fname: 'Stannis', lname: 'Baratheon'
      }]));
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Stannis', 'Ramsey', 'Roose', 'Theon'], "changing dependent array updates sorted array");
  });

  QUnit.test("adding to the dependent array updates the sorted array", function() {
    items = get(obj, 'items');

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    run(function() {
      items.pushObject({ fname: 'Tyrion', lname: 'Lannister' });
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Tyrion', 'Bran', 'Robb'], "Adding to the dependent array updates the sorted array");
  });

  QUnit.test("removing from the dependent array updates the sorted array", function() {
    items = get(obj, 'items');

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    run(function() {
      items.popObject();
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Robb'], "Removing from the dependent array updates the sorted array");
  });

  QUnit.test("distinct items may be sort-equal, although their relative order will not be guaranteed", function() {
    var jaime, jaimeInDisguise;

    run(function() {
      // We recreate jaime and "Cersei" here only for test stability: we want
      // their guid-ordering to be deterministic
      jaimeInDisguise = EmberObject.create({
        fname: 'Cersei', lname: 'Lannister', age: 34
      });
      jaime = EmberObject.create({
        fname: 'Jaime', lname: 'Lannister', age: 34
      });
      items = get(obj, 'items');

      items.replace(0, 1, jaime);
      items.replace(1, 1, jaimeInDisguise);
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

    run(function() {
      // comparator will now return 0.
      // Apparently it wasn't a very good disguise.
      jaimeInDisguise.set('fname', 'Jaime');
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Jaime', 'Jaime', 'Bran', 'Robb'], "sorted array is updated");

    run(function() {
      // comparator will again return non-zero
      jaimeInDisguise.set('fname', 'Cersei');
    });


    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "sorted array is updated");
  });

  QUnit.test("guid sort-order fallback with a search proxy is not confused by non-search ObjectProxys", function() {
    var tyrion = { fname: "Tyrion", lname: "Lannister" };
    var tyrionInDisguise = ObjectProxy.create({
          fname: "Yollo",
          lname: "",
          content: tyrion
        });

    items = get(obj, 'items');

    run(function() {
      items.pushObject(tyrion);
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Tyrion', 'Bran', 'Robb']);

    run(function() {
      items.pushObject(tyrionInDisguise);
    });

    deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Yollo', 'Cersei', 'Jaime', 'Tyrion', 'Bran', 'Robb']);
  });
}

QUnit.module('computedSort - sortProperties', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        itemSorting: Ember.A(['lname', 'fname']),
        items: Ember.A([{
          fname: "Jaime", lname: "Lannister", age: 34
        }, {
          fname: "Cersei", lname: "Lannister", age: 34
        }, {
          fname: "Robb", lname: "Stark", age: 16
        }, {
          fname: "Bran", lname: "Stark", age: 8
        }]),

        sortedItems: computedSort('items', 'itemSorting')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

commonSortTests();

QUnit.test("updating sort properties updates the sorted array", function() {
  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    set(obj, 'itemSorting', Ember.A(['fname:desc']));
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Robb', 'Jaime', 'Cersei', 'Bran'], "after updating sort properties array is updated");
});

QUnit.test("updating sort properties in place updates the sorted array", function() {
  sortProps = get(obj, 'itemSorting');

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    sortProps.clear();
    sortProps.pushObject('fname');
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Bran', 'Cersei', 'Jaime', 'Robb'], "after updating sort properties array is updated");
});

QUnit.test("updating new sort properties in place updates the sorted array", function() {
  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    set(obj, 'itemSorting', Ember.A(['age:desc', 'fname:asc']));
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Robb', 'Bran'], "precond - array is correct after item sorting is changed");

  run(function() {
    items = get(obj, 'items');

    var cersei = items.objectAt(1);
    set(cersei, 'age', 29); // how vain
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Jaime', 'Cersei', 'Robb', 'Bran'], "after updating sort properties array is updated");
});

QUnit.test("sort direction defaults to ascending", function() {
  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    set(obj, 'itemSorting', Ember.A(['fname']));
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Bran', 'Cersei', 'Jaime', 'Robb'], "sort direction defaults to ascending");
});

QUnit.test("updating an item's sort properties updates the sorted array", function() {
  var tyrionInDisguise;

  run(function() {
    items = get(obj, 'items');
  });

  tyrionInDisguise = items.objectAt(1);

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    set(tyrionInDisguise, 'fname', 'Tyrion');
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Jaime', 'Tyrion', 'Bran', 'Robb'], "updating an item's sort properties updates the sorted array");
});

QUnit.test("updating several of an item's sort properties updated the sorted array", function() {
  var sansaInDisguise;

  run(function() {
    items = get(obj, 'items');
  });

  sansaInDisguise = items.objectAt(1);

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    setProperties(sansaInDisguise, {
      fname: 'Sansa',
      lname: 'Stark'
    });
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Jaime', 'Bran', 'Robb', 'Sansa'], "updating an item's sort properties updates the sorted array");
});

QUnit.test("updating an item's sort properties does not error when binary search does a self compare (#3273)", function() {
  var jaime, cersei;

  run(function() {
    jaime = EmberObject.create({
      name: 'Jaime',
      status: 1
    });
    cersei = EmberObject.create({
      name: 'Cersei',
      status: 2
    });

    obj = EmberObject.createWithMixins({
      people: Ember.A([jaime, cersei]),
      sortProps: Ember.A(['status']),
      sortedPeople: computedSort('people', 'sortProps')
    });
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei], "precond - array is initially sorted");

  run(function() {
    cersei.set('status', 3);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei], "array is sorted correctly");

  run(function() {
    cersei.set('status', 2);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei], "array is sorted correctly");
});

QUnit.test("property paths in sort properties update the sorted array", function () {
  var jaime, cersei, sansa;

  run(function () {
    jaime = EmberObject.create({
      relatedObj: EmberObject.create({ status: 1, firstName: 'Jaime', lastName: 'Lannister' })
    });
    cersei = EmberObject.create({
      relatedObj: EmberObject.create({ status: 2, firstName: 'Cersei', lastName: 'Lannister' })
    });
    sansa = EmberObject.create({
      relatedObj: EmberObject.create({ status: 3, firstName: 'Sansa', lastName: 'Stark' })
    });

    obj = EmberObject.createWithMixins({
      people: Ember.A([jaime, cersei, sansa]),
      sortProps: Ember.A(['relatedObj.status']),
      sortedPeople: computedSort('people', 'sortProps')
    });
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei, sansa], "precond - array is initially sorted");

  run(function () {
    cersei.set('status', 3);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei, sansa], "array is sorted correctly");

  run(function () {
    cersei.set('status', 1);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei, sansa], "array is sorted correctly");

  run(function () {
    sansa.set('status', 1);
  });

  deepEqual(get(obj, 'sortedPeople'), [jaime, cersei, sansa], "array is sorted correctly");

  run(function () {
    obj.set('sortProps', Ember.A(['relatedObj.firstName']));
  });

  deepEqual(get(obj, 'sortedPeople'), [cersei, jaime, sansa], "array is sorted correctly");
});

function sortByLnameFname(a, b) {
  var lna = get(a, 'lname');
  var lnb = get(b, 'lname');

  if (lna !== lnb) {
    return lna > lnb ? 1 : -1;
  }

  return sortByFnameAsc(a, b);
}

function sortByFnameAsc(a, b) {
  var fna = get(a, 'fname');
  var fnb = get(b, 'fname');

  if (fna === fnb) {
    return 0;
  }
  return fna > fnb ? 1 : -1;
}

QUnit.module('computedSort - sort function', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        items: Ember.A([{
          fname: "Jaime", lname: "Lannister", age: 34
        }, {
          fname: "Cersei", lname: "Lannister", age: 34
        }, {
          fname: "Robb", lname: "Stark", age: 16
        }, {
          fname: "Bran", lname: "Stark", age: 8
        }]),

        sortedItems: computedSort('items.@each.fname', sortByLnameFname)
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

commonSortTests();

QUnit.test("changing item properties specified via @each triggers a resort of the modified item", function() {
  var tyrionInDisguise;

  run(function() {
    items = get(obj, 'items');
  });

  tyrionInDisguise = items.objectAt(1);

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    set(tyrionInDisguise, 'fname', 'Tyrion');
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Jaime', 'Tyrion', 'Bran', 'Robb'], "updating a specified property on an item resorts it");
});

QUnit.test("changing item properties not specified via @each does not trigger a resort", function() {
  var cersei;

  run(function() {
    items = get(obj, 'items');
  });

  cersei = items.objectAt(1);

  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "precond - array is initially sorted");

  run(function() {
    set(cersei, 'lname', 'Stark'); // plot twist! (possibly not canon)
  });

  // The array has become unsorted.  If your sort function is sensitive to
  // properties, they *must* be specified as dependent item property keys or
  // we'll be doing binary searches on unsorted arrays.
  deepEqual(mappedGet(obj, 'sortedItems', 'fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], "updating an unspecified property on an item does not resort it");
});

QUnit.module('computedSort - stability', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        items: Ember.A(Ember.A([{
          name: "A", count: 1
        }, {
          name: "B", count: 1
        }, {
          name: "C", count: 1
        }, {
          name: "D", count: 1
        }]).map(function(elt) {
          return EmberObject.create(elt);
        })),

        sortProps: Ember.A(['count', 'name']),
        sortedItems: computedSort('items', 'sortProps')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("sorts correctly as only one property changes", function() {
  deepEqual(mappedGet(obj, 'sortedItems', 'name'), ['A', 'B', 'C', 'D'], "initial");
  obj.get('items').objectAt(3).set('count', 2);
  deepEqual(mappedGet(obj, 'sortedItems', 'name'), ['A', 'B', 'C', 'D'], "final");
});

QUnit.module('computedSort - concurrency', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        items: Ember.A(Ember.A([{
          name: "A", count: 1
        }, {
          name: "B", count: 2
        }, {
          name: "C", count: 3
        }, {
          name: "D", count: 4
        }]).map(function(elt) {
          return EmberObject.create(elt);
        })),

        sortProps: Ember.A(['count']),
        sortedItems: computedSort('items', 'sortProps'),
        customSortedItems: computedSort('items.@each.count', function(a, b) {
          return get(a, 'count') - get(b, 'count');
        })
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("sorts correctly when there are concurrent changes", function() {
  deepEqual(mappedGet(obj, 'sortedItems', 'name'), ['A', 'B', 'C', 'D'], "initial");
  Ember.changeProperties(function() {
    obj.get('items').objectAt(1).set('count', 5);
    obj.get('items').objectAt(2).set('count', 6);
  });
  deepEqual(mappedGet(obj, 'sortedItems', 'name'), ['A', 'D', 'B', 'C'], "final");
});

QUnit.test("sorts correctly with a user-provided comparator when there are concurrent changes", function() {
  deepEqual(mappedGet(obj, 'sortedItems', 'name'), ['A', 'B', 'C', 'D'], "initial");

  run(function() {
    Ember.changeProperties(function() {
      obj.get('items').objectAt(1).set('count', 5);
      obj.get('items').objectAt(2).set('count', 6);
    });
  });

  deepEqual(mappedGet(obj, 'sortedItems', 'name'), ['A', 'D', 'B', 'C'], "final");
});



QUnit.module('computedMax', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        items: Ember.A([1,2,3]),
        max: computedMax('items')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("max tracks the max number as objects are added", function() {
  equal(get(obj, 'max'), 3, "precond - max is initially correct");

  run(function() {
    items = get(obj, 'items');
  });

  run(function() {
    items.pushObject(5);
  });

  equal(get(obj, 'max'), 5, "max updates when a larger number is added");

  run(function() {
    items.pushObject(2);
  });

  equal(get(obj, 'max'), 5, "max does not update when a smaller number is added");
});

QUnit.test("max recomputes when the current max is removed", function() {
  equal(get(obj, 'max'), 3, "precond - max is initially correct");

  run(function() {
    items = get(obj, 'items');
    items.removeObject(2);
  });

  equal(get(obj, 'max'), 3, "max is unchanged when a non-max item is removed");

  run(function() {
    items.removeObject(3);
  });

  equal(get(obj, 'max'), 1, "max is recomputed when the current max is removed");
});

QUnit.module('computedMin', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        items: Ember.A([1,2,3]),
        min: computedMin('items')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("min tracks the min number as objects are added", function() {
  equal(get(obj, 'min'), 1, "precond - min is initially correct");

  run(function() {
    items = get(obj, 'items');
  });

  run(function() {
    items.pushObject(-2);
  });

  equal(get(obj, 'min'), -2, "min updates when a smaller number is added");

  run(function() {
    items.pushObject(2);
  });

  equal(get(obj, 'min'), -2, "min does not update when a larger number is added");
});

QUnit.test("min recomputes when the current min is removed", function() {
  equal(get(obj, 'min'), 1, "precond - min is initially correct");

  run(function() {
    items = get(obj, 'items');
    items.removeObject(2);
  });

  equal(get(obj, 'min'), 1, "min is unchanged when a non-min item is removed");

  run(function() {
    items.removeObject(1);
  });

  equal(get(obj, 'min'), 3, "min is recomputed when the current min is removed");
});

QUnit.module('Ember.arrayComputed - mixed sugar', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        items: Ember.A([{
          fname: "Jaime", lname: "Lannister", age: 34
        }, {
          fname: "Cersei", lname: "Lannister", age: 34
        }, {
          fname: "Robb", lname: "Stark", age: 16
        }, {
          fname: "Bran", lname: "Stark", age: 8
        }]),

        lannisters: computedFilterBy('items', 'lname', 'Lannister'),
        lannisterSorting: Ember.A(['fname']),
        sortedLannisters: computedSort('lannisters', 'lannisterSorting'),


        starks: computedFilterBy('items', 'lname', 'Stark'),
        starkAges: computedMapBy('starks', 'age'),
        oldestStarkAge: computedMax('starkAges')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("filtering and sorting can be combined", function() {
  run(function() {
    items = get(obj, 'items');
  });

  deepEqual(mappedGet(obj, 'sortedLannisters', 'fname'), ['Cersei', 'Jaime'], "precond - array is initially filtered and sorted");

  run(function() {
    items.pushObject({ fname: 'Tywin',   lname: 'Lannister' });
    items.pushObject({ fname: 'Lyanna',  lname: 'Stark' });
    items.pushObject({ fname: 'Gerion',  lname: 'Lannister' });
  });

  deepEqual(mappedGet(obj, 'sortedLannisters', 'fname'), ['Cersei', 'Gerion', 'Jaime', 'Tywin'], "updates propagate to array");
});

QUnit.test("filtering, sorting and reduce (max) can be combined", function() {
  run(function() {
    items = get(obj, 'items');
  });

  equal(16, get(obj, 'oldestStarkAge'), "precond - end of chain is initially correct");

  run(function() {
    items.pushObject({ fname: 'Rickon', lname: 'Stark', age: 5 });
  });

  equal(16, get(obj, 'oldestStarkAge'), "chain is updated correctly");

  run(function() {
    items.pushObject({ fname: 'Eddard', lname: 'Stark', age: 35 });
  });

  equal(35, get(obj, 'oldestStarkAge'), "chain is updated correctly");
});

function todo(name, priority) {
  return EmberObject.create({ name: name, priority: priority });
}

function priorityComparator(todoA, todoB) {
  var pa = parseInt(get(todoA, 'priority'), 10);
  var pb = parseInt(get(todoB, 'priority'), 10);

  return pa - pb;
}

function evenPriorities(todo) {
  var p = parseInt(get(todo, 'priority'), 10);

  return p % 2 === 0;
}

QUnit.module('Ember.arrayComputed - chains', {
  setup() {
    obj = EmberObject.createWithMixins({
      todos: Ember.A([todo('E', 4), todo('D', 3), todo('C', 2), todo('B', 1), todo('A', 0)]),
      sorted: computedSort('todos.@each.priority', priorityComparator),
      filtered: computedFilter('sorted.@each.priority', evenPriorities)
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it can filter and sort when both depend on the same item property", function() {
  deepEqual(mappedGet(obj, 'todos', 'name'), ['E', 'D', 'C', 'B', 'A'], "precond - todos initially correct");
  deepEqual(mappedGet(obj, 'sorted', 'name'), ['A', 'B', 'C', 'D', 'E'], "precond - sorted initially correct");
  deepEqual(mappedGet(obj, 'filtered', 'name'), ['A', 'C', 'E'], "precond - filtered initially correct");

  run(function() {
    beginPropertyChanges();
    // here we trigger several changes
    //  A. D.priority 3 -> 6
    //    1. updated sorted from item property change
    //      a. remove D; reinsert D
    //      b. update filtered from sorted change
    //    2. update filtered from item property change
    //
    // If 1.b happens before 2 it should invalidate 2
    get(obj, 'todos').objectAt(1).set('priority', 6);
    endPropertyChanges();
  });

  deepEqual(mappedGet(obj, 'todos', 'name'), ['E', 'D', 'C', 'B', 'A'], "precond - todos remain correct");
  deepEqual(mappedGet(obj, 'sorted', 'name'), ['A', 'B', 'C', 'E', 'D'], "precond - sorted updated correctly");
  deepEqual(mappedGet(obj, 'filtered', 'name'), ['A', 'C', 'E', 'D'], "filtered updated correctly");
});

QUnit.module('Chaining array and reduced CPs', {
  setup() {
    run(function() {
      userFnCalls = 0;
      obj = EmberObject.createWithMixins({
        array: Ember.A([{ v: 1 }, { v: 3 }, { v: 2 }, { v: 1 }]),
        mapped: computedMapBy('array', 'v'),
        max: computedMax('mapped'),
        maxDidChange: observer('max', function() {
          userFnCalls++;
        })
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test("it computes interdependent array computed properties", function() {
  get(obj, 'mapped');

  equal(get(obj, 'max'), 3, 'sanity - it properly computes the maximum value');
  equal(userFnCalls, 0, 'observer is not called on initialisation');

  var calls = 0;
  addObserver(obj, 'max', function() {
    calls++;
  });

  run(function() {
    obj.get('array').pushObject({ v: 5 });
  });

  equal(get(obj, 'max'), 5, 'maximum value is updated correctly');
  equal(userFnCalls, 1, 'object defined observers fire');
  equal(calls, 1, 'runtime created observers fire');
});

QUnit.module('computedSum', {
  setup() {
    run(function() {
      obj = EmberObject.createWithMixins({
        array: Ember.A([1, 2, 3]),
        total: computedSum('array')
      });
    });
  },
  teardown() {
    run(function() {
      obj.destroy();
    });
  }
});

QUnit.test('sums the values in the dependentKey', function() {
  var sum = get(obj, 'total');
  equal(sum, 6, 'sums the values');
});

QUnit.test('updates when array is modified', function() {
  var sum = function() {
    return get(obj, 'total');
  };

  run(function() {
    get(obj, 'array').pushObject(1);
  });

  equal(sum(), 7, 'recomputed when elements are added');

  run(function() {
    get(obj, 'array').popObject();
  });

  equal(sum(), 6, 'recomputes when elements are removed');
});
