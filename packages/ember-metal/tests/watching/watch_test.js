import { context } from 'ember-environment';
import {
  meta,
  set,
  get,
  computed,
  defineProperty,
  addListener,
  watch,
  unwatch,
  deleteMeta
} from '../..';
import { testBoth } from 'internal-test-helpers';

let willCount, didCount, willKeys, didKeys, originalLookup;

QUnit.module('watch', {
  beforeEach() {
    willCount = didCount = 0;
    willKeys = [];
    didKeys = [];

    originalLookup = context.lookup;
    context.lookup = {};
  },

  afterEach() {
    context.lookup = originalLookup;
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

testBoth('watching a computed property', function(get, set, assert) {
  let obj = {};
  defineProperty(obj, 'foo', computed({
    get() {
      return this.__foo;
    },
    set(keyName, value) {
      if (value !== undefined) {
        this.__foo = value;
      }
      return this.__foo;
    }
  }));
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set, assert) {
  let obj = { foo: 'baz' };
  addListeners(obj, 'foo');

  watch(obj, 'foo');
  assert.equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  assert.equal(get(obj, 'foo'), 'bar', 'should get new value');
  assert.equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watching a regular undefined property', function(get, set, assert) {
  let obj = { };
  addListeners(obj, 'foo');

  watch(obj, 'foo');

  assert.equal('foo' in obj, false, 'precond undefined');

  set(obj, 'foo', 'bar');

  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  assert.equal(get(obj, 'foo'), 'bar', 'should get new value');
  assert.equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watches should inherit', function(get, set, assert) {
  let obj = { foo: 'baz' };
  let objB = Object.create(obj);

  addListeners(obj, 'foo');
  watch(obj, 'foo');
  assert.equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  assert.equal(willCount, 2, 'should have invoked willCount once only');
  assert.equal(didCount, 2, 'should have invoked didCount once only');
});

QUnit.test('watching an object THEN defining it should work also', function(assert) {
  let obj = {};
  addListeners(obj, 'foo');

  watch(obj, 'foo');

  defineProperty(obj, 'foo');
  set(obj, 'foo', 'bar');

  assert.equal(get(obj, 'foo'), 'bar', 'should have set');
  assert.equal(willCount, 1, 'should have invoked willChange once');
  assert.equal(didCount, 1, 'should have invoked didChange once');
});

QUnit.test('watching a chain then defining the property', function(assert) {
  let obj = {};
  let foo = { bar: 'bar' };
  addListeners(obj, 'foo.bar');
  addListeners(foo, 'bar');

  watch(obj, 'foo.bar');

  defineProperty(obj, 'foo', undefined, foo);
  set(foo, 'bar', 'baz');

  assert.deepEqual(willKeys, ['foo.bar', 'bar'], 'should have invoked willChange with bar, foo.bar');
  assert.deepEqual(didKeys, ['foo.bar', 'bar'], 'should have invoked didChange with bar, foo.bar');
  assert.equal(willCount, 2, 'should have invoked willChange twice');
  assert.equal(didCount, 2, 'should have invoked didChange twice');
});

QUnit.test('watching a chain then defining the nested property', function(assert) {
  let bar = {};
  let obj = { foo: bar };
  let baz = { baz: 'baz' };
  addListeners(obj, 'foo.bar.baz');
  addListeners(baz, 'baz');

  watch(obj, 'foo.bar.baz');

  defineProperty(bar, 'bar', undefined, baz);
  set(baz, 'baz', 'BOO');

  assert.deepEqual(willKeys, ['foo.bar.baz', 'baz'], 'should have invoked willChange with bar, foo.bar');
  assert.deepEqual(didKeys, ['foo.bar.baz', 'baz'], 'should have invoked didChange with bar, foo.bar');
  assert.equal(willCount, 2, 'should have invoked willChange twice');
  assert.equal(didCount, 2, 'should have invoked didChange twice');
});

testBoth('watching an object value then unwatching should restore old value', function(get, set, assert) {
  let obj = { foo: { bar: { baz: { biff: 'BIFF' } } } };
  addListeners(obj, 'foo.bar.baz.biff');

  watch(obj, 'foo.bar.baz.biff');

  let foo = get(obj, 'foo');
  assert.equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  unwatch(obj, 'foo.bar.baz.biff');
  assert.equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

QUnit.test('when watching another object, destroy should remove chain watchers from the other object', function(assert) {
  let objA = {};
  let objB = { foo: 'bar' };
  objA.b = objB;
  addListeners(objA, 'b.foo');

  watch(objA, 'b.foo');

  let meta_objB = meta(objB);
  let chainNode = meta(objA).readableChains()._chains.b._chains.foo;

  assert.equal(meta_objB.peekWatching('foo'), 1, 'should be watching foo');
  assert.equal(meta_objB.readableChainWatchers().has('foo', chainNode), true, 'should have chain watcher');

  deleteMeta(objA);

  assert.equal(meta_objB.peekWatching('foo'), 0, 'should not be watching foo');
  assert.equal(meta_objB.readableChainWatchers().has('foo', chainNode), false, 'should not have chain watcher');
});

// TESTS for length property

testBoth('watching "length" property on an object', function(get, set, assert) {
  let obj = { length: '26.2 miles' };
  addListeners(obj, 'length');

  watch(obj, 'length');
  assert.equal(get(obj, 'length'), '26.2 miles', 'should have original prop');

  set(obj, 'length', '10k');
  assert.equal(willCount, 1, 'should have invoked willCount');
  assert.equal(didCount, 1, 'should have invoked didCount');

  assert.equal(get(obj, 'length'), '10k', 'should get new value');
  assert.equal(obj.length, '10k', 'property should be accessible on obj');
});

testBoth('watching "length" property on an array', function(get, set, assert) {
  let arr = [];
  addListeners(arr, 'length');

  watch(arr, 'length');
  assert.equal(get(arr, 'length'), 0, 'should have original prop');

  set(arr, 'length', '10');
  assert.equal(willCount, 1, 'should NOT have invoked willCount');
  assert.equal(didCount, 1, 'should NOT have invoked didCount');

  assert.equal(get(arr, 'length'), 10, 'should get new value');
  assert.equal(arr.length, 10, 'property should be accessible on arr');
});

testBoth('watch + ES5 getter', function(get, set, assert) {
  let parent = { b: 1 };
  let child = {
    get b() {
      return parent.b;
    }
  };

  assert.equal(parent.b,  1, 'parent.b should be 1');
  assert.equal(child.b, 1, 'child.b should be 1');
  assert.equal(get(child, 'b'), 1, 'Ember.get(child, "b") should be 1');

  watch(child, 'b');

  assert.equal(parent.b,  1, 'parent.b should be 1 (after watch)');
  assert.equal(child.b, 1, 'child.b should be 1  (after watch)');

  assert.equal(get(child, 'b'), 1, 'Ember.get(child, "b") should be 1 (after watch)');
});

testBoth('watch + Ember.set + no-descriptor', function(get, set, assert) {
  let child = { };

  assert.equal(child.b, undefined, 'child.b ');
  assert.equal(get(child, 'b'), undefined, 'Ember.get(child, "b")');

  watch(child, 'b');
  set(child, 'b', 1);

  assert.equal(child.b, 1, 'child.b (after watch)');
  assert.equal(get(child, 'b'), 1, 'Ember.get(child, "b") (after watch)');
});
