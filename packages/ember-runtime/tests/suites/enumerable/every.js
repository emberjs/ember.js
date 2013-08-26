require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// every()
//

suite.module('every');

suite.test('every should should invoke callback on each item as long as you return true', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      found = [], result;

  result = obj.every(function(i) { found.push(i); return true; });
  equal(result, true, 'return value of obj.every');
  deepEqual(found, ary, 'items passed during every() should match');
});

suite.test('every should stop invoking when you return false', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2,
      exp = cnt,
      found = [], result;

  result = obj.every(function(i) { found.push(i); return --cnt>0; });
  equal(result, false, 'return value of obj.every');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0,-2), 'items passed during every() should match');
});

// ..........................................................
// everyBy()
//

suite.module('everyBy');

suite.test('should return true of every property matches', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ]);

  equal(obj.everyBy('foo', 'foo'), true, 'everyBy(foo)');
  equal(obj.everyBy('bar', 'bar'), false, 'everyBy(bar)');
});

suite.test('should return true of every property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true },
    Ember.Object.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equal(obj.everyBy('foo'), true, 'everyBy(foo)');
  equal(obj.everyBy('bar'), false, 'everyBy(bar)');
});

suite.test('should return true if every property matches null', function() {
  var obj = this.newObject([
    { foo: null, bar: 'BAZ' },
    Ember.Object.create({ foo: null, bar: null })
  ]);

  equal(obj.everyBy('foo', null), true, "everyBy('foo', null)");
  equal(obj.everyBy('bar', null), false, "everyBy('bar', null)");
});

suite.test('should return true if every property is undefined', function() {
  var obj = this.newObject([
    { foo: undefined, bar: 'BAZ' },
    Ember.Object.create({ bar: undefined })
  ]);

  equal(obj.everyBy('foo', undefined), true, "everyBy('foo', undefined)");
  equal(obj.everyBy('bar', undefined), false, "everyBy('bar', undefined)");
});
