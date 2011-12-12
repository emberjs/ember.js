// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('Ember.isWatching');

var testObserver = function(setup, teardown) {
  var obj = {}, key = 'foo', fn = function() {};

  equals(Ember.isWatching(obj, 'foo'), false, "precond - isWatching is false by default");
  setup(obj, key, fn);
  equals(Ember.isWatching(obj, 'foo'), true, "isWatching is true when observers are added");
  teardown(obj, key, fn);
  equals(Ember.isWatching(obj, 'foo'), false, "isWatching is false after observers are removed");
};

test("isWatching is true for regular local observers", function() {
  testObserver(function(obj, key, fn) {
    Ember.Mixin.create({
      didChange: Ember.observer(fn, key)
    }).apply(obj);
  }, function(obj, key, fn) {
    Ember.removeObserver(obj, key, null, fn);
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
  }, function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', null);
  });
});

test("isWatching is true for computed properties", function() {
  testObserver(function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', Ember.computed(fn).property(key + '.bar'));
  }, function(obj, key, fn) {
    Ember.defineProperty(obj, 'computed', null);
  });
});
