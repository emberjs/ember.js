// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same should_throw*/
var set ;
module("SC.IndexSet#add", {
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
// BASIC ADDS
//

test("add range to end of set", function() {
  set.add(1000,5);
  equals(set.get('length'), 5, 'should have correct index count');
  equals(set.get('max'), 1005, 'max should return 1 past last index');
  same(iter(set), [1000,1001,1002,1003,1004]);
});

test("add range into middle of empty range", function() {
  set.add(100,2); // add initial set.
  equals(iter(set)[0], 100, 'precond - first index is 100');

  // now add second range
  set.add(10,1);
  equals(set.get('length'), 3, 'should have extra length');
  equals(set.get('max'), 102, 'max should return 1 past last index');
  same(iter(set), [10, 100, 101]);
});

test("add range overlapping front edge of range", function() {
  set.add(100,2); // add initial set.
  equals(iter(set)[0], 100, 'precond - first index is 100');

  // now add second range
  set.add(99,2);
  equals(set.get('length'), 3, 'should have extra length');
  equals(set.get('max'), 102, 'max should return 1 past last index');
  same(iter(set), [99, 100, 101]);
});

test("add range overlapping last edge of range", function() {
  set.add(100,2).add(200,2);
  same(iter(set), [100,101,200,201], 'should have two sets');

  // now add overlapping range
  set.add(101,2);
  equals(set.get('length'), 5, 'new set.length');
  equals(set.get('max'), 202, 'max should return 1 past last index');
  same(iter(set), [100,101,102,200,201], 'should include 101-102');
});

test("add range overlapping two ranges, merging into one", function() {
  set.add(100,2).add(110,2);
  same(iter(set), [100,101,110,111], 'should have two sets');

  // now add overlapping range
  set.add(101,10);
  equals(set.get('length'), 12, 'new set.length');
  equals(set.get('max'), 112, 'max should return 1 past last index');
  same(iter(set), [100,101,102,103,104,105,106,107,108,109,110,111], 'should include one range 100-111');
});

test("add range overlapping three ranges, merging into one", function() {
  set.add(100,2).add(105,2).add(110,2);
  same(iter(set), [100,101,105,106,110,111], 'should have two sets');

  // now add overlapping range
  set.add(101,10);
  equals(set.get('length'), 12, 'new set.length');
  equals(set.get('max'), 112, 'max should return 1 past last index');
  same(iter(set), [100,101,102,103,104,105,106,107,108,109,110,111], 'should include one range 100-111');
});

test("add range partially overlapping one range and replacing another range, merging into one", function() {
  set.add(100,2).add(105,2);
  same(iter(set), [100,101,105,106], 'should have two sets');

  // now add overlapping range
  set.add(101,10);
  equals(set.get('length'), 11, 'new set.length');

  equals(set.get('max'), 111, 'max should return 1 past last index');
  same(iter(set), [100,101,102,103,104,105,106,107,108,109,110], 'should include one range 100-110');
});

test("add range overlapping last index", function() {
  set.add(100,2); // add initial set.
  equals(iter(set)[0], 100, 'precond - first index is 100');

  // now add second range
  set.add(101,2);
  equals(set.get('length'), 3, 'should have extra length');
  equals(set.get('max'), 103, 'max should return 1 past last index');
  same(iter(set), [100, 101, 102]);
});

test("add range matching existing range", function() {
  set.add(100,5); // add initial set.
  equals(iter(set)[0], 100, 'precond - first index is 100');

  // now add second range
  set.add(100,5);
  equals(set.get('length'), 5, 'should not change');
  equals(set.get('max'), 105, 'max should return 1 past last index');
  same(iter(set), [100, 101, 102, 103, 104]);
});

// ..........................................................
// NORMALIZED PARAMETER CASES
//

test("add with no params should do nothing", function() {
  set.add();
  same(iter(set), []);
});

test("add with single number should add index only", function() {
  set.add(2);
  same(iter(set), [2]);
});

test("add with range object should add range only", function() {
  set.add({ start: 2, length: 2 });
  same(iter(set), [2,3]);
});

test("add with index set should add indexes in set", function() {
  set.add(SC.IndexSet.create().add(2,2).add(10,2));
  same(iter(set), [2,3,10,11]);
});

// ..........................................................
// OTHER BEHAVIORS
//

test("adding a range should trigger an observer notification", function() {
  var callCnt = 0;
  set.addObserver('[]', function() { callCnt++; });
  set.add(10,10);
  equals(callCnt, 1, 'should have called observer once');
});

test("adding a range over an existing range should not trigger an observer notification", function() {
  var callCnt = 0;
  set.add(10,10);
  set.addObserver('[]', function() { callCnt++; });
  set.add(15,5);
  equals(callCnt, 0, 'should not have called observer');
});

test("appending a range to end should merge into last range", function() {
  set = SC.IndexSet.create(2).add(3);
  equals(set.rangeStartForIndex(3), 2, 'last two range should merge together (%@)'.fmt(set.inspect()));
  equals(set.get('max'), 4, 'should have max');
  equals(set.get('length'), 2, 'should have length');

  set = SC.IndexSet.create(2000, 1000).add(3000, 1000);
  equals(set.rangeStartForIndex(3990), 2000, 'last two range should merge together (%@)'.fmt(set.inspect()));
  equals(set.get('max'), 4000, 'should have max');
  equals(set.get('length'), 2000, 'should have length');

});

test("appending range to start of empty set should create a single range", function() {
  set = SC.IndexSet.create().add(0,2);
  equals(set.rangeStartForIndex(1), 0, 'should have single range (%@)'.fmt(set.inspect()));
  equals(set.get('length'), 2, 'should have length');
  equals(set.get('max'), 2, 'should have max');

  set = SC.IndexSet.create().add(0,2000);
  equals(set.rangeStartForIndex(1998), 0, 'should have single range (%@)'.fmt(set.inspect()));
  equals(set.get('length'), 2000, 'should have length');
  equals(set.get('max'), 2000, 'should have max');

});

test("add raises exception when frozen", function() {
  should_throw(function() {
    set.freeze().add(0,2);
  }, SC.FROZEN_ERROR);
});

// ..........................................................
// SPECIAL CASES
//
// demonstrate fixes for specific bugs here.

test("adding in the same range should keep length consistent", function() {
  set = SC.IndexSet.create();
  set.add(1,4);
  equals(set.length, 4, 'set length should be 4');

  set.add(1,3); // should be like a no-op
  equals(set.length, 4, 'set length should remain 4 after set.add(1,3)');

  set.add(1,2); // should be like a no-op
  equals(set.length, 4, 'set length should remain 4 after set.add(1,2)');

});
