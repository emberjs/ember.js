/*global bench alert*/

bench("foo should not exist", function() {
  Ember.Object.create({ foo: function() { }.observes('bar') });
});

