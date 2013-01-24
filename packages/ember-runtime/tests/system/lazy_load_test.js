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

test("hooks in ENV.EMBER_LOAD_HOOKS['hookName'] get executed", function() {

  // Note that the necessary code to perform this test is run before
  // the Ember lib is loaded in tests/index.html

  Ember.run(function() {
    Ember.runLoadHooks("__before_ember_test_hook__", 1);
  });

  equal(window.ENV.__test_hook_count__, 1, "the object was passed into the load hook");
});
