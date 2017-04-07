import { toString } from '../index';

QUnit.module('ember-utils toString');

QUnit.test('toString uses an object\'s toString method when available', function() {
  let obj = {
    toString() {
      return 'bob';
    }
  };

  strictEqual(toString(obj), 'bob');
});

QUnit.test('toString falls back to Object.prototype.toString', function() {
  let obj = Object.create(null);

  strictEqual(toString(obj), {}.toString());
});

QUnit.test('toString does not fail when called on Arrays with objects without toString method', function() {
  let obj = Object.create(null);
  let arr = [obj, 2];

  strictEqual(toString(arr), `${({}).toString()},2`);
});
