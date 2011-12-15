module("system/binding/sync_test.js");

testBoth("bindings should not try to sync destroyed objects", function(get, set) {
  var a, b;

  Ember.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');
  });

  Ember.run(function() {
    set(a, 'foo', 'trollface');
    set(b, 'isDestroyed', true);
    // should not raise
  });

  Ember.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    Ember.bind(b, 'foo', 'a.foo');
  });

  Ember.run(function() {
    set(b, 'foo', 'trollface');
    set(a, 'isDestroyed', true);
    // should not raise
  });
});
