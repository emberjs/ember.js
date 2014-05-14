import EmberObject from "ember-runtime/system/object";

var Cache = EmberObject.extend({
  init: function() {
    this.cache = {};
  },
  has: function(bucketKey) {
    return bucketKey in this.cache;
  },
  stash: function(bucketKey, key, value) {
    var bucket = this.cache[bucketKey];
    if (!bucket) {
      bucket = this.cache[bucketKey] = {};
    }
    bucket[key] = value;
  },
  lookup: function(bucketKey, prop, defaultValue) {
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

export default Cache;

