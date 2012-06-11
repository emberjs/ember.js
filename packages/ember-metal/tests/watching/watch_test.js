// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Global:true */

require('ember-metal/~tests/props_helper');

var willCount = 0 , didCount = 0,
    willKeys = [] , didKeys = [],
    willChange = Ember.propertyWillChange,
    didChange = Ember.propertyDidChange;

module('Ember.watch', {
  setup: function() {
    willCount = didCount = 0;
    willKeys = [];
    didKeys = [];
    Ember.propertyWillChange = function(cur, keyName) {
      willCount++;
      willKeys.push(keyName);
      willChange.call(this, cur, keyName);
    };

    Ember.propertyDidChange = function(cur, keyName) {
      didCount++;
      didKeys.push(keyName);
      didChange.call(this, cur, keyName);
    };
  },

  teardown: function() {
    Ember.propertyWillChange = willChange;
    Ember.propertyDidChange  = didChange;
  }
});

testBoth('watching a computed property', function(get, set) {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set) {

  var obj = { foo: 'baz' };

  Ember.watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');
});

testBoth('watches should inherit', function(get, set) {

  var obj = { foo: 'baz' };
  var objB = Ember.create(obj);

  Ember.watch(obj, 'foo');
  equal(get(obj, 'foo'), 'baz', 'should have original prop');

  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  equal(willCount, 2, 'should have invoked willCount once only');
  equal(didCount, 2, 'should have invoked didCount once only');
});

test("watching an object THEN defining it should work also", function() {

  var obj = {};
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
  Ember.watch(obj, 'foo.bar');

  Ember.defineProperty(obj, 'foo', Ember.SIMPLE_PROPERTY, foo);
  Ember.set(foo, 'bar', 'baz');

  deepEqual(willKeys, ['bar', 'foo.bar'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['bar', 'foo.bar'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

test("watching a chain then defining the nested property", function () {
  var bar = {};
  var obj = {foo: bar};
  var baz = {baz: 'baz'};
  Ember.watch(obj, 'foo.bar.baz');

  Ember.defineProperty(bar, 'bar', Ember.SIMPLE_PROPERTY, baz);
  Ember.set(baz, 'baz', 'BOO');

  deepEqual(willKeys, ['baz', 'foo.bar.baz'], 'should have invoked willChange with bar, foo.bar');
  deepEqual(didKeys, ['baz', 'foo.bar.baz'], 'should have invoked didChange with bar, foo.bar');
  equal(willCount, 2, 'should have invoked willChange twice');
  equal(didCount, 2, 'should have invoked didChange twice');
});

testBoth('watching an object value then unwatching should restore old value', function(get, set) {

  var obj = { foo: { bar: { baz: { biff: 'BIFF' } } } };
  Ember.watch(obj, 'foo.bar.baz.biff');

  var foo = Ember.get(obj, 'foo');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  Ember.unwatch(obj, 'foo.bar.baz.biff');
  equal(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

testBoth('watching a global object that does not yet exist should queue', function(get, set) {

  Global = null;

  var obj = {};
  Ember.watch(obj, 'Global.foo'); // only works on global chained props

  equal(willCount, 0, 'should not have fired yet');
  equal(didCount, 0, 'should not have fired yet');

  Global = { foo: 'bar' };
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

  Ember.watch(obj, 'Global.foo');

  var meta_Global = Ember.meta(Global);
  var chainNode = Ember.meta(obj).chains._chains.Global._chains.foo;
  var guid = Ember.guidFor(chainNode);

  equal(meta_Global.watching.foo, 1, 'should be watching foo');
  strictEqual(meta_Global.chainWatchers.foo[guid], chainNode, 'should have chain watcher');

  Ember.destroy(obj);

  equal(meta_Global.watching.foo, 0, 'should not be watching foo');
  strictEqual(meta_Global.chainWatchers.foo[guid], undefined, 'should not have chain watcher');

  Global = null; // reset
});

test('when watching another object, destroy should remove chain watchers from the other object', function() {

  var objA = {};
  var objB = {foo: 'bar'};
  objA.b = objB;

  Ember.watch(objA, 'b.foo');

  var meta_objB = Ember.meta(objB);
  var chainNode = Ember.meta(objA).chains._chains.b._chains.foo;
  var guid = Ember.guidFor(chainNode);

  equal(meta_objB.watching.foo, 1, 'should be watching foo');
  strictEqual(meta_objB.chainWatchers.foo[guid], chainNode, 'should have chain watcher');

  Ember.destroy(objA);

  equal(meta_objB.watching.foo, 0, 'should not be watching foo');
  strictEqual(meta_objB.chainWatchers.foo[guid], undefined, 'should not have chain watcher');
});
