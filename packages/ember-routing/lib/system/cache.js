import { Object as EmberObject } from 'ember-runtime';

/**
  A two-tiered cache with support for fallback values when doing lookups.
  Uses "buckets" and then "keys" to cache values.

  @private
  @class BucketCache
*/
export default EmberObject.extend({
  init() {
    this.cache = Object.create(null);
  },

  has(bucketKey) {
    return !!this.cache[bucketKey];
  },

  stash(bucketKey, key, value) {
    let bucket = this.cache[bucketKey];

    if (!bucket) {
      bucket = this.cache[bucketKey] = Object.create(null);
    }

    bucket[key] = value;
  },

  lookup(bucketKey, prop, defaultValue) {
    let cache = this.cache;
    if (!this.has(bucketKey)) {
      return defaultValue;
    }

    let bucket = cache[bucketKey];
    if (prop in bucket && bucket[prop] !== undefined) {
      return bucket[prop];
    } else {
      return defaultValue;
    }
  }
});
