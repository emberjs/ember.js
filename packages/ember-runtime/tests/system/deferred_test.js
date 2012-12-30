module("Ember.Deferred all-in-one");

asyncTest("Can resolve a promise", function() {
  var value = { value: true };

  var promise = Ember.Deferred.promise(function(deferred) {
    setTimeout(function() {
      Ember.run(function() { deferred.resolve(value); });
    });
  });

  promise.then(function(resolveValue) {
    start();
    equal(resolveValue, value, "The resolved value should be correct");
  });
});

asyncTest("Can reject a promise", function() {
  var rejected = { rejected: true };

  var promise = Ember.Deferred.promise(function(deferred) {
    setTimeout(function() {
      Ember.run(function() { deferred.reject(rejected); });
    });
  });

  promise.then(null, function(rejectedValue) {
    start();
    equal(rejectedValue, rejected, "The resolved value should be correct");
  });
});


