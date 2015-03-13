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
    "linkRenderNode",
    "createScope",
    "classify",
    "createFreshScope",
    "createChildScope",
    "bindShadowScope",
    "bindScope",
    "bindSelf",
    "bindLocal",
    "bindBlock",
    "updateScope",
    "updateSelf",
    "updateLocal",
    "lookupHelper",
    "hasHelper",
    "invokeHelper",
    "range",
    "block",
    "inline",
    "keyword",
    "partial",
    "component",
    "element",
    "attribute",
    "subexpr",
    "concat",
    "get",
    "getRoot",
    "getChild",
    "getValue",
    "cleanupRenderNode",
    "destroyRenderNode"
  ];

  for (var i = 0; i < hookNames.length; i++) {
    var hook = hooks[hookNames[i]];
    ok(hook !== undefined, "hook " + hookNames[i] + " is present");
  }

  equal(keys(hooks).length, hookNames.length, "Hooks length match");
});
