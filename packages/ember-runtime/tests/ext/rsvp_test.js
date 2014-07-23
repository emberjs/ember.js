/* global Promise:true */

import run from "ember-metal/run_loop";
import RSVP from "ember-runtime/ext/rsvp";

QUnit.module('Ember.RSVP');

test('Ensure that errors thrown from within a promise are sent to the console', function(){
  var error = new Error('Error thrown in a promise for testing purposes.');

  try {
    run(function(){
      new RSVP.Promise(function(resolve, reject){
        throw error;
      });
    });
    ok(false, 'expected assertion to be thrown');
  } catch (e) {
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

test("given `Ember.testing = true`, correctly informs the test suite about async steps", function() {
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
      QUnit.stop(); // raw async, we must inform the test framework manually
      setTimeout(function(){
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
  }).then(function(user){
    equal(user.name, 'async tomster');
    equal(asyncStarted, 2);
    equal(asyncEnded, 2);
  });
});
