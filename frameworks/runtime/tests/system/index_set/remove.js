// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest should_throw*/
var set ;
module("SC.IndexSet#remove", {
  setup: function() {
    set = SC.IndexSet.create();
  }
});

function iter(s) {
  var ret = [];
  set.forEach(function(k) { ret.push(k); });
  return ret ;
}

// ..........................................................
// BASIC REMOVES
// 

test("remove a range after end of set", function() {
  equals(set.get('length'), 0, 'precond - should be empty');  

  set.remove(1000, 5);
  equals(set.get('length'), 0, 'should still be empty');  
  equals(set.get('max'), 0, 'max should return 1 past last index');
  same(iter(set), [], 'should be empty');
});

test("remove range in middle of an existing range", function() {
  set.add(100,4);
  same(iter(set), [100, 101, 102, 103], 'precond - should have range');
  
  set.remove(101,2);
  equals(set.get('length'), 2, 'new length should not include removed range');
  equals(set.get('max'), 104, 'max should return 1 past last index');
  same(iter(set), [100,103], 'should remove range in the middle'); 
});

test("remove range overlapping front edge of range", function() {
  set.add(100,2); // add initial set.
  equals(iter(set)[0], 100, 'precond - first index is 100');
  
  // now add second range
  set.remove(99,2);
  equals(set.get('length'), 1, 'should have extra length');
  equals(set.get('max'), 102, 'max should return 1 past last index');
  same(iter(set), [101]);
});

test("remove range overlapping last edge of range", function() {
  set.add(100,2).add(200,2); // make sure not last range
  same(iter(set), [100,101,200,201], 'should have two sets');
  
  // now add overlapping range
  set.remove(101,2);
  equals(set.get('length'), 3, 'new set.length');
  equals(set.get('max'), 202, 'max should return 1 past last index');
  same(iter(set), [100,200,201], 'should remove 101-102');
});

test("remove range overlapping two ranges, remove parts of both", function() {
  set.add(100,2).add(110,2);
  same(iter(set), [100,101,110,111], 'should have two sets');
  
  // now add overlapping range
  set.remove(101,10);
  equals(set.get('length'), 2, 'new set.length');
  equals(set.get('max'), 112, 'max should return 1 past last index');
  same(iter(set), [100,111], 'should remove range 101-110');
});

test("remove range overlapping three ranges, removing one and parts of the others", function() {
  set.add(100,2).add(105,2).add(110,2);
  same(iter(set), [100,101,105,106,110,111], 'should have two sets');
  
  // now add overlapping range
  set.remove(101,10);
  equals(set.get('length'), 2, 'new set.length');
  equals(set.get('max'), 112, 'max should return 1 past last index');
  same(iter(set), [100,111], 'should remove range 101-110');
});

test("remove range partially overlapping one range and replacing another range", function() {
  set.add(100,2).add(105,2);
  same(iter(set), [100,101,105,106], 'should have two sets');
  
  // now add overlapping range
  set.remove(101,10);
  equals(set.get('length'), 1, 'new set.length');

  equals(set.get('max'), 101, 'max should return 1 past last index');
  same(iter(set), [100], 'should include one range 100-110');
});

test("remove range overlapping last index", function() {
  set.add(100,2); // add initial set.
  equals(iter(set)[0], 100, 'precond - first index is 100');
  
  // now add second range
  set.remove(101,2);
  equals(set.get('length'), 1, 'should have extra length');
  equals(set.get('max'), 101, 'max should return 1 past last index');
  same(iter(set), [100]);
});

test("remove range matching existing range", function() {
  set.add(100,5); // add initial set.
  same(iter(set), [100, 101, 102, 103, 104]);
  
  // now add second range
  set.remove(100,5);
  equals(set.get('length'), 0, 'should be empty');
  equals(set.get('max'), 0, 'max should return 1 past last index');
  same(iter(set), []);  
});

// ..........................................................
// NORMALIZED PARAMETER CASES
// 

test("remove with no params should do nothing", function() {
  set.add(10,2).remove();
  same(iter(set), [10,11]);
});

test("remove with single number should add index only", function() {
  set.add(10,2).remove(10);
  same(iter(set), [11]);
});

test("remove with range object should add range only", function() {
  set.add(10,5).remove({ start: 10, length: 2 });
  same(iter(set), [12,13,14]);
});

test("remove with index set should add indexes in set", function() {
  set.add(0,14).remove(SC.IndexSet.create().add(2,2).add(10,2));
  same(iter(set), [0,1,4,5,6,7,8,9,12,13]);
});


// ..........................................................
// OTHER BEHAVIORS
// 
test("remove a range should trigger an observer notification", function() {
  var callCnt = 0;
  set.add(10, 20);
  
  set.addObserver('[]', function() { callCnt++; });
  set.remove(10,10);
  equals(callCnt, 1, 'should have called observer once');
});

test("removing a non-existent range should not trigger observer notification", function() {
  var callCnt = 0;
  
  set.addObserver('[]', function() { callCnt++; });
  set.remove(10,10); // 10-20 are already empty
  equals(callCnt, 0, 'should NOT have called observer');
});

test("removing a clone of the same index set should leave an empty set", function() {
  var set = SC.IndexSet.create(0,2), set2 = set.clone();
  ok(set.isEqual(set2), 'precond - clone is equal to receiver');
  set.remove(set2);
  equals(set.get('length'), 0, 'set should now be empty');
});

test("removing an index range outside of target range (specific bug)", function() {

  var set = SC.IndexSet.create(10,3);
  var set2 = SC.IndexSet.create(0,3);
  
  // removing set2 from set should not changed set at all because it is 
  // before the first range, but it causes a problem with the length.
  set.remove(set2);
  equals(set.get('length'), 3, 'length should not change');
});

test("remove() raises exception when frozen", function() {
  should_throw(function() {
    set.freeze().remove(0,2);    
  }, SC.FROZEN_ERROR);  
});
