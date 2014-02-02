// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set, array, array2;
module("SC.SelectionSet#add", {
  setup: function() {
    set = SC.SelectionSet.create();
    array = '0 1 2 3 4 5 6 7 8 9'.w();
    array2 = 'a b c d e f g h i k l m'.w();
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
// BASIC ADDS
// 

test("Adding indexes for single source", function() {
  set.add(array, 4, 3);
  validate(set, [SC.IndexSet.create(4,3)], array);

  set.add(array, 1);
  validate(set, [SC.IndexSet.create(1).add(4,3)], array);
});

test("Adding multiple sources", function() {
  var expected = SC.IndexSet.create(4,3);
  var expected2 = SC.IndexSet.create(1);
  expected.source = array;
  expected2.source = array2;
  
  set.add(array, 4, 3);
  validate(set, [expected]);

  set.add(array2, 1);
  validate(set, [expected, expected2]);
});

test("Adding IndexSet with source", function() {
  var expected = SC.IndexSet.create(4,3);
  expected.source = array;
  
  set.add(expected);
  validate(set, [expected]);
});

test("Adding another SelectionSet", function() {
  var expected = SC.IndexSet.create(4,3);
  var expected2 = SC.IndexSet.create(1,5);
  expected.source = array;
  expected2.source = array2;
  
  set.add(array, 4, 3);
  validate(set, [expected]);

  var set2 = SC.SelectionSet.create().add(array2, 1, 5);
  validate(set2, [expected2]);
  
  set.add(set2);
  validate(set, [expected, expected2]);
});

test("Adding indexes with range object !!", function() {
  set.add(array, { start: 4, length: 3 });
  validate(set, [SC.IndexSet.create(4,3)], array);
});



