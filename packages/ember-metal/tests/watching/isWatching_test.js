module('Ember.isWatching');

var testObserver = function(setup, teardown, key) {
  var obj = {}, fn = function() {};
  key = key || 'foo';

  equal(Ember.isWatching(obj, key), false, "precond - isWatching is false by default");
  setup(obj, key, fn);
  equal(Ember.isWatching(obj, key), true, "isWatching is true when observers are added");
  teardown(obj, key, fn);
  equal(Ember.isWatching(obj, key), false, "isWatching is false after observers are removed");
};

test("isWatching is true for regular local observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.Mixin.create({
      didChange: Ember.observer(fn, key)
    }).apply(obj);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key, obj, fn);
  });
});

test("isWatching is true for nonlocal observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.addObserver(obj, key, obj, fn);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key, obj, fn);
  });
});

test("isWatching is true for chained observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.addObserver(obj, key + '.bar', obj, fn);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key + '.bar', obj, fn);
  });
});

test("isWatching is true for computed properties", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', Ember.computed(fn).property(key));
    Ember.get(obj, 'computed');
  }, function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', null);
  });
});

test("isWatching is true for chained computed properties", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', Ember.computed(fn).property(key + '.bar'));
    Ember.get(obj, 'computed');
  }, function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', null);
  });
});

// can't watch length on Array - it is special...
// But you should be able to watch a length property of an object
test("isWatching is true for 'length' property on object", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'length', null, '26.2 miles');
    Ember.addObserver(obj, 'length', obj, fn);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, 'length', obj, fn);
  }, 'length');
});
