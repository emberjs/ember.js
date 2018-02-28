import {
  computed,
  Mixin,
  observer
} from 'ember-metal';
import { MANDATORY_SETTER } from 'ember/features';
import EmberObject from '../../../system/object';

QUnit.module('EmberObject.create', {});

QUnit.test('simple properties are set', function(assert) {
  let o = EmberObject.create({ ohai: 'there' });
  assert.equal(o.get('ohai'), 'there');
});

QUnit.test('calls computed property setters', function(assert) {
  let MyClass = EmberObject.extend({
    foo: computed({
      get() {
        return 'this is not the value you\'re looking for';
      },
      set(key, value) {
        return value;
      }
    })
  });

  let o = MyClass.create({ foo: 'bar' });
  assert.equal(o.get('foo'), 'bar');
});

if (MANDATORY_SETTER) {
  QUnit.test('sets up mandatory setters for watched simple properties', function(assert) {
    let MyClass = EmberObject.extend({
      foo: null,
      bar: null,
      fooDidChange: observer('foo', function() {})
    });

    let o = MyClass.create({ foo: 'bar', bar: 'baz' });
    assert.equal(o.get('foo'), 'bar');

    let descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
    assert.ok(descriptor.set, 'Mandatory setter was setup');

    descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
    assert.ok(!descriptor.set, 'Mandatory setter was not setup');
  });
}

QUnit.test('calls setUnknownProperty if defined', function(assert) {
  let setUnknownPropertyCalled = false;

  let MyClass = EmberObject.extend({
    setUnknownProperty(/* key, value */) {
      setUnknownPropertyCalled = true;
    }
  });

  MyClass.create({ foo: 'bar' });
  assert.ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});

QUnit.test('throws if you try to define a computed property', function() {
  expectAssertion(function() {
    EmberObject.create({
      foo: computed(function() {})
    });
  }, 'EmberObject.create no longer supports defining computed properties. Define computed properties using extend() or reopen() before calling create().');
});

QUnit.test('throws if you try to call _super in a method', function() {
  expectAssertion(function() {
    EmberObject.create({
      foo() {
        this._super(...arguments);
      }
    });
  }, 'EmberObject.create no longer supports defining methods that call _super.');
});

QUnit.test('throws if you try to \'mixin\' a definition', function() {
  let myMixin = Mixin.create({
    adder(arg1, arg2) {
      return arg1 + arg2;
    }
  });

  expectAssertion(function() {
    EmberObject.create(myMixin);
  }, 'EmberObject.create no longer supports mixing in other definitions, use .extend & .create separately instead.');
});

QUnit.test('inherits properties from passed in EmberObject', function(assert) {
  let baseObj = EmberObject.create({ foo: 'bar' });
  let secondaryObj = EmberObject.create(baseObj);

  assert.equal(secondaryObj.foo, baseObj.foo, 'Em.O.create inherits properties from EmberObject parameter');
});

QUnit.test('throws if you try to pass anything a string as a parameter', function() {
  let expected = 'EmberObject.create only accepts objects.';

  expectAssertion(() => EmberObject.create('some-string'), expected);
});

QUnit.test('EmberObject.create can take undefined as a parameter', function(assert) {
  let o = EmberObject.create(undefined);
  assert.deepEqual(EmberObject.create(), o);
});
