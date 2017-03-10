import { deprecateProperty } from '../deprecate';

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
