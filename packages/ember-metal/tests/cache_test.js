import Cache from "ember-metal/cache";

QUnit.module("Cache");

QUnit.test("basic", function() {
  var cache = new Cache(100, function(key) {
    return key.toUpperCase();
  });

  equal(cache.get("foo"), "FOO");
  equal(cache.get("bar"), "BAR");
  equal(cache.get("foo"), "FOO");
});

QUnit.test("caches computation correctly", function() {
  var count = 0;
  var cache = new Cache(100, function(key) {
    count++;
    return key.toUpperCase();
  });

  equal(count, 0);
  cache.get("foo");
  equal(count, 1);
  cache.get("bar");
  equal(count, 2);
  cache.get("bar");
  equal(count, 2);
  cache.get("foo");
  equal(count, 2);
});

QUnit.test("handles undefined value correctly", function() {
  var cache = new Cache(100, function(key) {});

  equal(cache.get("foo"), undefined);
});

QUnit.test("continues working after reaching cache limit", function() {
  var cache = new Cache(3, function(key) {
    return key.toUpperCase();
  });

  cache.get("a");
  cache.get("b");
  cache.get("c");

  equal(cache.get("d"), "D");
  equal(cache.get("a"), "A");
  equal(cache.get("b"), "B");
  equal(cache.get("c"), "C");
});
