// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-metal/~tests/props_helper');

module('SC.get');

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
    equals(SC.get(obj, key), obj[key], key);
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

  equals(SC.get(obj, 'foo'), 'FOO', 'should return value from unknown');
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
  SC.addObserver(obj, 'foo', function() {
    count++;
  });

  equals(get(obj, 'foo'), 'FOO', 'should return value from unknown');
});

// ..........................................................
// BUGS
// 

test('(regression) watched properties on unmodified inherited objects should still return their original value', function() {

  var MyMixin = SC.Mixin.create({
    someProperty: 'foo',
    propertyDidChange: SC.observer(function() {
      // NOTHING TO DO
    }, 'someProperty')
  });

  var baseObject = MyMixin.apply({});
  var theRealObject = SC.create(baseObject);
  
  equals(SC.get(theRealObject, 'someProperty'), 'foo', 'should return the set value, not false');  
});

