// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises TestObject */

module('sproutcore-runtime/system/object/destroy_test');

test("should schedule objects to be destroyed at the end of the run loop", function() {
  var obj = SC.Object.create();

  SC.run(function() {
    var meta;
    obj.destroy();
    meta = SC.meta(obj);
    ok(meta, "object is not destroyed immediately");
  });

  ok(obj.get('isDestroyed'), "object is destroyed after run loop finishes");
});

test("should raise an exception when modifying watched properties on a destroyed object", function() {
  if (SC.platform.hasAccessors) {
    var obj = SC.Object.create({
      foo: "bar",
      fooDidChange: SC.observer(function() { }, 'foo')
    });

    SC.run(function() {
      obj.destroy();
    });

    raises(function() {
      SC.set(obj, 'foo', 'baz');
    }, Error, "raises an exception");
  }
});
