// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same notest */
var set ;
var sc_get = SC.get, sc_set = SC.set;

module("SC.IndexSet#clone", {
  setup: function() {
    set = SC.IndexSet.create();
  }
});

test("clone should return new object with same key properties", function() {
  set.add(100,100).add(200,100);
  set.source = "foo";
  
  var set2 = set.clone();
  ok(set2 !== null, 'return value should not be null');
  ok(set2 !== set, 'cloned set should not be same instance as set');
  ok(set.isEqual(set2), 'set.isEqual(set2) should be true');
  
  equals(sc_get(set2, 'length'), sc_get(set, 'length'), 'clone should have same length');
  equals(sc_get(set2, 'min'), sc_get(set, 'min'), 'clone should have same min');
  equals(sc_get(set2, 'max'), sc_get(set, 'max'), 'clone should have same max');
  equals(sc_get(set2, 'source'), sc_get(set, 'source'), 'clone should have same source');

});

test("cloning frozen object returns unfrozen", function() {
  var set2 = set.freeze().clone();
  equals(sc_get(set2, 'isFrozen'), NO, 'set2.isFrozen should be NO');
});

test("copy works like clone", function() {
  same(set.copy(), set, 'should return copy');
  ok(set.copy() !== set, 'should not return same instance');
  
  set.freeze();
  equals(set.frozenCopy(), set, 'should return same instance when frozen');
});

