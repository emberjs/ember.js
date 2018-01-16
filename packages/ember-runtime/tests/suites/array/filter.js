import EmberObject from '../../../system/object';
import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

// ..........................................................
// filter()
//

suite.module('filter');

suite.test('filter should invoke on each item', function(assert) {
  let obj = this.newObject();
  let ary = this.toArray(obj);
  let cnt = ary.length - 2;
  let found = [];
  let result;

  // return true on all but the last two
  result = obj.filter(function(i) {
    found.push(i);
    return --cnt >= 0;
  });
  assert.deepEqual(found, ary, 'should have invoked on each item');
  assert.deepEqual(result, ary.slice(0, -2), 'filtered array should exclude items');
});

// ..........................................................
// filterBy()
//

suite.module('filterBy');

suite.test('should filter based on object', function(assert) {
  let obj, ary;

  ary = [
    { foo: 'foo', bar: 'BAZ' },
    EmberObject.create({ foo: 'foo', bar: 'bar' })
  ];

  obj = this.newObject(ary);

  assert.deepEqual(obj.filterBy('foo', 'foo'), ary, 'filterBy(foo)');
  assert.deepEqual(obj.filterBy('bar', 'bar'), [ary[1]], 'filterBy(bar)');
});

suite.test('should include in result if property is true', function(assert) {
  let obj, ary;

  ary = [
    { foo: 'foo', bar: true },
    EmberObject.create({ foo: 'bar', bar: false })
  ];

  obj = this.newObject(ary);

  // different values - all eval to true
  assert.deepEqual(obj.filterBy('foo'), ary, 'filterBy(foo)');
  assert.deepEqual(obj.filterBy('bar'), [ary[0]], 'filterBy(bar)');
});

suite.test('should filter on second argument if provided', function(assert) {
  let obj, ary;

  ary = [
    { name: 'obj1', foo: 3 },
    EmberObject.create({ name: 'obj2', foo: 2 }),
    { name: 'obj3', foo: 2 },
    EmberObject.create({ name: 'obj4', foo: 3 })
  ];

  obj = this.newObject(ary);

  assert.deepEqual(obj.filterBy('foo', 3), [ary[0], ary[3]], 'filterBy(\'foo\', 3)\')');
});

suite.test('should correctly filter null second argument', function(assert) {
  let obj, ary;

  ary = [
    { name: 'obj1', foo: 3 },
    EmberObject.create({ name: 'obj2', foo: null }),
    { name: 'obj3', foo: null },
    EmberObject.create({ name: 'obj4', foo: 3 })
  ];

  obj = this.newObject(ary);

  assert.deepEqual(obj.filterBy('foo', null), [ary[1], ary[2]], 'filterBy(\'foo\', 3)\')');
});

suite.test('should not return all objects on undefined second argument', function(assert) {
  let obj, ary;

  ary = [
    { name: 'obj1', foo: 3 },
    EmberObject.create({ name: 'obj2', foo: 2 })
  ];

  obj = this.newObject(ary);

  assert.deepEqual(obj.filterBy('foo', undefined), [], 'filterBy(\'foo\', 3)\')');
});

suite.test('should correctly filter explicit undefined second argument', function(assert) {
  let obj, ary;

  ary = [
    { name: 'obj1', foo: 3 },
    EmberObject.create({ name: 'obj2', foo: 3 }),
    { name: 'obj3', foo: undefined },
    EmberObject.create({ name: 'obj4', foo: undefined }),
    { name: 'obj5' },
    EmberObject.create({ name: 'obj6' })
  ];

  obj = this.newObject(ary);

  assert.deepEqual(obj.filterBy('foo', undefined), ary.slice(2), 'filterBy(\'foo\', 3)\')');
});

suite.test('should not match undefined properties without second argument', function(assert) {
  let obj, ary;

  ary = [
    { name: 'obj1', foo: 3 },
    EmberObject.create({ name: 'obj2', foo: 3 }),
    { name: 'obj3', foo: undefined },
    EmberObject.create({ name: 'obj4', foo: undefined }),
    { name: 'obj5' },
    EmberObject.create({ name: 'obj6' })
  ];

  obj = this.newObject(ary);

  assert.deepEqual(obj.filterBy('foo'), ary.slice(0, 2), 'filterBy(\'foo\', 3)\')');
});

export default suite;
