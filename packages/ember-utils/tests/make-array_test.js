import { makeArray } from '../index';
import { ArrayProxy } from 'ember-runtime';

QUnit.module('ember-utils makeArray');

QUnit.test('makeArray returns empty array by default', function () {
  deepEqual(makeArray(), []);
});

QUnit.test('makeArray returns empty array when input is `null`', function () {
  deepEqual(makeArray(null), []);
});

QUnit.test('makeArray returns empty array when input is `undefined`', function () {
  deepEqual(makeArray(undefined), []);
});

QUnit.test('makeArray returns empty array when input is non-array', function () {
  deepEqual(makeArray('lindsay'), ['lindsay']);
  deepEqual(makeArray(123), [123]);
  deepEqual(makeArray({ foo: 'bar' }), [{ foo: 'bar' }]);
});

QUnit.test('makeArray returns the input itself when it is already an array', function () {
  let array = [1, 2, 42];
  equal(makeArray(array), array);
});

QUnit.test('makeArray returns the input itself when it is ArrayProxy', function () {
  let controller = ArrayProxy.create({ content: [] });
  equal(makeArray(controller), controller);
});
