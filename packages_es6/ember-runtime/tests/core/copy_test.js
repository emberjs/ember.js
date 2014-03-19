import copy from "ember-runtime/copy";

module("Ember Copy Method");

test("Ember.copy null", function() {
  var obj = {field: null};
  equal(copy(obj, true).field, null, "null should still be null");
});

test("Ember.copy date", function() {
  var date = new Date(2014, 7, 22),
      dateCopy = copy(date);
  equal(date.getTime(), dateCopy.getTime(), "dates should be equivalent");
});
