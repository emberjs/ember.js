import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/join_test');

test('run.join brings its own run loop if none provided', function() {
  ok(!run.currentRunLoop, 'expects no existing run-loop');

  var ret = run.join(function() {
    ok(run.currentRunLoop, 'brings its own run loop');
    return 1;
  });

  equal(ret, undefined, 'expected no return value');
});

test('run.join joins and existing run-loop, and fires its action queue.', function() {
  var outerRunLoop, wasInvoked;

  run(function() {
    outerRunLoop = run.currentRunLoop;

    var ret = run.join(function() {
      wasInvoked = true;
      deepEqual(outerRunLoop, run.currentRunLoop, 'joined the existing run-loop');
      return 1;
    });

    equal(ret, undefined, 'expected no return value');

    ok(!wasInvoked, 'expected the joined callback not be invoked yet');
  });

  ok(wasInvoked, 'expected the joined callback to have invoked');
});

test('run.join returns a value if creating a new run-loop', function() {
  var value = 'returned value';

  var result = run.join(function() {
    return value;
  });

  equal(value, undefined, 'no return value ever!!!!');
});

test('run.join returns undefined if joining another run-loop', function() {
  var value = 'returned value',
  result;

  run(function() {
    var result = run.join(function() {
      return value;
    });
  });

  equal(result, undefined, 'returns nothing');
});

