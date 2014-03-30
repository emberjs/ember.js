module("Ember.DeferredMixin");

test("can resolve deferred", function() {
  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(a) {
    count++;
  });

  Ember.run(deferred, 'resolve', deferred);

  equal(count, 1, "was fulfilled");
});

test("can reject deferred", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(null, function() {
    count++;
  });

  Ember.run(deferred, 'reject');

  equal(count, 1, "fail callback was called");
});

test("can resolve with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  Ember.run(deferred, 'resolve', deferred);

  equal(count1, 1, "then were resolved");
  equal(count2, 0, "then was not rejected");
});

test("can reject with then", function() {

  var deferred, count1 = 0 ,count2 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  Ember.run(deferred, 'reject');

  equal(count1, 0, "then was not resolved");
  equal(count2, 1, "then were rejected");
});

test("can call resolve multiple times", function() {

  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    count++;
  });

  Ember.run(function() {
    deferred.resolve(deferred);
    deferred.resolve(deferred);
    deferred.resolve(deferred);
  });

  equal(count, 1, "calling resolve multiple times has no effect");
});

test("resolve prevent reject", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  Ember.run(deferred, 'resolve', deferred);
  Ember.run(deferred, 'reject');

  equal(resolved, true, "is resolved");
  equal(rejected, false, "is not rejected");
});

test("reject prevent resolve", function() {
  var deferred, resolved = false, rejected = false, progress = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  Ember.run(deferred, 'reject');
  Ember.run(deferred, 'reject', deferred);

  equal(resolved, false, "is not resolved");
  equal(rejected, true, "is rejected");
});

test("will call callbacks if they are added after resolution", function() {

  var deferred, count1 = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  Ember.run(deferred, 'resolve', 'toto');

  Ember.run(function() {
    deferred.then(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });

    deferred.then(function(context) {
      if (context === 'toto') {
        count1++;
      }
    });
  });

  equal(count1, 2, "callbacks called after resolution");
});

test("then is chainable", function() {
  var deferred, count = 0;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    eval('error'); // Use eval to pass JSHint
  }).then(null, function() {
    count++;
  });

  Ember.run(deferred, 'resolve', deferred);

  equal(count, 1, "chained callback was called");
});



test("can self fulfill", function() {
  expect(1);
  var deferred;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(value) {
    equal(value, deferred, "successfully resolved to itself");
  });

  Ember.run(deferred, 'resolve', deferred);
});


test("can self reject", function() {
  expect(1);
  var deferred;

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function() {
    ok(false, 'should not fulfill');
  },function(value) {
    equal(value, deferred, "successfully rejected to itself");
  });

  Ember.run(deferred, 'reject', deferred);
});

test("can fulfill to a custom value", function() {
  expect(1);
  var deferred, obj = {};

  Ember.run(function() {
    deferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then(function(value) {
    equal(value, obj, "successfully resolved to given value");
  });

  Ember.run(deferred, 'resolve', obj);
});


test("can chain self fulfilling objects", function() {
  expect(2);
  var firstDeferred, secondDeferred;

  Ember.run(function() {
    firstDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
    secondDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  firstDeferred.then(function(value) {
    equal(value, firstDeferred, "successfully resolved to the first deferred");
    return secondDeferred;
  }).then(function(value) {
    equal(value, secondDeferred, "successfully resolved to the second deferred");
  });

  Ember.run(function() {
    firstDeferred.resolve(firstDeferred);
    secondDeferred.resolve(secondDeferred);
  });
});

test("can do multi level assimilation", function() {
  expect(1);
  var firstDeferred, secondDeferred, firstDeferredResolved = false;

  Ember.run(function() {
    firstDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
    secondDeferred = Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  firstDeferred.then(function() {
    firstDeferredResolved = true;
  });

  secondDeferred.then(function() {
    ok(firstDeferredResolved, "first deferred already resolved");
  });

  Ember.run(secondDeferred, 'resolve', firstDeferred);
  Ember.run(firstDeferred, 'resolve', firstDeferred);
});


test("can handle rejection without rejection handler", function() {
  expect(2);

  var reason = 'some reason';

  var deferred = Ember.run(function() {
    return Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then().then(function() {
    ok(false, 'expected rejection, got fulfillment');
  }, function(actualReason) {
    ok(true, 'expected fulfillment');
    equal(actualReason, reason);
  });

  Ember.run(deferred, 'reject', reason);
});

test("can handle fulfillment without  fulfillment handler", function() {
  expect(2);

  var fulfillment = 'some fulfillment';

  var deferred = Ember.run(function() {
    return Ember.Object.createWithMixins(Ember.DeferredMixin);
  });

  deferred.then().then(function(actualFulfillment) {
    ok(true, 'expected fulfillment');
    equal(fulfillment, actualFulfillment);
  }, function(reason) {
    ok(false, 'expected fulfillment, got reason' + reason);
  });

  Ember.run(deferred, 'resolve', fulfillment);
});

if (Ember.FEATURES['ember-runtime-test-friendly-promises']) {
  var asyncStarted = 0;
  var asyncEnded = 0;
  var Promise = Ember.RSVP.Promise;

  var EmberTest;
  var EmberTesting;

  module("Ember.DeferredMixin RSVP's async + Testing", {
    setup: function() {
      EmberTest = Ember.Test;
      EmberTesting = Ember.testing;

      Ember.Test = {
        adapter: {
          asyncStart: function() {
            asyncStarted++;
            QUnit.stop();
          },
          asyncEnd: function() {
            asyncEnded++;
            QUnit.start();
          }
        }
      };
    },
    teardown: function() {
      asyncStarted = 0;
      asyncEnded = 0;

      Ember.testing = EmberTesting;
      Ember.Test =  EmberTest;
    }
  });

  test("given `Ember.testing = true`, correctly informs the test suite about async steps", function() {
    expect(19);

    ok(!Ember.run.currentRunLoop, 'expect no run-loop');

    Ember.testing = true;

    equal(asyncStarted, 0);
    equal(asyncEnded, 0);

    var user = Promise.resolve({
      name: 'tomster'
    });

    equal(asyncStarted, 1);
    equal(asyncEnded, 0);

    user.then(function(user){
      equal(asyncStarted, 1);
      equal(asyncEnded, 1);

      equal(user.name, 'tomster');

      return Promise.resolve(1).then(function(){
        equal(asyncStarted, 1);
        equal(asyncEnded, 1);
      });

    }).then(function(){
      equal(asyncStarted, 1);
      equal(asyncEnded, 1);

      return new Promise(function(resolve){
        stop(); // raw async, we must inform the test framework manually
        setTimeout(function(){
          start(); // raw async, we must inform the test framework manually

          equal(asyncStarted, 1);
          equal(asyncEnded, 1);

          resolve({
            name: 'async tomster'
          });

          equal(asyncStarted, 2);
          equal(asyncEnded, 1);
        }, 0);
      });
    }).then(function(user){
      equal(user.name, 'async tomster');
      equal(asyncStarted, 2);
      equal(asyncEnded, 2);
    });
  });
}
