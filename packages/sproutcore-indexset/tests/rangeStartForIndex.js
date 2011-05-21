// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */
var set, start, len ;
var sc_get = SC.get, sc_set = SC.set;

module("SC.IndexSet#rangeStartForIndex", {
  setup: function() {
    start = SC.IndexSet.HINT_SIZE*2 + 10 ;
    len  = Math.floor(SC.IndexSet.HINT_SIZE * 1.5);
    set = SC.IndexSet.create().add(start, len);
  }
});

test("index is start of range", function() {
  equals(set.rangeStartForIndex(start), start, 'should return start');
  equals(set.rangeStartForIndex(0), 0, 'should return first range');
});

test("index is middle of range", function() {
  equals(set.rangeStartForIndex(start+20), start, 'should return start');
  equals(set.rangeStartForIndex(start+SC.IndexSet.HINT_SIZE), start, 'should return start');
  equals(set.rangeStartForIndex(20), 0, 'should return first range');
});

test("index last index", function() {
  equals(set.rangeStartForIndex(start+len), start+len, 'should return end of range');
});

test("index past last index", function() {
  equals(set.rangeStartForIndex(start+len+20), start+len, 'should return end of range');
});


