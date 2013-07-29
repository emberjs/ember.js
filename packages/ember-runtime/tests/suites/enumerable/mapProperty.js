require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

suite.module('mapProperty');

suite.test('get value of each property without a filter', function() {
  var obj = this.newObject([{a: 1},{a: 2}]);
  equal(obj.mapProperty('a').join(''), '12');
});

suite.test('get only property values of filtered items', function() {
  var obj = this.newObject([{a: 1, include: true},{a: 2, include: false},{a: 3, include: true}]);
  var filter = function(item){
    return item.include;
  };
  equal(obj.mapProperty('a', filter).join(''), '13');
});


suite.test('getEach alias should work without a filter', function() {
  var obj = this.newObject([{a: 1},{a: 2}]);
  equal(obj.getEach('a').join(''), '12');
});

suite.test('getEach alias should work with a filter', function() {
  var obj = this.newObject([{a: 1, include: true},{a: 2, include: false},{a: 3, include: true}]);
  var filter = function(item){
    return item.include;
  };
  equal(obj.getEach('a', filter).join(''), '13');
});

