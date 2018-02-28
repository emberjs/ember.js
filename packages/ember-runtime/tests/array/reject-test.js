import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';
import EmberObject from '../../system/object';

class RejectTest extends AbstractTestCase {
  '@test should reject any item that does not meet the condition'() {
    let obj = this.newObject([1, 2, 3, 4]);
    let result;

    result = obj.reject(i => i < 3);
    this.assert.deepEqual(result, [3, 4], 'reject the correct items');
  }

  '@test should be the inverse of filter'() {
    let obj = this.newObject([1, 2, 3, 4]);
    let isEven = i => i % 2 === 0;
    let filtered, rejected;

    filtered = obj.filter(isEven);
    rejected = obj.reject(isEven);

    this.assert.deepEqual(filtered, [2, 4], 'filtered evens');
    this.assert.deepEqual(rejected, [1, 3], 'rejected evens');
  }
}

class RejectByTest extends AbstractTestCase {
  '@test should reject based on object'() {
    let obj, ary;

    ary = [
      { foo: 'foo', bar: 'BAZ' },
      EmberObject.create({ foo: 'foo', bar: 'bar' })
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.rejectBy('foo', 'foo'), [], 'rejectBy(foo)');
    this.assert.deepEqual(obj.rejectBy('bar', 'bar'), [ary[0]], 'rejectBy(bar)');
  }

  '@test should include in result if property is false'() {
    let obj, ary;

    ary = [
      { foo: false, bar: true },
      EmberObject.create({ foo: false, bar: false })
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.rejectBy('foo'), ary, 'rejectBy(foo)');
    this.assert.deepEqual(obj.rejectBy('bar'), [ary[1]], 'rejectBy(bar)');
  }

  '@test should reject on second argument if provided'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: 2 }),
      { name: 'obj3', foo: 2 },
      EmberObject.create({ name: 'obj4', foo: 3 })
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.rejectBy('foo', 3), [ary[1], ary[2]], 'rejectBy(\'foo\', 3)\')');
  }

  '@test should correctly reject null second argument'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: null }),
      { name: 'obj3', foo: null },
      EmberObject.create({ name: 'obj4', foo: 3 })
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.rejectBy('foo', null), [ary[0], ary[3]], 'rejectBy(\'foo\', null)\')');
  }

  '@test should correctly reject undefined second argument'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: 2 })
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.rejectBy('bar', undefined), [], 'rejectBy(\'bar\', undefined)\')');
  }

  '@test should correctly reject explicit undefined second argument'() {
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

    this.assert.deepEqual(obj.rejectBy('foo', undefined), ary.slice(0, 2), 'rejectBy(\'foo\', undefined)\')');
  }

  '@test should match undefined, null, or false properties without second argument'() {
    let obj, ary;

    ary = [
      { name: 'obj1', foo: 3 },
      EmberObject.create({ name: 'obj2', foo: 3 }),
      { name: 'obj3', foo: undefined },
      EmberObject.create({ name: 'obj4', foo: undefined }),
      { name: 'obj5' },
      EmberObject.create({ name: 'obj6' }),
      { name: 'obj7', foo: null },
      EmberObject.create({ name: 'obj8', foo: null }),
      { name: 'obj9', foo: false },
      EmberObject.create({ name: 'obj10', foo: false })
    ];

    obj = this.newObject(ary);

    this.assert.deepEqual(obj.rejectBy('foo'), ary.slice(2), 'rejectBy(\'foo\')\')');
  }
}

runArrayTests('reject', RejectTest);
runArrayTests('rejectBy', RejectByTest);