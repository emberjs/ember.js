import { run, cancel, schedule, getCurrentRunLoop } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('system/run_loop/schedule_test', class extends AbstractTestCase {
  ['@test scheduling item in queue should defer until finished'](assert) {
    let cnt = 0;

    run(() => {
      schedule('actions', () => cnt++);
      schedule('actions', () => cnt++);
      assert.equal(cnt, 0, 'should not run action yet');
    });

    assert.equal(cnt, 2, 'should flush actions now');
  }

  ['@test a scheduled item can be canceled'](assert) {
    let hasRan = false;

    run(() => {
      let cancelId = schedule('actions', () => hasRan = true);
      cancel(cancelId);
    });

    assert.notOk(hasRan, 'should not have ran callback run');
  }

  ['@test nested runs should queue each phase independently'](assert) {
    let cnt = 0;

    run(() => {
      schedule('actions', () => cnt++);
      assert.equal(cnt, 0, 'should not run action yet');

      run(() => {
        schedule('actions', () => cnt++);
      });
      assert.equal(cnt, 1, 'should not run action yet');
    });

    assert.equal(cnt, 2, 'should flush actions now');
  }

  ['@test prior queues should be flushed before moving on to next queue'](assert) {
    let order = [];

    run(() => {
      let runLoop = getCurrentRunLoop();
      assert.ok(runLoop, 'run loop present');

      expectDeprecation(() => {
        schedule('sync', () => {
          order.push('sync');
          assert.equal(runLoop, getCurrentRunLoop(), 'same run loop used');
        });
      }, `Scheduling into the 'sync' run loop queue is deprecated.`);

      schedule('actions', () => {
        order.push('actions');
        assert.equal(runLoop, getCurrentRunLoop(), 'same run loop used');

        schedule('actions', () => {
          order.push('actions');
          assert.equal(runLoop, getCurrentRunLoop(), 'same run loop used');
        });

        expectDeprecation(() => {
          schedule('sync', () => {
            order.push('sync');
            assert.equal(runLoop, getCurrentRunLoop(), 'same run loop used');
          });
        }, `Scheduling into the 'sync' run loop queue is deprecated.`);
      });

      schedule('destroy', () => {
        order.push('destroy');
        assert.equal(runLoop, getCurrentRunLoop(), 'same run loop used');
      });
    });

    assert.deepEqual(order, ['sync', 'actions', 'sync', 'actions', 'destroy']);
  }

  ['@test makes sure it does not trigger an autorun during testing']() {
    expectAssertion(() => schedule('actions', () => {}), /wrap any code with asynchronous side-effects in a run/);

    // make sure not just the first violation is asserted.
    expectAssertion(() => schedule('actions', () => {}), /wrap any code with asynchronous side-effects in a run/);
  }
});
