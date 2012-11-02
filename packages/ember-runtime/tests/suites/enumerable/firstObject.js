require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('firstObject');

suite.test('returns first item in enumerable', function() {
  var obj = this.newObject();
  equal(Ember.get(obj, 'firstObject'), this.toArray(obj)[0]);
});

suite.test('returns undefined if enumerable is empty', function() {
  var obj = this.newObject([]);
  equal(Ember.get(obj, 'firstObject'), undefined);
});