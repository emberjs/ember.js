/**
  A two-tiered cache with support for fallback values when doing lookups.
  Uses "buckets" and then "keys" to cache values.

  @private
  @class BucketCache
*/
export default class BucketCache {
  cache: Map<string, Map<string, any>>;
  constructor() {
    this.cache = new Map();
  }

  has(bucketKey: string) {
    return this.cache.has(bucketKey);
  }

  stash(bucketKey: string, key: string, value: any) {
    let bucket = this.cache.get(bucketKey);

    if (bucket === undefined) {
      bucket = new Map();
      this.cache.set(bucketKey, bucket);
    }

    bucket.set(key, value);
  }

  lookup(bucketKey: string, prop: string, defaultValue: any) {
    if (!this.has(bucketKey)) {
      return defaultValue;
    }

    let bucket = this.cache.get(bucketKey)!;
    if (bucket.has(prop)) {
      return bucket.get(prop);
    } else {
      return defaultValue;
    }
  }
}
