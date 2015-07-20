import Ember from 'ember-metal/core';
import { testBoth } from 'ember-metal/tests/props_helper';
import { addListener } from 'ember-metal/events';
import {
  watch,
  unwatch,
  destroy
} from 'ember-metal/watching';

var willCount, didCount,
    willKeys, didKeys,
    originalLookup, lookup, Global;

QUnit.module('watch', {
  setup() {
    willCount = didCount = 0;
    willKeys = [];
    didKeys = [];

    originalLookup = Ember.lookup;
    Ember.lookup = lookup = {};
  },

  teardown() {
    Ember.lookup = originalLookup;
  }
});

function addListeners(obj, keyPath) {
  addListener(obj, keyPath + ':before', function() {
    willCount++;
    willKeys.push(keyPath);
  });
  addListener(obj, keyPath + ':change', function() {
    didCount++;
    didKeys.push(keyPath);
  });
}

testBoth('watching a computed property', function(get, set) {
  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed({
    get: function() {
      return this.__foo;
    },
    set: function(keyName, value) {
      if (value !== undefined) {
        this.__foo = value;
      }
      return this.__foo;
    }
  }));
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set) {
  var obj = { foo: 'baz' };
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'foo'), 'bar', 'should get new value');
  equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watching a regular undefined property', function(get, set) {
  var obj = { };
  addListeners(obj, 'foo');

  watch(obj, 'foo');

  equal('foo' in obj, false, 'precond undefined');

  set(obj, 'foo', 'bar');

  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'foo'), 'bar', 'should get new value');
  equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watches should inherit', function(get, set) {
  var obj = { foo: 'baz' };
  var objB = Object.create(obj);

  addListeners(obj, 'foo');
  watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  equal(willCount, 2, 'should have invoked willCount once only');
  equal(didCount, 2, 'should have invoked didCount once only');
});

QUnit.test('watching an object THEN defining it should work also', function() {
  var obj = {};
  addListeners(obj, 'foo');

  watch(obj, 'foo');

  Ember.defineProperty(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');

  equal(Ember.get(obj, 'foo'), 'bar', 'should have set');
  equal(willCount, 1, 'should have invoked willChange once');
  equal(didCount, 1, 'should have invoked didChange once');
});

QUnit.test('watching a chain then defining the property', function () {
  var obj = {};
  var foo = { bar: 'bar' };
  addListeners(obj, 'foo.bar');
  addListeners(foo, 'bar');

  watch(obj, 'foo.bar');

  Ember.defineProperty(obj, 'foo', undefined, foo);
  Ember.set(foo, 'bar', 'baz');

  deepEqual(willKeys, ['foo.bar', 'bar'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['foo.bar', 'bar'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

QUnit.test('watching a chain then defining the nested property', function () {
  var bar = {};
  var obj = { foo: bar };
  var baz = { baz: 'baz' };
  addListeners(obj, 'foo.bar.baz');
  addListeners(baz, 'baz');

  watch(obj, 'foo.bar.baz');

  Ember.defineProperty(bar, 'bar', undefined, baz);
  Ember.set(baz, 'baz', 'BOO');

  deepEqual(willKeys, ['foo.bar.baz', 'baz'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['foo.bar.baz', 'baz'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

testBoth('watching an object value then unwatching should restore old value', function(get, set) {
  var obj = { foo: { bar: { baz: { biff: 'BIFF' } } } };
  addListeners(obj, 'foo.bar.baz.biff');

  watch(obj, 'foo.bar.baz.biff');

  var foo = Ember.get(obj, 'foo');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  unwatch(obj, 'foo.bar.baz.biff');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

testBoth('watching a global object that does not yet exist should queue', function(get, set) {
  lookup['Global'] = Global = null;

  var obj = {};
  addListeners(obj, 'Global.foo');

  watch(obj, 'Global.foo'); // only works on global chained props

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  lookup['Global'] = Global = { foo: 'bar' };
  addListeners(Global, 'foo');

  watch.flushPending(); // this will also be invoked automatically on ready

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  set(Global, 'foo', 'baz');

  // should fire twice because this is a chained property (once on key, once
  // on path)
  equal(willCount, 2, 'should be watching');
  equal(didCount, 2, 'should be watching');

  lookup['Global'] = Global = null; // reset
});

QUnit.test('when watching a global object, destroy should remove chain watchers from the global object', function() {
  lookup['Global'] = Global = { foo: 'bar' };
  var obj = {};
  addListeners(obj, 'Global.foo');

  watch(obj, 'Global.foo');

  var meta_Global = Ember.meta(Global);
  var chainNode = Ember.meta(obj).chains._chains.Global._chains.foo;

  equal(meta_Global.watching.foo, 1, 'should be watching foo');
  equal(meta_Global.chainWatchers.has('foo', chainNode), true, 'should have chain watcher');

  destroy(obj);

  equal(meta_Global.watching.foo, 0, 'should not be watching foo');
  equal(meta_Global.chainWatchers.has('foo', chainNode), false, 'should not have chain watcher');

  lookup['Global'] = Global = null; // reset
});

QUnit.test('when watching another object, destroy should remove chain watchers from the other object', function() {
  var objA = {};
  var objB = { foo: 'bar' };
  objA.b = objB;
  addListeners(objA, 'b.foo');

  watch(objA, 'b.foo');

  var meta_objB = Ember.meta(objB);
  var chainNode = Ember.meta(objA).chains._chains.b._chains.foo;

  equal(meta_objB.watching.foo, 1, 'should be watching foo');
  equal(meta_objB.chainWatchers.has('foo', chainNode), true, 'should have chain watcher');

  destroy(objA);

  equal(meta_objB.watching.foo, 0, 'should not be watching foo');
  equal(meta_objB.chainWatchers.has('foo', chainNode), false, 'should not have chain watcher');
});

// TESTS for length property

testBoth('watching "length" property on an object', function(get, set) {
  var obj = { length: '26.2 miles' };
  addListeners(obj, 'length');

  watch(obj, 'length');
  equal(get(obj, 'length'), '26.2 miles', 'should have original prop');

  set(obj, 'length', '10k');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'length'), '10k', 'should get new value');
  equal(obj.length, '10k', 'property should be accessible on obj');
});

testBoth('watching "length" property on an array', function(get, set) {
  var arr = [];
  addListeners(arr, 'length');

  watch(arr, 'length');
  equal(get(arr, 'length'), 0, 'should have original prop');

  set(arr, 'length', '10');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

  equal(get(arr, 'length'), 10, 'should get new value');
  equal(arr.length, 10, 'property should be accessible on arr');
});
