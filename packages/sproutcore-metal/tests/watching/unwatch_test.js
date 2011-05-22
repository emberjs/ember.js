// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('sproutcore-metal/~tests/props_helper');

var willCount = 0 , didCount = 0, 
    willChange = SC.propertyWillChange, 
    didChange = SC.propertyDidChange;

module('SC.unwatch', {
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

testBoth('unwatching a computed property - regular get/set', function(get, set) {

  var obj = {};
  SC.defineProperty(obj, 'foo', SC.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));
  
  SC.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');

  SC.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equals(willCount, 0, 'should NOT have invoked willCount');
  equals(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set) {

  var obj = { foo: 'BIFF' };
  
  SC.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');

  SC.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equals(willCount, 0, 'should NOT have invoked willCount');
  equals(didCount, 0, 'should NOT have invoked didCount');
});

test('unwatching should be nested', function() {

  var obj = { foo: 'BIFF' };
  
  SC.watch(obj, 'foo');
  SC.watch(obj, 'foo');
  SC.set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');

  SC.unwatch(obj, 'foo');
  willCount = didCount = 0;
  SC.set(obj, 'foo', 'BAZ');
  equals(willCount, 1, 'should NOT have invoked willCount');
  equals(didCount, 1, 'should NOT have invoked didCount');

  SC.unwatch(obj, 'foo');
  willCount = didCount = 0;
  SC.set(obj, 'foo', 'BAZ');
  equals(willCount, 0, 'should NOT have invoked willCount');
  equals(didCount, 0, 'should NOT have invoked didCount');
});
