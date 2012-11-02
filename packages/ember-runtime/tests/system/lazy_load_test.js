module("Lazy Loading");

test("if a load hook is registered, it is executed when runLoadHooks are exected", function() {
  var count = 0;

  Ember.run(function() {
    Ember.onLoad("__test_hook__", function(object) {
      count += object;
    });
  });

  Ember.run(function() {
    Ember.runLoadHooks("__test_hook__", 1);
  });

  equal(count, 1, "the object was passed into the load hook");
});

test("if runLoadHooks was already run, it executes newly added hooks immediately", function() {
  var count = 0;
  Ember.run(function() {
    Ember.onLoad("__test_hook__", function(object) {
      count += object;
    });
  });

  Ember.run(function() {
    Ember.runLoadHooks("__test_hook__", 1);
  });

  count = 0;
  Ember.run(function() {
    Ember.onLoad("__test_hook__", function(object) {
      count += object;
    });
  });

  equal(count, 1, "the original object was passed into the load hook");
});
