import { Cache } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Cache',
  class extends AbstractTestCase {
    ['@test basic'](assert) {
      let cache = new Cache(100, key => key.toUpperCase());

      assert.equal(cache.get('foo'), 'FOO');
      assert.equal(cache.get('bar'), 'BAR');
      assert.equal(cache.get('foo'), 'FOO');
    }

    ['@test explicit sets'](assert) {
      let cache = new Cache(100, key => key.toUpperCase());

      assert.equal(cache.get('foo'), 'FOO');

      assert.equal(cache.set('foo', 'FOO!!!'), 'FOO!!!');

      assert.equal(cache.get('foo'), 'FOO!!!');

      assert.strictEqual(cache.set('foo', undefined), undefined);

      assert.strictEqual(cache.get('foo'), undefined);
    }

    ['@test caches computation correctly'](assert) {
      let count = 0;
      let cache = new Cache(100, key => {
        count++;
        return key.toUpperCase();
      });

      assert.equal(count, 0);
      cache.get('foo');
      assert.equal(count, 1);
      cache.get('bar');
      assert.equal(count, 2);
      cache.get('bar');
      assert.equal(count, 2);
      cache.get('foo');
      assert.equal(count, 2);
    }

    ['@test caches computation correctly with custom cache keys'](assert) {
      let count = 0;
      let cache = new Cache(
        100,
        obj => {
          count++;
          return obj.value.toUpperCase();
        },
        obj => obj.key
      );

      assert.equal(count, 0);
      cache.get({ key: 'foo', value: 'foo' });
      assert.equal(count, 1);
      cache.get({ key: 'bar', value: 'bar' });
      assert.equal(count, 2);
      cache.get({ key: 'bar', value: 'bar' });
      assert.equal(count, 2);
      cache.get({ key: 'foo', value: 'foo' });
      assert.equal(count, 2);
    }

    ['@test handles undefined value correctly'](assert) {
      let count = 0;
      let cache = new Cache(100, () => {
        count++;
      });

      assert.equal(count, 0);
      assert.strictEqual(cache.get('foo'), undefined);
      assert.equal(count, 1);
      assert.strictEqual(cache.get('bar'), undefined);
      assert.equal(count, 2);
      assert.strictEqual(cache.get('bar'), undefined);
      assert.equal(count, 2);
      assert.strictEqual(cache.get('foo'), undefined);
      assert.equal(count, 2);
    }

    ['@test continues working after reaching cache limit'](assert) {
      let cache = new Cache(3, key => key.toUpperCase());

      cache.get('a');
      cache.get('b');
      cache.get('c');

      assert.equal(cache.get('d'), 'D');
      assert.equal(cache.get('a'), 'A');
      assert.equal(cache.get('b'), 'B');
      assert.equal(cache.get('c'), 'C');
    }
  }
);
