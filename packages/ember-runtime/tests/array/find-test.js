import EmberObject from '../../system/object';
import { AbstractTestCase } from 'internal-test-helpers';
import { runArrayTests } from '../helpers/array';

class FindTests extends AbstractTestCase {
  '@test find should invoke callback on each item as long as you return false'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let found = [];
    let result;

    result = obj.find(function(i) {
      found.push(i);
      return false;
    });
    this.assert.equal(result, undefined, 'return value of obj.find');
    this.assert.deepEqual(found, ary, 'items passed during find() should match');
  }

  '@test every should stop invoking when you return true'() {
    let obj = this.newObject();
    let ary = this.toArray(obj);
    let cnt = ary.length - 2;
    let exp = cnt;
    let found = [];
    let result;

    result = obj.find(function(i) {
      found.push(i);
      return --cnt >= 0;
    });
    this.assert.equal(result, ary[exp - 1], 'return value of obj.find');
    this.assert.equal(found.length, exp, 'should invoke proper number of times');
    this.assert.deepEqual(found, ary.slice(0, -2), 'items passed during find() should match');
  }
}

class FindByTests extends AbstractTestCase {
  '@test should return first object of property matches'() {
    let ary, obj;

    ary = [{ foo: 'foo', bar: 'BAZ' }, EmberObject.create({ foo: 'foo', bar: 'bar' })];

    obj = this.newObject(ary);

    this.assert.equal(obj.findBy('foo', 'foo'), ary[0], 'findBy(foo)');
    this.assert.equal(obj.findBy('bar', 'bar'), ary[1], 'findBy(bar)');
  }

  '@test should return first object with truthy prop'() {
    let ary, obj;

    ary = [{ foo: 'foo', bar: false }, EmberObject.create({ foo: 'bar', bar: true })];

    obj = this.newObject(ary);

    // different values - all eval to true
    this.assert.equal(obj.findBy('foo'), ary[0], 'findBy(foo)');
    this.assert.equal(obj.findBy('bar'), ary[1], 'findBy(bar)');
  }

  '@test should return first null property match'() {
    let ary, obj;

    ary = [{ foo: null, bar: 'BAZ' }, EmberObject.create({ foo: null, bar: null })];

    obj = this.newObject(ary);

    this.assert.equal(obj.findBy('foo', null), ary[0], "findBy('foo', null)");
    this.assert.equal(obj.findBy('bar', null), ary[1], "findBy('bar', null)");
  }

  '@test should return first undefined property match'() {
    let ary, obj;

    ary = [{ foo: undefined, bar: 'BAZ' }, EmberObject.create({})];

    obj = this.newObject(ary);

    this.assert.equal(obj.findBy('foo', undefined), ary[0], "findBy('foo', undefined)");
    this.assert.equal(obj.findBy('bar', undefined), ary[1], "findBy('bar', undefined)");
  }
}

runArrayTests('find', FindTests);
runArrayTests('findBy', FindByTests);
