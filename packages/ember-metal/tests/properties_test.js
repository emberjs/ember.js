import { computed } from 'ember-metal/computed';
import { defineProperty } from 'ember-metal/properties';
import { deprecateProperty } from 'ember-metal/deprecate_property';

QUnit.module('Ember.defineProperty');

QUnit.test('toString', function() {
  var obj = {};
  defineProperty(obj, 'toString', undefined, function() { return 'FOO'; });
  equal(obj.toString(), 'FOO', 'should replace toString');
});

// QUnit.test('for data properties, didDefineProperty hook should be called if implemented', function() {
//   expect(2);

//   var obj = {
//     didDefineProperty(obj, keyName, value) {
//       equal(keyName, 'foo', 'key name should be foo');
//       equal(value, 'bar', 'value should be bar');
//     }
//   };

//   defineProperty(obj, 'foo', undefined, 'bar');
// });

// QUnit.test('for computed properties, didDefineProperty hook should be called if implemented', function() {
//   expect(2);

//   var computedProperty = computed(function() { return this; });

//   var obj = {
//     didDefineProperty(obj, keyName, value) {
//       equal(keyName, 'foo', 'key name should be foo');
//       strictEqual(value, computedProperty, 'value should be passed as computed property');
//     }
//   };

//   defineProperty(obj, 'foo', computedProperty);
// });

// QUnit.test('for descriptor properties, didDefineProperty hook should be called if implemented', function() {
//   expect(2);

//   var descriptor = {
//     writable: true,
//     configurable: false,
//     enumerable: true,
//     value: 42
//   };

//   var obj = {
//     didDefineProperty(obj, keyName, value) {
//       equal(keyName, 'answer', 'key name should be answer');
//       strictEqual(value, descriptor, 'value should be passed as descriptor');
//     }
//   };

//   defineProperty(obj, 'answer', descriptor);
// });

QUnit.test("on pojo, new simple value", function() {
  let obj = {};

  defineProperty(obj, 'foo', {
    value: 1
  });

  let descriptor = Object.getOwnPropertyDescriptor(obj, 'foo');

  equal(obj.foo, 1);
  deepEqual(descriptor, {
    value: 1,
    writable: false,
    enumerable: false,
    configurable: false
  });

  // TODO: this should be made to pass
  // equal(obj.__ember_meta__, undefined, 'should not have created an ember meta');
});

QUnit.test("on pojo, new simple value with writable/config/enum", function() {
  let obj = {};

  defineProperty(obj, 'foo', {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true
  });

  let descriptor = Object.getOwnPropertyDescriptor(obj, 'foo');

  equal(obj.foo, 1);
  deepEqual(descriptor, {
    value: 1,
    writable: true,
    enumerable: true,
    configurable: true
  });

  // TODO: this should be made to pass
  // equal(obj.__ember_meta__, undefined, 'should not have created an ember meta');
});


QUnit.test("on pojo, new get/set descriptor", function() {
  let obj = {};

  function get() { return 1; }
  function set() { }

  defineProperty(obj, 'foo', {
    get,
    set
  });

  let descriptor = Object.getOwnPropertyDescriptor(obj, 'foo');

  equal(obj.foo, 1);
  // TODO: test setter

  deepEqual(descriptor.get, get);
  deepEqual(descriptor.set, set);

  ok(!('value' in descriptor));
  ok(!descriptor.configurable);
  ok(!descriptor.enumerable);

  // TODO: this should be made to pass
  // equal(obj.__ember_meta__, undefined, 'should not have created an ember meta');
});

QUnit.test('computed property descriptor', function() {
  let obj = {};
  let callCount = 0;

  defineProperty(obj, 'foo', computed(function() {
    callCount++;
    return 1;
  }));

  equal(callCount, 0);
  equal(obj.foo, 1);
  equal(callCount, 1);

  // ensure idempotence
  equal(obj.foo, 1);
  equal(callCount, 1);

  let descriptor = Object.getOwnPropertyDescriptor(obj, 'foo');

  ok(!('value' in descriptor));
  ok(!descriptor.configurable);
  ok(!descriptor.enumerable);

  // TODO: this should be made to pass
  // equal(obj.__ember_meta__, undefined, 'should not have created an ember meta');
});

QUnit.module('Ember.deprecateProperty');

QUnit.test('enables access to deprecated property and returns the value of the new property', function() {
  expect(3);
  var obj = { foo: 'bar' };

  deprecateProperty(obj, 'baz', 'foo');

  expectDeprecation();
  equal(obj.baz, obj.foo, 'baz and foo are equal');

  obj.foo = 'blammo';
  equal(obj.baz, obj.foo, 'baz and foo are equal');
});

QUnit.test('deprecatedKey is not enumerable', function() {
  expect(2);
  var obj = { foo: 'bar', blammo: 'whammy' };

  deprecateProperty(obj, 'baz', 'foo');

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      notEqual(prop, 'baz');
    }
  }
});

QUnit.test('enables setter to deprecated property and updates the value of the new property', function() {
  expect(3);
  var obj = { foo: 'bar' };

  deprecateProperty(obj, 'baz', 'foo');

  expectDeprecation();
  obj.baz = 'bloop';
  equal(obj.foo, 'bloop', 'updating baz updates foo');
  equal(obj.baz, obj.foo, 'baz and foo are equal');
});
