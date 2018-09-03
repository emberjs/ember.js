dimport { run } from '@ember/runloop';
import { onLoad, runLoadHooks, _loaded } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Lazy Loading',
  class extends AbstractTestCase {
    afterEach() {
      let keys = Object.keys(_loaded);
      for (let i = 0; i < keys.length; i++) {
        delete _loaded[keys[i]];
      }
    }

    ['@test if a load hook is registered, it is executed when runLoadHooks are exected'](assert) {
      let count = 0;

      run(function() {
        onLoad('__test_hook__', function(object) {
          count += object;
        });
      });

      run(function() {
        runLoadHooks('__test_hook__', 1);
      });

      assert.equal(count, 1, 'the object was passed into the load hook');
    }

    ['@test if runLoadHooks was already run, it executes newly added hooks immediately'](assert) {
      let count = 0;
      run(() => {
        onLoad('__test_hook__', object => (count += object));
      });

      run(() => runLoadHooks('__test_hook__', 1));

      count = 0;
      run(() => {
        onLoad('__test_hook__', object => (count += object));
      });

      assert.equal(count, 1, 'the original object was passed into the load hook');
    }

    ["@test hooks in ENV.EMBER_LOAD_HOOKS['hookName'] get executed"](assert) {
      // Note that the necessary code to perform this test is run before
      // the Ember lib is loaded in tests/index.html

      run(() => {
        runLoadHooks('__before_ember_test_hook__', 1);
      });

      assert.equal(window.ENV.__test_hook_count__, 1, 'the object was passed into the load hook');
    }

    ['@test load hooks trigger a custom event'](assert) {
      if (
        typeof window === 'object' &&
        typeof window.dispatchEvent === 'function' &&
        typeof CustomEvent === 'function'
      ) {
        let eventObject = 'super duper awesome events';

        window.addEventListener('__test_hook_for_events__', function(e) {
          assert.ok(true, 'custom event was fired');
          assert.equal(e.detail, eventObject, 'event details are provided properly');
        });

        run(() => {
          runLoadHooks('__test_hook_for_events__', eventObject);
        });
      } else {
        assert.expect(0);
      }
    }
  }
);
