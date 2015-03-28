import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/once_test');

QUnit.test('calling invokeOnce more than once invokes only once', function() {

  var count = 0;
  run(function() {
    var F = function() { count++; };
    run.once(F);
    run.once(F);
    run.once(F);
  });

  equal(count, 1, 'should have invoked once');
});

QUnit.test('should differentiate based on target', function() {

  var A = { count: 0 };
  var B = { count: 0 };
  run(function() {
    var F = function() { this.count++; };
    run.once(A, F);
    run.once(B, F);
    run.once(A, F);
    run.once(B, F);
  });

  equal(A.count, 1, 'should have invoked once on A');
  equal(B.count, 1, 'should have invoked once on B');
});


QUnit.test('should ignore other arguments - replacing previous ones', function() {

  var A = { count: 0 };
  var B = { count: 0 };
  run(function() {
    var F = function(amt) { this.count += amt; };
    run.once(A, F, 10);
    run.once(B, F, 20);
    run.once(A, F, 30);
    run.once(B, F, 40);
  });

  equal(A.count, 30, 'should have invoked once on A');
  equal(B.count, 40, 'should have invoked once on B');
});

QUnit.test('should be inside of a runloop when running', function() {

  run(function() {
    run.once(function() {
      ok(!!run.currentRunLoop, 'should have a runloop');
    });
  });
});


