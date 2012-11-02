require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('compact');

suite.test('removes null values from enumerable', function() {
  var obj = this.newObject([null, 1, null]);
  var ary = obj.compact();
  equal(ary[0], 1);
  equal(ary.length, 1);
});
