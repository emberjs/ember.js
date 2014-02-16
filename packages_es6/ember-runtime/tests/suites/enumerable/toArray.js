require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('toArray');

suite.test('toArray should convert to an array', function() {
  var obj = this.newObject();
  deepEqual(obj.toArray(), this.toArray(obj));
});

