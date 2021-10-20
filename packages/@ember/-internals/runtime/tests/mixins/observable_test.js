import { computed, addObserver, get } from '@ember/-internals/metal';
import EmberObject from '../../lib/system/object';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';

moduleFor(
  'mixins/observable',
  class extends AbstractTestCase {
    ['@test should be able to use getProperties to get a POJO of provided keys'](assert) {
      let obj = EmberObject.create({
        firstName: 'Steve',
        lastName: 'Jobs',
        companyName: 'Apple, Inc.',
      });

      let pojo = obj.getProperties('firstName', 'lastName');
      assert.strictEqual('Steve', pojo.firstName);
      assert.strictEqual('Jobs', pojo.lastName);
    }

    ['@test should be able to use getProperties with array parameter to get a POJO of provided keys'](
      assert
    ) {
      let obj = EmberObject.create({
        firstName: 'Steve',
        lastName: 'Jobs',
        companyName: 'Apple, Inc.',
      });

      let pojo = obj.getProperties(['firstName', 'lastName']);
      assert.strictEqual('Steve', pojo.firstName);
      assert.strictEqual('Jobs', pojo.lastName);
    }

    ['@test should be able to use setProperties to set multiple properties at once'](assert) {
      let obj = EmberObject.create({
        firstName: 'Steve',
        lastName: 'Jobs',
        companyName: 'Apple, Inc.',
      });

      obj.setProperties({ firstName: 'Tim', lastName: 'Cook' });
      assert.strictEqual('Tim', obj.get('firstName'));
      assert.strictEqual('Cook', obj.get('lastName'));
    }

    async ['@test calling setProperties completes safely despite exceptions'](assert) {
      let exc = new Error('Something unexpected happened!');
      let obj = EmberObject.extend({
        companyName: computed({
          get() {
            return 'Apple, Inc.';
          },
          set() {
            throw exc;
          },
        }),
      }).create({
        firstName: 'Steve',
        lastName: 'Jobs',
      });

      let firstNameChangedCount = 0;

      addObserver(obj, 'firstName', () => firstNameChangedCount++);

      try {
        obj.setProperties({
          firstName: 'Tim',
          lastName: 'Cook',
          companyName: 'Fruit Co., Inc.',
        });
      } catch (err) {
        if (err !== exc) {
          throw err;
        }
      }

      await runLoopSettled();

      assert.strictEqual(firstNameChangedCount, 1, 'firstName should have fired once');

      obj.destroy();
    }

    ['@test should be able to retrieve cached values of computed properties without invoking the computed property'](
      assert
    ) {
      let obj = EmberObject.extend({
        foo: computed(function () {
          return 'foo';
        }),
      }).create({
        bar: 'bar',
      });

      assert.strictEqual(
        obj.cacheFor('foo'),
        undefined,
        'should return undefined if no value has been cached'
      );
      get(obj, 'foo');

      assert.strictEqual(get(obj, 'foo'), 'foo', 'precond - should cache the value');
      assert.strictEqual(
        obj.cacheFor('foo'),
        'foo',
        'should return the cached value after it is invoked'
      );

      assert.strictEqual(
        obj.cacheFor('bar'),
        undefined,
        'returns undefined if the value is not a computed property'
      );
    }

    ['@test incrementProperty should work even if value is number in string'](assert) {
      let obj = EmberObject.create({
        age: '24',
      });
      obj.incrementProperty('age');
      assert.strictEqual(25, obj.get('age'));
    }
  }
);
