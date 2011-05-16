// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set ;

module("SC.IndexSet.indexBefore", {
  setup: function() {
    set = SC.IndexSet.create(5).add(10,5).add(100);
  }
});

test("no earlier index in set", function(){ 
  equals(set.indexBefore(4), -1, 'set.indexBefore(4) in %@ should not have index before it'.fmt(set));
});

test("with index after end of set", function() {
  equals(set.indexBefore(1000), 100, 'set.indexBefore(1000) in %@ should return last index in set'.fmt(set));
});

test("inside of multi-index range", function() {
  equals(set.indexBefore(12), 11, 'set.indexBefore(12) in %@ should return previous index'.fmt(set));
});

test("beginning of multi-index range", function() {
  equals(set.indexBefore(10), 5, 'set.indexBefore(10) in %@ should end of previous range'.fmt(set));
});


test("single index range", function() {
  equals(set.indexBefore(100), 14, 'set.indexBefore(100) in %@ should end of previous range multi-index range'.fmt(set));
});



