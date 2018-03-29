import {
  watch,
  unwatch,
  defineProperty,
  addListener,
  computed,
  set
} from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let didCount;

function addListeners(obj, keyPath) {
  addListener(obj, keyPath + ':change', () => didCount++);
}

moduleFor(
  'unwatch',
  class extends AbstractTestCase {
    beforeEach() {
      didCount = 0;
    }

    ['@test unwatching a computed property - regular get/set'](assert) {
      let obj = {};

      defineProperty(
        obj,
        'foo',
        computed({
          get() {
            return this.__foo;
          },
          set(keyName, value) {
            this.__foo = value;
            return this.__foo;
          }
        })
      );
      addListeners(obj, 'foo');

      watch(obj, 'foo');
      set(obj, 'foo', 'bar');
      assert.equal(didCount, 1, 'should have invoked didCount');

      unwatch(obj, 'foo');
      didCount = 0;
      set(obj, 'foo', 'BAZ');
      assert.equal(didCount, 0, 'should NOT have invoked didCount');
    }

    ['@test unwatching a regular property - regular get/set'](assert) {
      let obj = { foo: 'BIFF' };
      addListeners(obj, 'foo');

      watch(obj, 'foo');
      set(obj, 'foo', 'bar');
      assert.equal(didCount, 1, 'should have invoked didCount');

      unwatch(obj, 'foo');
      didCount = 0;
      set(obj, 'foo', 'BAZ');
      assert.equal(didCount, 0, 'should NOT have invoked didCount');
    }

    ['@test unwatching should be nested'](assert) {
      let obj = { foo: 'BIFF' };
      addListeners(obj, 'foo');

      watch(obj, 'foo');
      watch(obj, 'foo');
      set(obj, 'foo', 'bar');
      assert.equal(didCount, 1, 'should have invoked didCount');

      unwatch(obj, 'foo');
      didCount = 0;
      set(obj, 'foo', 'BAZ');
      assert.equal(didCount, 1, 'should NOT have invoked didCount');

      unwatch(obj, 'foo');
      didCount = 0;
      set(obj, 'foo', 'BAZ');
      assert.equal(didCount, 0, 'should NOT have invoked didCount');
    }

    ['@test unwatching "length" property on an object'](assert) {
      let obj = { foo: 'RUN' };
      addListeners(obj, 'length');

      // Can watch length when it is undefined
      watch(obj, 'length');
      set(obj, 'length', '10k');
      assert.equal(didCount, 1, 'should have invoked didCount');

      // Should stop watching despite length now being defined (making object 'array-like')
      unwatch(obj, 'length');
      didCount = 0;
      set(obj, 'length', '5k');
      assert.equal(didCount, 0, 'should NOT have invoked didCount');
    }

    ['@test unwatching should not destroy non MANDATORY_SETTER descriptor'](
      assert
    ) {
      let obj = {
        get foo() {
          return 'RUN';
        }
      };

      assert.equal(obj.foo, 'RUN', 'obj.foo');
      watch(obj, 'foo');
      assert.equal(obj.foo, 'RUN', 'obj.foo after watch');
      unwatch(obj, 'foo');
      assert.equal(obj.foo, 'RUN', 'obj.foo after unwatch');
    }
  }
);
