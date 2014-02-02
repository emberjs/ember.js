// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set, array, array2;
module("SC.SelectionSet#indexSetForSource", {
  setup: function() {
    set = SC.SelectionSet.create();
    array = '0 1 2 3 4 5 6 7 8 9'.w();
    array2 = 'a b c d e f g h i k l m'.w();
  }
});

test("empty selection set", function() {
  equals(set.indexSetForSource(array), null, 'should return null for source not in set');
  equals(set.indexSetForSource(array2), null, 'should return null for source not in set (2)');
});

test("selection set if index range is added", function() {
  var ret;
  
  set.add(array, 3,4);
  ret = set.indexSetForSource(array);
  ok(ret, 'should return an index set for the array');
  same(ret, SC.IndexSet.create(3,4), 'should be index set that was added');  
  
  set.remove(array,3,1);
  ret = set.indexSetForSource(array);
  same(ret, SC.IndexSet.create(4,3), 'should return new index set when membership changes');
  
  set.add(array,10,1);
  ret = set.indexSetForSource(array);
  same(ret, SC.IndexSet.create(4,3).add(10,1), 'should return combined index set when multiple items are added');
});

test("selection set if objects in index set are added", function() {
  var ret ;
  set.addObjects(["0", 'a']);
  
  ret = set.indexSetForSource(array);
  same(ret, SC.IndexSet.create(0,1), 'should return index set with objects found in set interpolated');  

  ret = set.indexSetForSource(array2);
  same(ret, SC.IndexSet.create(0,1), 'should return index set with objects found in set interpolated (2)');
  
  set.removeObject("0");
  ret = set.indexSetForSource(array);
  equals(ret, null, 'should return null when matching objects are removed');  

  ret = set.indexSetForSource(array2);
  same(ret, SC.IndexSet.create(0,1), 'removing other objects should not effect');

});


test("selection set if objects and ranged are added", function() {
  var ret ;
  set.add(array, 4,3).addObjects(["0", 'a']);
  
  ret = set.indexSetForSource(array);
  same(ret, SC.IndexSet.create(0,1).add(4,3), 'should return index set with objects found in set interpolated');  

  ret = set.indexSetForSource(array2);
  same(ret, SC.IndexSet.create(0,1), 'should return index set with objects found in set interpolated (2)');
  
  set.removeObject("0");
  ret = set.indexSetForSource(array);
  same(ret, SC.IndexSet.create(4,3), 'should return just range when objects are removed');  

  ret = set.indexSetForSource(array2);
  same(ret, SC.IndexSet.create(0,1), 'removing other objects should not effect');

});


// ..........................................................
// SPECIAL CASES
// 

test("add and remove source", function() {
  set.add(array, 3,4).remove(array, 3,4);
  equals(set.indexSetForSource(array), null, 'should return null for source not in set');
});

test("looking up indexSet for source when objects are added should recache when source content changes", function() {
  var obj = array.objectAt(0), ret;
  
  set = SC.SelectionSet.create().addObject(obj);
  ret = set.indexSetForSource(array);
  same(ret, SC.IndexSet.create(0), 'should return index set with item at 0');

  array.removeObject(obj).pushObject(obj); // move obj to end.
  ret = set.indexSetForSource(array) ;
  same(ret, SC.IndexSet.create(array.indexOf(obj)), 'should return index set with item at end');
  
});
