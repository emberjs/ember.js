// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/once_test');

test('calling invokeOnce more than once invokes only once', function() {

  var count = 0;
  SC.run(function() {
    var F = function() { count++; };
    SC.run.once(F);
    SC.run.once(F);
    SC.run.once(F);
  });
  
  equals(count, 1, 'should have invoked once');
});

test('should differentiate based on target', function() {

  var A = { count: 0 }, B = { count: 0 };
  SC.run(function() {
    var F = function() { this.count++; };
    SC.run.once(A, F);
    SC.run.once(B, F);
    SC.run.once(A, F);
    SC.run.once(B, F);
  });
  
  equals(A.count, 1, 'should have invoked once on A');
  equals(B.count, 1, 'should have invoked once on B');
});


test('should ignore other arguments - replacing previous ones', function() {

  var A = { count: 0 }, B = { count: 0 };
  SC.run(function() {
    var F = function(amt) { this.count += amt; };
    SC.run.once(A, F, 10);
    SC.run.once(B, F, 20);
    SC.run.once(A, F, 30);
    SC.run.once(B, F, 40);
  });
  
  equals(A.count, 30, 'should have invoked once on A');
  equals(B.count, 40, 'should have invoked once on B');
});

test('should be inside of a runloop when running', function() {

  SC.run(function() {
    SC.run.once(function() {
      ok(!!SC.run.currentRunLoop, 'should have a runloop');
    });
  });
});


