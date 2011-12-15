// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-metal/~tests/props_helper');

var willCount = 0 , didCount = 0, 
    willChange = Ember.propertyWillChange, 
    didChange = Ember.propertyDidChange;

module('Ember.unwatch', {
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

testBoth('unwatching a computed property - regular get/set', function(get, set) {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));
  
  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equals(willCount, 0, 'should NOT have invoked willCount');
  equals(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set) {

  var obj = { foo: 'BIFF' };
  
  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equals(willCount, 0, 'should NOT have invoked willCount');
  equals(didCount, 0, 'should NOT have invoked didCount');
});

test('unwatching should be nested', function() {

  var obj = { foo: 'BIFF' };
  
  Ember.watch(obj, 'foo');
  Ember.watch(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');
  equals(willCount, 1, 'should have invoked willCount');
  equals(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  Ember.set(obj, 'foo', 'BAZ');
  equals(willCount, 1, 'should NOT have invoked willCount');
  equals(didCount, 1, 'should NOT have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  Ember.set(obj, 'foo', 'BAZ');
  equals(willCount, 0, 'should NOT have invoked willCount');
  equals(didCount, 0, 'should NOT have invoked didCount');
});
