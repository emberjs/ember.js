import EmberObject from '../../../system/object';
import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();
// ..........................................................
// find()
//

suite.module('find');

suite.test('find should invoke callback on each item as long as you return false', function(assert) {
  let obj = this.newObject();
  let ary = this.toArray(obj);
  let found = [];
  let result;

  result = obj.find(function(i) {
    found.push(i);
    return false;
  });
  assert.equal(result, undefined, 'return value of obj.find');
  assert.deepEqual(found, ary, 'items passed during find() should match');
});

suite.test('every should stop invoking when you return true', function(assert) {
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
  assert.equal(result, ary[exp - 1], 'return value of obj.find');
  assert.equal(found.length, exp, 'should invoke proper number of times');
  assert.deepEqual(found, ary.slice(0, -2), 'items passed during find() should match');
});

// ..........................................................
// findBy()
//

suite.module('findBy');

suite.test('should return first object of property matches', function(assert) {
  let ary, obj;

  ary = [
    { foo: 'foo', bar: 'BAZ' },
    EmberObject.create({ foo: 'foo', bar: 'bar' })
  ];

  obj = this.newObject(ary);

  assert.equal(obj.findBy('foo', 'foo'), ary[0], 'findBy(foo)');
  assert.equal(obj.findBy('bar', 'bar'), ary[1], 'findBy(bar)');
});

suite.test('should return first object with truthy prop', function(assert) {
  let ary, obj;

  ary = [
    { foo: 'foo', bar: false },
    EmberObject.create({ foo: 'bar', bar: true })
  ];

  obj = this.newObject(ary);

  // different values - all eval to true
  assert.equal(obj.findBy('foo'), ary[0], 'findBy(foo)');
  assert.equal(obj.findBy('bar'), ary[1], 'findBy(bar)');
});

suite.test('should return first null property match', function(assert) {
  let ary, obj;

  ary = [
    { foo: null, bar: 'BAZ' },
    EmberObject.create({ foo: null, bar: null })
  ];

  obj = this.newObject(ary);

  assert.equal(obj.findBy('foo', null), ary[0], 'findBy(\'foo\', null)');
  assert.equal(obj.findBy('bar', null), ary[1], 'findBy(\'bar\', null)');
});

suite.test('should return first undefined property match', function(assert) {
  let ary, obj;

  ary = [
    { foo: undefined, bar: 'BAZ' },
    EmberObject.create({ })
  ];

  obj = this.newObject(ary);

  assert.equal(obj.findBy('foo', undefined), ary[0], 'findBy(\'foo\', undefined)');
  assert.equal(obj.findBy('bar', undefined), ary[1], 'findBy(\'bar\', undefined)');
});

export default suite;
