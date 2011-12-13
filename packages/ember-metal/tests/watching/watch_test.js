// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth Global */

require('ember-metal/~tests/props_helper');

var willCount = 0 , didCount = 0, 
    willChange = Ember.propertyWillChange, 
    didChange = Ember.propertyDidChange;

module('Ember.watch', {
  setup: function() {
    willCount = didCount = 0;
    Ember.propertyWillChange = function(cur, keyName) {
      willCount++;
      willChange.call(this, cur, keyName);
    };

    Ember.propertyDidChange = function(cur, keyName) {
      didCount++;
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
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set) {

  var obj = { foo: 'baz' };
  
  Ember.watch(obj, 'foo');
  equals(get(obj, 'foo'), 'baz', 'should have original prop');
  
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');
});

testBoth('watches should inherit', function(get, set) {

  var obj = { foo: 'baz' };
  var objB = Ember.create(obj);
  
  Ember.watch(obj, 'foo');
  equals(get(obj, 'foo'), 'baz', 'should have original prop');
  
  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  equals(willCount, 2, 'should have invoked willCount once only');
  equals(didCount, 2, 'should have invoked didCount once only');
});

test("watching an object THEN defining it should work also", function() {

  var obj = {};
  Ember.watch(obj, 'foo');
  
  Ember.defineProperty(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');
  
  equals(Ember.get(obj, 'foo'), 'bar', 'should have set');
  equals(willCount, 1, 'should have invoked willChange once');
  equals(didCount, 1, 'should have invoked didChange once');
  
});

testBoth('watching an object value then unwatching should restore old value', function(get, set) {

  var obj = { foo: { bar: { baz: { biff: 'BIFF' } } } };
  Ember.watch(obj, 'foo.bar.baz.biff');

  var foo = Ember.get(obj, 'foo');
  equals(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  Ember.unwatch(obj, 'foo.bar.baz.biff');
  equals(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

testBoth('watching a global object that does not yet exist should queue', function(get, set) {

  Global = null;

  var obj = {};
  Ember.watch(obj, 'Global.foo'); // only works on global chained props

  equals(willCount, 0, 'should not have fired yet');
  equals(didCount, 0, 'should not have fired yet');

  Global = { foo: 'bar' };
  Ember.watch.flushPending(); // this will also be invoked automatically on ready

  equals(willCount, 0, 'should not have fired yet');
  equals(didCount, 0, 'should not have fired yet');

  set(Global, 'foo', 'baz');

  // should fire twice because this is a chained property (once on key, once
  // on path)
  equals(willCount, 2, 'should be watching');
  equals(didCount, 2, 'should be watching');

  Global = null; // reset
});

