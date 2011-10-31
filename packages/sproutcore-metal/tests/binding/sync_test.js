module("system/binding/sync_test.js");

testBoth("bindings should not try to sync destroyed objects", function(get, set) {
  var a, b;

  SC.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    SC.bind(b, 'foo', 'a.foo');
  });

  SC.run(function() {
    set(a, 'foo', 'trollface');
    set(b, 'isDestroyed', true);
    // should not raise
  });

  SC.run(function() {
    a = {
      foo: 'trololol'
    };

    b = {
      a: a
    };
    SC.bind(b, 'foo', 'a.foo');
  });

  SC.run(function() {
    set(b, 'foo', 'trollface');
    set(a, 'isDestroyed', true);
    // should not raise
  });
});
