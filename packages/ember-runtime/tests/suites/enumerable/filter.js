require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests;

// ..........................................................
// filter()
//

suite.module('filter');

suite.test('filter should invoke on each item', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      cnt = ary.length - 2,
      found = [], result;

  // return true on all but the last two
  result = obj.filter(function(i) { found.push(i); return --cnt>=0; });
  deepEqual(found, ary, 'should have invoked on each item');
  deepEqual(result, ary.slice(0,-2), 'filtered array should exclude items');
});

// ..........................................................
// filterBy()
//

suite.module('filterBy');

suite.test('should filter based on object', function() {
  var obj, ary;

  ary = [
    { foo: 'foo', bar: 'BAZ' },
    Ember.Object.create({ foo: 'foo', bar: 'bar' })
  ];

  obj = this.newObject(ary);

  deepEqual(obj.filterBy('foo', 'foo'), ary, 'filterBy(foo)');
  deepEqual(obj.filterBy('bar', 'bar'), [ary[1]], 'filterBy(bar)');
});

suite.test('should include in result if property is true', function() {
  var obj, ary;

  ary = [
    { foo: 'foo', bar: true },
    Ember.Object.create({ foo: 'bar', bar: false })
  ];

  obj = this.newObject(ary);

  // different values - all eval to true
  deepEqual(obj.filterBy('foo'), ary, 'filterBy(foo)');
  deepEqual(obj.filterBy('bar'), [ary[0]], 'filterBy(bar)');
});

suite.test('should filter on second argument if provided', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: 2}),
    { name: 'obj3', foo: 2},
    Ember.Object.create({ name: 'obj4', foo: 3})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.filterBy('foo', 3), [ary[0], ary[3]], "filterBy('foo', 3)')");
});

suite.test('should correctly filter null second argument', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: null}),
    { name: 'obj3', foo: null},
    Ember.Object.create({ name: 'obj4', foo: 3})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.filterBy('foo', null), [ary[1], ary[2]], "filterBy('foo', 3)')");
});

suite.test('should not return all objects on undefined second argument', function() {
  var obj, ary;

  ary = [
    { name: 'obj1', foo: 3},
    Ember.Object.create({ name: 'obj2', foo: 2})
  ];

  obj = this.newObject(ary);

  deepEqual(obj.filterBy('foo', undefined), [], "filterBy('foo', 3)')");
});

suite.test('should correctly filter explicit undefined second argument', function() {
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

  deepEqual(obj.filterBy('foo', undefined), ary.slice(2), "filterBy('foo', 3)')");
});

suite.test('should not match undefined properties without second argument', function() {
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

  deepEqual(obj.filterBy('foo'), ary.slice(0, 2), "filterBy('foo', 3)')");
});

suite.test('should be aliased to filterProperty', function() {
  var ary = [];

  equal(ary.filterProperty, ary.filterBy);
});
