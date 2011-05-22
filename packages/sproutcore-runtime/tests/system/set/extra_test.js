// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ..........................................................
// SC.Set.init
// 

module('SC.Set.init');

test('passing an array to new SC.Set() should instantiate w/ items', function() {

  var get = SC.get;
  var ary  = [1,2,3];
  var aSet = new SC.Set(ary);
  var count = 0;
  
  equals(get(aSet, 'length'), 3, 'should have three items');
  aSet.forEach(function(x) {
    ok(ary.indexOf(x)>=0, 'should find passed item in array');
    count++;
  });
  equals(count, 3, 'iterating should have returned three objects');
});


// ..........................................................
// SC.Set.clear
// 

module('SC.Set.clear');

test('should clear a set of its content', function() {

  var get = SC.get, set = SC.set;
  var aSet = new SC.Set([1,2,3]);
  var count = 0;
  
  equals(get(aSet, 'length'), 3, 'should have three items');
  ok(get(aSet, 'firstObject'), 'firstObject should return an object');
  ok(get(aSet, 'lastObject'), 'lastObject should return an object');
  SC.addObserver(aSet, '[]', function() { count++; });

  aSet.clear();
  equals(get(aSet, 'length'), 0, 'should have 0 items');
  equals(count, 1, 'should have notified of content change');
  equals(get(aSet, 'firstObject'), null, 'firstObject should return nothing');
  equals(get(aSet, 'lastObject'), null, 'lastObject should return nothing');
  
  count = 0;
  aSet.forEach(function() { count++; });
  equals(count, 0, 'iterating over items should not invoke callback');
  
});

// ..........................................................
// SC.Set.pop
// 

module('SC.Set.pop');

test('calling pop should return an object and remove it', function() {

  var aSet = new SC.Set([1,2,3]);
  var count = 0, obj;
  while(count<10 && (obj = aSet.pop())) { 
    equals(aSet.contains(obj), false, 'set should no longer contain object');
    count++;
    equals(SC.get(aSet, 'length'), 3-count, 'length should be shorter');
  }
  
  equals(count, 3, 'should only pop 3 objects');
  equals(SC.get(aSet, 'length'), 0, 'final length should be zero');
  equals(aSet.pop(), null, 'extra pops should do nothing');
});

// ..........................................................
// SC.Set.aliases
// 

module('SC.Set aliases');

test('method aliases', function() {
  var aSet = new SC.Set();
  equals(aSet.add, aSet.addObject, 'add -> addObject');
  equals(aSet.remove, aSet.removeObject, 'remove -> removeObject');
  equals(aSet.addEach, aSet.addObjects, 'addEach -> addObjects');
  equals(aSet.removeEach, aSet.removeObjects, 'removeEach -> removeObjects');

  equals(aSet.push, aSet.addObject, 'push -> addObject');
  equals(aSet.unshift, aSet.addObject, 'unshift -> addObject');
  equals(aSet.shift, aSet.pop, 'shift -> pop');
});


