// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth Global */

require('sproutcore-metal/~tests/props_helper');

var willCount = 0 , didCount = 0, 
    willChange = SC.propertyWillChange, 
    didChange = SC.propertyDidChange;

module('SC.watch', {
  setup: function() {
    willCount = didCount = 0;
    SC.propertyWillChange = function(cur, keyName) {
      willCount++;
      willChange.call(this, cur, keyName);
    };

    SC.propertyDidChange = function(cur, keyName) {
      didCount++;
      didChange.call(this, cur, keyName);
    };
  },
  
  teardown: function() {
    SC.propertyWillChange = willChange;
    SC.propertyDidChange  = didChange;
  }
});

testBoth('watching a computed property', function(get, set) {

  var obj = {};
  SC.defineProperty(obj, 'foo', SC.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));
  
  SC.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');
});

testBoth('watching a regular defined property', function(get, set) {

  var obj = { foo: 'baz' };
  
  SC.watch(obj, 'foo');
  equals(get(obj, 'foo'), 'baz', 'should have original prop');
  
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');
});

testBoth('watches should inherit', function(get, set) {

  var obj = { foo: 'baz' };
  var objB = SC.create(obj);
  
  SC.watch(obj, 'foo');
  equals(get(obj, 'foo'), 'baz', 'should have original prop');
  
  set(obj, 'foo', 'bar');
  set(objB, 'foo', 'baz');
  equals(willCount, 2, 'should have invoked willCount once only');
  equals(didCount, 2, 'should have invoked didCount once only');
});

test("watching an object THEN defining it should work also", function() {

  var obj = {};
  SC.watch(obj, 'foo');
  
  SC.defineProperty(obj, 'foo');
  SC.set(obj, 'foo', 'bar');
  
  equals(SC.get(obj, 'foo'), 'bar', 'should have set');
  equals(willCount, 1, 'should have invoked willChange once');
  equals(didCount, 1, 'should have invoked didChange once');
  
});

testBoth('watching an object value then unwatching should restore old value', function(get, set) {

  var obj = { foo: { bar: { baz: { biff: 'BIFF' } } } };
  SC.watch(obj, 'foo.bar.baz.biff');

  var foo = SC.get(obj, 'foo');
  equals(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');

  SC.unwatch(obj, 'foo.bar.baz.biff');
  equals(get(get(get(foo, 'bar'), 'baz'), 'biff'), 'BIFF', 'biff should exist');
});

testBoth('watching a global object that does not yet exist should queue', function(get, set) {

  Global = null;

  var obj = {};
  SC.watch(obj, 'Global.foo'); // only works on global chained props

  equals(willCount, 0, 'should not have fired yet');
  equals(didCount, 0, 'should not have fired yet');

  Global = { foo: 'bar' };
  SC.watch.flushPending(); // this will also be invoked automatically on ready

  equals(willCount, 0, 'should not have fired yet');
  equals(didCount, 0, 'should not have fired yet');

  set(Global, 'foo', 'baz');

  // should fire twice because this is a chained property (once on key, once
  // on path)
  equals(willCount, 2, 'should be watching');
  equals(didCount, 2, 'should be watching');

  Global = null; // reset
});

