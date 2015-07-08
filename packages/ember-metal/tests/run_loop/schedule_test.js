import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/schedule_test');

QUnit.test('scheduling item in queue should defer until finished', function() {
  var cnt = 0;

  run(function() {
    run.schedule('actions', function() { cnt++; });
    run.schedule('actions', function() { cnt++; });
    equal(cnt, 0, 'should not run action yet');
  });

  equal(cnt, 2, 'should flush actions now');
});

QUnit.test('nested runs should queue each phase independently', function() {
  var cnt = 0;

  run(function() {
    run.schedule('actions', function() { cnt++; });
    equal(cnt, 0, 'should not run action yet');

    run(function() {
      run.schedule('actions', function() { cnt++; });
    });
    equal(cnt, 1, 'should not run action yet');
  });

  equal(cnt, 2, 'should flush actions now');
});

QUnit.test('prior queues should be flushed before moving on to next queue', function() {
  var order = [];

  run(function() {
    var runLoop = run.currentRunLoop;
    ok(runLoop, 'run loop present');

    run.schedule('sync', function() {
      order.push('sync');
      equal(runLoop, run.currentRunLoop, 'same run loop used');
    });
    run.schedule('actions', function() {
      order.push('actions');
      equal(runLoop, run.currentRunLoop, 'same run loop used');

      run.schedule('actions', function() {
        order.push('actions');
        equal(runLoop, run.currentRunLoop, 'same run loop used');
      });

      run.schedule('sync', function() {
        order.push('sync');
        equal(runLoop, run.currentRunLoop, 'same run loop used');
      });
    });
    run.schedule('destroy', function() {
      order.push('destroy');
      equal(runLoop, run.currentRunLoop, 'same run loop used');
    });
  });

  deepEqual(order, ['sync', 'actions', 'sync', 'actions', 'destroy']);
});

QUnit.test('makes sure it does not trigger an autorun during testing', function() {
  expectAssertion(function() {
    run.schedule('actions', function() {});
  }, /wrap any code with asynchronous side-effects in a run/);

  // make sure not just the first violation is asserted.
  expectAssertion(function() {
    run.schedule('actions', function() {});
  }, /wrap any code with asynchronous side-effects in a run/);
});
