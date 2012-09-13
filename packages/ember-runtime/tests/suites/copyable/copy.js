require('ember-runtime/~tests/suites/copyable');

var suite = Ember.CopyableTests;

suite.module('copy');

suite.test("should return an equivalent copy", function() {
  var obj = this.newObject();
  var copy = obj.copy();
  ok(this.isEqual(obj, copy), 'old object and new object should be equivalent');
});


