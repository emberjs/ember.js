import EmberObject from 'ember-runtime/system/object';

export default EmberObject.extend({
  init() {
    this.cache = {};
  },
  has(bucketKey) {
    return bucketKey in this.cache;
  },
  stash(bucketKey, key, value) {
    let bucket = this.cache[bucketKey];
    if (!bucket) {
      bucket = this.cache[bucketKey] = {};
    }
    bucket[key] = value;
  },
  lookup(bucketKey, prop, defaultValue) {
    let cache = this.cache;
    if (!(bucketKey in cache)) {
      return defaultValue;
    }
    let bucket = cache[bucketKey];
    if (prop in bucket) {
      return bucket[prop];
    } else {
      return defaultValue;
    }
  }
});
