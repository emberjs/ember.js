import { run, next, _getCurrentRunLoop } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'runloop `next`',
  class extends AbstractTestCase {
    ['@test should invoke immediately on next timeout'](assert) {
      let done = assert.async();
      let invoked = false;

      run(() => next(() => (invoked = true)));

      assert.equal(invoked, false, 'should not have invoked yet');

      setTimeout(() => {
        assert.equal(invoked, true, 'should have invoked later item');
        done();
      }, 20);
    }

    ['@test callback should be called from within separate loop'](assert) {
      let done = assert.async();
      let firstRunLoop, secondRunLoop;
      run(() => {
        firstRunLoop = _getCurrentRunLoop();
        next(() => (secondRunLoop = _getCurrentRunLoop()));
      });

      setTimeout(() => {
        assert.ok(secondRunLoop, 'callback was called from within run loop');
        assert.ok(
          firstRunLoop && secondRunLoop !== firstRunLoop,
          'two separate run loops were invoked'
        );
        done();
      }, 20);
    }

    ['@test multiple calls to next share coalesce callbacks into same run loop'](assert) {
      let done = assert.async();
      let secondRunLoop, thirdRunLoop;
      run(() => {
        next(() => (secondRunLoop = _getCurrentRunLoop()));
        next(() => (thirdRunLoop = _getCurrentRunLoop()));
      });

      setTimeout(() => {
        assert.ok(
          secondRunLoop && secondRunLoop === thirdRunLoop,
          'callbacks coalesced into same run loop'
        );
        done();
      }, 20);
    }
  }
);
