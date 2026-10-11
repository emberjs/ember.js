import { module, test } from 'qunit';
import Component from '@ember/component';

module('built-in component toString', function () {
  test('component has the correct toString value', function (assert) {
    assert.strictEqual(Component.toString(), '@ember/component');
  });
});
