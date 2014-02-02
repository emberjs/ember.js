// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test equals context ok same */
var set, start, len ;
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

test("creating holes by appending to an existing range should not affect the range start", function () {
  var hintSize = SC.IndexSet.HINT_SIZE,
      start, set;

  set = SC.IndexSet.create();

  set.add(1);
  set.add(hintSize + 1);

  // Before adding 2,
  // the internal data structure looks like:
  // {
  //   0  : -  1,   // Hole until 1
  //   1  :    2,   // End of range is 2
  //   2  : -257,   // Hole until 257
  //   256:    2,   // Hint points at index 2, which is ok.
  //   257:  258,   // End of range is 258
  //   258:    0    // End of index set
  // }
  equals(set.rangeStartForIndex(hintSize),
         set.rangeStartForIndex(hintSize - 1));

  set.add(2);

  // Assuming SC.IndexSet.HINT_SIZE is 256,
  // the internal data structure looks like:
  // {
  //   0  : -  1,   // Hole until 1
  //   1  :    3,   // End of range is 3
  //   3  : -257,   // Hole until 257
  //   256:    2,   // Hint points at index 2, which is invalid.
  //   257:  258,   // End of range is 258
  //   258:    0    // End of index set
  // }

  equals(set.rangeStartForIndex(hintSize),
         set.rangeStartForIndex(hintSize - 1));
});
