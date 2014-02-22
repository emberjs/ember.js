import copy from "ember-runtime/copy";

module("Ember Copy Method");

test("Ember.copy null", function() {
  var obj = {field: null};
  equal(copy(obj, true).field, null, "null should still be null");
});

