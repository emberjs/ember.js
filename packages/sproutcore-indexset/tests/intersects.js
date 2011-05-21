// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest */

var set ;
var sc_get = SC.get, sc_set = SC.set;

module("SC.IndexSet#intersects", {
  setup: function() {
    set = SC.IndexSet.create().add(1000, 10).add(2000,1);
  }
});

// ..........................................................
// SINGLE INDEX
// 

test("handle index in set", function() {
  equals(set.intersects(1001), YES, 'index 1001 should be in set %@'.fmt(set));
  equals(set.intersects(1009), YES, 'index 1009 should be in set %@'.fmt(set));
  equals(set.intersects(2000), YES, 'index 2000 should be in set %@'.fmt(set));
});

test("handle index not in set", function() {
  equals(set.intersects(0), NO, 'index 0 should not be in set');
  equals(set.intersects(10), NO, 'index 10 should not be in set');
  equals(set.intersects(1100), NO, 'index 1100 should not be in set');
});

test("handle index past end of set", function() {
  equals(set.intersects(3000), NO, 'index 3000 should not be in set');
});

// ..........................................................
// RANGE
// 

test("handle range inside set", function() {
  equals(set.intersects(1001,4), YES, '1001..1003 should be in set');
});

test("handle range outside of set", function() {
  equals(set.intersects(100,4), NO, '100..1003 should NOT be in set');
});

test("handle range partially inside set", function() {
  equals(set.intersects(998,4), YES,'998..1001 should be in set');
});

// ..........................................................
// INDEX SET
// 

test("handle set inside IndexSet", function() {
  var test = SC.IndexSet.create().add(1001,4).add(1005,2);
  equals(set.intersects(test), YES, '%@ should be in %@'.fmt(test, set));
});

test("handle range outside of IndexSet", function() {
  var test = SC.IndexSet.create().add(100,4).add(105,2);
  equals(set.intersects(test), NO, '%@ should be in %@'.fmt(test, set));
});

test("handle range partially inside IndexSet", function() {
  var test = SC.IndexSet.create().add(1001,4).add(100,2);
  equals(set.intersects(test), YES, '%@ should be in %@'.fmt(test, set));
});

test("handle self", function() {
  equals(set.contains(set), YES, 'should return YES when passed itself');  
});

