require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('mapProperty');

suite.test('get value of each property', function() {
  var obj = this.newObject([{a: 1},{a: 2}]);
  equal(obj.mapProperty('a').join(''), '12');
});

suite.test('should work also through getEach alias', function() {
  var obj = this.newObject([{a: 1},{a: 2}]);
  equal(obj.getEach('a').join(''), '12');
});
