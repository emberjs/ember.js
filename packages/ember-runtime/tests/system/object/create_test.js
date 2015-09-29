import Ember from 'ember-metal/core'; // lookup
import isEnabled from 'ember-metal/features';
import {computed} from 'ember-metal/computed';
import {Mixin, observer} from 'ember-metal/mixin';
import EmberObject from 'ember-runtime/system/object';

var moduleOptions, originalLookup;

moduleOptions = {
  setup() {
    originalLookup = Ember.lookup;
    Ember.lookup = {};
  },

  teardown() {
    Ember.lookup = originalLookup;
  }
};

QUnit.module('EmberObject.create', moduleOptions);

QUnit.test('simple properties are set', function() {
  var o = EmberObject.create({ ohai: 'there' });
  equal(o.get('ohai'), 'there');
});

QUnit.test('calls computed property setters', function() {
  var MyClass = EmberObject.extend({
    foo: computed({
      get: function() {
        return 'this is not the value you\'re looking for';
      },
      set: function(key, value) {
        return value;
      }
    })
  });

  var o = MyClass.create({ foo: 'bar' });
  equal(o.get('foo'), 'bar');
});

if (isEnabled('mandatory-setter')) {
  QUnit.test('sets up mandatory setters for watched simple properties', function() {
    var MyClass = EmberObject.extend({
      foo: null,
      bar: null,
      fooDidChange: observer('foo', function() {})
    });

    var o = MyClass.create({ foo: 'bar', bar: 'baz' });
    equal(o.get('foo'), 'bar');

    // Catch IE8 where Object.getOwnPropertyDescriptor exists but only works on DOM elements
    try {
      Object.getOwnPropertyDescriptor({}, 'foo');
    } catch(e) {
      return;
    }

    var descriptor = Object.getOwnPropertyDescriptor(o, 'foo');
    ok(descriptor.set, 'Mandatory setter was setup');

    descriptor = Object.getOwnPropertyDescriptor(o, 'bar');
    ok(!descriptor.set, 'Mandatory setter was not setup');
  });
}

QUnit.test('allows bindings to be defined', function() {
  var obj = EmberObject.create({
    foo: 'foo',
    barBinding: 'foo'
  });

  equal(obj.get('bar'), 'foo', 'The binding value is correct');
});

QUnit.test('calls setUnknownProperty if defined', function() {
  var setUnknownPropertyCalled = false;

  var MyClass = EmberObject.extend({
    setUnknownProperty(key, value) {
      setUnknownPropertyCalled = true;
    }
  });

  MyClass.create({ foo: 'bar' });
  ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});

QUnit.test('throws if you try to define a computed property', function() {
  expectAssertion(function() {
    EmberObject.create({
      foo: computed(function() {})
    });
  }, 'Ember.Object.create no longer supports defining computed properties. Define computed properties using extend() or reopen() before calling create().');
});

QUnit.test('throws if you try to call _super in a method', function() {
  expectAssertion(function() {
    EmberObject.create({
      foo() {
        this._super.apply(this, arguments);
      }
    });
  }, 'Ember.Object.create no longer supports defining methods that call _super.');
});

QUnit.test('throws if you try to \'mixin\' a definition', function() {
  var myMixin = Mixin.create({
    adder(arg1, arg2) {
      return arg1 + arg2;
    }
  });

  expectAssertion(function() {
    EmberObject.create(myMixin);
  }, 'Ember.Object.create no longer supports mixing in other definitions, use .extend & .create seperately instead.');
});

// This test is for IE8.
QUnit.test('property name is the same as own prototype property', function() {
  var MyClass = EmberObject.extend({
    toString() { return 'MyClass'; }
  });

  equal(MyClass.create().toString(), 'MyClass', 'should inherit property from the arguments of `EmberObject.create`');
});

QUnit.test('inherits properties from passed in EmberObject', function() {
  var baseObj = EmberObject.create({ foo: 'bar' });
  var secondaryObj = EmberObject.create(baseObj);

  equal(secondaryObj.foo, baseObj.foo, 'Em.O.create inherits properties from EmberObject parameter');
});

QUnit.test('throws if you try to pass anything a string as a parameter', function() {
  var expected = 'EmberObject.create only accepts an objects.';

  throws(function() {
    EmberObject.create('some-string');
  }, expected);
});

QUnit.test('EmberObject.create can take undefined as a parameter', function() {
  var o = EmberObject.create(undefined);
  deepEqual(EmberObject.create(), o);
});

QUnit.test('EmberObject.create can take null as a parameter', function() {
  var o = EmberObject.create(null);
  deepEqual(EmberObject.create(), o);
});
