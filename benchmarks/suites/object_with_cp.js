/*global bench before*/

bench("foo should not exist", function() {
  Ember.Object.create({ foo: function() { }.property('bar') });
});
