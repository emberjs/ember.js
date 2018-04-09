import EmberObject from '../../lib/system/object';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class IsAnyTests extends AbstractTestCase {
  '@test should return true of any property matches'() {
    let obj = this.newObject([
      { foo: 'foo', bar: 'BAZ' },
      EmberObject.create({ foo: 'foo', bar: 'bar' }),
    ]);

    this.assert.equal(obj.isAny('foo', 'foo'), true, 'isAny(foo)');
    this.assert.equal(obj.isAny('bar', 'bar'), true, 'isAny(bar)');
    this.assert.equal(obj.isAny('bar', 'BIFF'), false, 'isAny(BIFF)');
  }

  '@test should return true of any property is true'() {
    let obj = this.newObject([
      { foo: 'foo', bar: true },
      EmberObject.create({ foo: 'bar', bar: false }),
    ]);

    // different values - all eval to true
    this.assert.equal(obj.isAny('foo'), true, 'isAny(foo)');
    this.assert.equal(obj.isAny('bar'), true, 'isAny(bar)');
    this.assert.equal(obj.isAny('BIFF'), false, 'isAny(biff)');
  }

  '@test should return true if any property matches null'() {
    let obj = this.newObject([
      { foo: null, bar: 'bar' },
      EmberObject.create({ foo: 'foo', bar: null }),
    ]);

    this.assert.equal(obj.isAny('foo', null), true, "isAny('foo', null)");
    this.assert.equal(obj.isAny('bar', null), true, "isAny('bar', null)");
  }

  '@test should return true if any property is undefined'() {
    let obj = this.newObject([{ foo: undefined, bar: 'bar' }, EmberObject.create({ foo: 'foo' })]);

    this.assert.equal(obj.isAny('foo', undefined), true, "isAny('foo', undefined)");
    this.assert.equal(obj.isAny('bar', undefined), true, "isAny('bar', undefined)");
  }

  '@test should not match undefined properties without second argument'() {
    let obj = this.newObject([{ foo: undefined }, EmberObject.create({})]);

    this.assert.equal(obj.isAny('foo'), false, "isAny('foo', undefined)");
  }
}

runArrayTests('isAny', IsAnyTests);
