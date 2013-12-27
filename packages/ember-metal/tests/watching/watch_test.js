/*globals Global:true */

require('ember-metal/~tests/props_helper');

var willCount, didCount,
    willKeys, didKeys,
    indexOf = Ember.EnumerableUtils.indexOf;

module('Ember.watch', {
  setup: function() {
    willCount = didCount = 0;
    willKeys = [];
    didKeys = [];
  }
});

function addListeners(obj, keyPath) {
  Ember.addListener(obj, keyPath + ':before', function() {
    willCount++;
    willKeys.push(keyPath);
  });
  Ember.addListener(obj, keyPath + ':change', function() {
    didCount++;
    didKeys.push(keyPath);
  });
}

testBoth('watching a computed property', function(get, set) {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set) {

  var obj = { foo: 'baz' };
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');
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

  Ember.watch(obj, 'foo');

  equal('foo' in obj, false, 'precond undefined');

  set(obj, 'foo', 'bar');

  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  equal(get(obj, 'foo'), 'bar', 'should get new value');
  equal(obj.foo, 'bar', 'property should be accessible on obj');
});

testBoth('watches should inherit', function(get, set) {

  var obj = { foo: 'baz' };
  var objB = Ember.create(obj);

  addListeners(obj, 'foo');
  Ember.watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  equal(willCount, 2, 'should have invoked willCount once only');
  equal(didCount, 2, 'should have invoked didCount once only');
});

test("watching an object THEN defining it should work also", function() {

  var obj = {};
  addListeners(obj, 'foo');

  Ember.watch(obj, 'foo');

  Ember.defineProperty(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');

  equal(Ember.get(obj, 'foo'), 'bar', 'should have set');
  equal(willCount, 1, 'should have invoked willChange once');
  equal(didCount, 1, 'should have invoked didChange once');

});

test("watching a chain then defining the property", function () {
  var obj = {};
  var foo = {bar: 'bar'};
  addListeners(obj, 'foo.bar');
  addListeners(foo, 'bar');

  Ember.watch(obj, 'foo.bar');

  Ember.defineProperty(obj, 'foo', undefined, foo);
  Ember.set(foo, 'bar', 'baz');

  deepEqual(willKeys, ['foo.bar', 'bar'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['foo.bar', 'bar'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

test("watching a chain then defining the nested property", function () {
  var bar = {};
  var obj = {foo: bar};
  var baz = {baz: 'baz'};
  addListeners(obj, 'foo.bar.baz');
  addListeners(baz, 'baz');

  Ember.watch(obj, 'foo.bar.baz');

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

  Ember.watch(obj, 'foo.bar.baz.biff');

  var foo = Ember.get(obj, 'foo');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  Ember.unwatch(obj, 'foo.bar.baz.biff');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

testBoth('watching a global object that does not yet exist should queue', function(get, set) {
  Global = null;

  var obj = {};
  addListeners(obj, 'Global.foo');

  Ember.watch(obj, 'Global.foo'); // only works on global chained props

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  Global = { foo: 'bar' };
  addListeners(Global, 'foo');

  Ember.watch.flushPending(); // this will also be invoked automatically on ready

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  set(Global, 'foo', 'baz');

  // should fire twice because this is a chained property (once on key, once
  // on path)
  equal(willCount, 2, 'should be watching');
  equal(didCount, 2, 'should be watching');

  Global = null; // reset
});

test('when watching a global object, destroy should remove chain watchers from the global object', function() {

  Global = { foo: 'bar' };
  var obj = {};
  addListeners(obj, 'Global.foo');

  Ember.watch(obj, 'Global.foo');

  var meta_Global = Ember.meta(Global);
  var chainNode = Ember.meta(obj).chains._chains.Global._chains.foo;
  var index = indexOf(meta_Global.chainWatchers.foo, chainNode);

  equal(meta_Global.watching.foo, 1, 'should be watching foo');
  strictEqual(meta_Global.chainWatchers.foo[index], chainNode, 'should have chain watcher');

  Ember.destroy(obj);

  index = indexOf(meta_Global.chainWatchers.foo, chainNode);
  equal(meta_Global.watching.foo, 0, 'should not be watching foo');
  equal(index, -1, 'should not have chain watcher');

  Global = null; // reset
});

test('when watching another object, destroy should remove chain watchers from the other object', function() {

  var objA = {};
  var objB = {foo: 'bar'};
  objA.b = objB;
  addListeners(objA, 'b.foo');

  Ember.watch(objA, 'b.foo');

  var meta_objB = Ember.meta(objB);
  var chainNode = Ember.meta(objA).chains._chains.b._chains.foo;
  var index = indexOf(meta_objB.chainWatchers.foo, chainNode);

  equal(meta_objB.watching.foo, 1, 'should be watching foo');
  strictEqual(meta_objB.chainWatchers.foo[index], chainNode, 'should have chain watcher');

  Ember.destroy(objA);

  index = indexOf(meta_objB.chainWatchers.foo, chainNode);
  equal(meta_objB.watching.foo, 0, 'should not be watching foo');
  equal(index, -1, 'should not have chain watcher');
});

// TESTS for length property

testBoth('watching "length" property on an object', function(get, set) {

  var obj = { length: '26.2 miles' };
  addListeners(obj, 'length');

  Ember.watch(obj, 'length');
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

  Ember.watch(arr, 'length');
  equal(get(arr, 'length'), 0, 'should have original prop');

  set(arr, 'length', '10');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

  equal(get(arr, 'length'), 10, 'should get new value');
  equal(arr.length, 10, 'property should be accessible on arr');
});

test('watching non-configurable property should assert', function() {
  var obj = {
    state: 'happy'
  };

  Ember.platform.defineProperty(obj, 'sleepy', {});

  expectAssertion(function() {
    Ember.watchKey(obj, 'sleepy');
  }, 'You cannot watch non-configurable property: sleepy');
});
