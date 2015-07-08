import { get, INTERCEPT_GET } from 'ember-metal/property_get';
import { set, INTERCEPT_SET, UNHANDLED_SET } from 'ember-metal/property_set';

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

QUnit.test('should call INTERCEPT_SET and support UNHANDLED_SET if INTERCEPT_SET is defined', function() {
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

  let calledWith;
  newObj[INTERCEPT_SET] = function(obj, key, value) {
    calledWith = [key, value];
    return UNHANDLED_SET;
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    calledWith = undefined;

    equal(set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(calledWith[0], key, 'INTERCEPT_SET called with the key');
    equal(calledWith[1], obj[key], 'INTERCEPT_SET called with the key');
    equal(get(newObj, key), obj[key], 'should set value since UNHANDLED_SET was returned');
  }
});

QUnit.test('should call INTERCEPT_SET and support handling the set if it is defined', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null,
    undefinedValue: undefined
  };

  var newObj = {
    bucket: {}
  };

  let calledWith;
  newObj[INTERCEPT_SET] = function(obj, key, value) {
    set(obj.bucket, key, value);
    return value;
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    calledWith = undefined;

    equal(set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(get(newObj.bucket, key), obj[key], 'should have moved the value to `bucket`');
    ok(newObj.bucket.hasOwnProperty(key), 'the key is defined in bucket');
    ok(!newObj.hasOwnProperty(key), 'the key is not defined on the raw object');
  }
});

QUnit.test('should call INTERCEPT_GET and INTERCEPT_SET', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null,
    undefinedValue: undefined
  };

  var newObj = {
    string: null,
    number: null,
    boolTrue: null,
    boolFalse: null,
    nullValue: null,
    undefinedValue: null,
    bucket: {}
  };

  newObj[INTERCEPT_SET] = function(obj, key, value) {
    set(obj.bucket, key, value);
    return value;
  };

  newObj[INTERCEPT_GET] = function(obj, key) {
    return get(obj.bucket, key);
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    equal(set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(get(newObj.bucket, key), obj[key], 'should have moved the value to `bucket`');
    equal(get(newObj, key), obj[key], 'INTERCEPT_GET was called');
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

