import { run, schedule, _getCurrentRunLoop } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/run_loop/unwind_test',
  class extends AbstractTestCase {
    ['@test RunLoop unwinds despite unhandled exception'](assert) {
      let initialRunLoop = _getCurrentRunLoop();

      assert.throws(
        () => {
          run(() => {
            schedule('actions', function () {
              throw new Error('boom!');
            });
          });
        },
        Error,
        'boom!'
      );

      // The real danger at this point is that calls to autorun will stick
      // tasks into the already-dead runloop, which will never get
      // flushed. I can't easily demonstrate this in a unit test because
      // autorun explicitly doesn't work in test mode. - ef4
      assert.equal(
        _getCurrentRunLoop(),
        initialRunLoop,
        'Previous run loop should be cleaned up despite exception'
      );
    }

    ['@test run unwinds despite unhandled exception'](assert) {
      let initialRunLoop = _getCurrentRunLoop();

      assert.throws(
        () => {
          run(function () {
            throw new Error('boom!');
          });
        },
        Error,
        'boom!'
      );

      assert.equal(
        _getCurrentRunLoop(),
        initialRunLoop,
        'Previous run loop should be cleaned up despite exception'
      );
    }
  }
);
