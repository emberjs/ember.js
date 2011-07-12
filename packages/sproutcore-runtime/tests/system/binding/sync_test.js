module("system/binding/sync_test.js");

testBoth("bindings should not try to sync destroyed objects", function(get, set) {
  var a, b;

  SC.run(function() {
    a = SC.Object.create({
      foo: 'trololol'
    });

    b = SC.Object.create({
      a: a,
      fooBinding: 'a.foo'
    });
  });

  SC.run(function() {
    set(a, 'foo', 'trollface');
    b.destroy();
    // should not raise
  });

  SC.run(function() {
    a = SC.Object.create({
      foo: 'trololol'
    });

    b = SC.Object.create({
      a: a,
      fooBinding: 'a.foo'
    });
  });

  SC.run(function() {
    set(b, 'foo', 'trollface');
    a.destroy();
    // should not raise
  });
});
