/*globals raises TestObject */

module('ember-runtime/system/object/destroy_test');

test("should schedule objects to be destroyed at the end of the run loop", function() {
  var obj = Ember.Object.create();

  Ember.run(function() {
    var meta;
    obj.destroy();
    meta = Ember.meta(obj);
    ok(meta, "object is not destroyed immediately");
  });

  ok(obj.get('isDestroyed'), "object is destroyed after run loop finishes");
});

test("should raise an exception when modifying watched properties on a destroyed object", function() {
  if (Ember.platform.hasAccessors) {
    var obj = Ember.Object.createWithMixins({
      foo: "bar",
      fooDidChange: Ember.observer(function() { }, 'foo')
    });

    Ember.run(function() {
      obj.destroy();
    });

    raises(function() {
      Ember.set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  } else {
    expect(0);
  }
});

test("observers should not fire after an object has been destroyed", function() {
  var count = 0;
  var obj = Ember.Object.createWithMixins({
    fooDidChange: Ember.observer(function() {
      count++;
    }, 'foo')
  });

  obj.set('foo', 'bar');

  equal(count, 1, "observer was fired once");

  Ember.run(function() {
    Ember.beginPropertyChanges();
    obj.set('foo', 'quux');
    obj.destroy();
    Ember.endPropertyChanges();
  });

  equal(count, 1, "observer was not called after object was destroyed");
});
