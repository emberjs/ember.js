import { bind, _getCurrentRunLoop } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/run_loop/run_bind_test',
  class extends AbstractTestCase {
    ['@test bind builds a run-loop wrapped callback handler'](assert) {
      assert.expect(3);

      let obj = {
        value: 0,
        increment(increment) {
          assert.ok(_getCurrentRunLoop(), 'expected a run-loop');
          return (this.value += increment);
        },
      };

      let proxiedFunction = bind(obj, obj.increment, 1);
      assert.strictEqual(proxiedFunction(), 1);
      assert.strictEqual(obj.value, 1);
    }

    ['@test bind keeps the async callback arguments'](assert) {
      assert.expect(4);

      function asyncCallback(increment, increment2, increment3) {
        assert.ok(_getCurrentRunLoop(), 'expected a run-loop');
        assert.strictEqual(increment, 1);
        assert.strictEqual(increment2, 2);
        assert.strictEqual(increment3, 3);
      }

      function asyncFunction(fn) {
        fn(2, 3);
      }

      asyncFunction(bind(asyncCallback, asyncCallback, 1));
    }

    ['@test [GH#16652] bind throws an error if callback is undefined']() {
      let assertBindThrows = (msg, ...args) => {
        expectAssertion(
          function () {
            bind(...args);
          },
          /could not find a suitable method to bind/,
          msg
        );
      };
      assertBindThrows('without arguments');
      assertBindThrows('with one arguments that is not a function', 'myMethod');
      assertBindThrows(
        'if second parameter is not a function and not a property in first parameter',
        Object.create(null),
        'myMethod'
      );
    }
  }
);
