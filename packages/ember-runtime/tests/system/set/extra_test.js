// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// Ember.Set.init
//

module('Ember.Set.init');

test('passing an array to new Ember.Set() should instantiate w/ items', function() {

  var get = Ember.get;
  var ary  = [1,2,3];
  var aSet = new Ember.Set(ary);
  var count = 0;

  equal(get(aSet, 'length'), 3, 'should have three items');
  aSet.forEach(function(x) {
    ok(Ember.ArrayUtils.indexOf(ary, x)>=0, 'should find passed item in array');
    count++;
  });
  equal(count, 3, 'iterating should have returned three objects');
});


// ..........................................................
// Ember.Set.clear
//

module('Ember.Set.clear');

test('should clear a set of its content', function() {

  var get = Ember.get, set = Ember.set;
  var aSet = new Ember.Set([1,2,3]);
  var count = 0;

  equal(get(aSet, 'length'), 3, 'should have three items');
  ok(get(aSet, 'firstObject'), 'firstObject should return an object');
  ok(get(aSet, 'lastObject'), 'lastObject should return an object');
  Ember.addObserver(aSet, '[]', function() { count++; });

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
// Ember.Set.pop
//

module('Ember.Set.pop');

test('calling pop should return an object and remove it', function() {

  var aSet = new Ember.Set([1,2,3]);
  var count = 0, obj;
  while(count<10 && (obj = aSet.pop())) {
    equal(aSet.contains(obj), false, 'set should no longer contain object');
    count++;
    equal(Ember.get(aSet, 'length'), 3-count, 'length should be shorter');
  }

  equal(count, 3, 'should only pop 3 objects');
  equal(Ember.get(aSet, 'length'), 0, 'final length should be zero');
  equal(aSet.pop(), null, 'extra pops should do nothing');
});

// ..........................................................
// Ember.Set.aliases
//

module('Ember.Set aliases');

test('method aliases', function() {
  var aSet = new Ember.Set();
  equal(aSet.add, aSet.addObject, 'add -> addObject');
  equal(aSet.remove, aSet.removeObject, 'remove -> removeObject');
  equal(aSet.addEach, aSet.addObjects, 'addEach -> addObjects');
  equal(aSet.removeEach, aSet.removeObjects, 'removeEach -> removeObjects');

  equal(aSet.push, aSet.addObject, 'push -> addObject');
  equal(aSet.unshift, aSet.addObject, 'unshift -> addObject');
  equal(aSet.shift, aSet.pop, 'shift -> pop');
});


