var originalSetTimeout = window.setTimeout;

var wait = function(callback, maxWaitCount) {
  maxWaitCount = Ember.isNone(maxWaitCount) ? 100 : maxWaitCount;

  originalSetTimeout(function() {
    if (maxWaitCount > 0 && (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop)) {
      wait(callback, maxWaitCount - 1);

      return;
    }

    callback();
  }, 10);
};

module('Ember.run.debounce', {
  teardown: function() {
    window.setTimeout = originalSetTimeout;
  }
});

asyncTest('should invoke only once after specified period of time - function only', function() {

  var invokeCount = 0;
  var myFunc = function() { invokeCount += 1; };
  var myContext = null;

  Ember.run(function() {
    Ember.run.debounce(myContext, myFunc, 10);
    Ember.run.debounce(myContext, myFunc, 10);
  });

  wait(function() {
    start();
    equal(invokeCount, 1, 'should have invoked only once');
  });
});

asyncTest('should invoke only once after specified period of time - target/method', function() {

  var obj = { invokeCount: 0 } ;
  var myFunc = function() { this.invokeCount += 1; };

  Ember.run(function() {
    Ember.run.debounce(obj, myFunc, 10);
    Ember.run.debounce(obj, myFunc, 10);
  });

  wait(function() {
    start();
    equal(obj.invokeCount, 1, 'should have invoked only once');
  });
});

asyncTest('should invoke only once after specified period of time - target/method as string', function() {

  var obj = {
    myFunc: function() {this.invokeCount += 1; },
    invokeCount: 0
  };

  Ember.run(function() {
    Ember.run.debounce(obj, 'myFunc', 10);
    Ember.run.debounce(obj, 'myFunc', 10);
  });

  wait(function() {
    start();
    equal(obj.invokeCount, 1, 'should have invoked only once');
  });
});

asyncTest('should invoke only once after specified period of time - target/method/args', function() {

  var obj = { invokeArg: null } ;
  var myFunc = function(arg) { this.invokeArg = arg; };

  Ember.run(function() {
    Ember.run.debounce(obj, myFunc, 5, 10);
    Ember.run.debounce(obj, myFunc, 7, 10);
  });

  wait(function() {
    start();
    equal(obj.invokeArg, 5, 'should have invoked item with first args');
  });
});

asyncTest('should invoke again after timer has reset', function() {
  var invokeCount = 0;
  var myContext = null;
  var myFunc = function() { invokeCount += 1; };

  Ember.run(function() {
    Ember.run.debounce(myContext, myFunc, 10);
  });

  wait( function() {
    start();
    equal(invokeCount, 1, 'should have invoked once');
    stop();

    Ember.run(function() {
      Ember.run.debounce(myContext, myFunc, 10);
    });

    wait( function() {
      start();
      equal(invokeCount, 2, 'should have invoked a second time');
    });
  });
});

asyncTest('should not invoke before timer', function() {
  var invokeCount = 0;
  var myContext = null;
  var myFunc = function() { invokeCount += 1; };

  Ember.run(function() {
    Ember.run.debounce(myContext, myFunc, 15);
  });

  originalSetTimeout( function() {
    start();
    equal(invokeCount, 0, 'should not invoke before timer');
    stop();

    originalSetTimeout( function() {
      start();
      equal(invokeCount, 1, 'should invoke after timer');
    }, 10);
  }, 10);

});
