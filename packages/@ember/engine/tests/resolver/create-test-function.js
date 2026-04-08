import { test } from 'qunit';

export default function (fn) {
  return function (given, expected, description) {
    test(description, function (assert) {
      assert.deepEqual(fn(given), expected);
    });
  };
}
