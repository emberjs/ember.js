import { DEBUG } from '@glimmer/env';
import { debugToString as maybeDebugToString } from '..';
QUnit.module('debug-to-string tests');

if (DEBUG) {
  const debugToString = maybeDebugToString as ((value: unknown) => string);
  QUnit.test('[debugToString] should be an function in debug mode', (assert) => {
    assert.deepEqual(typeof maybeDebugToString, 'function');
  });
  QUnit.test('should return debug name for named [function]', function (assert) {
    function foo() { };
    assert.deepEqual(debugToString(foo), 'foo');
  });
  QUnit.test('should return debug name for arrow [function]', function (assert) {
    let foo = () => { };
    assert.deepEqual(debugToString(foo), 'foo');
  });
  QUnit.test('should return debug name for primitive [number]', function (assert) {
    assert.deepEqual(debugToString(1), '1');
  });
  QUnit.test('should return debug name for primitive [undefined]', function (assert) {
    assert.deepEqual(debugToString(undefined), 'undefined');
  });
  QUnit.test('should return debug name for primitive [string]', function (assert) {
    assert.deepEqual(debugToString('foo'), 'foo');
  });
  QUnit.test('should return debug name for primitive [null]', function (assert) {
    assert.deepEqual(debugToString(null), 'null');
  });
  QUnit.test('should return debug name for primitive [NaN]', function (assert) {
    assert.deepEqual(debugToString(NaN), 'NaN');
  });
  QUnit.test('should return debug name for primitive [Infinity]', function (assert) {
    assert.deepEqual(debugToString(Infinity), 'Infinity');
  });
  QUnit.test('should return debug name for primitive [Symbol]', function (assert) {
    assert.deepEqual(debugToString(Symbol('Foo')), 'Symbol(Foo)');
  });
  QUnit.test('should return debug name for object', function (assert) {
    assert.deepEqual(debugToString({}), 'Object');
  });
  QUnit.test('should return debug name for object with constructor property', function (assert) {
    assert.deepEqual(debugToString({ constructor: { modelName: 'bar' } }), '(unknown object)');
  });
  QUnit.test('should return debug name for object with toString function', function (assert) {
    assert.deepEqual(debugToString({ toString() { return '[Glimmer]' } }), '[Glimmer]');
  });
  QUnit.test('should return debug name for class', function (assert) {
    assert.deepEqual(debugToString(class Foo { }), 'Foo');
  });
  QUnit.test('should return debug name for ember-like object #1', function (assert) {
    assert.deepEqual(debugToString({ toString() { return '<CoreObject:ember205>' } }), '<Object:ember205>');
  });
  QUnit.test('should return debug name for ember-like object #2', function (assert) {
    assert.deepEqual(debugToString({ toString() { return '<model:null:ember201:null>' } }), '<model:null:ember201:null>');
  });
} else {
  QUnit.test('[debugToString] should be undefined without debug mode', (assert) => {
    assert.deepEqual(typeof maybeDebugToString, 'undefined');
  });
}
