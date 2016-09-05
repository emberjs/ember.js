import isNone from '../../is_none';
import run from '../../run_loop';

const originalSetTimeout = window.setTimeout;
const originalDateValueOf = Date.prototype.valueOf;
const originalPlatform = run.backburner._platform;

function wait(callback, maxWaitCount) {
  maxWaitCount = isNone(maxWaitCount) ? 100 : maxWaitCount;

  originalSetTimeout(() => {
    if (maxWaitCount > 0 && (run.hasScheduledTimers() || run.currentRunLoop)) {
      wait(callback, maxWaitCount - 1);

      return;
    }

    callback();
  }, 10);
}

// Synchronous "sleep". This simulates work being done
// after run.later was called but before the run loop
// has flushed. In previous versions, this would have
// caused the run.later callback to have run from
// within the run loop flush, since by the time the
// run loop has to flush, it would have considered
// the timer already expired.
function pauseUntil(time) {
  // jscs:disable
  while (+new Date() < time) { /* do nothing - sleeping */ }
  // jscs:enable
}

QUnit.module('run.later', {
  teardown() {
    run.backburner._platform = originalPlatform;
    window.setTimeout = originalSetTimeout;
    Date.prototype.valueOf = originalDateValueOf;
  }
});

asyncTest('should invoke after specified period of time - function only', function() {
  let invoked = false;

  run(() => {
    run.later(() => invoked = true, 100);
  });

  wait(() => {
    QUnit.start();
    equal(invoked, true, 'should have invoked later item');
  });
});

asyncTest('should invoke after specified period of time - target/method', function() {
  let obj = { invoked: false };

  run(() => {
    run.later(obj, function() { this.invoked = true; }, 100);
  });

  wait(() => {
    QUnit.start();
    equal(obj.invoked, true, 'should have invoked later item');
  });
});

asyncTest('should invoke after specified period of time - target/method/args', function() {
  let obj = { invoked: 0 };

  run(() => {
    run.later(obj, function(amt) { this.invoked += amt; }, 10, 100);
  });

  wait(() => {
    QUnit.start();
    equal(obj.invoked, 10, 'should have invoked later item');
  });
});

asyncTest('should always invoke within a separate runloop', function() {
  let obj = { invoked: 0 };
  let firstRunLoop, secondRunLoop;

  run(() => {
    firstRunLoop = run.currentRunLoop;

    run.later(obj, function(amt) {
      this.invoked += amt;
      secondRunLoop = run.currentRunLoop;
    }, 10, 1);

    pauseUntil(+new Date() + 100);
  });

  ok(firstRunLoop, 'first run loop captured');
  ok(!run.currentRunLoop, 'shouldn\'t be in a run loop after flush');
  equal(obj.invoked, 0, 'shouldn\'t have invoked later item yet');

  wait(() => {
    QUnit.start();
    equal(obj.invoked, 10, 'should have invoked later item');
    ok(secondRunLoop, 'second run loop took place');
    ok(secondRunLoop !== firstRunLoop, 'two different run loops took place');
  });
});

// Our current implementation doesn't allow us to correctly enforce this ordering.
// We should probably implement a queue to provide this guarantee.
// See https://github.com/emberjs/ember.js/issues/3526 for more information.

// asyncTest('callback order', function() {
//   let array = [];
//   function fn(val) { array.push(val); }

//   run(function() {
//     run.later(this, fn, 4, 5);
//     run.later(this, fn, 1, 1);
//     run.later(this, fn, 5, 10);
//     run.later(this, fn, 2, 3);
//     run.later(this, fn, 3, 3);
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
//   function fn(val) { array.push(run.currentRunLoop); }

//   run(function() {

//     // Force +new Date to return the same result while scheduling
//     // run.later timers. Otherwise: non-determinism!
//     let now = +new Date();
//     Date.prototype.valueOf = function() { return now; };

//     run.later(this, fn, 10);
//     run.later(this, fn, 200);
//     run.later(this, fn, 200);

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

asyncTest('inception calls to run.later should run callbacks in separate run loops', function() {
  let runLoop, finished;

  run(() => {
    runLoop = run.currentRunLoop;
    ok(runLoop);

    run.later(() => {
      ok(run.currentRunLoop && run.currentRunLoop !== runLoop,
         'first later callback has own run loop');
      runLoop = run.currentRunLoop;

      run.later(() => {
        ok(run.currentRunLoop && run.currentRunLoop !== runLoop,
           'second later callback has own run loop');
        finished = true;
      }, 40);
    }, 40);
  });

  wait(() => {
    QUnit.start();
    ok(finished, 'all .later callbacks run');
  });
});

asyncTest('setTimeout should never run with a negative wait', function() {
  // Rationale: The old run loop code was susceptible to an occasional
  // bug where invokeLaterTimers would be scheduled with a setTimeout
  // with a negative wait. Modern browsers normalize this to 0, but
  // older browsers (IE <= 8) break with a negative wait, which
  // happens when an expired timer callback takes a while to run,
  // which is what we simulate here.
  let newSetTimeoutUsed;
  run.backburner._platform = {
    setTimeout() {
      let wait = arguments[arguments.length - 1];
      newSetTimeoutUsed = true;
      ok(!isNaN(wait) && wait >= 0, 'wait is a non-negative number');

      return originalPlatform.setTimeout.apply(originalPlatform, arguments);
    }
  };

  let count = 0;
  run(() => {
    run.later(() => {
      count++;

      // This will get run first. Waste some time.
      // This is intended to break invokeLaterTimers code by taking a
      // long enough time that other timers should technically expire. It's
      // fine that they're not called in this run loop; just need to
      // make sure that invokeLaterTimers doesn't end up scheduling
      // a negative setTimeout.
      pauseUntil(+new Date() + 60);
    }, 1);

    run.later(() => {
      equal(count, 1, 'callbacks called in order');
    }, 50);
  });

  wait(() => {
    QUnit.start();
    ok(newSetTimeoutUsed, 'stub setTimeout was used');
  });
});
