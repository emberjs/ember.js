import { isProxy, setProxy } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  '@ember/-internals/utils isProxy',
  class extends AbstractTestCase {
    ['@test basic'](assert) {
      let proxy = {};
      setProxy(proxy);

      assert.strictEqual(isProxy(proxy), true);

      assert.strictEqual(isProxy({}), false);
      assert.strictEqual(isProxy(undefined), false);
      assert.strictEqual(isProxy(null), false);
    }
  }
);
