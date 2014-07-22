import {hooks} from "../htmlbars-runtime";

module("htmlbars-runtime");

test("hooks are present", function () {
  var hookNames = ['content', 'lookupHelper'];
  for (var i=0;i<hookNames.length;i++) {
    ok(hooks[hookNames[i]], "hook "+hookNames[i]+" is present");
  }
});
