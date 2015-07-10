import {
  Map,
  MapWithDefault,
  OrderedSet
} from 'ember-metal/map';

var object, number, string, map, variety;
var varieties = [['Map', Map], ['MapWithDefault', MapWithDefault]];

function testMap(nameAndFunc) {
  variety = nameAndFunc[0];

  QUnit.module('Ember.' + variety + ' (forEach and get are implicitly tested)', {
    setup() {
      object = {};
      number = 42;
      string = 'foo';

      map = nameAndFunc[1].create();
    }
  });

  var mapHasLength = function(expected, theMap) {
    theMap = theMap || map;

    var length = 0;
    theMap.forEach(function() {
      length++;
    });

    equal(length, expected, 'map should contain ' + expected + ' items');
  };

  var mapHasEntries = function(entries, theMap) {
    theMap = theMap || map;

    for (var i = 0, l = entries.length; i < l; i++) {
      equal(theMap.get(entries[i][0]), entries[i][1]);
      equal(theMap.has(entries[i][0]), true);
    }

    mapHasLength(entries.length, theMap);
  };

  var unboundThis;

  (function() {
    unboundThis = this;
  }());

  QUnit.test('set', function() {
    map.set(object, 'winning');
    map.set(number, 'winning');
    map.set(string, 'winning');

    mapHasEntries([
      [object, 'winning'],
      [number, 'winning'],
      [string, 'winning']
    ]);

    map.set(object, 'losing');
    map.set(number, 'losing');
    map.set(string, 'losing');

    mapHasEntries([
      [object, 'losing'],
      [number, 'losing'],
      [string, 'losing']
    ]);

    equal(map.has('nope'), false, 'expected the key `nope` to not be present');
    equal(map.has({}), false, 'expected they key `{}` to not be present');
  });

  QUnit.test('set chaining', function() {
    map.set(object, 'winning').
        set(number, 'winning').
        set(string, 'winning');

    mapHasEntries([
      [object, 'winning'],
      [number, 'winning'],
      [string, 'winning']
    ]);

    map.set(object, 'losing').
        set(number, 'losing').
        set(string, 'losing');

    mapHasEntries([
      [object, 'losing'],
      [number, 'losing'],
      [string, 'losing']
    ]);

    equal(map.has('nope'), false, 'expected the key `nope` to not be present');
    equal(map.has({}), false, 'expected they key `{}` to not be present');
  });

  QUnit.test('with key with undefined value', function() {
    map.set('foo', undefined);

    map.forEach(function(value, key) {
      equal(value, undefined);
      equal(key, 'foo');
    });

    ok(map.has('foo'), 'has key foo, even with undefined value');

    equal(map.size, 1);
  });

  QUnit.test('arity of forEach is 1 – es6 23.1.3.5', function() {
    equal(map.forEach.length, 1, 'expected arity for map.forEach is 1');
  });

  QUnit.test('forEach throws without a callback as the first argument', function() {
    equal(map.forEach.length, 1, 'expected arity for map.forEach is 1');
  });

  QUnit.test('remove', function() {
    map.set(object, 'winning');
    map.set(number, 'winning');
    map.set(string, 'winning');

    expectDeprecation(function() {
      map.remove(object);
      map.remove(number);
      map.remove(string);

      // doesn't explode
      map.remove({});
    }, 'Calling `Map.prototype.remove` has been deprecated, please use `Map.prototype.delete` instead.');

    mapHasEntries([]);
  });

  QUnit.test('has empty collection', function() {
    equal(map.has('foo'), false);
    equal(map.has(), false);
  });

  QUnit.test('delete', function() {
    expectNoDeprecation();

    map.set(object, 'winning');
    map.set(number, 'winning');
    map.set(string, 'winning');

    map.delete(object);
    map.delete(number);
    map.delete(string);

    // doesn't explode
    map.delete({});

    mapHasEntries([]);
  });

  QUnit.test('copy and then update', function() {
    map.set(object, 'winning');
    map.set(number, 'winning');
    map.set(string, 'winning');

    var map2 = map.copy();

    map2.set(object, 'losing');
    map2.set(number, 'losing');
    map2.set(string, 'losing');

    mapHasEntries([
      [object, 'winning'],
      [number, 'winning'],
      [string, 'winning']
    ]);

    mapHasEntries([
      [object, 'losing'],
      [number, 'losing'],
      [string, 'losing']
    ], map2);
  });

  QUnit.test('copy and then delete', function() {
    map.set(object, 'winning');
    map.set(number, 'winning');
    map.set(string, 'winning');

    var map2 = map.copy();

    map2.delete(object);
    map2.delete(number);
    map2.delete(string);

    mapHasEntries([
      [object, 'winning'],
      [number, 'winning'],
      [string, 'winning']
    ]);

    mapHasEntries([], map2);
  });

  QUnit.test('length', function() {
    expectDeprecation('Usage of `length` is deprecated, use `size` instead.');

    //Add a key twice
    equal(map.length, 0);
    map.set(string, 'a string');
    equal(map.length, 1);
    map.set(string, 'the same string');
    equal(map.length, 1);

    //Add another
    map.set(number, 'a number');
    equal(map.length, 2);

    //Remove one that doesn't exist
    map.delete('does not exist');
    equal(map.length, 2);

    //Check copy
    var copy = map.copy();
    equal(copy.length, 2);

    //Remove a key twice
    map.delete(number);
    equal(map.length, 1);
    map.delete(number);
    equal(map.length, 1);

    //Remove the last key
    map.delete(string);
    equal(map.length, 0);
    map.delete(string);
    equal(map.length, 0);
  });

  QUnit.test('size', function() {
    //Add a key twice
    equal(map.size, 0);
    map.set(string, 'a string');
    equal(map.size, 1);
    map.set(string, 'the same string');
    equal(map.size, 1);

    //Add another
    map.set(number, 'a number');
    equal(map.size, 2);

    //Remove one that doesn't exist
    map.delete('does not exist');
    equal(map.size, 2);

    //Check copy
    var copy = map.copy();
    equal(copy.size, 2);

    //Remove a key twice
    map.delete(number);
    equal(map.size, 1);
    map.delete(number);
    equal(map.size, 1);

    //Remove the last key
    map.delete(string);
    equal(map.size, 0);
    map.delete(string);
    equal(map.size, 0);
  });

  QUnit.test('forEach without proper callback', function() {
    QUnit.throws(function() {
      map.forEach();
    }, '[object Undefined] is not a function');

    QUnit.throws(function() {
      map.forEach(undefined);
    }, '[object Undefined] is not a function');

    QUnit.throws(function() {
      map.forEach(1);
    }, '[object Number] is not a function');

    QUnit.throws(function() {
      map.forEach({});
    }, '[object Object] is not a function');

    map.forEach(function(value, key) {
      map.delete(key);
    });
    // ensure the error happens even if no data is present
    equal(map.size, 0);
    QUnit.throws(function() {
      map.forEach({});
    }, '[object Object] is not a function');
  });

  QUnit.test('forEach basic', function() {
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    var iteration = 0;

    var expectations = [
      { value: 1, key: 'a', context: unboundThis },
      { value: 2, key: 'b', context: unboundThis },
      { value: 3, key: 'c', context: unboundThis }
    ];

    map.forEach(function(value, key, theMap) {
      var expectation = expectations[iteration];

      equal(value, expectation.value, 'value should be correct');
      equal(key, expectation.key, 'key should be correct');
      equal(this, expectation.context, 'context should be as if it was unbound');
      equal(map, theMap, 'map being iterated over should be passed in');

      iteration++;
    });

    equal(iteration, 3, 'expected 3 iterations');
  });

  QUnit.test('forEach basic /w context', function() {
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    var iteration = 0;
    var context = {};
    var expectations = [
      { value: 1, key: 'a', context: context },
      { value: 2, key: 'b', context: context },
      { value: 3, key: 'c', context: context }
    ];

    map.forEach(function(value, key, theMap) {
      var expectation = expectations[iteration];

      equal(value, expectation.value, 'value should be correct');
      equal(key, expectation.key, 'key should be correct');
      equal(this, expectation.context, 'context should be as if it was unbound');
      equal(map, theMap, 'map being iterated over should be passed in');

      iteration++;
    }, context);

    equal(iteration, 3, 'expected 3 iterations');
  });

  QUnit.test('forEach basic /w deletion while enumerating', function() {
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    var iteration = 0;

    var expectations = [
      { value: 1, key: 'a', context: unboundThis },
      { value: 2, key: 'b', context: unboundThis }
    ];

    map.forEach(function(value, key, theMap) {
      if (iteration === 0) {
        map.delete('c');
      }

      var expectation = expectations[iteration];

      equal(value, expectation.value, 'value should be correct');
      equal(key, expectation.key, 'key should be correct');
      equal(this, expectation.context, 'context should be as if it was unbound');
      equal(map, theMap, 'map being iterated over should be passed in');

      iteration++;
    });

    equal(iteration, 2, 'expected 3 iterations');
  });

  QUnit.test('forEach basic /w addition while enumerating', function() {
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    var iteration = 0;

    var expectations = [
      { value: 1, key: 'a', context: unboundThis },
      { value: 2, key: 'b', context: unboundThis },
      { value: 3, key: 'c', context: unboundThis },
      { value: 4, key: 'd', context: unboundThis }
    ];

    map.forEach(function(value, key, theMap) {
      if (iteration === 0) {
        map.set('d', 4);
      }

      var expectation = expectations[iteration];

      equal(value, expectation.value, 'value should be correct');
      equal(key, expectation.key, 'key should be correct');
      equal(this, expectation.context, 'context should be as if it was unbound');
      equal(map, theMap, 'map being iterated over should be passed in');

      iteration++;
    });

    equal(iteration, 4, 'expected 3 iterations');
  });

  QUnit.test('clear', function() {
    var iterations = 0;

    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4);

    equal(map.size, 4);

    map.forEach(function() {
      iterations++;
    });
    equal(iterations, 4);

    map.clear();
    equal(map.size, 0);
    iterations = 0;
    map.forEach(function() {
      iterations++;
    });
    equal(iterations, 0);
  });

  QUnit.test('-0', function() {
    equal(map.has(-0), false);
    equal(map.has(0), false);

    map.set(-0, 'zero');

    equal(map.has(-0), true);
    equal(map.has(0), true);

    equal(map.get(0), 'zero');
    equal(map.get(-0), 'zero');

    map.forEach(function(value, key) {
      equal(1 / key, Infinity, 'spec says key should be positive zero');
    });
  });

  QUnit.test('NaN', function() {
    equal(map.has(NaN), false);

    map.set(NaN, 'not-a-number');

    equal(map.has(NaN), true);

    equal(map.get(NaN), 'not-a-number');
  });

  QUnit.test('NaN Boxed', function() {
    //jshint -W053
    var boxed = new Number(NaN);
    equal(map.has(boxed), false);

    map.set(boxed, 'not-a-number');

    equal(map.has(boxed), true);
    equal(map.has(NaN), false);

    equal(map.get(NaN), undefined);
    equal(map.get(boxed), 'not-a-number');
  });

  QUnit.test('0 value', function() {
    var obj = {};
    equal(map.has(obj), false);

    equal(map.size, 0);
    map.set(obj, 0);
    equal(map.size, 1);

    equal(map.has(obj), true);
    equal(map.get(obj), 0);

    map.delete(obj);
    equal(map.has(obj), false);
    equal(map.get(obj), undefined);
    equal(map.size, 0);
  });
}

for (var i = 0;  i < varieties.length;  i++) {
  testMap(varieties[i]);
}

QUnit.module('MapWithDefault - default values');

QUnit.test('Retrieving a value that has not been set returns and sets a default value', function() {
  var map = MapWithDefault.create({
    defaultValue(key) {
      return [key];
    }
  });

  var value = map.get('ohai');
  deepEqual(value, ['ohai']);

  strictEqual(value, map.get('ohai'));
});

QUnit.test('Map.prototype.constructor', function() {
  var map = new Map();
  equal(map.constructor, Map);
});

QUnit.test('MapWithDefault.prototype.constructor', function() {
  var map = new MapWithDefault({
    defaultValue(key) { return key; }
  });
  equal(map.constructor, MapWithDefault);
});

QUnit.test('Copying a MapWithDefault copies the default value', function() {
  var map = MapWithDefault.create({
    defaultValue(key) {
      return [key];
    }
  });

  map.set('ohai', 1);
  map.get('bai');

  var map2 = map.copy();

  equal(map2.get('ohai'), 1);
  deepEqual(map2.get('bai'), ['bai']);

  map2.set('kthx', 3);

  deepEqual(map.get('kthx'), ['kthx']);
  equal(map2.get('kthx'), 3);

  deepEqual(map2.get('default'), ['default']);

  map2.defaultValue = function(key) {
    return ['tom is on', key];
  };

  deepEqual(map2.get('drugs'), ['tom is on', 'drugs']);
});

QUnit.module('OrderedSet', {
  setup() {
    object = {};
    number = 42;
    string = 'foo';

    map = OrderedSet.create();
  }
});

QUnit.test('add returns the set', function() {
  var obj = {};
  equal(map.add(obj), map);
  equal(map.add(obj), map, 'when it is already in the set');
});
