import { debugToString as maybeDebugToString } from '@glimmer/util';

QUnit.module('debug-to-string tests');

if (import.meta.env.DEV) {
  const debugToString = maybeDebugToString as (value: unknown) => string;
  QUnit.test('[debugToString] should be an function in debug mode', (assert) => {
    assert.deepEqual(typeof maybeDebugToString, 'function');
  });
  QUnit.test('should return debug name for named [function]', (assert) => {
    function foo() {}
    assert.deepEqual(debugToString(foo), 'foo');
  });
  QUnit.test('should return debug name for arrow [function]', (assert) => {
    let foo = () => {};
    assert.deepEqual(debugToString(foo), 'foo');
  });
  QUnit.test('should return debug name for primitive [number]', (assert) => {
    assert.deepEqual(debugToString(1), '1');
  });
  QUnit.test('should return debug name for primitive [undefined]', (assert) => {
    assert.deepEqual(debugToString(undefined), 'undefined');
  });
  QUnit.test('should return debug name for primitive [string]', (assert) => {
    assert.deepEqual(debugToString('foo'), 'foo');
  });
  QUnit.test('should return debug name for primitive [null]', (assert) => {
    assert.deepEqual(debugToString(null), 'null');
  });
  QUnit.test('should return debug name for primitive [NaN]', (assert) => {
    assert.deepEqual(debugToString(NaN), 'NaN');
  });
  QUnit.test('should return debug name for primitive [Infinity]', (assert) => {
    assert.deepEqual(debugToString(Infinity), 'Infinity');
  });
  QUnit.test('should return debug name for primitive [Symbol]', (assert) => {
    assert.deepEqual(debugToString(Symbol('Foo')), 'Symbol(Foo)');
  });
  QUnit.test('should return debug name for object', (assert) => {
    assert.deepEqual(debugToString({}), 'Object');
  });
  QUnit.test('should return debug name for object with constructor property', (assert) => {
    assert.deepEqual(debugToString({ constructor: { modelName: 'bar' } }), '(unknown object)');
  });
  QUnit.test('should return debug name for object with toString function', (assert) => {
    assert.deepEqual(
      debugToString({
        toString() {
          return '[Glimmer]';
        },
      }),
      '[Glimmer]'
    );
  });
  QUnit.test('should return debug name for class', (assert) => {
    assert.deepEqual(debugToString(class Foo {}), 'Foo');
  });
  QUnit.test('should return debug name for ember-like object #1', (assert) => {
    assert.deepEqual(
      debugToString({
        toString() {
          return '<CoreObject:ember205>';
        },
      }),
      '<Object:ember205>'
    );
  });
  QUnit.test('should return debug name for ember-like object #2', (assert) => {
    assert.deepEqual(
      debugToString({
        toString() {
          return '<model:null:ember201:null>';
        },
      }),
      '<model:null:ember201:null>'
    );
  });
} else {
  QUnit.test('[debugToString] should be undefined without debug mode', (assert) => {
    assert.deepEqual(typeof maybeDebugToString, 'undefined');
  });
}
