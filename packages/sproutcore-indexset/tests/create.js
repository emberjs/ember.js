// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest */

var sc_get = SC.get, sc_set = SC.set;

module("SC.IndexSet#create");

test("create with no params", function() {
  var set = SC.IndexSet.create();
  equals(sc_get(set, 'length'), 0, 'should have no indexes');
});

test("create with just index", function() {
  var set = SC.IndexSet.create(4);
  equals(sc_get(set, 'length'),1, 'should have 1 index');
  equals(set.contains(4), YES, 'should contain index');
  equals(set.contains(5), NO, 'should not contain 5');
});

test("create with index and length", function() {
  var set = SC.IndexSet.create(4, 2);
  equals(sc_get(set, 'length'),2, 'should have 2 indexes');
  equals(set.contains(4), YES, 'should contain 4');
  equals(set.contains(5), YES, 'should contain 5');
});

test("create with other set", function() {
  var first = SC.IndexSet.create(4,2);

  var set = SC.IndexSet.create(first);
  equals(sc_get(set, 'length'),2, 'should have same number of indexes (2)');
  equals(set.contains(4), YES, 'should contain 4, just like first');
  equals(set.contains(5), YES, 'should contain 5, just like first');
});





