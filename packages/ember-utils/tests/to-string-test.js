import { toString } from '..';

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
