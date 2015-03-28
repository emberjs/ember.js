import { parsePropertyPath } from "ember-views/streams/class_name_binding";

QUnit.module("EmberView - parsePropertyPath");

QUnit.test("it works with a simple property path", function() {
  var parsed = parsePropertyPath("simpleProperty");

  equal(parsed.path, "simpleProperty", "path is parsed correctly");
  equal(parsed.className, undefined, "there is no className");
  equal(parsed.falsyClassName, undefined, "there is no falsyClassName");
  equal(parsed.classNames, "", "there is no classNames");
});

QUnit.test("it works with a more complex property path", function() {
  var parsed = parsePropertyPath("content.simpleProperty");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, undefined, "there is no className");
  equal(parsed.falsyClassName, undefined, "there is no falsyClassName");
  equal(parsed.classNames, "", "there is no classNames");
});

QUnit.test("className is extracted", function() {
  var parsed = parsePropertyPath("content.simpleProperty:class");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, "class", "className is extracted");
  equal(parsed.falsyClassName, undefined, "there is no falsyClassName");
  equal(parsed.classNames, ":class", "there is a classNames");
});

QUnit.test("falsyClassName is extracted", function() {
  var parsed = parsePropertyPath("content.simpleProperty:class:falsyClass");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, "class", "className is extracted");
  equal(parsed.falsyClassName, "falsyClass", "falsyClassName is extracted");
  equal(parsed.classNames, ":class:falsyClass", "there is a classNames");
});

QUnit.test("it works with an empty true class", function() {
  var parsed = parsePropertyPath("content.simpleProperty::falsyClass");

  equal(parsed.path, "content.simpleProperty", "path is parsed correctly");
  equal(parsed.className, undefined, "className is undefined");
  equal(parsed.falsyClassName, "falsyClass", "falsyClassName is extracted");
  equal(parsed.classNames, "::falsyClass", "there is a classNames");
});
