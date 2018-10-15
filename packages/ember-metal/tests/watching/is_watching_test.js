import {
  computed,
  get,
  defineProperty,
  Mixin,
  observer,
  addObserver,
  removeObserver,
  isWatching,
} from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function testObserver(assert, setup, teardown, key = 'key') {
  let obj = {};

  assert.equal(isWatching(obj, key), false, 'precond - isWatching is false by default');
  setup(obj, key, 'fn');
  assert.equal(isWatching(obj, key), true, 'isWatching is true when observers are added');
  teardown(obj, key, 'fn');
  assert.equal(isWatching(obj, key), false, 'isWatching is false after observers are removed');
}

moduleFor(
  'isWatching',
  class extends AbstractTestCase {
    ['@test isWatching is true for regular local observers'](assert) {
      testObserver(
        assert,
        (obj, key, fn) => {
          Mixin.create({
            [fn]: observer(key, function() {}),
          }).apply(obj);
        },
        (obj, key, fn) => removeObserver(obj, key, obj, fn)
      );
    }

    ['@test isWatching is true for nonlocal observers'](assert) {
      testObserver(
        assert,
        (obj, key, fn) => {
          addObserver(obj, key, obj, fn);
        },
        (obj, key, fn) => removeObserver(obj, key, obj, fn)
      );
    }

    ['@test isWatching is true for chained observers'](assert) {
      testObserver(
        assert,
        function(obj, key, fn) {
          addObserver(obj, key + '.bar', obj, fn);
        },
        function(obj, key, fn) {
          removeObserver(obj, key + '.bar', obj, fn);
        }
      );
    }

    ['@test isWatching is true for computed properties'](assert) {
      testObserver(
        assert,
        (obj, key, fn) => {
          defineProperty(obj, fn, computed(function() {}).property(key));
          get(obj, fn);
        },
        (obj, key, fn) => defineProperty(obj, fn, null)
      );
    }

    ['@test isWatching is true for chained computed properties'](assert) {
      testObserver(
        assert,
        (obj, key, fn) => {
          defineProperty(obj, fn, computed(function() {}).property(key + '.bar'));
          get(obj, fn);
        },
        (obj, key, fn) => defineProperty(obj, fn, null)
      );
    }

    // can't watch length on Array - it is special...
    // But you should be able to watch a length property of an object
    ["@test isWatching is true for 'length' property on object"](assert) {
      testObserver(
        assert,
        (obj, key, fn) => {
          defineProperty(obj, 'length', null, '26.2 miles');
          addObserver(obj, 'length', obj, fn);
        },
        (obj, key, fn) => removeObserver(obj, 'length', obj, fn),
        'length'
      );
    }
  }
);
