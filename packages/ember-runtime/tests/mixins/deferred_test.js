/* global EmberDev */

import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import Deferred from "ember-runtime/mixins/deferred";

var originalDeprecate;

QUnit.module("Deferred", {
  setup: function() {
    originalDeprecate = Ember.deprecate;
    Ember.deprecate = function() { };
  },

  teardown: function() {
    Ember.deprecate = originalDeprecate;
  }
});

QUnit.test("can resolve deferred", function() {
  var deferred;
  var count = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function(a) {
    count++;
  });

  run(deferred, 'resolve', deferred);

  equal(count, 1, "was fulfilled");
});

QUnit.test("can reject deferred", function() {

  var deferred;
  var count = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(null, function() {
    count++;
  });

  run(deferred, 'reject');

  equal(count, 1, "fail callback was called");
});

QUnit.test("can resolve with then", function() {

  var deferred;
  var count1 = 0;
  var count2 = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  run(deferred, 'resolve', deferred);

  equal(count1, 1, "then were resolved");
  equal(count2, 0, "then was not rejected");
});

QUnit.test("can reject with then", function() {

  var deferred;
  var count1 = 0;
  var count2 = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    count1++;
  }, function() {
    count2++;
  });

  run(deferred, 'reject');

  equal(count1, 0, "then was not resolved");
  equal(count2, 1, "then were rejected");
});

QUnit.test("can call resolve multiple times", function() {

  var deferred;
  var count = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    count++;
  });

  run(function() {
    deferred.resolve(deferred);
    deferred.resolve(deferred);
    deferred.resolve(deferred);
  });

  equal(count, 1, "calling resolve multiple times has no effect");
});

QUnit.test("resolve prevent reject", function() {
  var deferred;
  var resolved = false;
  var rejected = false;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  run(deferred, 'resolve', deferred);
  run(deferred, 'reject');

  equal(resolved, true, "is resolved");
  equal(rejected, false, "is not rejected");
});

QUnit.test("reject prevent resolve", function() {
  var deferred;
  var resolved = false;
  var rejected = false;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    resolved = true;
  }, function() {
    rejected = true;
  });

  run(deferred, 'reject');
  run(deferred, 'reject', deferred);

  equal(resolved, false, "is not resolved");
  equal(rejected, true, "is rejected");
});

QUnit.test("will call callbacks if they are added after resolution", function() {

  var deferred;
  var count1 = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  run(deferred, 'resolve', 'toto');

  run(function() {
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

QUnit.test("then is chainable", function() {
  var deferred;
  var count = 0;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    eval('error'); // Use eval to pass JSHint
  }).then(null, function() {
    count++;
  });

  run(deferred, 'resolve', deferred);

  equal(count, 1, "chained callback was called");
});



QUnit.test("can self fulfill", function() {
  expect(1);
  var deferred;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function(value) {
    equal(value, deferred, "successfully resolved to itself");
  });

  run(deferred, 'resolve', deferred);
});


QUnit.test("can self reject", function() {
  expect(1);
  var deferred;

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function() {
    ok(false, 'should not fulfill');
  }, function(value) {
    equal(value, deferred, "successfully rejected to itself");
  });

  run(deferred, 'reject', deferred);
});

QUnit.test("can fulfill to a custom value", function() {
  expect(1);
  var deferred;
  var obj = {};

  run(function() {
    deferred = EmberObject.createWithMixins(Deferred);
  });

  deferred.then(function(value) {
    equal(value, obj, "successfully resolved to given value");
  });

  run(deferred, 'resolve', obj);
});


QUnit.test("can chain self fulfilling objects", function() {
  expect(2);
  var firstDeferred, secondDeferred;

  run(function() {
    firstDeferred = EmberObject.createWithMixins(Deferred);
    secondDeferred = EmberObject.createWithMixins(Deferred);
  });

  firstDeferred.then(function(value) {
    equal(value, firstDeferred, "successfully resolved to the first deferred");
    return secondDeferred;
  }).then(function(value) {
    equal(value, secondDeferred, "successfully resolved to the second deferred");
  });

  run(function() {
    firstDeferred.resolve(firstDeferred);
    secondDeferred.resolve(secondDeferred);
  });
});

QUnit.test("can do multi level assimilation", function() {
  expect(1);
  var firstDeferred, secondDeferred;
  var firstDeferredResolved = false;

  run(function() {
    firstDeferred = EmberObject.createWithMixins(Deferred);
    secondDeferred = EmberObject.createWithMixins(Deferred);
  });

  firstDeferred.then(function() {
    firstDeferredResolved = true;
  });

  secondDeferred.then(function() {
    ok(firstDeferredResolved, "first deferred already resolved");
  });

  run(secondDeferred, 'resolve', firstDeferred);
  run(firstDeferred, 'resolve', firstDeferred);
});


QUnit.test("can handle rejection without rejection handler", function() {
  expect(2);

  var reason = 'some reason';

  var deferred = run(function() {
    return EmberObject.createWithMixins(Deferred);
  });

  deferred.then().then(function() {
    ok(false, 'expected rejection, got fulfillment');
  }, function(actualReason) {
    ok(true, 'expected fulfillment');
    equal(actualReason, reason);
  });

  run(deferred, 'reject', reason);
});

QUnit.test("can handle fulfillment without  fulfillment handler", function() {
  expect(2);

  var fulfillment = 'some fulfillment';

  var deferred = run(function() {
    return EmberObject.createWithMixins(Deferred);
  });

  deferred.then().then(function(actualFulfillment) {
    ok(true, 'expected fulfillment');
    equal(fulfillment, actualFulfillment);
  }, function(reason) {
    ok(false, 'expected fulfillment, got reason' + reason);
  });

  run(deferred, 'resolve', fulfillment);
});

if (!EmberDev.runningProdBuild) {
  QUnit.test("causes a deprecation warning when used", function() {
    var deferred, deprecationMade;
    var obj = {};

    Ember.deprecate = function(message) {
      deprecationMade = message;
    };

    deferred = EmberObject.createWithMixins(Deferred);
    equal(deprecationMade, undefined, 'no deprecation was made on init');

    deferred.then(function(value) {
      equal(value, obj, "successfully resolved to given value");
    });
    equal(deprecationMade, 'Usage of Ember.DeferredMixin or Ember.Deferred is deprecated.');

    run(deferred, 'resolve', obj);
  });
}
