// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var realMainFunction, realApplicationMode, timesMainCalled;
module("SC.onReady.done", {
  setup: function() {
    timesMainCalled = 0;

    realMainFunction = window.main;
    window.main = function() {
      timesMainCalled += 1;
    };

    realApplicationMode = SC.mode;
  },

  teardown: function() {
    window.main = realMainFunction;
    SC.mode = realApplicationMode;
    SC.isReady = false;
  }
});

test("When the application is done loading in test mode", function() {
  SC.mode = SC.TEST_MODE;
  SC.onReady.done();

  equals(timesMainCalled, 0, "main should not have been called");
});

test("When the application is done loading in application mode", function() {
  SC.mode = SC.APP_MODE;
  SC.onReady.done();

  equals(timesMainCalled, 1, "main should have been called");
});
