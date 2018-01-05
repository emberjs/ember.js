import { setOwner } from 'ember-utils';
import {
  Descriptor,
  defineProperty,
  get,
  set,
  InjectedProperty
} from '..';

QUnit.module('InjectedProperty');

QUnit.test('injected properties should be descriptors', function(assert) {
  assert.ok(new InjectedProperty() instanceof Descriptor);
});

QUnit.test('injected properties should be overridable', function(assert) {
  let obj = {};
  defineProperty(obj, 'foo', new InjectedProperty());

  set(obj, 'foo', 'bar');

  assert.equal(get(obj, 'foo'), 'bar', 'should return the overridden value');
});

QUnit.test('getting on an object without an owner or container should fail assertion', function() {
  let obj = {};
  defineProperty(obj, 'foo', new InjectedProperty('type', 'name'));

  expectAssertion(function() {
    get(obj, 'foo');
  }, /Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container./);
});

QUnit.test('getting on an object without an owner but with a container should not fail', function(assert) {
  let obj = {
    container: {
      lookup(key) {
        assert.ok(true, 'should call container.lookup');
        return key;
      }
    }
  };

  defineProperty(obj, 'foo', new InjectedProperty('type', 'name'));

  assert.equal(get(obj, 'foo'), 'type:name', 'should return the value of container.lookup');
});

QUnit.test('getting should return a lookup on the container', function(assert) {
  assert.expect(2);

  let obj = {};

  setOwner(obj, {
    lookup(key) {
      assert.ok(true, 'should call container.lookup');
      return key;
    }
  });

  defineProperty(obj, 'foo', new InjectedProperty('type', 'name'));

  assert.equal(get(obj, 'foo'), 'type:name', 'should return the value of container.lookup');
});

QUnit.test('omitting the lookup name should default to the property name', function(assert) {
  let obj = {};

  setOwner(obj, {
    lookup(key) {
      return key;
    }
  });

  defineProperty(obj, 'foo', new InjectedProperty('type'));

  assert.equal(get(obj, 'foo'), 'type:foo', 'should lookup the type using the property name');
});
