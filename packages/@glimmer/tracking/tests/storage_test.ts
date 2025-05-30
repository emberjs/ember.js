import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

import { createStorage, getValue, setValue } from '@glimmer/tracking/primitives/storage';
import { createCache, getValue as getCacheValue } from '@glimmer/tracking/primitives/cache';

moduleFor(
  '@glimmer/tracking/primitives/storage',
  class extends AbstractTestCase {
    ['@test it works'](assert: QUnit['assert']) {
      let count = 0;

      let storage = createStorage();

      let cache = createCache(() => {
        getValue(storage);
        return ++count;
      });

      assert.equal(getValue(storage), undefined, 'does not have a value initially');
      assert.equal(getCacheValue(cache), 1, 'cache runs the first time');
      assert.equal(getCacheValue(cache), 1, 'cache does not the second time');

      setValue(storage, 123);

      assert.equal(getValue(storage), 123, 'value is set correctly');
      assert.equal(getCacheValue(cache), 2, 'cache ran after storage was set');

      setValue(storage, 123);

      assert.equal(getValue(storage), 123, 'value remains the same');
      assert.equal(getCacheValue(cache), 2, 'cache not ran after storage was set to same value');
    }
  }
);
