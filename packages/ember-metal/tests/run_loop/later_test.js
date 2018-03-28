import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { assign } from 'ember-utils';
import {
  run,
  later,
  backburner,
  isNone,
  hasScheduledTimers,
  getCurrentRunLoop,
} from '../..';

const originalSetTimeout = window.setTimeout;
const originalDateValueOf = Date.prototype.valueOf;
const originalPlatform = backburner._platform;

function wait(callback, maxWaitCount) {
  maxWaitCount = isNone(maxWaitCount) ? 100 : maxWaitCount;

  originalSetTimeout(() => {
    if (maxWaitCount > 0 && (hasScheduledTimers() || getCurrentRunLoop())) {
      wait(callback, maxWaitCount - 1);

      return;
    }

    callback();
  }, 10);
}

// Synchronous "sleep". This simulates work being done
// after later was called but before the run loop
// has flushed. In previous versions, this would have
// caused the later callback to have run from
// within the run loop flush, since by the time the
// run loop has to flush, it would have considered
// the timer already expired.
function pauseUntil(time) {
  while (+new Date() < time) { /* do nothing - sleeping */ }
}

moduleFor('run.later', class extends AbstractTestCase {
  teardown() {
    backburner._platform = originalPlatform;
    window.setTimeout = originalSetTimeout;
    Date.prototype.valueOf = originalDateValueOf;
  }

  ['@test should invoke after specified period of time - function only'](assert) {
    let done = assert.async();
    let invoked = false;

    run(() => {
      later(() => invoked = true, 100);
    });

    wait(() => {
      assert.equal(invoked, true, 'should have invoked later item');
      done();
    });
  }

  ['@test should invoke after specified period of time - target/method'](assert) {
    let done = assert.async();
    let obj = { invoked: false };

    run(() => {
      later(obj, function() { this.invoked = true; }, 100);
    });

    wait(() => {
      assert.equal(obj.invoked, true, 'should have invoked later item');
      done();
    });
  }

  ['@test should invoke after specified period of time - target/method/args'](assert) {
    let done = assert.async();
    let obj = { invoked: 0 };

    run(() => {
      later(obj, function(amt) { this.invoked += amt; }, 10, 100);
    });

    wait(() => {
      assert.equal(obj.invoked, 10, 'should have invoked later item');
      done();
    });
  }

  ['@test should always invoke within a separate runloop'](assert) {
    let done = assert.async();
    let obj = { invoked: 0 };
    let firstRunLoop, secondRunLoop;

    run(() => {
      firstRunLoop = getCurrentRunLoop();

      later(obj, function(amt) {
        this.invoked += amt;
        secondRunLoop = getCurrentRunLoop();
      }, 10, 1);

      pauseUntil(+new Date() + 100);
    });

    assert.ok(firstRunLoop, 'first run loop captured');
    assert.ok(!getCurrentRunLoop(), 'shouldn\'t be in a run loop after flush');
    assert.equal(obj.invoked, 0, 'shouldn\'t have invoked later item yet');

    wait(() => {
      assert.equal(obj.invoked, 10, 'should have invoked later item');
      assert.ok(secondRunLoop, 'second run loop took place');
      assert.ok(secondRunLoop !== firstRunLoop, 'two different run loops took place');
      done();
    });
  }

  // Our current implementation doesn't allow us to correctly enforce this ordering.
  // We should probably implement a queue to provide this guarantee.
  // See https://github.com/emberjs/ember.js/issues/3526 for more information.

  // asyncTest('callback order', function() {
  //   let array = [];
  //   function fn(val) { array.push(val); }

  //   run(function() {
  //     later(this, fn, 4, 5);
  //     later(this, fn, 1, 1);
  //     later(this, fn, 5, 10);
  //     later(this, fn, 2, 3);
  //     later(this, fn, 3, 3);
  //   });

  //   deepEqual(array, []);

  //   wait(function() {
  //     QUnit.start();
  //     deepEqual(array, [1,2,3,4,5], 'callbacks were called in expected order');
  //   });
  // });


  // Out current implementation doesn't allow us to properly enforce what is tested here.
  // We should probably fix it, but it's not technically a bug right now.
  // See https://github.com/emberjs/ember.js/issues/3522 for more information.

  // asyncTest('callbacks coalesce into same run loop if expiring at the same time', function() {
  //   let array = [];
  //   function fn(val) { array.push(getCurrentRunLoop()); }

  //   run(function() {

  //     // Force +new Date to return the same result while scheduling
  //     // later timers. Otherwise: non-determinism!
  //     let now = +new Date();
  //     Date.prototype.valueOf = function() { return now; };

  //     later(this, fn, 10);
  //     later(this, fn, 200);
  //     later(this, fn, 200);

  //     Date.prototype.valueOf = originalDateValueOf;
  //   });

  //   deepEqual(array, []);

  //   wait(function() {
  //     QUnit.start();
  //     equal(array.length, 3, 'all callbacks called');
  //     ok(array[0] !== array[1], 'first two callbacks have different run loops');
  //     ok(array[0], 'first runloop present');
  //     ok(array[1], 'second runloop present');
  //     equal(array[1], array[2], 'last two callbacks got the same run loop');
  //   });
  // });

  ['@test inception calls to later should run callbacks in separate run loops'](assert) {
    let done = assert.async();
    let runLoop, finished;

    run(() => {
      runLoop = getCurrentRunLoop();
      assert.ok(runLoop);

      later(() => {
        assert.ok(getCurrentRunLoop() && getCurrentRunLoop() !== runLoop,
          'first later callback has own run loop');
        runLoop = getCurrentRunLoop();

        later(() => {
          assert.ok(getCurrentRunLoop() && getCurrentRunLoop() !== runLoop,
            'second later callback has own run loop');
          finished = true;
        }, 40);
      }, 40);
    });

    wait(() => {
      assert.ok(finished, 'all .later callbacks run');
      done();
    });
  }

  ['@test setTimeout should never run with a negative wait'](assert) {
    let done = assert.async();
    // Rationale: The old run loop code was susceptible to an occasional
    // bug where invokeLaterTimers would be scheduled with a setTimeout
    // with a negative wait. Modern browsers normalize this to 0, but
    // older browsers (IE <= 8) break with a negative wait, which
    // happens when an expired timer callback takes a while to run,
    // which is what we simulate here.
    let newSetTimeoutUsed;
    backburner._platform = assign({}, originalPlatform, {
      setTimeout() {
        let wait = arguments[arguments.length - 1];
        newSetTimeoutUsed = true;
        assert.ok(!isNaN(wait) && wait >= 0, 'wait is a non-negative number');

        return originalPlatform.setTimeout.apply(originalPlatform, arguments);
      }
    });

    let count = 0;
    run(() => {
      later(() => {
        count++;

        // This will get run first. Waste some time.
        // This is intended to break invokeLaterTimers code by taking a
        // long enough time that other timers should technically expire. It's
        // fine that they're not called in this run loop; just need to
        // make sure that invokeLaterTimers doesn't end up scheduling
        // a negative setTimeout.
        pauseUntil(+new Date() + 60);
      }, 1);

      later(() => {
        assert.equal(count, 1, 'callbacks called in order');
      }, 50);
    });

    wait(() => {
      assert.ok(newSetTimeoutUsed, 'stub setTimeout was used');
      done();
    });
  }
});

