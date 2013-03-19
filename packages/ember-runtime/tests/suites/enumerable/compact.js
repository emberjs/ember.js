require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('compact');

suite.test('removes null and undefined values from enumerable', function() {
  var obj = this.newObject([null, 1, false, '', undefined, 0, null]);
  var ary = obj.compact();
  deepEqual(ary, [1, false, '', 0]);
});
