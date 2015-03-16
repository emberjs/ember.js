import EmberObject from "ember-runtime/system/object";

export default EmberObject.extend({
  init() {
    this.cache = {};
  },
  has(bucketKey) {
    return bucketKey in this.cache;
  },
  stash(bucketKey, key, value) {
    var bucket = this.cache[bucketKey];
    if (!bucket) {
      bucket = this.cache[bucketKey] = {};
    }
    bucket[key] = value;
  },
  lookup(bucketKey, prop, defaultValue) {
    var cache = this.cache;
    if (!(bucketKey in cache)) {
      return defaultValue;
    }
    var bucket = cache[bucketKey];
    if (prop in bucket) {
      return bucket[prop];
    } else {
      return defaultValue;
    }
  },
  cache: null
});
