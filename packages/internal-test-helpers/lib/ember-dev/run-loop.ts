// @ts-ignore
import { cancelTimers, end, getCurrentRunLoop, hasScheduledTimers } from '@ember/runloop';

export function setupRunLoopCheck(hooks: NestedHooks) {
  hooks.afterEach(function() {
    let { assert } = QUnit.config.current;

    if (getCurrentRunLoop()) {
      assert.ok(false, 'Should not be in a run loop at end of test');
      while (getCurrentRunLoop()) {
        end();
      }
    }

    if (hasScheduledTimers()) {
      assert.ok(false, 'Ember run should not have scheduled timers at end of test');
      cancelTimers();
    }
  });
}
