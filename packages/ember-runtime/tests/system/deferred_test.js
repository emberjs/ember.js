import run from 'ember-metal/run_loop';
import Deferred from "ember-runtime/system/deferred";

QUnit.module("Ember.Deferred all-in-one");

asyncTest("Can resolve a promise", function() {
  var value = { value: true };

  ignoreDeprecation(function() {
    var promise = Deferred.promise(function(deferred) {
      setTimeout(function() {
        run(function() { deferred.resolve(value); });
      });
    });

    promise.then(function(resolveValue) {
      QUnit.start();
      equal(resolveValue, value, "The resolved value should be correct");
    });
  });
});

asyncTest("Can reject a promise", function() {
  var rejected = { rejected: true };

  ignoreDeprecation(function() {
    var promise = Deferred.promise(function(deferred) {
      setTimeout(function() {
        run(function() { deferred.reject(rejected); });
      });
    });

    promise.then(null, function(rejectedValue) {
      QUnit.start();
      equal(rejectedValue, rejected, "The resolved value should be correct");
    });
  });
});
