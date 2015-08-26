import Ember from 'ember-metal/core';
import EmberObject from 'ember-runtime/system/object';
import setProperties from 'ember-metal/set_properties';
import ObjectProxy from 'ember-runtime/system/object_proxy';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { addObserver } from 'ember-metal/observer';
import { observer } from 'ember-metal/mixin';
import {
  sum,
  min,
  max,
  map,
  sort,
  setDiff,
  mapBy,
  filter,
  filterBy,
  uniq,
  union,
  intersect
} from 'ember-runtime/computed/reduce_computed_macros';
import { isArray } from 'ember-runtime/utils';

var obj;
QUnit.module('map', {
  setup() {
    obj = EmberObject.extend({
      mapped: map('array.@each.v', (item) => item.v),
      mappedObjects: map('arrayObjects.@each.v',  (item) => ({ name: item.v.name }))
    }).create({
      arrayObjects: Ember.A([
        { v: { name: 'Robert' } },
        { v: { name: 'Leanna' } }
      ]),

      array: Ember.A([
        { v: 1 },
        { v: 3 },
        { v: 2 },
        { v: 1 }
      ])
    });
  },

  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('map is readOnly', function() {
  QUnit.throws(function() {
    obj.set('mapped', 1);
  }, /Cannot set read-only property "mapped" on object:/);
});

QUnit.test('it maps simple properties', function() {
  deepEqual(obj.get('mapped'), [1, 3, 2, 1]);

  obj.get('array').pushObject({ v: 5 });

  deepEqual(obj.get('mapped'), [1, 3, 2, 1, 5]);

  obj.get('array').removeAt(3);

  deepEqual(obj.get('mapped'), [1, 3, 2, 5]);
});

QUnit.test('it maps simple unshifted properties', function() {
  var array = Ember.A();

  obj = EmberObject.extend({
    mapped: map('array', (item) => item.toUpperCase())
  }).create({
    array
  });

  array.unshiftObject('c');
  array.unshiftObject('b');
  array.unshiftObject('a');

  array.popObject();

  deepEqual(obj.get('mapped'), ['A', 'B'], 'properties unshifted in sequence are mapped correctly');
});

QUnit.test('it has the correct `this`', function() {
  obj = EmberObject.extend({
    mapped: map('array', function(item)  {
      equal(this, obj, 'should have correct context');
      return this.upperCase(item);
    }),
    upperCase(string) {
      return string.toUpperCase();
    }
  }).create({
    array: ['a', 'b', 'c']
  });

  deepEqual(obj.get('mapped'), ['A', 'B', 'C'], 'properties unshifted in sequence are mapped correctly');
});

QUnit.test('it passes the index to the callback', function() {
  var array = ['a', 'b', 'c'];

  obj = EmberObject.extend({
    mapped: map('array', (item, index) => index)
  }).create({
    array
  });

  deepEqual(obj.get('mapped'), [0, 1, 2], 'index is passed to callback correctly');
});

QUnit.test('it maps objects', function() {
  deepEqual(obj.get('mappedObjects'), [
    { name: 'Robert' },
    { name: 'Leanna' }
  ]);

  obj.get('arrayObjects').pushObject({
    v: { name: 'Eddard' }
  });

  deepEqual(obj.get('mappedObjects'), [
    { name: 'Robert' },
    { name: 'Leanna' },
    { name: 'Eddard' }
  ]);

  obj.get('arrayObjects').removeAt(1);

  deepEqual(obj.get('mappedObjects'), [
    { name: 'Robert' },
    { name: 'Eddard' }
  ]);

  set(obj.get('arrayObjects')[0], 'v', { name: 'Stannis' });

  deepEqual(obj.get('mappedObjects'), [
    { name: 'Stannis' },
    { name: 'Eddard' }
  ]);
});

QUnit.test('it maps unshifted objects with property observers', function() {
  var array = Ember.A();
  var cObj = { v: 'c' };

  obj = EmberObject.extend({
    mapped: map('array.@each.v', (item) => get(item, 'v').toUpperCase())
  }).create({
    array
  });

  array.unshiftObject(cObj);
  array.unshiftObject({ v: 'b' });
  array.unshiftObject({ v: 'a' });

  set(cObj, 'v', 'd');

  deepEqual(array.mapBy('v'), ['a', 'b', 'd'], 'precond - unmapped array is correct');
  deepEqual(obj.get('mapped'), ['A', 'B', 'D'], 'properties unshifted in sequence are mapped correctly');
});

QUnit.module('mapBy', {
  setup() {
    obj = EmberObject.extend({
      mapped: mapBy('array', 'v')
    }).create({
      array: Ember.A([
        { v: 1 },
        { v: 3 },
        { v: 2 },
        { v: 1 }
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('mapBy is readOnly', function() {
  QUnit.throws(function() {
    obj.set('mapped', 1);
  }, /Cannot set read-only property "mapped" on object:/);
});

QUnit.test('it maps properties', function() {
  deepEqual(obj.get('mapped'), [1, 3, 2, 1]);

  obj.get('array').pushObject({ v: 5 });

  deepEqual(obj.get('mapped'), [1, 3, 2, 1, 5]);

  obj.get('array').removeAt(3);

  deepEqual(obj.get('mapped'), [1, 3, 2, 5]);
});

QUnit.test('it is observable', function() {
  var calls = 0;

  deepEqual(obj.get('mapped'), [1, 3, 2, 1]);

  addObserver(obj, 'mapped.@each', () => calls++);

  obj.get('array').pushObject({ v: 5 });

  equal(calls, 1, 'mapBy is observable');
});

QUnit.module('filter', {
  setup() {
    obj = EmberObject.extend({
      filtered: filter('array', (item) => item % 2 === 0)
    }).create({
      array: Ember.A([1, 2, 3, 4, 5, 6, 7, 8])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('filter is readOnly', function() {
  QUnit.throws(function() {
    obj.set('filtered', 1);
  }, /Cannot set read-only property "filtered" on object:/);
});

QUnit.test('it filters according to the specified filter function', function() {
  deepEqual(obj.get('filtered'), [2, 4, 6, 8], 'filter filters by the specified function');
});

QUnit.test('it passes the index to the callback', function() {
  obj = EmberObject.extend({
    filtered: filter('array', (item, index) => index === 1)
  }).create({
    array: ['a', 'b', 'c']
  });

  deepEqual(get(obj, 'filtered'), ['b'], 'index is passed to callback correctly');
});

QUnit.test('it has the correct `this`', function() {
  obj = EmberObject.extend({
    filtered: filter('array', function(item, index) {
      equal(this, obj);
      return this.isOne(index);
    }),
    isOne(value) {
      return value === 1;
    }
  }).create({
    array: ['a', 'b', 'c']
  });

  deepEqual(get(obj, 'filtered'), ['b'], 'index is passed to callback correctly');
});

QUnit.test('it passes the array to the callback', function() {
  obj = EmberObject.extend({
    filtered: filter('array',  (item, index, array) => index === get(array, 'length') - 2)
  }).create({
    array: Ember.A(['a', 'b', 'c'])
  });

  deepEqual(obj.get('filtered'), ['b'], 'array is passed to callback correctly');
});

QUnit.test('it caches properly', function() {
  var array = obj.get('array');

  var filtered = obj.get('filtered');
  ok(filtered === obj.get('filtered'));

  array.addObject(11);
  var newFiltered = obj.get('filtered');

  ok(filtered !== newFiltered);

  ok(obj.get('filtered') === newFiltered);
});

QUnit.test('it updates as the array is modified', function() {
  var array = obj.get('array');

  deepEqual(obj.get('filtered'), [2, 4, 6, 8], 'precond - filtered array is initially correct');

  array.addObject(11);
  deepEqual(obj.get('filtered'), [2, 4, 6, 8], 'objects not passing the filter are not added');

  array.addObject(12);
  deepEqual(obj.get('filtered'), [2, 4, 6, 8, 12], 'objects passing the filter are added');

  array.removeObject(3);
  array.removeObject(4);

  deepEqual(obj.get('filtered'), [2, 6, 8, 12], 'objects removed from the dependent array are removed from the computed array');
});

QUnit.test('the dependent array can be cleared one at a time', function() {
  var array = get(obj, 'array');

  deepEqual(obj.get('filtered'), [2, 4, 6, 8], 'precond - filtered array is initially correct');

  // clear 1-8 but in a random order
  array.removeObject(3);
  array.removeObject(1);
  array.removeObject(2);
  array.removeObject(4);
  array.removeObject(8);
  array.removeObject(6);
  array.removeObject(5);
  array.removeObject(7);

  deepEqual(obj.get('filtered'), [], 'filtered array cleared correctly');
});

QUnit.test('the dependent array can be `clear`ed directly (#3272)', function() {
  deepEqual(obj.get('filtered'), [2, 4, 6, 8], 'precond - filtered array is initially correct');

  obj.get('array').clear();

  deepEqual(obj.get('filtered'), [], 'filtered array cleared correctly');
});

QUnit.test('it updates as the array is replaced', function() {
  deepEqual(obj.get('filtered'), [2, 4, 6, 8], 'precond - filtered array is initially correct');

  obj.set('array', [20, 21, 22, 23, 24]);

  deepEqual(obj.get('filtered'), [20, 22, 24], 'computed array is updated when array is changed');
});

QUnit.module('filterBy', {
  setup() {
    obj = EmberObject.extend({
      a1s: filterBy('array', 'a', 1),
      as: filterBy('array', 'a'),
      bs: filterBy('array', 'b')
    }).create({
      array: Ember.A([
        { name: 'one', a: 1, b: false },
        { name: 'two', a: 2, b: false },
        { name: 'three', a: 1, b: true },
        { name: 'four', b: true }
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('filterBy is readOnly', function() {
  QUnit.throws(function() {
    obj.set('as', 1);
  }, /Cannot set read-only property "as" on object:/);
});

QUnit.test('properties can be filtered by truthiness', function() {
  deepEqual(obj.get('as').mapBy('name'), ['one', 'two', 'three'], 'properties can be filtered by existence');
  deepEqual(obj.get('bs').mapBy('name'), ['three', 'four'], 'booleans can be filtered');

  set(obj.get('array')[0], 'a', undefined);
  set(obj.get('array')[3], 'a', true);

  set(obj.get('array')[0], 'b', true);
  set(obj.get('array')[3], 'b', false);

  deepEqual(obj.get('as').mapBy('name'), ['two', 'three', 'four'], 'arrays computed by filter property respond to property changes');
  deepEqual(obj.get('bs').mapBy('name'), ['one', 'three'], 'arrays computed by filtered property respond to property changes');

  obj.get('array').pushObject({ name: 'five', a: 6, b: true });

  deepEqual(obj.get('as').mapBy('name'), ['two', 'three', 'four', 'five'], 'arrays computed by filter property respond to added objects');
  deepEqual(obj.get('bs').mapBy('name'), ['one', 'three', 'five'], 'arrays computed by filtered property respond to added objects');

  obj.get('array').popObject();

  deepEqual(obj.get('as').mapBy('name'), ['two', 'three', 'four'], 'arrays computed by filter property respond to removed objects');
  deepEqual(obj.get('bs').mapBy('name'), ['one', 'three'], 'arrays computed by filtered property respond to removed objects');

  obj.set('array', [
    { name: 'six', a: 12, b: true }
  ]);

  deepEqual(obj.get('as').mapBy('name'), ['six'], 'arrays computed by filter property respond to array changes');
  deepEqual(obj.get('bs').mapBy('name'), ['six'], 'arrays computed by filtered property respond to array changes');
});

QUnit.test('properties can be filtered by values', function() {
  deepEqual(obj.get('a1s').mapBy('name'), ['one', 'three'], 'properties can be filtered by matching value');

  obj.get('array').pushObject({ name: 'five', a: 1 });

  deepEqual(obj.get('a1s').mapBy('name'), ['one', 'three', 'five'], 'arrays computed by matching value respond to added objects');

  obj.get('array').popObject();

  deepEqual(obj.get('a1s').mapBy('name'), ['one', 'three'], 'arrays computed by matching value respond to removed objects');

  set(obj.get('array')[1], 'a', 1);
  set(obj.get('array')[2], 'a', 2);

  deepEqual(obj.get('a1s').mapBy('name'), ['one', 'two'], 'arrays computed by matching value respond to modified properties');
});

QUnit.test('properties values can be replaced', function() {
  obj = EmberObject.extend({
    a1s: filterBy('array', 'a', 1),
    a1bs: filterBy('a1s', 'b')
  }).create({
    array: []
  });

  deepEqual(obj.get('a1bs').mapBy('name'), [], 'properties can be filtered by matching value');

  set(obj, 'array', [
    { name: 'item1', a: 1, b: true }
  ]);

  deepEqual(obj.get('a1bs').mapBy('name'), ['item1'], 'properties can be filtered by matching value');
});

[
  ['uniq', uniq],
  ['union', union]
].forEach((tuple) => {
  const [name, macro] = tuple;

  QUnit.module(`computed.${name}`, {
    setup() {
      obj = EmberObject.extend({
        union: macro('array', 'array2', 'array3')
      }).create({
        array: Ember.A([1, 2, 3, 4, 5, 6]),
        array2: Ember.A([4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9]),
        array3: Ember.A([1, 8, 10])
      });
    },
    teardown() {
      Ember.run(obj, 'destroy');
    }
  });

  QUnit.test(`${name} is readOnly`, function() {
    QUnit.throws(function() {
      obj.set('union', 1);
    }, /Cannot set read-only property "union" on object:/);
  });

  QUnit.test('does not include duplicates', function() {
    var array = obj.get('array');
    var array2 = obj.get('array2');

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], name + ' does not include duplicates');

    array.pushObject(8);

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], name + ' does not add existing items');

    array.pushObject(11);

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], name + ' adds new items');

    array2.removeAt(6); // remove 7

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], name + ' does not remove items that are still in the dependent array');

    array2.removeObject(7);

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 8, 9, 10, 11], name + ' removes items when their last instance is gone');
  });

  QUnit.test('has set-union semantics', function() {
    var array = obj.get('array');

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], name + ' is initially correct');

    array.removeObject(6);

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'objects are not removed if they exist in other dependent arrays');

    array.clear();

    deepEqual(obj.get('union').sort((x, y) => x - y), [1, 4, 5, 6, 7, 8, 9, 10], 'objects are removed when they are no longer in any dependent array');
  });
});

QUnit.module('computed.intersect', {
  setup() {
    obj = EmberObject.extend({
      intersection: intersect('array', 'array2', 'array3')
    }).create({
      array: Ember.A([1, 2, 3, 4, 5, 6]),
      array2: Ember.A([3, 3, 3, 4, 5]),
      array3: Ember.A([3, 5, 6, 7, 8])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('intersect is readOnly', function() {
  QUnit.throws(function() {
    obj.set('intersection', 1);
  }, /Cannot set read-only property "intersection" on object:/);
});

QUnit.test('it has set-intersection semantics', function() {
  var array2 = obj.get('array2');
  var array3 = obj.get('array3');

  deepEqual(obj.get('intersection').sort((x, y) => x - y), [3, 5], 'intersection is initially correct');

  array2.shiftObject();

  deepEqual(obj.get('intersection').sort((x, y) => x - y), [3, 5], 'objects are not removed when they are still in all dependent arrays');

  array2.shiftObject();

  deepEqual(obj.get('intersection').sort((x, y) => x - y), [3, 5], 'objects are not removed when they are still in all dependent arrays');

  array2.shiftObject();

  deepEqual(obj.get('intersection'), [5], 'objects are removed once they are gone from all dependent arrays');

  array2.pushObject(1);

  deepEqual(obj.get('intersection'), [5], 'objects are not added as long as they are missing from any dependent array');

  array3.pushObject(1);

  deepEqual(obj.get('intersection').sort((x, y) => x - y), [1, 5], 'objects added once they belong to all dependent arrays');
});

QUnit.module('setDiff', {
  setup() {
    obj = EmberObject.extend({
      diff: setDiff('array', 'array2')
    }).create({
      array: Ember.A([1, 2, 3, 4, 5, 6, 7]),
      array2: Ember.A([3, 4, 5, 10])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('setDiff is readOnly', function() {
  QUnit.throws(function() {
    obj.set('diff', 1);
  }, /Cannot set read-only property "diff" on object:/);
});

QUnit.test('it throws an error if given fewer or more than two dependent properties', function() {
  throws(function () {
    EmberObject.extend({
      diff: setDiff('array')
    }).create({
      array: Ember.A([1, 2, 3, 4, 5, 6, 7]),
      array2: Ember.A([3, 4, 5])
    });
  }, /requires exactly two dependent arrays/, 'setDiff requires two dependent arrays');

  throws(function () {
    EmberObject.extend({
      diff: setDiff('array', 'array2', 'array3')
    }).create({
      array: Ember.A([1, 2, 3, 4, 5, 6, 7]),
      array2: Ember.A([3, 4, 5]),
      array3: Ember.A([7])
    });
  }, /requires exactly two dependent arrays/, 'setDiff requires two dependent arrays');
});


QUnit.test('it has set-diff semantics', function() {
  var array1 = obj.get('array');
  var array2 = obj.get('array2');

  deepEqual(obj.get('diff').sort((x, y) => x - y), [1, 2, 6, 7], 'set-diff is initially correct');

  array2.popObject();

  deepEqual(obj.get('diff').sort((x, y) => x - y), [1, 2, 6, 7], 'removing objects from the remove set has no effect if the object is not in the keep set');

  array2.shiftObject();

  deepEqual(obj.get('diff').sort((x, y) => x - y), [1, 2, 3, 6, 7], 'removing objects from the remove set adds them if they\'re in the keep set');

  array1.removeObject(3);

  deepEqual(obj.get('diff').sort((x, y) => x - y), [1, 2, 6, 7], 'removing objects from the keep array removes them from the computed array');

  array1.pushObject(5);

  deepEqual(obj.get('diff').sort((x, y) => x - y), [1, 2, 6, 7], 'objects added to the keep array that are in the remove array are not added to the computed array');

  array1.pushObject(22);

  deepEqual(obj.get('diff').sort((x, y) => x - y), [1, 2, 6, 7, 22], 'objects added to the keep array not in the remove array are added to the computed array');
});


function commonSortTests() {
  QUnit.test('arrays are initially sorted', function() {
    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'array is initially sorted');
  });

  QUnit.test('default sort order is correct', function() {
    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'array is initially sorted');
  });

  QUnit.test('changing the dependent array updates the sorted array', function() {
    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'precond - array is initially sorted');

    obj.set('items', [
      { fname: 'Roose', lname: 'Bolton' },
      { fname: 'Theon', lname: 'Greyjoy' },
      { fname: 'Ramsey', lname: 'Bolton' },
      { fname: 'Stannis', lname: 'Baratheon' }
    ]);

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Stannis',
      'Ramsey',
      'Roose',
      'Theon'
    ], 'changing dependent array updates sorted array');
  });

  QUnit.test('adding to the dependent array updates the sorted array', function() {
    var items = obj.get('items');

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'precond - array is initially sorted');

    items.pushObject({
      fname: 'Tyrion',
      lname: 'Lannister'
    });

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Tyrion',
      'Bran',
      'Robb'
    ], 'Adding to the dependent array updates the sorted array');
  });

  QUnit.test('removing from the dependent array updates the sorted array', function() {
    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'precond - array is initially sorted');

    obj.get('items').popObject();

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Robb'
    ], 'Removing from the dependent array updates the sorted array');
  });

  QUnit.test('distinct items may be sort-equal, although their relative order will not be guaranteed', function() {
    // We recreate jaime and "Cersei" here only for test stability: we want
    // their guid-ordering to be deterministic
    var jaimeInDisguise = {
      fname: 'Cersei',
      lname: 'Lannister',
      age: 34
    };

    var jaime = {
      fname: 'Jaime',
      lname: 'Lannister',
      age: 34
    };

    var items = obj.get('items');

    items.replace(0, 1, jaime);
    items.replace(1, 1, jaimeInDisguise);

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'precond - array is initially sorted');

    set(jaimeInDisguise, 'fname', 'Jaime');

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Jaime',
      'Jaime',
      'Bran',
      'Robb'
    ], 'sorted array is updated');

    set(jaimeInDisguise, 'fname', 'Cersei');

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Bran',
      'Robb'
    ], 'sorted array is updated');
  });

  QUnit.test('guid sort-order fallback with a search proxy is not confused by non-search ObjectProxys', function() {
    var tyrion = {
      fname: 'Tyrion',
      lname: 'Lannister'
    };

    var tyrionInDisguise = ObjectProxy.create({
      fname: 'Yollo',
      lname: '',
      content: tyrion
    });

    var items = obj.get('items');

    items.pushObject(tyrion);

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Cersei',
      'Jaime',
      'Tyrion',
      'Bran',
      'Robb'
    ]);

    items.pushObject(tyrionInDisguise);

    deepEqual(obj.get('sortedItems').mapBy('fname'), [
      'Yollo',
      'Cersei',
      'Jaime',
      'Tyrion',
      'Bran',
      'Robb'
    ]);
  });
}

QUnit.module('sort - sortProperties', {
  setup() {
    obj = EmberObject.extend({
      sortedItems: sort('items', 'itemSorting')
    }).create({
      itemSorting: Ember.A(['lname', 'fname']),
      items: Ember.A([
        { fname: 'Jaime', lname: 'Lannister', age: 34 },
        { fname: 'Cersei', lname: 'Lannister', age: 34 },
        { fname: 'Robb', lname: 'Stark', age: 16 },
        { fname: 'Bran', lname: 'Stark', age: 8 }
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('sort is readOnly', function() {
  QUnit.throws(function() {
    obj.set('sortedItems', 1);
  }, /Cannot set read-only property "sortedItems" on object:/);
});

commonSortTests();

QUnit.test('updating sort properties detaches observers for old sort properties', function() {
  var objectToRemove = obj.get('items')[3];

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  obj.set('itemSorting', Ember.A(['fname:desc']));

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Robb',
    'Jaime',
    'Cersei',
    'Bran'
  ], 'after updating sort properties array is updated');

  obj.get('items').removeObject(objectToRemove);

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Robb',
    'Jaime',
    'Cersei'
  ], 'after removing item array is updated');

  set(objectToRemove, 'lname', 'Updated-Stark');

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Robb',
    'Jaime',
    'Cersei'
  ], 'after changing removed item array is not updated');
});

QUnit.test('updating sort properties updates the sorted array', function() {
  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  obj.set('itemSorting', Ember.A(['fname:desc']));

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Robb',
    'Jaime',
    'Cersei',
    'Bran'
  ], 'after updating sort properties array is updated');
});

QUnit.test('updating sort properties invalidates the sorted array', function() {
  var sortProps = obj.get('itemSorting');

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  sortProps.clear();
  sortProps.pushObject('fname');

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Bran',
    'Cersei',
    'Jaime',
    'Robb'
  ], 'after updating sort properties array is updated');
});

QUnit.test('updating new sort properties invalidates the sorted array', function() {
  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  obj.set('itemSorting', Ember.A(['age:desc', 'fname:asc']));

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Robb',
    'Bran'
  ], 'precond - array is correct after item sorting is changed');

  set(obj.get('items')[1], 'age', 29);

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Jaime',
    'Cersei',
    'Robb',
    'Bran'
  ], 'after updating sort properties array is updated');
});

QUnit.test('sort direction defaults to ascending', function() {
  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ]);
});

QUnit.test('sort direction defaults to ascending (with sort property change)', function() {
  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  obj.set('itemSorting', Ember.A(['fname']));

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Bran',
    'Cersei',
    'Jaime',
    'Robb'
  ], 'sort direction defaults to ascending');
});

QUnit.test('updating an item\'s sort properties updates the sorted array', function() {
  var tyrionInDisguise = obj.get('items')[1];

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  set(tyrionInDisguise, 'fname', 'Tyrion');

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Jaime',
    'Tyrion',
    'Bran',
    'Robb'
  ], 'updating an item\'s sort properties updates the sorted array');
});

QUnit.test('updating several of an item\'s sort properties updated the sorted array', function() {
  var sansaInDisguise = obj.get('items')[1];

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Cersei',
    'Jaime',
    'Bran',
    'Robb'
  ], 'precond - array is initially sorted');

  setProperties(sansaInDisguise, {
    fname: 'Sansa',
    lname: 'Stark'
  });

  deepEqual(obj.get('sortedItems').mapBy('fname'), [
    'Jaime',
    'Bran',
    'Robb',
    'Sansa'
  ], 'updating an item\'s sort properties updates the sorted array');
});

QUnit.test('updating an item\'s sort properties does not error when binary search does a self compare (#3273)', function() {
  var jaime = {
    name: 'Jaime',
    status: 1
  };

  var cersei = {
    name: 'Cersei',
    status: 2
  };

  var obj = EmberObject.extend({
    sortProps: ['status'],
    sortedPeople: sort('people', 'sortProps')
  }).create({
    people: [jaime, cersei]
  });

  deepEqual(obj.get('sortedPeople'), [
    jaime,
    cersei
  ], 'precond - array is initially sorted');

  set(cersei, 'status', 3);

  deepEqual(obj.get('sortedPeople'), [
    jaime,
    cersei
  ], 'array is sorted correctly');

  set(cersei, 'status', 2);

  deepEqual(obj.get('sortedPeople'), [
    jaime,
    cersei
  ], 'array is sorted correctly');
});

QUnit.test('array observers do not leak', function() {
  var daria = { name: 'Daria' };
  var jane  = { name: 'Jane' };

  var sisters = [jane, daria];

  var sortProps = Ember.A(['name']);
  var jaime = EmberObject.extend({
    sortedPeople: sort('sisters', 'sortProps'),
    sortProps
  }).create({
    sisters
  });

  jaime.get('sortedPeople');
  Ember.run(jaime, 'destroy');

  try {
    sortProps.pushObject({
      name: 'Anna'
    });
    ok(true);
  } catch (e) {
    ok(false, e);
  }
});

QUnit.test('property paths in sort properties update the sorted array', function () {
  var jaime = {
    relatedObj: { status: 1, firstName: 'Jaime', lastName: 'Lannister' }
  };

  var cersei = {
    relatedObj: { status: 2, firstName: 'Cersei', lastName: 'Lannister' }
  };

  var sansa = EmberObject.create({
    relatedObj: { status: 3, firstName: 'Sansa', lastName: 'Stark' }
  });

  var obj = EmberObject.extend({
    sortProps: ['relatedObj.status'],
    sortedPeople: sort('people', 'sortProps')
  }).create({
    people: [jaime, cersei, sansa]
  });

  deepEqual(obj.get('sortedPeople'), [
    jaime,
    cersei,
    sansa
  ], 'precond - array is initially sorted');

  set(cersei, 'status', 3);

  deepEqual(obj.get('sortedPeople'), [
    jaime,
    cersei,
    sansa
  ], 'array is sorted correctly');

  set(cersei, 'status', 1);

  deepEqual(obj.get('sortedPeople'), [
    jaime,
    cersei,
    sansa
  ], 'array is sorted correctly');

  sansa.set('status', 1);

  deepEqual(obj.get('sortedPeople'), [jaime, cersei, sansa], 'array is sorted correctly');

  obj.set('sortProps', ['relatedObj.firstName']);

  deepEqual(obj.get('sortedPeople'), [cersei, jaime, sansa], 'array is sorted correctly');
});

QUnit.test('if the dependentKey is neither an array nor object, it will return an empty array', () => {
  set(obj, 'items', null);
  ok(isArray(obj.get('sortedItems')), 'returns an empty arrays');

  set(obj, 'array', undefined);
  ok(isArray(obj.get('sortedItems')), 'returns an empty arrays');

  set(obj, 'array', 'not an array');
  ok(isArray(obj.get('sortedItems')), 'returns an empty arrays');
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

QUnit.module('sort - sort function', {
  setup() {
    obj = EmberObject.extend({
      sortedItems: sort('items.@each.fname', sortByLnameFname)
    }).create({
      items: Ember.A([
        { fname: 'Jaime', lname: 'Lannister', age: 34 },
        { fname: 'Cersei', lname: 'Lannister', age: 34 },
        { fname: 'Robb', lname: 'Stark', age: 16 },
        { fname: 'Bran', lname: 'Stark', age: 8 }
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('sort has correct `this`', function() {
  var obj = EmberObject.extend({
    sortedItems: sort('items.@each.fname', function(a, b) {
      equal(this, obj, 'expected the object to be `this`');
      return this.sortByLastName(a, b);
    }),
    sortByLastName(a, b) {
      return sortByFnameAsc(a, b);
    }
  }).create({
    items: Ember.A([
      { fname: 'Jaime', lname: 'Lannister', age: 34 },
      { fname: 'Cersei', lname: 'Lannister', age: 34 },
      { fname: 'Robb', lname: 'Stark', age: 16 },
      { fname: 'Bran', lname: 'Stark', age: 8 }
    ])
  });

  obj.get('sortedItems');
});

QUnit.test('sort (with function) is readOnly', function() {
  QUnit.throws(function() {
    obj.set('sortedItems', 1);
  }, /Cannot set read-only property "sortedItems" on object:/);
});

commonSortTests();

QUnit.test('changing item properties specified via @each triggers a resort of the modified item', function() {
  var items = get(obj, 'items');

  var tyrionInDisguise = items[1];

  deepEqual(obj.get('sortedItems').mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], 'precond - array is initially sorted');

  set(tyrionInDisguise, 'fname', 'Tyrion');

  deepEqual(obj.get('sortedItems').mapBy('fname'), ['Jaime', 'Tyrion', 'Bran', 'Robb'], 'updating a specified property on an item resorts it');
});

QUnit.test('changing item properties not specified via @each does not trigger a resort', function() {
  var items = obj.get('items');
  var cersei = items[1];

  deepEqual(obj.get('sortedItems').mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], 'precond - array is initially sorted');

  set(cersei, 'lname', 'Stark'); // plot twist! (possibly not canon)

  // The array has become unsorted.  If your sort function is sensitive to
  // properties, they *must* be specified as dependent item property keys or
  // we'll be doing binary searches on unsorted arrays.
  deepEqual(obj.get('sortedItems').mapBy('fname'), ['Cersei', 'Jaime', 'Bran', 'Robb'], 'updating an unspecified property on an item does not resort it');
});

QUnit.module('sort - stability', {
  setup() {
    obj = EmberObject.extend({
      sortProps: ['count', 'name'],
      sortedItems: sort('items', 'sortProps')
    }).create({
      items: [
        { name: 'A', count: 1 },
        { name: 'B', count: 1 },
        { name: 'C', count: 1 },
        { name: 'D', count: 1 }
      ]
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('sorts correctly as only one property changes', function() {
  deepEqual(obj.get('sortedItems').mapBy('name'), ['A', 'B', 'C', 'D'], 'initial');

  set(obj.get('items')[3], 'count', 2);

  deepEqual(obj.get('sortedItems').mapBy('name'), ['A', 'B', 'C', 'D'], 'final');
});


QUnit.module('sort - concurrency', {
  setup() {
    obj = EmberObject.extend({
      sortProps: ['count'],
      sortedItems: sort('items', 'sortProps'),
      customSortedItems: sort('items.@each.count', (a, b) => a.count - b.count)
    }).create({
      items: Ember.A([
        { name: 'A', count: 1 },
        { name: 'B', count: 2 },
        { name: 'C', count: 3 },
        { name: 'D', count: 4 }
      ])
    });
  },

  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('sorts correctly after mutation to the sort properties', function() {
  var sorted = obj.get('sortedItems');
  deepEqual(sorted.mapBy('name'), ['A', 'B', 'C', 'D'], 'initial');

  set(obj.get('items')[1], 'count', 5);
  set(obj.get('items')[2], 'count', 6);

  deepEqual(obj.get('sortedItems').mapBy('name'), ['A', 'D', 'B', 'C'], 'final');
});

QUnit.test('sort correctl after mutation to the sor ', function() {
  deepEqual(obj.get('customSortedItems').mapBy('name'), ['A', 'B', 'C', 'D'], 'initial');

  set(obj.get('items')[1], 'count', 5);
  set(obj.get('items')[2], 'count', 6);

  deepEqual(obj.get('customSortedItems').mapBy('name'), ['A', 'D', 'B', 'C'], 'final');

  deepEqual(obj.get('sortedItems').mapBy('name'), ['A', 'D', 'B', 'C'], 'final');
});

QUnit.module('max', {
  setup() {
    obj = EmberObject.extend({
      max: max('items')
    }).create({
      items: Ember.A([1, 2, 3])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('max is readOnly', function() {
  QUnit.throws(function() {
    obj.set('max', 1);
  }, /Cannot set read-only property "max" on object:/);
});

QUnit.test('max tracks the max number as objects are added', function() {
  equal(obj.get('max'), 3, 'precond - max is initially correct');

  var items = obj.get('items');

  items.pushObject(5);

  equal(obj.get('max'), 5, 'max updates when a larger number is added');

  items.pushObject(2);

  equal(obj.get('max'), 5, 'max does not update when a smaller number is added');
});

QUnit.test('max recomputes when the current max is removed', function() {
  equal(obj.get('max'), 3, 'precond - max is initially correct');

  obj.get('items').removeObject(2);

  equal(obj.get('max'), 3, 'max is unchanged when a non-max item is removed');

  obj.get('items').removeObject(3);

  equal(obj.get('max'), 1, 'max is recomputed when the current max is removed');
});

QUnit.module('min', {
  setup() {
    obj = EmberObject.extend({
      min: min('items')
    }).create({
      items: Ember.A([1, 2, 3])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('min is readOnly', function() {
  QUnit.throws(function() {
    obj.set('min', 1);
  }, /Cannot set read-only property "min" on object:/);
});

QUnit.test('min tracks the min number as objects are added', function() {
  equal(obj.get('min'), 1, 'precond - min is initially correct');

  obj.get('items').pushObject(-2);

  equal(obj.get('min'), -2, 'min updates when a smaller number is added');

  obj.get('items').pushObject(2);

  equal(obj.get('min'), -2, 'min does not update when a larger number is added');
});

QUnit.test('min recomputes when the current min is removed', function() {
  var items = obj.get('items');

  equal(obj.get('min'), 1, 'precond - min is initially correct');

  items.removeObject(2);

  equal(obj.get('min'), 1, 'min is unchanged when a non-min item is removed');

  items.removeObject(1);

  equal(obj.get('min'), 3, 'min is recomputed when the current min is removed');
});

QUnit.module('Ember.arrayComputed - mixed sugar', {
  setup() {
    obj = EmberObject.extend({
      lannisters: filterBy('items', 'lname', 'Lannister'),
      lannisterSorting: Ember.A(['fname']),
      sortedLannisters: sort('lannisters', 'lannisterSorting'),

      starks: filterBy('items', 'lname', 'Stark'),
      starkAges: mapBy('starks', 'age'),
      oldestStarkAge: max('starkAges')
    }).create({
      items: Ember.A([
        { fname: 'Jaime', lname: 'Lannister', age: 34 },
        { fname: 'Cersei', lname: 'Lannister', age: 34 },
        { fname: 'Robb', lname: 'Stark', age: 16 },
        { fname: 'Bran', lname: 'Stark', age: 8 }
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('filtering and sorting can be combined', function() {
  var items = obj.get('items');

  deepEqual(obj.get('sortedLannisters').mapBy('fname'), ['Cersei', 'Jaime'], 'precond - array is initially filtered and sorted');

  items.pushObject({ fname: 'Tywin',   lname: 'Lannister' });
  items.pushObject({ fname: 'Lyanna',  lname: 'Stark' });
  items.pushObject({ fname: 'Gerion',  lname: 'Lannister' });

  deepEqual(obj.get('sortedLannisters').mapBy('fname'), ['Cersei', 'Gerion', 'Jaime', 'Tywin'], 'updates propagate to array');
});

QUnit.test('filtering, sorting and reduce (max) can be combined', function() {
  var items = obj.get('items');

  equal(16, obj.get('oldestStarkAge'), 'precond - end of chain is initially correct');

  items.pushObject({ fname: 'Rickon', lname: 'Stark', age: 5 });

  equal(16, obj.get('oldestStarkAge'), 'chain is updated correctly');

  items.pushObject({ fname: 'Eddard', lname: 'Stark', age: 35 });

  equal(35, obj.get('oldestStarkAge'), 'chain is updated correctly');
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
    obj = EmberObject.extend({
      sorted: sort('todos.@each.priority', priorityComparator),
      filtered: filter('sorted.@each.priority', evenPriorities)
    }).create({
      todos: Ember.A([
        todo('E', 4),
        todo('D', 3),
        todo('C', 2),
        todo('B', 1),
        todo('A', 0)
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('it can filter and sort when both depend on the same item property', function() {
  deepEqual(obj.get('todos').mapBy('name'), ['E', 'D', 'C', 'B', 'A'], 'precond - todos initially correct');
  deepEqual(obj.get('sorted').mapBy('name'), ['A', 'B', 'C', 'D', 'E'], 'precond - sorted initially correct');
  deepEqual(obj.get('filtered').mapBy('name'), ['A', 'C', 'E'], 'precond - filtered initially correct');

  set(obj.get('todos')[1], 'priority', 6);

  deepEqual(obj.get('todos').mapBy('name'), ['E', 'D', 'C', 'B', 'A'], 'precond - todos remain correct');
  deepEqual(obj.get('sorted').mapBy('name'), ['A', 'B', 'C', 'E', 'D'], 'precond - sorted updated correctly');
  deepEqual(obj.get('filtered').mapBy('name'), ['A', 'C', 'E', 'D'], 'filtered updated correctly');
});

var userFnCalls;
QUnit.module('Chaining array and reduced CPs', {
  setup() {
    userFnCalls = 0;
    obj = EmberObject.extend({
      mapped: mapBy('array', 'v'),
      max: max('mapped'),
      maxDidChange: observer('max', () => userFnCalls++)
    }).create({
      array: Ember.A([
        { v: 1 },
        { v: 3 },
        { v: 2 },
        { v: 1 }
      ])
    });
  },
  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('it computes interdependent array computed properties', function() {
  equal(obj.get('max'), 3, 'sanity - it properly computes the maximum value');

  var calls = 0;

  addObserver(obj, 'max', () => calls++);

  obj.get('array').pushObject({ v: 5 });

  equal(obj.get('max'), 5, 'maximum value is updated correctly');
  equal(userFnCalls, 1, 'object defined observers fire');
  equal(calls, 1, 'runtime created observers fire');
});

QUnit.module('sum', {
  setup() {
    obj = EmberObject.extend({
      total: sum('array')
    }).create({
      array: Ember.A([1, 2, 3])
    });
  },

  teardown() {
    Ember.run(obj, 'destroy');
  }
});

QUnit.test('sum is readOnly', function() {
  QUnit.throws(function() {
    obj.set('total', 1);
  }, /Cannot set read-only property "total" on object:/);
});
QUnit.test('sums the values in the dependentKey', function() {
  equal(obj.get('total'), 6, 'sums the values');
});

QUnit.test('if the dependentKey is neither an array nor object, it will return `0`', () => {
  set(obj, 'array', null);
  equal(get(obj, 'total'), 0, 'returns 0');

  set(obj, 'array', undefined);
  equal(get(obj, 'total'), 0, 'returns 0');

  set(obj, 'array', 'not an array');
  equal(get(obj, 'total'), 0, 'returns 0');
});

QUnit.test('updates when array is modified', function() {
  obj.get('array').pushObject(1);

  equal(obj.get('total'), 7, 'recomputed when elements are added');

  obj.get('array').popObject();

  equal(obj.get('total'), 6, 'recomputes when elements are removed');
});
