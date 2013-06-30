module("Ember.isEmpty");

test("Ember.isEmpty", function() {
  var arrayProxy = Ember.ArrayProxy.create({ content: Ember.A() });

  equal(true,  Ember.isEmpty(arrayProxy), "for an ArrayProxy that has empty content");
});
