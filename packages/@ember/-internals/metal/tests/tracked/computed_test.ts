import { get, set, tracked } from '../..';

import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  moduleFor(
    '@tracked getters',
    class extends AbstractTestCase {
      ['@test works without get'](assert: Assert) {
        let count = 0;

        class Count {
          @tracked
          get foo() {
            count++;
            return `computed foo`;
          }
        }

        let obj = new Count();

        assert.equal(obj.foo, 'computed foo', 'should return value');
        assert.equal(count, 1, 'should have invoked computed property');
      }

      ['@test defining computed property should invoke property on get'](assert: Assert) {
        let count = 0;

        class Count {
          @tracked
          get foo() {
            count++;
            return `computed foo`;
          }
        }

        let obj = new Count();

        assert.equal(get(obj, 'foo'), 'computed foo', 'should return value');
        assert.equal(count, 1, 'should have invoked computed property');
      }

      ['@test defining computed property should invoke property on set'](assert: Assert) {
        let count = 0;

        class Foo {
          __foo = '';

          @tracked
          get foo() {
            return this.__foo;
          }

          set foo(value) {
            count++;
            this.__foo = `computed ${value}`;
          }
        }

        let obj = new Foo();

        assert.equal(set(obj, 'foo', 'bar'), 'bar', 'should return set value');
        assert.equal(count, 1, 'should have invoked computed property');
        assert.equal(get(obj, 'foo'), 'computed bar', 'should return new value');
      }
    }
  );
}
