import SafeString from "htmlbars-util/safe-string";
import { htmlSafe } from "ember-htmlbars/utils/string";

QUnit.module('ember-htmlbars: SafeString');

test("htmlSafe should return an instance of SafeString", function() {
  var safeString = htmlSafe("you need to be more <b>bold</b>");

  ok(safeString instanceof SafeString, "should return SafeString");
});
