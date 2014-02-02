// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.requiredObjectForPropertyPath Tests
// ========================================================================
/*globals module test ok same equals expects */

module("SC.requiredObjectForPropertyPath") ;

test("should be able to resolve an object on the window", function() {
  var myLocal = (window.myGlobal = { test: 'this '}) ;

  same(myLocal, { test: 'this '}) ;
  same(window.myGlobal, { test: 'this '}) ;

  // verify we can resolve our binding path
  same(SC.requiredObjectForPropertyPath('myGlobal'), { test: 'this '}) ;

  window.myGlobal = null;
});

test("should throw error when object can't be found", function() {
  should_throw(function(){ SC.requiredObjectForPropertyPath('notExistingObject'); },
                  Error, "notExistingObject could not be found");
});
