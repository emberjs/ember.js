require('ember-runtime/~tests/suites/mutable_array');

var suite = Ember.MutableArrayTests;

suite.module('pushObjects');

suite.test("should raise exception if not Ember.Enumerable is passed to pushObjects", function() {
  var obj = this.newObject([]);

  raises(function() {
    obj.pushObjects( "string" );
  });
});