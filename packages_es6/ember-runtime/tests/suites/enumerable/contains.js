require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('contains');

suite.test('contains returns true if items is in enumerable', function() {
  var data = this.newFixture(3);
  var obj  = this.newObject(data);
  equal(obj.contains(data[1]), true, 'should return true if contained');
});

suite.test('contains returns false if item is not in enumerable', function() {
  var data = this.newFixture(1);
  var obj  = this.newObject(this.newFixture(3));
  equal(obj.contains(data[0]), false, 'should return false if not contained');
});

