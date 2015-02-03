import { classStringForValue } from "ember-views/streams/class_name_binding";

QUnit.module("EmberView - classStringForValue");

QUnit.test("returns dasherized version of last path part if value is true", function() {
  equal(classStringForValue("propertyName", true), "property-name", "class is dasherized");
  equal(classStringForValue("content.propertyName", true), "property-name", "class is dasherized");
});

QUnit.test("returns className if value is true and className is specified", function() {
  equal(classStringForValue("propertyName", true, "truthyClass"), "truthyClass", "returns className if given");
  equal(classStringForValue("content.propertyName", true, "truthyClass"), "truthyClass", "returns className if given");
});

QUnit.test("returns falsyClassName if value is false and falsyClassName is specified", function() {
  equal(classStringForValue("propertyName", false, "truthyClass", "falsyClass"), "falsyClass", "returns falsyClassName if given");
  equal(classStringForValue("content.propertyName", false, "truthyClass", "falsyClass"), "falsyClass", "returns falsyClassName if given");
});

QUnit.test("returns null if value is false and falsyClassName is not specified", function() {
  equal(classStringForValue("propertyName", false, "truthyClass"), null, "returns null if falsyClassName is not specified");
  equal(classStringForValue("content.propertyName", false, "truthyClass"), null, "returns null if falsyClassName is not specified");
});

QUnit.test("returns null if value is false", function() {
  equal(classStringForValue("propertyName", false), null, "returns null if value is false");
  equal(classStringForValue("content.propertyName", false), null, "returns null if value is false");
});

QUnit.test("returns null if value is true and className is not specified and falsyClassName is specified", function() {
  equal(classStringForValue("propertyName", true, undefined, "falsyClassName"), null, "returns null if value is true");
  equal(classStringForValue("content.propertyName", true, undefined, "falsyClassName"), null, "returns null if value is true");
});

QUnit.test("returns the value if the value is truthy", function() {
  equal(classStringForValue("propertyName", "myString"), "myString", "returns value if the value is truthy");
  equal(classStringForValue("content.propertyName", "myString"), "myString", "returns value if the value is truthy");

  equal(classStringForValue("propertyName", "123"), 123, "returns value if the value is truthy");
  equal(classStringForValue("content.propertyName", 123), 123, "returns value if the value is truthy");
});

QUnit.test("treat empty array as falsy value and return null", function() {
  equal(classStringForValue("propertyName", [], "truthyClass"), null, "returns null if value is false");
  equal(classStringForValue("content.propertyName", [], "truthyClass"), null, "returns null if value is false");
});

QUnit.test("treat non-empty array as truthy value and return the className if specified", function() {
  equal(classStringForValue("propertyName", ['emberjs'], "truthyClass"), "truthyClass", "returns className if given");
  equal(classStringForValue("content.propertyName", ['emberjs'], "truthyClass"), "truthyClass", "returns className if given");
});
