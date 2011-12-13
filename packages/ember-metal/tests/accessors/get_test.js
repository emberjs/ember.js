// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/~tests/props_helper');

module('Ember.get');

test('should get arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };
  
  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equals(Ember.get(obj, key), obj[key], key);
  }
  
});

test('should call unknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,
    unknownProperty: function(key) {
      equals(key, 'foo', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equals(Ember.get(obj, 'foo'), 'FOO', 'should return value from unknown');
  equals(obj.count, 1, 'should have invoked');
});

testBoth("should call unknownProperty on watched values if the value is undefined", function(get, set) {
  var obj = {
    count: 0,
    unknownProperty: function(key) {
      equals(key, 'foo', "should pass key");
      this.count++;
      return "FOO";
    }
  };

  var count = 0;
  Ember.addObserver(obj, 'foo', function() {
    count++;
  });

  equals(get(obj, 'foo'), 'FOO', 'should return value from unknown');
});

// ..........................................................
// BUGS
// 

test('(regression) watched properties on unmodified inherited objects should still return their original value', function() {

  var MyMixin = Ember.Mixin.create({
    someProperty: 'foo',
    propertyDidChange: Ember.observer(function() {
      // NOTHING TO DO
    }, 'someProperty')
  });

  var baseObject = MyMixin.apply({});
  var theRealObject = Ember.create(baseObject);
  
  equals(Ember.get(theRealObject, 'someProperty'), 'foo', 'should return the set value, not false');  
});

