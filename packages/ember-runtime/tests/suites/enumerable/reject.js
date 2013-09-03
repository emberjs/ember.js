require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// reject()
//

suite.module('reject');

suite.test('should reject any item that does not meet the condition', function() {
  var obj = this.newObject([1,2,3,4]),
      result;

  result = obj.reject(function(i) { return i < 3; });
  deepEqual(result, [3,4], 'reject the correct items');
});

suite.test('should be the inverse of filter', function() {
  var obj = this.newObject([1,2,3,4]),
      isEven = function(i) { return i % 2 === 0; },
      filtered, rejected;

  filtered = obj.filter(isEven);
  rejected = obj.reject(isEven);

  deepEqual(filtered, [2,4], 'filtered evens');
  deepEqual(rejected, [1,3], 'rejected evens');
});

// ..........................................................
// rejectBy()
//

suite.module('rejectBy');

suite.test('should reject based on object', function() {
  var obj, ary;

  ary = [
    { foo: 'foo', bar: 'BAZ' },
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('foo', 'foo'), [], 'rejectBy(foo)');
  deepEqual(obj.rejectBy('bar', 'bar'), [ary[0]], 'rejectBy(bar)');
});

suite.test('should include in result if property is false', function() {
  var obj, ary;

  ary = [
    { foo: false, bar: true },
    Ember.Object.create({ foo: false, bar: false })
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('foo'), ary, 'rejectBy(foo)');
  deepEqual(obj.rejectBy('bar'), [ary[1]], 'rejectBy(bar)');
});

suite.test('should reject on second argument if provided', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: 2}),
    { name: 'obj3', foo: 2},
    Ember.Object.create({ name: 'obj4', foo: 3})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('foo', 3), [ary[1], ary[2]], "rejectBy('foo', 3)')");
});

suite.test('should correctly reject null second argument', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: null}),
    { name: 'obj3', foo: null},
    Ember.Object.create({ name: 'obj4', foo: 3})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('foo', null), [ary[0], ary[3]], "rejectBy('foo', null)')");
});

suite.test('should correctly reject undefined second argument', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: 2})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('bar', undefined), [], "rejectBy('bar', undefined)')");
});

suite.test('should correctly reject explicit undefined second argument', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: 3}),
    { name: 'obj3', foo: undefined},
    Ember.Object.create({ name: 'obj4', foo: undefined}),
    { name: 'obj5'},
    Ember.Object.create({ name: 'obj6'})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('foo', undefined), ary.slice(0, 2), "rejectBy('foo', undefined)')");
});

suite.test('should match undefined, null, or false properties without second argument', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: 3}),
    { name: 'obj3', foo: undefined},
    Ember.Object.create({ name: 'obj4', foo: undefined}),
    { name: 'obj5'},
    Ember.Object.create({ name: 'obj6'}),
    { name: 'obj7', foo: null },
    Ember.Object.create({ name: 'obj8', foo: null }),
    { name: 'obj9', foo: false },
    Ember.Object.create({ name: 'obj10', foo: false })
  ];

  obj = this.newObject(ary);

  deepEqual(obj.rejectBy('foo'), ary.slice(2), "rejectBy('foo')')");
});

suite.test('should be aliased to rejectProperty', function() {
  var ary =[];

  equal(ary.rejectProperty, ary.rejectBy);
});
