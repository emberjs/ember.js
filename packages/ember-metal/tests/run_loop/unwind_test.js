// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/unwind_test');

test('RunLoop unwinds despite unhandled exception', function() {
  var initialRunLoop = Ember.run.currentRunLoop;

  raises(function(){
    Ember.run(function() {
      Ember.run.schedule('actions', function() { throw new Error("boom!"); });
    });
  }, Error, "boom!");
  
  // The real danger at this point is that calls to autorun will stick
  // tasks into the already-dead runloop, which will never get
  // flushed. I can't easily demonstrate this in a unit test because
  // autorun explicitly doesn't work in test mode. - ef4
  equal(Ember.run.currentRunLoop, initialRunLoop, "Previous run loop should be cleaned up despite exception");

  // Prevent a failure in this test from breaking subsequent tests.
  Ember.run.currentRunLoop = initialRunLoop;

});

