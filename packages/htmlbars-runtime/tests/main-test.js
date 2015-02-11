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
    "keywords",
    "createScope",
    "bindSelf",
    "bindLocal",
    "bindBlock",
    "lookupHelper",
    "hasHelper",
    "content",
    "range",
    "block",
    "inline",
    "partial",
    "component",
    "element",
    "attribute",
    "subexpr",
    "concat",
    "get",
    "getRoot",
    "getChild",
  ];

  for (var i = 0; i < hookNames.length; i++) {
    ok(hooks[hookNames[i]], "hook " + hookNames[i] + " is present");
  }

  equal(keys(hooks).length, hookNames.length, "Hooks length match");
});
