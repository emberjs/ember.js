import EmberObject from '../../../system/object';
import { SuiteModuleBuilder } from '../suite';

const suite = SuiteModuleBuilder.create();

// ..........................................................
// isAny()
//

suite.module('isAny');

suite.test('should return true of any property matches', function(assert) {
  let obj = this.newObject([
    { foo: 'foo', bar: 'BAZ' },
    EmberObject.create({ foo: 'foo', bar: 'bar' })
  ]);

  assert.equal(obj.isAny('foo', 'foo'), true, 'isAny(foo)');
  assert.equal(obj.isAny('bar', 'bar'), true, 'isAny(bar)');
  assert.equal(obj.isAny('bar', 'BIFF'), false, 'isAny(BIFF)');
});

suite.test('should return true of any property is true', function(assert) {
  let obj = this.newObject([
    { foo: 'foo', bar: true },
    EmberObject.create({ foo: 'bar', bar: false })
  ]);

  // different values - all eval to true
  assert.equal(obj.isAny('foo'), true, 'isAny(foo)');
  assert.equal(obj.isAny('bar'), true, 'isAny(bar)');
  assert.equal(obj.isAny('BIFF'), false, 'isAny(biff)');
});

suite.test('should return true if any property matches null', function(assert) {
  let obj = this.newObject([
    { foo: null, bar: 'bar' },
    EmberObject.create({ foo: 'foo', bar: null })
  ]);

  assert.equal(obj.isAny('foo', null), true, 'isAny(\'foo\', null)');
  assert.equal(obj.isAny('bar', null), true, 'isAny(\'bar\', null)');
});

suite.test('should return true if any property is undefined', function(assert) {
  let obj = this.newObject([
    { foo: undefined, bar: 'bar' },
    EmberObject.create({ foo: 'foo' })
  ]);

  assert.equal(obj.isAny('foo', undefined), true, 'isAny(\'foo\', undefined)');
  assert.equal(obj.isAny('bar', undefined), true, 'isAny(\'bar\', undefined)');
});

suite.test('should not match undefined properties without second argument', function(assert) {
  let obj = this.newObject([
    { foo: undefined },
    EmberObject.create({ })
  ]);

  assert.equal(obj.isAny('foo'), false, 'isAny(\'foo\', undefined)');
});

export default suite;
