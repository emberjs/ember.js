import { hooks } from "../htmlbars-runtime";

QUnit.module("htmlbars-runtime");

function keys(obj) {
  var ownKeys = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      ownKeys.push(key);
    }
  }
  return ownKeys;
}

test("hooks are present", function () {
  var hookNames = [
    "getCachedFragment",
    "content",
    "inline",
    "block",
    "component",
    "element",
    "attribute",
    "subexpr",
    "concat",
    "get",
    "set"
  ];

  for (var i = 0; i < hookNames.length; i++) {
    ok(hooks[hookNames[i]], "hook " + hookNames[i] + " is present");
  }

  equal(keys(hooks).length, hookNames.length, "Hooks length match");
});
