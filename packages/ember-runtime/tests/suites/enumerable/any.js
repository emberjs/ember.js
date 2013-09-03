require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// any()
//

suite.module('any');

suite.test('any should should invoke callback on each item as long as you return false', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      found = [], result;

  result = obj.any(function(i) { found.push(i); return false; });
  equal(result, false, 'return value of obj.any');
  deepEqual(found, ary, 'items passed during any() should match');
});

suite.test('any should stop invoking when you return true', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2,
      exp = cnt,
      found = [], result;

  result = obj.any(function(i) { found.push(i); return --cnt <= 0; });
  equal(result, true, 'return value of obj.any');
  equal(found.length, exp, 'should invoke proper number of times');
  deepEqual(found, ary.slice(0,-2), 'items passed during any() should match');
});

suite.test('any should be aliased to some', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      anyFound = [], anyResult,
      someFound = [], someResult,
      cnt = ary.length - 2,
      exp = cnt;

  anyResult = obj.any(function(i) { anyFound.push(i); return false; });
  someResult = obj.some(function(i) { someFound.push(i); return false; });
  equal(someResult, anyResult);

  anyFound = [];
  someFound = [];

  cnt = ary.length - 2;
  anyResult = obj.any(function(i) { anyFound.push(i); return --cnt <= 0; });
  cnt = ary.length - 2;
  someResult = obj.some(function(i) { someFound.push(i); return --cnt <= 0; });

  equal(someResult, anyResult);
});

// ..........................................................
// anyBy()
//

suite.module('anyBy');

suite.test('should return true of any property matches', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ]);

  equal(obj.anyBy('foo', 'foo'), true, 'anyBy(foo)');
  equal(obj.anyBy('bar', 'bar'), true, 'anyBy(bar)');
  equal(obj.anyBy('bar', 'BIFF'), false, 'anyBy(BIFF)');
});

suite.test('should return true of any property is true', function() {
  var obj = this.newObject([
    { foo: 'foo', bar: true },
    Ember.Object.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  equal(obj.anyBy('foo'), true, 'anyBy(foo)');
  equal(obj.anyBy('bar'), true, 'anyBy(bar)');
  equal(obj.anyBy('BIFF'), false, 'anyBy(biff)');
});

suite.test('should return true if any property matches null', function() {
  var obj = this.newObject([
    { foo: null, bar: 'bar' },
    Ember.Object.create({ foo: 'foo', bar: null })
  ]);

  equal(obj.anyBy('foo', null), true, "anyBy('foo', null)");
  equal(obj.anyBy('bar', null), true, "anyBy('bar', null)");
});

suite.test('should return true if any property is undefined', function() {
  var obj = this.newObject([
    { foo: undefined, bar: 'bar' },
    Ember.Object.create({ foo: 'foo' })
  ]);

  equal(obj.anyBy('foo', undefined), true, "anyBy('foo', undefined)");
  equal(obj.anyBy('bar', undefined), true, "anyBy('bar', undefined)");
});

suite.test('should not match undefined properties without second argument', function() {
  var obj = this.newObject([
    { foo: undefined },
    Ember.Object.create({ })
  ]);

  equal(obj.anyBy('foo'), false, "anyBy('foo', undefined)");
});

suite.test('anyBy should be aliased to someProperty', function() {
  var obj = this.newObject();
  equal(obj.someProperty, obj.anyBy);
});
