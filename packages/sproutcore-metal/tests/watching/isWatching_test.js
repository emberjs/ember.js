// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.isWatching');

var testObserver = function(setup, teardown) {
  var obj = {}, key = 'foo', fn = function() {};

  equals(SC.isWatching(obj, 'foo'), false, "precond - isWatching is false by default");
  setup(obj, key, fn);
  equals(SC.isWatching(obj, 'foo'), true, "isWatching is true when observers are added");
  teardown(obj, key, fn);
  equals(SC.isWatching(obj, 'foo'), false, "isWatching is false after observers are removed");
};

test("isWatching is true for regular local observers", function() {
  testObserver(function(obj, key, fn) {
    SC.Mixin.create({
      didChange: SC.observer(fn, key)
    }).apply(obj);
  }, function(obj, key, fn) {
    SC.removeObserver(obj, key, null, fn);
  });
});

test("isWatching is true for nonlocal observers", function() {
  testObserver(function(obj, key, fn) {
    SC.addObserver(obj, key, obj, fn);
  }, function(obj, key, fn) {
    SC.removeObserver(obj, key, obj, fn);
  });
});

test("isWatching is true for chained observers", function() {
  testObserver(function(obj, key, fn) {
    SC.addObserver(obj, key + '.bar', obj, fn);
  }, function(obj, key, fn) {
    SC.removeObserver(obj, key + '.bar', obj, fn);
  });
});

test("isWatching is true for computed properties", function() {
  testObserver(function(obj, key, fn) {
    SC.defineProperty(obj, 'computed', SC.computed(fn).property(key));
  }, function(obj, key, fn) {
    SC.defineProperty(obj, 'computed', null);
  });
});

test("isWatching is true for computed properties", function() {
  testObserver(function(obj, key, fn) {
    SC.defineProperty(obj, 'computed', SC.computed(fn).property(key + '.bar'));
  }, function(obj, key, fn) {
    SC.defineProperty(obj, 'computed', null);
  });
});
