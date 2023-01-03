import EmberArray, { NativeArray } from '@ember/array';
import { A } from '@ember/array';
import { ENV } from '@ember/-internals/environment';
import { isEmberArray } from '@ember/array/-internals';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.A',
  class extends AbstractTestCase {
    ['@test Ember.A'](assert) {
      assert.deepEqual(A([1, 2]), [1, 2], 'array values were not be modified');
      assert.deepEqual(A(), [], 'returned an array with no arguments');
      assert.deepEqual(A(null), [], 'returned an array with a null argument');
      assert.ok(EmberArray.detect(A()), 'returned an ember array');
      assert.ok(EmberArray.detect(A([1, 2])), 'returned an ember array');
    }

    ['@test new Ember.A'](assert) {
      expectAssertion(() => {
        assert.deepEqual(new A([1, 2]), [1, 2], 'array values were not be modified');
        assert.deepEqual(new A(), [], 'returned an array with no arguments');
        assert.deepEqual(new A(null), [], 'returned an array with a null argument');
        assert.ok(EmberArray.detect(new A()), 'returned an ember array');
        assert.ok(EmberArray.detect(new A([1, 2])), 'returned an ember array');
      });
    }
  }
);

if (!ENV.EXTEND_PROTOTYPES.Array) {
  moduleFor(
    'Ember.A without Extended Prototypes',
    class extends AbstractTestCase {
      ['@feature(EMBER_A_NON_MODIFYING) Ember.A does not modify original'](assert) {
        let original = [1, 2];
        let proxy = A(original);

        assert.notOk(EmberArray.detect(original), 'EmberArray is not detected in the original');
        assert.ok(EmberArray.detect(proxy), 'EmberArray is detected in the proxy');

        assert.notOk(NativeArray.detect(original), 'NativeArray is not detected in the original');
        assert.ok(NativeArray.detect(proxy), 'NativeArray is detected in the proxy');

        assert.strictEqual(proxy.objectAt(1), 2, 'proxies to original array');

        proxy.pushObject(3);
        assert.deepEqual(original, [1, 2, 3], 'original array gets updated');

        assert.notOk(isEmberArray(original), 'original is not EmberArray');
        assert.ok(isEmberArray(proxy), 'proxy is EmberArray');

        assert.ok(Array.isArray(proxy), 'proxy is a native array');

        proxy.pushObjects([4, 5]);
        assert.deepEqual(original, [1, 2, 3, 4, 5], 'pushObjects works');
      }

      ['@feature(EMBER_A_NON_MODIFYING) Ember.A adds warnings about modification to original']() {
        let original = [1, 2];
        A(original);

        expectAssertion(() => {
          original.pushObject(1);
        });
      }
    }
  );
}
