import SafeString from "htmlbars-util/safe-string";
import { htmlSafe } from "ember-htmlbars/utils/string";

QUnit.module('ember-htmlbars: SafeString');

QUnit.test("htmlSafe should return an instance of SafeString", function() {
  var safeString = htmlSafe("you need to be more <b>bold</b>");

  ok(safeString instanceof SafeString, "should return SafeString");
});

QUnit.test("htmlSafe should return an empty string for null", function() {
  equal(htmlSafe(null).toString(), "", "should return an empty string");
});

QUnit.test("htmlSafe should return an empty string for undefined", function() {
  equal(htmlSafe().toString(), "", "should return an empty string");
});
