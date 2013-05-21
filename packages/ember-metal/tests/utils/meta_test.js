/*global jQuery*/

module("Ember.meta");

test("should return the same hash for an object", function() {
  var obj = {};

  Ember.meta(obj).foo = "bar";

  equal(Ember.meta(obj).foo, "bar", "returns same hash with multiple calls to Ember.meta()");
});

test("getMeta and setMeta", function() {
  var obj = {};

  ok(!Ember.getMeta(obj, 'foo'), "precond - foo property on meta does not yet exist");
  Ember.setMeta(obj, 'foo', "bar");
  equal(Ember.getMeta(obj, 'foo'), "bar", "foo property on meta now exists");
});

module("Ember.meta enumerable");
// Tests fix for https://github.com/emberjs/ember.js/issues/344
// This is primarily for older browsers such as IE8
if (Ember.platform.defineProperty.isSimulated) {
  if (Ember.imports.jQuery) {
    test("meta is not jQuery.isPlainObject", function () {
      var proto, obj;
      proto = {foo: 'bar'};
      equal(jQuery.isPlainObject(Ember.meta(proto)), false, 'meta should not be isPlainObject when meta property cannot be marked as enumerable: false');
      obj = Ember.create(proto);
      equal(jQuery.isPlainObject(Ember.meta(obj)), false, 'meta should not be isPlainObject when meta property cannot be marked as enumerable: false');
    });
  }
} else {
  test("meta is not enumerable", function () {
    var proto, obj, props, prop;
    proto = {foo: 'bar'};
    Ember.meta(proto);
    obj = Ember.create(proto);
    Ember.meta(obj);
    obj.bar = 'baz';
    props = [];
    for (prop in obj) {
      props.push(prop);
    }
    deepEqual(props.sort(), ['bar', 'foo']);
    if (typeof JSON !== 'undefined' && 'stringify' in JSON) {
      try {
        JSON.stringify(obj);
      } catch (e) {
        ok(false, 'meta should not fail JSON.stringify');
      }
    }
  });
}
