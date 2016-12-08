import { get } from '../../property_get';
import { set } from '../../property_set';
import { setHasViews } from '../../tags';

QUnit.module('set', {
  teardown() {
    setHasViews(() => false);
  }
});

QUnit.test('should set arbitrary properties on an object', function() {
  let obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null,
    undefinedValue: undefined
  };

  let newObj = {
    undefinedValue: 'emberjs'
  };

  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    equal(set(newObj, key, obj[key]), obj[key], 'should return value');
    equal(get(newObj, key), obj[key], 'should set value');
  }
});

QUnit.test('should call setUnknownProperty if defined and value is undefined', function() {
  let obj = {
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
  expectAssertion(() => set(undefined, 'aProperty', 'BAM'), /Cannot call set with 'aProperty' on an undefined object./);
});

QUnit.test('warn on attempts to call set with null as object', function() {
  expectAssertion(() => set(null, 'aProperty', 'BAM'), /Cannot call set with 'aProperty' on an undefined object./);
});

QUnit.test('warn on attempts to use set with an unsupported property path', function() {
  let obj = {};
  expectAssertion(() => set(obj, null, 42),      /The key provided to set must be a string, you passed null/);
  expectAssertion(() => set(obj, NaN, 42),       /The key provided to set must be a string, you passed NaN/);
  expectAssertion(() => set(obj, undefined, 42), /The key provided to set must be a string, you passed undefined/);
  expectAssertion(() => set(obj, false, 42),     /The key provided to set must be a string, you passed false/);
  expectAssertion(() => set(obj, 42, 42),        /The key provided to set must be a string, you passed 42/);
});

QUnit.test('warn on attempts of calling set on a destroyed object', function() {
  let obj = { isDestroyed: true };

  expectAssertion(() => set(obj, 'favoriteFood', 'hot dogs'), 'calling set on destroyed object: [object Object].favoriteFood = hot dogs');
});

QUnit.test('does not trigger auto-run assertion for objects that have not been tagged', function(assert) {
  setHasViews(() => true);
  let obj = {};

  set(obj, 'foo', 'bar');

  assert.equal(obj.foo, 'bar');
});
