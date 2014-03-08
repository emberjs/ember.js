module("Ember.View - _classStringForValue");

var cSFV = Ember.View._classStringForValue;

test("returns dasherized version of last path part if value is true", function() {
  equal(cSFV("propertyName", true), "property-name", "class is dasherized");
  equal(cSFV("content.propertyName", true), "property-name", "class is dasherized");
});

test("returns className if value is true and className is specified", function() {
  equal(cSFV("propertyName", true, "truthyClass"), "truthyClass", "returns className if given");
  equal(cSFV("content.propertyName", true, "truthyClass"), "truthyClass", "returns className if given");
});

test("returns falsyClassName if value is false and falsyClassName is specified", function() {
  equal(cSFV("propertyName", false, "truthyClass", "falsyClass"), "falsyClass", "returns falsyClassName if given");
  equal(cSFV("content.propertyName", false, "truthyClass", "falsyClass"), "falsyClass", "returns falsyClassName if given");
});

test("returns null if value is false and falsyClassName is not specified", function() {
  equal(cSFV("propertyName", false, "truthyClass"), null, "returns null if falsyClassName is not specified");
  equal(cSFV("content.propertyName", false, "truthyClass"), null, "returns null if falsyClassName is not specified");
});

test("returns null if value is false", function() {
  equal(cSFV("propertyName", false), null, "returns null if value is false");
  equal(cSFV("content.propertyName", false), null, "returns null if value is false");
});

test("returns null if value is true and className is not specified and falsyClassName is specified", function() {
  equal(cSFV("propertyName", true, undefined, "falsyClassName"), null, "returns null if value is true");
  equal(cSFV("content.propertyName", true, undefined, "falsyClassName"), null, "returns null if value is true");
});

test("returns the value if the value is truthy", function() {
  equal(cSFV("propertyName", "myString"), "myString", "returns value if the value is truthy");
  equal(cSFV("content.propertyName", "myString"), "myString", "returns value if the value is truthy");

  equal(cSFV("propertyName", "123"), 123, "returns value if the value is truthy");
  equal(cSFV("content.propertyName", 123), 123, "returns value if the value is truthy");
});