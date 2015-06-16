import { computed } from 'ember-metal/computed';
import { get } from 'ember-metal/property_get';
import { defineProperty } from 'ember-metal/properties';
import {
  Mixin,
  observer
} from 'ember-metal/mixin';
import {
  addObserver,
  removeObserver
} from 'ember-metal/observer';
import { isWatching } from 'ember-metal/watching';

QUnit.module('isWatching');

function testObserver(setup, teardown, key) {
  var obj = {};
  var fn = function() {};
  key = key || 'foo';

  equal(isWatching(obj, key), false, 'precond - isWatching is false by default');
  setup(obj, key, fn);
  equal(isWatching(obj, key), true, 'isWatching is true when observers are added');
  teardown(obj, key, fn);
  equal(isWatching(obj, key), false, 'isWatching is false after observers are removed');
}

QUnit.test('isWatching is true for regular local observers', function() {
  testObserver(function(obj, key, fn) {
    Mixin.create({
      didChange: observer(key, fn)
    }).apply(obj);
  }, function(obj, key, fn) {
    removeObserver(obj, key, obj, fn);
  });
});

QUnit.test('isWatching is true for nonlocal observers', function() {
  testObserver(function(obj, key, fn) {
    addObserver(obj, key, obj, fn);
  }, function(obj, key, fn) {
    removeObserver(obj, key, obj, fn);
  });
});

QUnit.test('isWatching is true for chained observers', function() {
  testObserver(function(obj, key, fn) {
    addObserver(obj, key + '.bar', obj, fn);
  }, function(obj, key, fn) {
    removeObserver(obj, key + '.bar', obj, fn);
  });
});

QUnit.test('isWatching is true for computed properties', function() {
  testObserver(function(obj, key, fn) {
    defineProperty(obj, 'computed', computed(fn).property(key));
    get(obj, 'computed');
  }, function(obj, key, fn) {
    defineProperty(obj, 'computed', null);
  });
});

QUnit.test('isWatching is true for chained computed properties', function() {
  testObserver(function(obj, key, fn) {
    defineProperty(obj, 'computed', computed(fn).property(key + '.bar'));
    get(obj, 'computed');
  }, function(obj, key, fn) {
    defineProperty(obj, 'computed', null);
  });
});

// can't watch length on Array - it is special...
// But you should be able to watch a length property of an object
QUnit.test('isWatching is true for \'length\' property on object', function() {
  testObserver(function(obj, key, fn) {
    defineProperty(obj, 'length', null, '26.2 miles');
    addObserver(obj, 'length', obj, fn);
  }, function(obj, key, fn) {
    removeObserver(obj, 'length', obj, fn);
  }, 'length');
});
