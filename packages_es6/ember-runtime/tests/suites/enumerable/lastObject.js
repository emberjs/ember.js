require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('lastObject');

suite.test('returns last item in enumerable', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj);
  equal(Ember.get(obj, 'lastObject'), ary[ary.length-1]);
});

suite.test('returns undefined if enumerable is empty', function() {
  var obj = this.newObject([]);
  equal(Ember.get(obj, 'lastObject'), undefined);
});