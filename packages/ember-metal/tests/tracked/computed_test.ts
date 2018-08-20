import { createWithDescriptors } from './support';
import { get, set, tracked } from '../..';

import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  moduleFor(
    'tracked getters',
    class extends AbstractTestCase {
      ['@test works without get'](assert) {
        let count = 0;

        class Count {
          get foo() {
            count++;
            return `computed foo`;
          }
        }

        tracked(Count.prototype, 'foo', Object.getOwnPropertyDescriptor(Count.prototype, 'foo'));

        let obj = new Count();

        assert.equal(obj.foo, 'computed foo', 'should return value');
        assert.equal(count, 1, 'should have invoked computed property');
      }

      ['@test defining computed property should invoke property on get'](assert) {
        let count = 0;

        class Count {
          get foo() {
            count++;
            return `computed foo`;
          }
        }

        tracked(Count.prototype, 'foo', Object.getOwnPropertyDescriptor(Count.prototype, 'foo'));

        let obj = new Count();

        assert.equal(get(obj, 'foo'), 'computed foo', 'should return value');
        assert.equal(count, 1, 'should have invoked computed property');
      }

      ['@test defining computed property should invoke property on set'](assert) {
        let count = 0;

        let obj = createWithDescriptors({
          get foo() {
            return this.__foo;
          },

          set foo(value) {
            count++;
            this.__foo = `computed ${value}`;
          },
        });

        assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value');
        assert.equal(count, 1, 'should have invoked computed property');
        assert.equal(get(obj, 'foo'), 'computed bar', 'should return new value');
      }
    }
  );
}
