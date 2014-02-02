// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok equals same CoreTest */

sc_require('debug/test_suites/array/base');

SC.ArraySuite.define(function(T) {

  T.module("flatten");

  test("should return flattened arrays", function() {
    var expected = [1,2,3,4,'a'],
        obj      = T.newObject([1,2,[3,[4]],'a']);

    expected.forEach(function(i,idx) {
      equals(obj.flatten().objectAt(idx), i,'obj.flatten().objectAt(%@) should match %@'.fmt(idx,i));
    });
  });
});
