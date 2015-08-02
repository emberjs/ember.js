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

    unknownProperty(key, value) {
      ok(false, 'should not invoke unknownProperty if setUnknownProperty is defined');
    },

    setUnknownProperty(key, value) {
      equal(key, 'foo', 'should pass key');
      equal(value, 'BAR', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(set(obj, 'foo', 'BAR'), 'BAR', 'should return set value');
  equal(obj.count, 1, 'should have invoked');
});

QUnit.test('warn on attempts to call set with undefined as object', function() {
  expectAssertion(function() {
    set(undefined, 'aProperty', 'BAM');
  }, /Cannot call set with 'aProperty' on an undefined object./);
});

QUnit.test('warn on attempts to call set with null as object', function() {
  expectAssertion(function() {
    set(null, 'aProperty', 'BAM');
  }, /Cannot call set with 'aProperty' on an undefined object./);
});

QUnit.test('warn on attempts to use set with an unsupported property path', function() {
  var obj = {};
  expectAssertion(function() {
    set(obj, null, 42);
  }, /The key provided to set must be a string, you passed null/);
  expectAssertion(function() {
    set(obj, NaN, 42);
  }, /The key provided to set must be a string, you passed NaN/);
  expectAssertion(function() {
    set(obj, undefined, 42);
  }, /The key provided to set must be a string, you passed undefined/);
  expectAssertion(function() {
    set(obj, false, 42);
  }, /The key provided to set must be a string, you passed false/);
  expectAssertion(function() {
    set(obj, 42, 42);
  }, /The key provided to set must be a string, you passed 42/);
});
