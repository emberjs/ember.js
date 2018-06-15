import { isProxy, setProxy } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-utils isProxy',
  class extends AbstractTestCase {
    ['@test basic'](assert) {
      let proxy = {};
      setProxy(proxy);

      assert.equal(isProxy(proxy), true);

      assert.equal(isProxy({}), false);
      assert.equal(isProxy(undefined), false);
      assert.equal(isProxy(null), false);
    }
  }
);
