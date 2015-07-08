import run from 'ember-metal/run_loop';

QUnit.module('run.next');

asyncTest('should invoke immediately on next timeout', function() {
  var invoked = false;

  run(function() {
    run.next(function() { invoked = true; });
  });

  equal(invoked, false, 'should not have invoked yet');


  setTimeout(function() {
    QUnit.start();
    equal(invoked, true, 'should have invoked later item');
  }, 20);
});

asyncTest('callback should be called from within separate loop', function() {
  var firstRunLoop, secondRunLoop;
  run(function() {
    firstRunLoop = run.currentRunLoop;
    run.next(function() { secondRunLoop = run.currentRunLoop; });
  });

  setTimeout(function() {
    QUnit.start();
    ok(secondRunLoop, 'callback was called from within run loop');
    ok(firstRunLoop && secondRunLoop !== firstRunLoop, 'two separate run loops were invoked');
  }, 20);
});

asyncTest('multiple calls to run.next share coalesce callbacks into same run loop', function() {
  var firstRunLoop, secondRunLoop, thirdRunLoop;
  run(function() {
    firstRunLoop = run.currentRunLoop;
    run.next(function() { secondRunLoop = run.currentRunLoop; });
    run.next(function() { thirdRunLoop  = run.currentRunLoop; });
  });

  setTimeout(function() {
    QUnit.start();
    ok(secondRunLoop && secondRunLoop === thirdRunLoop, 'callbacks coalesced into same run loop');
  }, 20);
});
