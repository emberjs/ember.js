import { module, test } from 'qunit';
import Component from '@ember/component';
import { DEPRECATIONS } from '@ember/-internals/deprecations';

if (!DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved) {
  module('built-in component toString (classic component)', function () {
    test('component has the correct toString value', function (assert) {
      assert.strictEqual(Component.toString(), '@ember/component');
    });
  });
}
