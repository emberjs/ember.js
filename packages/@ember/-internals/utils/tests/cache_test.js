import { Cache } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Cache',
  class extends AbstractTestCase {
    ['@test basic'](assert) {
      let cache = new Cache(100, (key) => key.toUpperCase());

      assert.strictEqual(cache.get('foo'), 'FOO');
      assert.strictEqual(cache.get('bar'), 'BAR');
      assert.strictEqual(cache.get('foo'), 'FOO');
    }

    ['@test explicit sets'](assert) {
      let cache = new Cache(100, (key) => key.toUpperCase());

      assert.strictEqual(cache.get('foo'), 'FOO');

      assert.strictEqual(cache.set('foo', 'FOO!!!'), 'FOO!!!');

      assert.strictEqual(cache.get('foo'), 'FOO!!!');

      assert.strictEqual(cache.set('foo', undefined), undefined);

      assert.strictEqual(cache.get('foo'), undefined);
    }

    ['@test caches computation correctly'](assert) {
      let count = 0;
      let cache = new Cache(100, (key) => {
        count++;
        return key.toUpperCase();
      });

      assert.strictEqual(count, 0);
      cache.get('foo');
      assert.strictEqual(count, 1);
      cache.get('bar');
      assert.strictEqual(count, 2);
      cache.get('bar');
      assert.strictEqual(count, 2);
      cache.get('foo');
      assert.strictEqual(count, 2);
    }

    ['@test handles undefined value correctly'](assert) {
      let count = 0;
      let cache = new Cache(100, () => {
        count++;
      });

      assert.strictEqual(count, 0);
      assert.strictEqual(cache.get('foo'), undefined);
      assert.strictEqual(count, 1);
      assert.strictEqual(cache.get('bar'), undefined);
      assert.strictEqual(count, 2);
      assert.strictEqual(cache.get('bar'), undefined);
      assert.strictEqual(count, 2);
      assert.strictEqual(cache.get('foo'), undefined);
      assert.strictEqual(count, 2);
    }

    ['@test continues working after reaching cache limit'](assert) {
      let cache = new Cache(3, (key) => key.toUpperCase());

      cache.get('a');
      cache.get('b');
      cache.get('c');

      assert.strictEqual(cache.get('d'), 'D');
      assert.strictEqual(cache.get('a'), 'A');
      assert.strictEqual(cache.get('b'), 'B');
      assert.strictEqual(cache.get('c'), 'C');
    }
  }
);
