import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';

QUnit.module('set');

QUnit.test('should set arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null,
    undefinedValue: undefined
  };

  var newObj = {
    undefinedValue: 'emberjs'
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    equal(set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(get(newObj, key), obj[key], 'should set value');
  }
});

QUnit.test('should call setUnknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,

    unknownProperty: function(key, value) {
      ok(false, 'should not invoke unknownProperty if setUnknownProperty is defined');
    },

    setUnknownProperty: function(key, value) {
      equal(key, 'foo', 'should pass key');
      equal(value, 'BAR', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(set(obj, 'foo', "BAR"), 'BAR', 'should return set value');
  equal(obj.count, 1, 'should have invoked');
});

