// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */
var set ;
var sc_get = SC.get, sc_set = SC.set;

module("SC.IndexSet#addEach", {
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

test("adding should iterate over an array", function() {
  set.addEach([1000, 1010, 1020, 1030]);
  equals(sc_get(set, 'length'), 4, 'should have correct index count');  
  equals(sc_get(set, 'max'), 1031, 'max should return 1 past last index');
  same(iter(set), [1000, 1010, 1020, 1030]);
});

test("adding should iterate over a set", function() {
  // add out of order...
  var input = SC.Set.create().add(1030).add(1010).add(1020).add(1000);
  set.addEach(input);
  equals(sc_get(set, 'length'), 4, 'should have correct index count');  
  equals(sc_get(set, 'max'), 1031, 'max should return 1 past last index');
  same(iter(set), [1000, 1010, 1020, 1030]);
});


test("adding should iterate over a indexset", function() {
  // add out of order...
  var input = SC.IndexSet.create().add(1000,2).add(1010).add(1020).add(1030);
  set.addEach(input);
  equals(sc_get(set, 'length'), 5, 'should have correct index count');  
  equals(sc_get(set, 'max'), 1031, 'max should return 1 past last index');
  same(iter(set), [1000, 1001, 1010, 1020, 1030]);
});
