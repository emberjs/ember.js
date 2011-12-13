// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/next_test');

test('should invoke immediately on next timeout', function() {

  var invoked = false;
  
  stop();
  
  Ember.run(function() {
    Ember.run.next(function() { invoked = true; });
  });

  equals(invoked, false, 'should not have invoked yet');
  
  
  setTimeout(function() {
    start();
    equals(invoked, true, 'should have invoked later item');
  }, 20);
  
});
