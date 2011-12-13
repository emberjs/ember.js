// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
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
    var obj = Ember.Object.create({
      foo: "bar",
      fooDidChange: Ember.observer(function() { }, 'foo')
    });

    Ember.run(function() {
      obj.destroy();
    });

    raises(function() {
      Ember.set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  }
});
