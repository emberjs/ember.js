import { isWatching, defineProperty, alias, PROPERTY_DID_CHANGE, computed, get, set } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'PROPERTY_DID_CHANGE',
  class extends AbstractTestCase {
    ['@test alias and cp'](assert) {
      let counts = {};
      let obj = {
        child: {},
        [PROPERTY_DID_CHANGE](keyName) {
          counts[keyName] = (counts[keyName] || 0) + 1;
        },
      };

      defineProperty(obj, 'cost', alias('child.cost'));
      defineProperty(obj, 'tax', alias('child.tax'));

      defineProperty(
        obj,
        'total',
        computed('cost', 'tax', {
          get() {
            return get(this, 'cost') + get(this, 'tax');
          },
        })
      );

      assert.ok(!isWatching(obj, 'child.cost'), 'precond alias target `child.cost` is not watched');
      assert.equal(get(obj, 'cost'), undefined);
      // this is how PROPERTY_DID_CHANGE will get notified
      assert.ok(
        isWatching(obj, 'child.cost'),
        'alias target `child.cost` is watched after consumption'
      );

      assert.ok(!isWatching(obj, 'child.tax'), 'precond alias target `child.tax` is not watched');
      assert.equal(get(obj, 'tax'), undefined);
      // this is how PROPERTY_DID_CHANGE will get notified
      assert.ok(
        isWatching(obj, 'child.tax'),
        'alias target `child.cost` is watched after consumption'
      );

      // increments the watching count on the alias itself to 1
      assert.ok(isNaN(get(obj, 'total')), 'total is initialized');

      // decrements the watching count on the alias itself to 0
      set(obj, 'child', {
        cost: 399.0,
        tax: 32.93,
      });

      // this should have called PROPERTY_DID_CHANGE for all of them
      assert.equal(counts['cost'], 1, 'PROPERTY_DID_CHANGE called with cost');
      assert.equal(counts['tax'], 1, 'PROPERTY_DID_CHANGE called with tax');
      assert.equal(counts['total'], 1, 'PROPERTY_DID_CHANGE called with total');

      // we should still have a dependency installed
      assert.ok(isWatching(obj, 'child.cost'), 'watching child.cost');
      assert.ok(isWatching(obj, 'child.tax'), 'watching child.tax');

      set(obj, 'child', {
        cost: 100.0,
        tax: 10.0,
      });

      assert.equal(counts['cost'], 2, 'PROPERTY_DID_CHANGE called with cost');
      assert.equal(counts['tax'], 2, 'PROPERTY_DID_CHANGE called with tax');
      assert.equal(counts['total'], 1, 'PROPERTY_DID_CHANGE called with total');
    }
  }
);
