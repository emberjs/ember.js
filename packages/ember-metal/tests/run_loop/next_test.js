module('Ember.run.next');

asyncTest('should invoke immediately on next timeout', function() {

  var invoked = false;

  Ember.run(function() {
    Ember.run.next(function() { invoked = true; });
  });

  equal(invoked, false, 'should not have invoked yet');


  setTimeout(function() {
    start();
    equal(invoked, true, 'should have invoked later item');
  }, 20);

});

asyncTest('callback should be called from within separate loop', function() {
  var firstRunLoop, secondRunLoop;
  Ember.run(function() {
    firstRunLoop = Ember.run.currentRunLoop;
    Ember.run.next(function() { secondRunLoop = Ember.run.currentRunLoop; });
  });

  setTimeout(function() {
    start();
    ok(secondRunLoop, 'callback was called from within run loop');
    ok(firstRunLoop && secondRunLoop !== firstRunLoop, 'two seperate run loops were invoked');
  }, 20);
});

asyncTest('multiple calls to Ember.run.next share coalesce callbacks into same run loop', function() {
  var firstRunLoop, secondRunLoop, thirdRunLoop;
  Ember.run(function() {
    firstRunLoop = Ember.run.currentRunLoop;
    Ember.run.next(function() { secondRunLoop = Ember.run.currentRunLoop; });
    Ember.run.next(function() { thirdRunLoop  = Ember.run.currentRunLoop; });
  });

  setTimeout(function() {
    start();
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
