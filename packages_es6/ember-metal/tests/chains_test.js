var META_KEY = Ember.META_KEY;

module("Chains");

test("finishChains should properly copy chains from prototypes to instances", function() {
  function didChange() {}

  var obj = {};
  Ember.addObserver(obj, 'foo.bar', null, didChange);

  var childObj = Object.create(obj);
  Ember.finishChains(childObj);

  ok(obj[META_KEY].chains !== childObj[META_KEY].chains, "The chains object is copied");
});