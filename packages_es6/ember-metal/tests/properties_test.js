import Ember from 'ember-metal/core';
import {set} from 'ember-metal/property_set';
import {get} from 'ember-metal/property_get';
import {computed} from 'ember-metal/computed';
import {defineProperty} from "ember-metal/properties";

module('Ember.defineProperty');

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

