import { run } from '../..';

QUnit.module('run.next');

asyncTest('should invoke immediately on next timeout', function() {
  let invoked = false;

  run(() => run.next(() => invoked = true));

  equal(invoked, false, 'should not have invoked yet');


  setTimeout(() => {
    QUnit.start();
    equal(invoked, true, 'should have invoked later item');
  }, 20);
});

asyncTest('callback should be called from within separate loop', function() {
  let firstRunLoop, secondRunLoop;
  run(() => {
    firstRunLoop = run.currentRunLoop;
    run.next(() => secondRunLoop = run.currentRunLoop);
  });

  setTimeout(() => {
    QUnit.start();
    ok(secondRunLoop, 'callback was called from within run loop');
    ok(firstRunLoop && secondRunLoop !== firstRunLoop, 'two separate run loops were invoked');
  }, 20);
});

asyncTest('multiple calls to run.next share coalesce callbacks into same run loop', function() {
  let secondRunLoop, thirdRunLoop;
  run(() => {
    run.next(() => secondRunLoop = run.currentRunLoop);
    run.next(() => thirdRunLoop  = run.currentRunLoop);
  });

  setTimeout(() => {
    QUnit.start();
    ok(secondRunLoop && secondRunLoop === thirdRunLoop, 'callbacks coalesced into same run loop');
  }, 20);
});

test('does not break with synchronous testing', function() {
  var callbackHasBeenRun = false;

  Ember.run(function() {
    // This be the application's production code that is being exercised from
    // a test suite, and it calls Ember.run.next. We'd like for the callback
    // to have finished executing before Ember.run returns, or non-determinism
    // happens.
    Ember.run.next(function() {
      callbackHasBeenRun = true;
    });
  });

  ok(callbackHasBeenRun, 'callback is called before run loop finishes');
});
