// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.objectForPropertyPath Tests
// ========================================================================
/*globals module test ok same equals expects */

// An ObjectController will make a content object or an array of content objects
module("SC.objectForPropertyPath") ;

test("should be able to resolve an object on the window", function() {
  var myLocal = (window.myGlobal = { test: 'this '}) ;

  same(myLocal, { test: 'this '}) ;
  same(window.myGlobal, { test: 'this '}) ;

  // verify we can resolve our binding path
  same(SC.objectForPropertyPath('myGlobal'), { test: 'this '}) ;

  window.myGlobal = null;
});

test("should return undefined if object can't be found", function() {
  var result = SC.objectForPropertyPath("notExistingObject");
  same(result, undefined);
});
