/* global Promise:true */

import run from "ember-metal/run_loop";
import RSVP from "ember-runtime/ext/rsvp";

QUnit.module('Ember.RSVP');

QUnit.test('Ensure that errors thrown from within a promise are sent to the console', function() {
  var error = new Error('Error thrown in a promise for testing purposes.');

  try {
    run(function() {
      new RSVP.Promise(function(resolve, reject) {
        throw error;
      });
    });
    ok(false, 'expected assertion to be thrown');
  } catch(e) {
    equal(e, error, "error was re-thrown");
  }
});

var asyncStarted = 0;
var asyncEnded = 0;
var Promise = RSVP.Promise;

var EmberTest;
var EmberTesting;

QUnit.module("Deferred RSVP's async + Testing", {
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

QUnit.test("given `Ember.testing = true`, correctly informs the test suite about async steps", function() {
  expect(19);

  ok(!run.currentRunLoop, 'expect no run-loop');

  Ember.testing = true;

  equal(asyncStarted, 0);
  equal(asyncEnded, 0);

  var user = Promise.resolve({
    name: 'tomster'
  });

  equal(asyncStarted, 0);
  equal(asyncEnded, 0);

  user.then(function(user) {
    equal(asyncStarted, 1);
    equal(asyncEnded, 1);

    equal(user.name, 'tomster');

    return Promise.resolve(1).then(function() {
      equal(asyncStarted, 1);
      equal(asyncEnded, 1);
    });

  }).then(function() {
    equal(asyncStarted, 1);
    equal(asyncEnded, 1);

    return new Promise(function(resolve) {
      QUnit.stop(); // raw async, we must inform the test framework manually
      setTimeout(function() {
        QUnit.start(); // raw async, we must inform the test framework manually

        equal(asyncStarted, 1);
        equal(asyncEnded, 1);

        resolve({
          name: 'async tomster'
        });

        equal(asyncStarted, 2);
        equal(asyncEnded, 1);
      }, 0);
    });
  }).then(function(user) {
    equal(user.name, 'async tomster');
    equal(asyncStarted, 2);
    equal(asyncEnded, 2);
  });
});

QUnit.test('TransitionAborted errors are not re-thrown', function() {
  expect(1);
  var fakeTransitionAbort = { name: 'TransitionAborted' };

  run(RSVP, 'reject', fakeTransitionAbort);

  ok(true, 'did not throw an error when dealing with TransitionAborted');
});

QUnit.test('rejections like jqXHR which have errorThrown property work', function() {
  expect(2);

  var wasEmberTesting = Ember.testing;
  var wasOnError      = Ember.onerror;

  try {
    Ember.testing = false;
    Ember.onerror = function(error) {
      equal(error, actualError, 'expected the real error on the jqXHR');
      equal(error.__reason_with_error_thrown__, jqXHR, 'also retains a helpful reference to the rejection reason');
    };

    var actualError = new Error("OMG what really happened");
    var jqXHR = {
      errorThrown: actualError
    };

    run(RSVP, 'reject', jqXHR);
  } finally {
    Ember.onerror = wasOnError;
    Ember.testing = wasEmberTesting;
  }
});


QUnit.test('rejections where the errorThrown is a string should wrap the sting in an error object', function() {
  expect(2);

  var wasEmberTesting = Ember.testing;
  var wasOnError      = Ember.onerror;

  try {
    Ember.testing = false;
    Ember.onerror = function(error) {
      equal(error.message, actualError, 'expected the real error on the jqXHR');
      equal(error.__reason_with_error_thrown__, jqXHR, 'also retains a helpful reference to the rejection reason');
    };

    var actualError = "OMG what really happened";
    var jqXHR = {
      errorThrown: actualError
    };

    run(RSVP, 'reject', jqXHR);
  } finally {
    Ember.onerror = wasOnError;
    Ember.testing = wasEmberTesting;
  }
});
