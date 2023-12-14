/**
  A two-tiered cache with support for fallback values when doing lookups.
  Uses "buckets" and then "keys" to cache values.

  @private
  @class BucketCache
*/
export default class BucketCache {
  constructor() {
    this.cache = new Map();
  }
  has(bucketKey) {
    return this.cache.has(bucketKey);
  }
  stash(bucketKey, key, value) {
    let bucket = this.cache.get(bucketKey);
    if (bucket === undefined) {
      bucket = new Map();
      this.cache.set(bucketKey, bucket);
    }
    bucket.set(key, value);
  }
  lookup(bucketKey, prop, defaultValue) {
    if (!this.has(bucketKey)) {
      return defaultValue;
    }
    let bucket = this.cache.get(bucketKey);
    if (bucket.has(prop)) {
      return bucket.get(prop);
    } else {
      return defaultValue;
    }
  }
}