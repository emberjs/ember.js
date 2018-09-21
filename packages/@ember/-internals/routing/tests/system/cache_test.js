import BucketCache from '../../lib/system/cache';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'BucketCache',
  class extends AbstractTestCase {
    constructor() {
      super();

      this.cache = new BucketCache();
    }

    ['@test has - returns false when bucket is not in cache'](assert) {
      assert.strictEqual(this.cache.has('foo'), false);
      assert.strictEqual(this.cache.has('constructor'), false);
    }

    ['@test has - returns true when bucket is in cache'](assert) {
      let token = {};

      this.cache.stash('foo', 'bar', token);
      this.cache.stash('constructor', 'bar', token);

      assert.strictEqual(this.cache.has('foo'), true);
      assert.strictEqual(this.cache.has('constructor'), true);
    }

    ['@test lookup - returns stashed value if key does exist in bucket'](assert) {
      let token = {};
      let defaultValue = {};

      this.cache.stash('foo', 'bar', token);

      assert.strictEqual(this.cache.lookup('foo', 'bar', defaultValue), token);
    }

    ['@test lookup - returns default value if key does not exist in bucket'](assert) {
      let token = {};
      let defaultValue = {};

      this.cache.stash('foo', 'bar', token);

      assert.strictEqual(this.cache.lookup('foo', 'boo', defaultValue), defaultValue);
      assert.strictEqual(this.cache.lookup('foo', 'constructor', defaultValue), defaultValue);
    }

    ['@test lookup - returns default value if bucket does not exist'](assert) {
      let defaultValue = {};

      assert.strictEqual(this.cache.lookup('boo', 'bar', defaultValue), defaultValue);
      assert.strictEqual(this.cache.lookup('constructor', 'bar', defaultValue), defaultValue);
    }
  }
);
