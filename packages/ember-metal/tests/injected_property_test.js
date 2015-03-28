import {
  Descriptor,
  defineProperty
} from "ember-metal/properties";
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import InjectedProperty from "ember-metal/injected_property";

QUnit.module('InjectedProperty');

QUnit.test('injected properties should be descriptors', function() {
  ok(new InjectedProperty() instanceof Descriptor);
});

QUnit.test('injected properties should be overridable', function() {
  var obj = {};
  defineProperty(obj, 'foo', new InjectedProperty());

  set(obj, 'foo', 'bar');

  equal(get(obj, 'foo'), 'bar', 'should return the overriden value');
});

QUnit.test("getting on an object without a container should fail assertion", function() {
  var obj = {};
  defineProperty(obj, 'foo', new InjectedProperty('type', 'name'));

  expectAssertion(function() {
    get(obj, 'foo');
  }, /Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container./);
});

QUnit.test("getting should return a lookup on the container", function() {
  expect(2);

  var obj = {
    container: {
      lookup(key) {
        ok(true, 'should call container.lookup');
        return key;
      }
    }
  };
  defineProperty(obj, 'foo', new InjectedProperty('type', 'name'));

  equal(get(obj, 'foo'), 'type:name', 'should return the value of container.lookup');
});

QUnit.test("omitting the lookup name should default to the property name", function() {
  var obj = {
    container: {
      lookup(key) {
        return key;
      }
    }
  };
  defineProperty(obj, 'foo', new InjectedProperty('type'));

  equal(get(obj, 'foo'), 'type:foo', 'should lookup the type using the property name');
});
