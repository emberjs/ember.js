import { get, getWithDefault, tracked } from '../..';

import { createTracked } from './support';

import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

import { EMBER_METAL_TRACKED_PROPERTIES } from 'ember/features';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  moduleFor(
    'tracked get',
    class extends AbstractTestCase {
      ['@test should get arbitrary properties on an object'](assert) {
        let obj = createTracked({
          string: 'string',
          number: 23,
          boolTrue: true,
          boolFalse: false,
          nullValue: null
        });

        for (let key in obj) {
          assert.equal(get(obj, key), obj[key], key);
        }
      }

      ['@test should retrieve a number key on an object'](assert) {
        let obj = createTracked({ 1: 'first' });

        assert.equal(get(obj, 1), 'first');
      }

      ['@test should not access a property more than once'](assert) {
        let count = 20;

        class Count {
          get id() {
            return ++count;
          }
        }

        tracked(
          Count.prototype,
          'id',
          Object.getOwnPropertyDescriptor(Count.prototype, 'id')
        );

        let obj = new Count();

        get(obj, 'id');

        assert.equal(count, 21);
      }
    }
  );

  moduleFor(
    'tracked getWithDefault',
    class extends AbstractTestCase {
      ['@test should get arbitrary properties on an object'](assert) {
        let obj = createTracked({
          string: 'string',
          number: 23,
          boolTrue: true,
          boolFalse: false,
          nullValue: null
        });

        for (let key in obj) {
          assert.equal(getWithDefault(obj, key, 'fail'), obj[key], key);
        }

        obj = createTracked({
          undef: undefined
        });

        assert.equal(
          getWithDefault(obj, 'undef', 'default'),
          'default',
          'explicit undefined retrieves the default'
        );
        assert.equal(
          getWithDefault(obj, 'not-present', 'default'),
          'default',
          'non-present key retrieves the default'
        );
      }
    }
  );
}
