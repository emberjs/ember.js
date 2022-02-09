import { end, _cancelTimers, _getCurrentRunLoop, _hasScheduledTimers } from '@ember/runloop';

export function setupRunLoopCheck(hooks: NestedHooks) {
  hooks.afterEach(function (assert) {
    if (_getCurrentRunLoop() || _hasScheduledTimers()) {
      let done = assert.async();
      // use a setTimeout to allow the current run loop to flush via autorun
      setTimeout(() => {
        // increment expected assertion count for the assertions just below
        if (assert['test'].expected !== null) {
          assert['test'].expected += 2;
        }

        // if it is _still_ not completed, we have a problem and the test should be fixed
        assert.ok(
          !_hasScheduledTimers(),
          'Ember run should not have scheduled timers at end of test'
        );
        assert.ok(!_getCurrentRunLoop(), 'Should not be in a run loop at end of test');

        // attempt to recover so the rest of the tests can run
        while (_getCurrentRunLoop()) {
          end();
        }
        _cancelTimers();

        done();
      }, 0);
    }
  });
}
