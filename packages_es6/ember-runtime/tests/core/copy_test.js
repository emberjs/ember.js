module("Ember Copy Method");

test("Ember.copy null", function() {
  var obj = {field: null};
  equal(Ember.copy(obj, true).field, null, "null should still be null");
});

