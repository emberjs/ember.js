import EnumerableUtils from "ember-metal/enumerable_utils";
import {get} from "ember-metal/property_get";
import {addObserver} from "ember-metal/observer";
import Set from "ember-runtime/system/set";

QUnit.module('Set.init');

QUnit.test('passing an array to new Set() should instantiate w/ items', function() {
  var aSet;

  var ary  = [1,2,3];
  var count = 0;

  ignoreDeprecation(function() {
    aSet = new Set(ary);
  });

  equal(get(aSet, 'length'), 3, 'should have three items');
  aSet.forEach(function(x) {
    ok(EnumerableUtils.indexOf(ary, x)>=0, 'should find passed item in array');
    count++;
  });
  equal(count, 3, 'iterating should have returned three objects');
});

QUnit.module('Set.clear');

QUnit.test('should clear a set of its content', function() {
  var aSet;
  var count = 0;

  ignoreDeprecation(function() {
    aSet = new Set([1,2,3]);
  });

  equal(get(aSet, 'length'), 3, 'should have three items');
  ok(get(aSet, 'firstObject'), 'firstObject should return an object');
  ok(get(aSet, 'lastObject'), 'lastObject should return an object');
  addObserver(aSet, '[]', function() { count++; });

  aSet.clear();
  equal(get(aSet, 'length'), 0, 'should have 0 items');
  equal(count, 1, 'should have notified of content change');
  equal(get(aSet, 'firstObject'), null, 'firstObject should return nothing');
  equal(get(aSet, 'lastObject'), null, 'lastObject should return nothing');

  count = 0;
  aSet.forEach(function() { count++; });
  equal(count, 0, 'iterating over items should not invoke callback');

});

// ..........................................................
// Set.pop
//

QUnit.module('Set.pop');

QUnit.test('calling pop should return an object and remove it', function() {
  var aSet, obj;
  var count = 0;

  ignoreDeprecation(function() {
    aSet = new Set([1,2,3]);
  });

  while (count<10 && (obj = aSet.pop())) {
    equal(aSet.contains(obj), false, 'set should no longer contain object');
    count++;
    equal(get(aSet, 'length'), 3-count, 'length should be shorter');
  }

  equal(count, 3, 'should only pop 3 objects');
  equal(get(aSet, 'length'), 0, 'final length should be zero');
  equal(aSet.pop(), null, 'extra pops should do nothing');
});

// ..........................................................
// Set.aliases
//

QUnit.module('Set aliases');

QUnit.test('method aliases', function() {
  var aSet;

  ignoreDeprecation(function() {
    aSet = new Set();
  });

  equal(aSet.add, aSet.addObject, 'add -> addObject');
  equal(aSet.remove, aSet.removeObject, 'remove -> removeObject');
  equal(aSet.addEach, aSet.addObjects, 'addEach -> addObjects');
  equal(aSet.removeEach, aSet.removeObjects, 'removeEach -> removeObjects');

  equal(aSet.push, aSet.addObject, 'push -> addObject');
  equal(aSet.unshift, aSet.addObject, 'unshift -> addObject');
  equal(aSet.shift, aSet.pop, 'shift -> pop');
});


