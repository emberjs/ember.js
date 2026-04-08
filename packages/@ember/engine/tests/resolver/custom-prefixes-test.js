import { module, test } from 'qunit';

import { setupResolver, resolver, modules } from './-setup-resolver';

module('strict-resolver | custom prefixes by type', function (hooks) {
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

    modules['grovestand/fruits/orange'] = 'whatever';

    let result = resolver.resolve('fruit:orange');

    assert.strictEqual(result, 'whatever', 'custom prefix was used');
  });
});
