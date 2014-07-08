import Ember from 'ember-metal/core';
import { platform } from "ember-metal/platform";
import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';
import { defineProperty,
         deprecateProperty
} from "ember-metal/properties";

QUnit.module('Ember.defineProperty');

test('toString', function() {

  var obj = {};
  defineProperty(obj, 'toString', undefined, function() { return 'FOO'; });
  equal(obj.toString(), 'FOO', 'should replace toString');
});

test("for data properties, didDefineProperty hook should be called if implemented", function() {
  expect(2);

  var obj = {
    didDefineProperty: function(obj, keyName, value) {
      equal(keyName, 'foo', "key name should be foo");
      equal(value, 'bar', "value should be bar");
    }
  };

  defineProperty(obj, 'foo', undefined, "bar");
});

test("for descriptor properties, didDefineProperty hook should be called if implemented", function() {
  expect(2);

  var computedProperty = computed(Ember.K);

  var obj = {
    didDefineProperty: function(obj, keyName, value) {
      equal(keyName, 'foo', "key name should be foo");
      strictEqual(value, computedProperty, "value should be passed descriptor");
    }
  };

  defineProperty(obj, 'foo', computedProperty);
});

if (platform.hasPropertyAccessors) {

  QUnit.module('Ember.deprecateProperty');

  test("enables access to deprecated property and returns the value of the new property", function() {
    expect(3);
    var obj = {foo: 'bar'};

    deprecateProperty(obj, 'baz', 'foo');

    expectDeprecation();
    equal(obj.baz, obj.foo, 'baz and foo are equal');

    obj.foo = 'blammo';
    equal(obj.baz, obj.foo, 'baz and foo are equal');
  });

  test("deprecatedKey is not enumerable", function() {
    expect(2);
    var obj = {foo: 'bar', blammo: 'whammy'};

    deprecateProperty(obj, 'baz', 'foo');

    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        notEqual(prop, 'baz');
      }
    }
  });

  test("enables setter to deprecated property and updates the value of the new property", function() {
    expect(3);
    var obj = {foo: 'bar'};

    deprecateProperty(obj, 'baz', 'foo');

    expectDeprecation();
    obj.baz = 'bloop';
    equal(obj.foo, 'bloop', 'updating baz updates foo');
    equal(obj.baz, obj.foo, 'baz and foo are equal');
  });
}
