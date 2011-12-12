// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('system/run_loop/once_test');

test('calling invokeOnce more than once invokes only once', function() {

  var count = 0;
  Ember.run(function() {
    var F = function() { count++; };
    Ember.run.once(F);
    Ember.run.once(F);
    Ember.run.once(F);
  });
  
  equals(count, 1, 'should have invoked once');
});

test('should differentiate based on target', function() {

  var A = { count: 0 }, B = { count: 0 };
  Ember.run(function() {
    var F = function() { this.count++; };
    Ember.run.once(A, F);
    Ember.run.once(B, F);
    Ember.run.once(A, F);
    Ember.run.once(B, F);
  });
  
  equals(A.count, 1, 'should have invoked once on A');
  equals(B.count, 1, 'should have invoked once on B');
});


test('should ignore other arguments - replacing previous ones', function() {

  var A = { count: 0 }, B = { count: 0 };
  Ember.run(function() {
    var F = function(amt) { this.count += amt; };
    Ember.run.once(A, F, 10);
    Ember.run.once(B, F, 20);
    Ember.run.once(A, F, 30);
    Ember.run.once(B, F, 40);
  });
  
  equals(A.count, 30, 'should have invoked once on A');
  equals(B.count, 40, 'should have invoked once on B');
});

test('should be inside of a runloop when running', function() {

  Ember.run(function() {
    Ember.run.once(function() {
      ok(!!Ember.run.currentRunLoop, 'should have a runloop');
    });
  });
});


