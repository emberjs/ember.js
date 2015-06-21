import { testBoth } from 'ember-metal/tests/props_helper';
import {
  get,
  getWithDefault,
  INTERCEPT_GET,
  UNHANDLED_GET
} from 'ember-metal/property_get';
import {
  Mixin,
  observer
} from 'ember-metal/mixin';
import { addObserver } from 'ember-metal/observer';

QUnit.module('Ember.get');

QUnit.test('should get arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    equal(get(obj, key), obj[key], key);
  }

});

QUnit.test('should invoke INTERCEPT_GET even if the property exists', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  let calledWith;
  obj[INTERCEPT_GET] = function(obj, key) {
    calledWith = [obj, key];
    return UNHANDLED_GET;
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    calledWith = undefined;
    equal(get(obj, key), obj[key], key);
    equal(calledWith[0], obj, 'the object was passed');
    equal(calledWith[1], key, 'the key was passed');
  }

});

QUnit.test('should invoke INTERCEPT_GET and accept a return value', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  obj[INTERCEPT_GET] = function(obj, key) {
    return key;
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key) || key === INTERCEPT_GET) {
      continue;
    }
    equal(get(obj, key), key, key);
  }
});

testBoth('should call unknownProperty on watched values if the value is undefined', function(get, set) {
  var obj = {
    count: 0,
    unknownProperty(key) {
      equal(key, 'foo', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  var count = 0;
  addObserver(obj, 'foo', function() {
    count++;
  });

  equal(get(obj, 'foo'), 'FOO', 'should return value from unknown');
});

QUnit.test('warn on attempts to get a property of undefined', function() {
  expectAssertion(function() {
    get(undefined, 'aProperty');
  }, /Cannot call get with 'aProperty' on an undefined object/i);
});

QUnit.test('warn on attempts to get a property path of undefined', function() {
  expectAssertion(function() {
    get(undefined, 'aProperty.on.aPath');
  }, /Cannot call get with 'aProperty.on.aPath' on an undefined object/);
});

QUnit.test('returns null when fetching a complex local path on a null context', function() {
  equal(get(null, 'aProperty.on.aPath'), null);
});

QUnit.test('returns null when fetching a simple local path on a null context', function() {
  equal(get(null, 'aProperty'), null);
});

QUnit.test('warn on attempts to get a falsy property', function() {
  var obj = {};
  expectAssertion(function() {
    get(obj, null);
  }, /Cannot call get with null key/);
  expectAssertion(function() {
    get(obj, NaN);
  }, /Cannot call get with NaN key/);
  expectAssertion(function() {
    get(obj, undefined);
  }, /Cannot call get with undefined key/);
  expectAssertion(function() {
    get(obj, false);
  }, /Cannot call get with false key/);
});

// ..........................................................
// BUGS
//

QUnit.test('(regression) watched properties on unmodified inherited objects should still return their original value', function() {

  var MyMixin = Mixin.create({
    someProperty: 'foo',
    propertyDidChange: observer('someProperty', function() {
      // NOTHING TO DO
    })
  });

  var baseObject = MyMixin.apply({});
  var theRealObject = Object.create(baseObject);

  equal(get(theRealObject, 'someProperty'), 'foo', 'should return the set value, not false');
});

QUnit.module('Ember.getWithDefault');

QUnit.test('should get arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    equal(getWithDefault(obj, key, 'fail'), obj[key], key);
  }

  obj = {
    undef: undefined
  };

  equal(getWithDefault(obj, 'undef', 'default'), 'default', 'explicit undefined retrieves the default');
  equal(getWithDefault(obj, 'not-present', 'default'), 'default', 'non-present key retrieves the default');
});

QUnit.test('should call unknownProperty if defined and value is undefined', function() {

  var obj = {
    count: 0,
    unknownProperty(key) {
      equal(key, 'foo', 'should pass key');
      this.count++;
      return 'FOO';
    }
  };

  equal(get(obj, 'foo'), 'FOO', 'should return value from unknown');
  equal(obj.count, 1, 'should have invoked');
});

testBoth('if unknownProperty is present, it is called', function(get, set) {
  var obj = {
    count: 0,
    unknownProperty(key) {
      if (key === 'foo') {
        equal(key, 'foo', 'should pass key');
        this.count++;
        return 'FOO';
      }
    }
  };

  var count = 0;
  addObserver(obj, 'foo', function() {
    count++;
  });

  equal(getWithDefault(obj, 'foo', 'fail'), 'FOO', 'should return value from unknownProperty');
  equal(getWithDefault(obj, 'bar', 'default'), 'default', 'should convert undefined from unknownProperty into default');
});

// ..........................................................
// BUGS
//

QUnit.test('(regression) watched properties on unmodified inherited objects should still return their original value', function() {

  var MyMixin = Mixin.create({
    someProperty: 'foo',
    propertyDidChange: observer('someProperty', function() {
      // NOTHING TO DO
    })
  });

  var baseObject = MyMixin.apply({});
  var theRealObject = Object.create(baseObject);

  equal(getWithDefault(theRealObject, 'someProperty', 'fail'), 'foo', 'should return the set value, not false');
});

