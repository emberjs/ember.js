import BucketCache from '../../system/cache';

QUnit.module('BucketCache', {
  setup() {
    this.cache = BucketCache.create();
  }
});

QUnit.test('has - returns false when bucket is not in cache', function(assert) {
  assert.strictEqual(this.cache.has('foo'), false);
  assert.strictEqual(this.cache.has('constructor'), false);
});

QUnit.test('has - returns true when bucket is in cache', function(assert) {
  let token = {};

  this.cache.stash('foo', 'bar', token);
  this.cache.stash('constructor', 'bar', token);

  assert.strictEqual(this.cache.has('foo'), true);
  assert.strictEqual(this.cache.has('constructor'), true);
});

QUnit.test('lookup - returns stashed value if key does exist in bucket', function(assert) {
  let token = {};
  let defaultValue = {};

  this.cache.stash('foo', 'bar', token);

  assert.strictEqual(this.cache.lookup('foo', 'bar', defaultValue), token);
});

QUnit.test('lookup - returns default value if key does not exist in bucket', function(assert) {
  let token = {};
  let defaultValue = {};

  this.cache.stash('foo', 'bar', token);

  assert.strictEqual(this.cache.lookup('foo', 'boo', defaultValue), defaultValue);
  assert.strictEqual(this.cache.lookup('foo', 'constructor', defaultValue), defaultValue);
});

QUnit.test('lookup - returns default value if bucket does not exist', function(assert) {
  let defaultValue = {};

  assert.strictEqual(this.cache.lookup('boo', 'bar', defaultValue), defaultValue);
  assert.strictEqual(this.cache.lookup('constructor', 'bar', defaultValue), defaultValue);
});
