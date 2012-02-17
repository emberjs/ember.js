// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


module('Ember.set');

test('should set arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  var newObj = {};

  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equal(Ember.set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(Ember.get(newObj, key), obj[key], 'should set value');
  }

});

test('should call unknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,
    unknownProperty: function(key, value) {
      equal(key, 'foo', 'should pass key');
      equal(value, 'BAR', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(Ember.set(obj, 'foo', "BAR"), 'BAR', 'should return set value');
  equal(obj.count, 1, 'should have invoked');
});

test('should call setUnknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,

    unknownProperty: function(key, value) {
      ok(false, 'should not invoke unknownProperty is setUnknownProperty is defined');
    },

    setUnknownProperty: function(key, value) {
      equal(key, 'foo', 'should pass key');
      equal(value, 'BAR', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(Ember.set(obj, 'foo', "BAR"), 'BAR', 'should return set value');
  equal(obj.count, 1, 'should have invoked');
});

