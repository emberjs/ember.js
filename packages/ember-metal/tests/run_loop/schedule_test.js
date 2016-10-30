import run from 'ember-metal/run_loop';

QUnit.module('system/run_loop/schedule_test');

QUnit.test('scheduling item in queue should defer until finished', function() {
  let cnt = 0;

  run(() => {
    run.schedule('actions', () => cnt++);
    run.schedule('actions', () => cnt++);
    equal(cnt, 0, 'should not run action yet');
  });

  equal(cnt, 2, 'should flush actions now');
});

QUnit.test('a scheduled item can be canceled', function(assert) {
  let hasRan = false;

  run(() => {
    let cancelId = run.schedule('actions', () => hasRan = true);
    run.cancel(cancelId);
  });

  assert.notOk(hasRan, 'should not have ran callback run');
});

QUnit.test('nested runs should queue each phase independently', function() {
  let cnt = 0;

  run(() => {
    run.schedule('actions', () => cnt++);
    equal(cnt, 0, 'should not run action yet');

    run(() => {
      run.schedule('actions', () => cnt++);
    });
    equal(cnt, 1, 'should not run action yet');
  });

  equal(cnt, 2, 'should flush actions now');
});

QUnit.test('prior queues should be flushed before moving on to next queue', function() {
  let order = [];

  run(() => {
    let runLoop = run.currentRunLoop;
    ok(runLoop, 'run loop present');

    run.schedule('sync', () => {
      order.push('sync');
      equal(runLoop, run.currentRunLoop, 'same run loop used');
    });

    run.schedule('actions', () => {
      order.push('actions');
      equal(runLoop, run.currentRunLoop, 'same run loop used');

      run.schedule('actions', () => {
        order.push('actions');
        equal(runLoop, run.currentRunLoop, 'same run loop used');
      });

      run.schedule('sync', () => {
        order.push('sync');
        equal(runLoop, run.currentRunLoop, 'same run loop used');
      });
    });

    run.schedule('destroy', () => {
      order.push('destroy');
      equal(runLoop, run.currentRunLoop, 'same run loop used');
    });
  });

  deepEqual(order, ['sync', 'actions', 'sync', 'actions', 'destroy']);
});

QUnit.test('makes sure it does not trigger an autorun during testing', function() {
  expectAssertion(() => run.schedule('actions', () => {}), /wrap any code with asynchronous side-effects in a run/);

  // make sure not just the first violation is asserted.
  expectAssertion(() => run.schedule('actions', () => {}), /wrap any code with asynchronous side-effects in a run/);
});
