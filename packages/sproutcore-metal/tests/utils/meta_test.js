// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("SC.meta");

test("should return the same hash for an object", function() {
  var obj = {};

  SC.meta(obj).foo = "bar";

  equals(SC.meta(obj).foo, "bar", "returns same hash with multiple calls to SC.meta()");
});

module("SC.metaPath")

test("should not create nested objects if writable is false", function() {
  var obj = {};

  ok(!SC.meta(obj).foo, "precond - foo property on meta does not yet exist");
  equals(SC.metaPath(obj, ['foo', 'bar', 'baz'], false), undefined, "should return undefined when writable is false and doesn't already exist") ;
  equals(SC.meta(obj).foo, undefined, "foo property is not created");
});

test("should create nested objects if writable is true", function() {
  var obj = {};

  ok(!SC.meta(obj).foo, "precond - foo property on meta does not yet exist");

  equals(typeof SC.metaPath(obj, ['foo', 'bar', 'baz'], true), "object", "should return hash when writable is true and doesn't already exist") ;
  ok(SC.meta(obj).foo.bar.baz['bat'] = true, "can set a property on the newly created hash");
});
