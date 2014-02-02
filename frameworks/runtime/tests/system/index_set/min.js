// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest */

module("SC.IndexSet#min");

test("newly created index", function() {
  var set = SC.IndexSet.create();
  equals(set.get('min'), -1, 'min should be -1');
});

test("after adding one range", function() {
  var set = SC.IndexSet.create().add(4,2);
  equals(set.get('min'),4, 'min should be lowest index');
});

test("after adding range then removing part of range", function() {
  var set = SC.IndexSet.create().add(4,4).remove(2,4);
  equals(set.get('min'),6, 'min should be lowest index');
});

test("after adding range several disjoint ranges", function() {
  var set = SC.IndexSet.create().add(6000).add(4,4);
  equals(set.get('min'),4, 'min should be lowest index');
});

test("after removing disjoint range", function() {
  var set = SC.IndexSet.create().add(4,2).add(6000).remove(2,10);
  equals(set.get('min'),6000, 'min should be lowest index');
});

test("after removing all ranges", function() {
  var set = SC.IndexSet.create().add(4,2).add(6000).remove(3,6200);
  equals(set.get('min'), -1, 'min should be back to -1 with no content');
});


test("newly created index, clearing and then adding", function() {
  var set = SC.IndexSet.create().add(4,2);
  equals(set.get('min'), 4, 'min should be lowest index');
	set.clear()
  equals(set.get('min'), -1, 'min should be back to -1 with no content');
	set.add(7, 3)
  equals(set.get('min'), 7, 'min should be lowest index');
});

