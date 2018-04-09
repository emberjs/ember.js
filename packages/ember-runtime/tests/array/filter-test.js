import EmberObject from '../../lib/system/object';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class FilterTest extends AbstractTestCase {
  '@test filter should invoke on each item'() {
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
    this.assert.deepEqual(found, ary, 'should have invoked on each item');
    this.assert.deepEqual(result, ary.slice(0, -2), 'filtered array should exclude items');
  }
}

class FilterByTest extends AbstractTestCase {
  '@test should filter based on object'() {
    let obj, ary;

    ary = [{ foo: 'foo', bar: 'BAZ' }, EmberObject.create({ foo: 'foo', bar: 'bar' })];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.filterBy('foo', 'foo'), ary, 'filterBy(foo)');
    this.assert.deepEqual(obj.filterBy('bar', 'bar'), [ary[1]], 'filterBy(bar)');
  }

  '@test should include in result if property is true'() {
    let obj, ary;

    ary = [{ foo: 'foo', bar: true }, EmberObject.create({ foo: 'bar', bar: false })];

    obj = this.newObject(ary);

    // different values - all eval to true
    this.assert.deepEqual(obj.filterBy('foo'), ary, 'filterBy(foo)');
    this.assert.deepEqual(obj.filterBy('bar'), [ary[0]], 'filterBy(bar)');
  }

  '@test should filter on second argument if provided'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: 2 }),
      { name: 'obj3', foo: 2 },
      EmberObject.create({ name: 'obj4', foo: 3 }),
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.filterBy('foo', 3), [ary[0], ary[3]], "filterBy('foo', 3)')");
  }

  '@test should correctly filter null second argument'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: null }),
      { name: 'obj3', foo: null },
      EmberObject.create({ name: 'obj4', foo: 3 }),
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.filterBy('foo', null), [ary[1], ary[2]], "filterBy('foo', 3)')");
  }

  '@test should not return all objects on undefined second argument'() {
    let obj, ary;

    ary = [{ name: 'obj1', foo: 3 }, EmberObject.create({ name: 'obj2', foo: 2 })];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.filterBy('foo', undefined), [], "filterBy('foo', 3)')");
  }

  '@test should correctly filter explicit undefined second argument'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: 3 }),
      { name: 'obj3', foo: undefined },
      EmberObject.create({ name: 'obj4', foo: undefined }),
      { name: 'obj5' },
      EmberObject.create({ name: 'obj6' }),
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.filterBy('foo', undefined), ary.slice(2), "filterBy('foo', 3)')");
  }

  '@test should not match undefined properties without second argument'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: 3 }),
      { name: 'obj3', foo: undefined },
      EmberObject.create({ name: 'obj4', foo: undefined }),
      { name: 'obj5' },
      EmberObject.create({ name: 'obj6' }),
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.filterBy('foo'), ary.slice(0, 2), "filterBy('foo', 3)')");
  }
}

runArrayTests('filter', FilterTest);
runArrayTests('filter', FilterByTest);
