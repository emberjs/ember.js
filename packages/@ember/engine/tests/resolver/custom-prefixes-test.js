import { module, test } from 'qunit';

import { setupResolver, resolver, loader } from './-setup-resolver';

module('custom prefixes by type', function (hooks) {
  hooks.beforeEach(function () {
    setupResolver();
  });

  test('will use the prefix specified for a given type if present', function (assert) {
    setupResolver({
      namespace: {
        fruitPrefix: 'grovestand',
        modulePrefix: 'appkit',
      },
    });

    loader.define('grovestand/fruits/orange', [], function () {
      assert.ok(true, 'custom prefix used');
      return 'whatever';
    });

    resolver.resolve('fruit:orange');
  });
});
