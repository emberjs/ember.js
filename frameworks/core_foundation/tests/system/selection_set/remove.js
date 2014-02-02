// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set, array, array2, expected, expected2 ;
module("SC.SelectionSet#remove", {
  setup: function() {
    set = SC.SelectionSet.create();
    array = '0 1 2 3 4 5 6 7 8 9'.w();
    array2 = 'a b c d e f g h i k l m'.w();

    expected = SC.IndexSet.create(4,3);
    expected2 = SC.IndexSet.create(1);
    expected.source = array;
    expected2.source = array2;
  }
});

/*
  validates that the selection set has the expected content.  pass index sets
  with sources set appropriately.  The order of the array is not important.
*/
function validate(set, expected, defaultSource) {
  var sources = set.get('sources'),
      len  = expected.length,
      idx, cur, actual ;

  equals(sources.length, expected.length, 'should have same number of sources (actual sources: %@)'.fmt(sources));

  for(idx=0;idx<len;idx++) {
    cur = expected[idx];
    if (!cur.source) cur.source =defaultSource;
    actual = set.indexSetForSource(cur.source, NO);
    ok(actual, 'should have indexSet for source: %@'.fmt(cur.source));
    equals(actual.source, cur.source, 'indexSet.source should match source');
    ok(actual.isEqual(cur), 'indexSet should match for source %@ (actual: %@ expected: %@)'.fmt(cur.source, actual, cur));
  }
}
// ..........................................................
// BASIC REMOVES
//

test("Removed indexes for single source", function() {
  set.add(array, 4, 3);
  validate(set, [SC.IndexSet.create(4,3)], array); // precondition

  set.remove(array, 4, 1);
  validate(set, [SC.IndexSet.create(5,2)], array);
});

test("Removed multiple sources", function() {

  set.add(array, 4, 3).add(array2, 1);
  validate(set, [expected, expected2]); // precondition

  set.remove(array, 4,1).remove(array2, 1);
  expected.remove(4,1);
  validate(set, [expected]); // precondition
});

test("Remove IndexSet with source", function() {
  set.add(array, 4, 3);
  validate(set, [SC.IndexSet.create(4,3)], array); // precondition

  var s = SC.IndexSet.create(4,1);
  s.source = array;
  set.remove(s);
  validate(set, [SC.IndexSet.create(5,2)], array);
});

test("Adding another SelectionSet", function() {

  set.add(array, 4, 3).add(array2, 1);
  validate(set, [expected, expected2]); // precondition

  var x = SC.SelectionSet.create().add(array, 4,1).add(array2, 1);
  set.remove(x);

  expected.remove(4,1);
  validate(set, [SC.IndexSet.create(5,2)], array);
});


// ..........................................................
// SPECIAL CASES
//

test("removing index set should also remove individually added objects", function() {
  var objToRemove = array[3]; // item from one array...
  var objToNotRemove = array2[3]; // item from array we won't remove..

  // add both objects.
  set.addObject(objToRemove).addObject(objToNotRemove);
  set.add(array, 4, 3);

  ok(set.contains(objToRemove), 'set should contain objToRemove');
  ok(set.contains(objToNotRemove), 'set should contain objToNotRemove');
  equals(set.get('length'), 5, 'set.length should == two objects + index.length');

  // now remove from array set
  set.remove(array, 2, 4);

  SC.stopIt = NO ;

  ok(!set.contains(objToRemove), 'set should NOT contain objToRemove');
  ok(set.contains(objToNotRemove), 'set should contain objToNotRemove');
  equals(set.get('length'), 2, 'set.length should == 1 object + index.length');
});


module("SC.SelectionSet#constrain", {
  setup: function() {
    set = SC.SelectionSet.create();
    array = '0 1 2 3 4 5 6 7 8 9'.w();
    array2 = 'a b c d e f g h i k l m'.w();

    expected = SC.IndexSet.create(4,3);
    expected2 = SC.IndexSet.create(1);
    expected.source = array;
    expected2.source = array2;
  }
});

/**
  After cleaning up a memory leak in SC.Set, it was discovered that the constrain
  method of SC.SelectionSet doesn't work properly.  It was naively using forEach
  to iterate through the objects while mutating the array so that the last
  object would never be constrained.

  This test shows that you can constrain more than one object using the method.
*/
test("Tests constrain helper method.", function () {
  var objToRemove1 = 'a',
    objToRemove2 = 'b';

  set.add(array, 4, 3);
  set.addObject(objToRemove1);
  set.addObject(objToRemove2);
  ok(set.contains(objToRemove1), 'Set should contain objToRemove1');
  ok(set.contains(objToRemove2), 'Set should contain objToRemove2');
  set.constrain(array);
  ok(!set.contains(objToRemove1), 'Set should not contain objToRemove1');
  ok(!set.contains(objToRemove2), 'Set should not contain objToRemove2');
});

