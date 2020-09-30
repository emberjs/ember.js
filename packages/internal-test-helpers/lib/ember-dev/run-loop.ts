// @ts-ignore
import { cancelTimers, end, getCurrentRunLoop, hasScheduledTimers } from '@ember/runloop';

export function setupRunLoopCheck(hooks: NestedHooks) {
  hooks.afterEach(function (assert) {
    if (getCurrentRunLoop() || hasScheduledTimers()) {
      let done = assert.async();
      // use a setTimeout to allow the current run loop to flush via autorun
      setTimeout(() => {
        // increment expected assertion count for the assertions just below
        if (assert['test'].expected !== null) {
          assert['test'].expected += 2;
        }

        // if it is _still_ not completed, we have a problem and the test should be fixed
        assert.ok(
          !hasScheduledTimers(),
          'Ember run should not have scheduled timers at end of test'
        );
        assert.ok(!getCurrentRunLoop(), 'Should not be in a run loop at end of test');

        // attempt to recover so the rest of the tests can run
        while (getCurrentRunLoop()) {
          end();
        }
        cancelTimers();

        done();
      }, 0);
    }
  });
}
