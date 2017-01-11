import EmberObject, { Mixin, computed } from 'glimmer-object';
import { strip } from 'glimmer-test-helpers';

let moduleOptions;

QUnit.module('GlimmerObject.create', moduleOptions);

QUnit.test('simple properties are set', function() {
  let o = EmberObject.create({ ohai: 'there' });
  equal(o.get('ohai'), 'there');
});

QUnit.test('reopening a parent flushes the child', assert => {
  let MyClass = EmberObject.extend();

  let SubClass = MyClass.extend();

  MyClass.reopen({
    hello() {
      return "hello";
    }
  });

  let sub: any = SubClass.create();

  assert.equal(sub.hello(), "hello");
});

QUnit.test('reopening a parent flushes the child', assert => {
  let MyClass = EmberObject.extend({
    hello() {
      return "original hello";
    }
  });

  let SubClass = MyClass.extend({
    hello() {
      return this._super();
    }
  });

  let GrandChild = SubClass.extend({
    hello() {
      return this._super();
    }
  });

  MyClass.reopen({
    hello() {
      return this._super() + " new hello";
    }
  });

  let sub: any = GrandChild.create();

  assert.equal(sub.hello(), "original hello new hello");
});

QUnit.test('reopening a parent with a computed property flushes the child', assert => {
  let MyClass = EmberObject.extend({
    hello: computed(function() {
      return "original hello";
    })
  });

  let SubClass = MyClass.extend({
    hello: computed(function() {
      return this._super();
    })
  });

  let GrandChild = SubClass.extend({
    hello: computed(function() {
      return this._super();
    })
  });

  MyClass.reopen({
    hello: computed(function() {
      return this._super() + " new hello";
    })
  });

  let sub: any = GrandChild.create();

  assert.equal(sub.hello, "original hello new hello");
});

QUnit.test('calls computed property setters', assert => {
  let MyClass = EmberObject.extend({
    foo: computed({
      get: function() {
        return 'this is not the value you\'re looking for';
      },
      set: function(key, value) {
        return value;
      }
    })
  });

  let o = MyClass.create({ foo: 'bar' });
  assert.equal(o.get('foo'), 'bar');
});

QUnit.skip('allows bindings to be defined', function() {
  let obj = EmberObject.create({
    foo: 'foo',
    barBinding: 'foo'
  });

  equal(obj.get('bar'), 'foo', 'The binding value is correct');
});

QUnit.skip('calls setUnknownProperty if defined', function() {
  let setUnknownPropertyCalled = false;

  let MyClass = EmberObject.extend({
    setUnknownProperty(key, value) {
      setUnknownPropertyCalled = true;
    }
  });

  MyClass.create({ foo: 'bar' });
  ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});

QUnit.skip('throws if you try to define a computed property', assert => {
  assert.throws(function() {
    EmberObject.create({
      foo: computed(function() {})
    });
  }, strip`Ember.Object.create no longer supports defining computed properties.
           Define computed properties using extend() or reopen() before calling create().`);
});

QUnit.skip('throws if you try to call _super in a method', assert => {
  assert.throws(function() {
    EmberObject.create({
      foo() {
        this._super.apply(this, arguments);
      }
    });
  }, 'Ember.Object.create no longer supports defining methods that call _super.');
});

QUnit.skip('throws if you try to \'mixin\' a definition', assert => {
  let myMixin = Mixin.create({
    adder(arg1, arg2) {
      return arg1 + arg2;
    }
  });

  assert.throws(function() {
    EmberObject.create(myMixin);
  }, 'Ember.Object.create no longer supports mixing in other definitions, use .extend & .create seperately instead.');
});

// This test is for IE8.
QUnit.test('property name is the same as own prototype property', function() {
  let MyClass = EmberObject.extend({
    toString() { return 'MyClass'; }
  });

  equal(MyClass.create().toString(), 'MyClass', 'should inherit property from the arguments of `EmberObject.create`');
});

QUnit.test('inherits properties from passed in EmberObject', function() {
  let baseObj = EmberObject.create({ foo: 'bar' });
  let secondaryObj = EmberObject.create(baseObj);

  equal(secondaryObj['foo'], baseObj['foo'], 'Em.O.create inherits properties from EmberObject parameter');
});

QUnit.skip('throws if you try to pass anything a string as a parameter', function() {
  let expected = 'EmberObject.create only accepts an objects.';

  throws(function() {
    EmberObject.create('some-string');
  }, expected);
});

QUnit.skip('EmberObject.create can take undefined as a parameter', function() {
  let o = EmberObject.create(undefined);
  deepEqual(EmberObject.create(), o);
});

QUnit.skip('EmberObject.create can take null as a parameter', function() {
  let o = EmberObject.create(null);
  deepEqual(EmberObject.create(), o);
});
