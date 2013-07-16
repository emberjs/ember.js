module("Ember Type Checking");

test("Ember.isArray" ,function() {
  var arrayProxy = Ember.ArrayProxy.create({ content: Ember.A() });

  equal(Ember.isArray(arrayProxy), true, "[]");
});
