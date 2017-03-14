import { computed } from '../computed';
import { defineProperty } from '../properties';
import { deprecateProperty } from 'ember-metal';

QUnit.module('Ember.defineProperty');

QUnit.test('toString', function() {
  let obj = {};
  defineProperty(obj, 'toString', undefined, function() { return 'FOO'; });
  equal(obj.toString(), 'FOO', 'should replace toString');
});

QUnit.test('for data properties, didDefineProperty hook should be called if implemented', function() {
  expect(2);

  let obj = {
    didDefineProperty(obj, keyName, value) {
      equal(keyName, 'foo', 'key name should be foo');
      equal(value, 'bar', 'value should be bar');
    }
  };

  defineProperty(obj, 'foo', undefined, 'bar');
});

QUnit.test('for computed properties, didDefineProperty hook should be called if implemented', function() {
  expect(2);

  let computedProperty = computed(function() { return this; });

  let obj = {
    didDefineProperty(obj, keyName, value) {
      equal(keyName, 'foo', 'key name should be foo');
      strictEqual(value, computedProperty, 'value should be passed as computed property');
    }
  };

  defineProperty(obj, 'foo', computedProperty);
});

QUnit.test('for descriptor properties, didDefineProperty hook should be called if implemented', function() {
  expect(2);

  let descriptor = {
    writable: true,
    configurable: false,
    enumerable: true,
    value: 42
  };

  let obj = {
    didDefineProperty(obj, keyName, value) {
      equal(keyName, 'answer', 'key name should be answer');
      strictEqual(value, descriptor, 'value should be passed as descriptor');
    }
  };

  defineProperty(obj, 'answer', descriptor);
});

QUnit.module('Ember.deprecateProperty');

QUnit.test('enables access to deprecated property and returns the value of the new property', function() {
  expect(3);
  let obj = { foo: 'bar' };

  deprecateProperty(obj, 'baz', 'foo');

  expectDeprecation();
  equal(obj.baz, obj.foo, 'baz and foo are equal');

  obj.foo = 'blammo';
  equal(obj.baz, obj.foo, 'baz and foo are equal');
});

QUnit.test('deprecatedKey is not enumerable', function() {
  expect(2);
  let obj = { foo: 'bar', blammo: 'whammy' };

  deprecateProperty(obj, 'baz', 'foo');

  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      notEqual(prop, 'baz');
    }
  }
});

QUnit.test('enables setter to deprecated property and updates the value of the new property', function() {
  expect(3);
  let obj = { foo: 'bar' };

  deprecateProperty(obj, 'baz', 'foo');

  expectDeprecation();
  obj.baz = 'bloop';
  equal(obj.foo, 'bloop', 'updating baz updates foo');
  equal(obj.baz, obj.foo, 'baz and foo are equal');
});
