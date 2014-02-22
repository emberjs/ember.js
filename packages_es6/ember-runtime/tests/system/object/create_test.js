import Ember from "ember-metal/core";
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import {guidFor} from "ember-metal/utils";
import {computed} from "ember-metal/computed";
import {required, Mixin, observer} from "ember-metal/mixin";
import run from "ember-metal/run_loop";
import {on} from "ember-metal/events";
import EmberObject from "ember-runtime/system/object";

var moduleOptions, originalLookup;

moduleOptions = {
  setup: function(){
    originalLookup = Ember.lookup;
    Ember.lookup = {};
  },

  teardown: function(){
    Ember.lookup = originalLookup;
  }
};

module('EmberObject.create', moduleOptions);

test("simple properties are set", function() {
  var o = EmberObject.create({ohai: 'there'});
  equal(o.get('ohai'), 'there');
});

test("calls computed property setters", function() {
  var MyClass = EmberObject.extend({
    foo: computed(function(key, val) {
      if (arguments.length === 2) { return val; }
      return "this is not the value you're looking for";
    })
  });

  var o = MyClass.create({foo: 'bar'});
  equal(o.get('foo'), 'bar');
});

if (Ember.ENV.MANDATORY_SETTER) {
  test("sets up mandatory setters for watched simple properties", function() {

    var MyClass = EmberObject.extend({
      foo: null,
      bar: null,
      fooDidChange: observer('foo', function() {})
    });

    var o = MyClass.create({foo: 'bar', bar: 'baz'});
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

test("allows bindings to be defined", function() {
  var obj = EmberObject.create({
    foo: 'foo',
    barBinding: 'foo'
  });

  equal(obj.get('bar'), 'foo', 'The binding value is correct');
});

test("calls setUnknownProperty if defined", function() {
  var setUnknownPropertyCalled = false;

  var MyClass = EmberObject.extend({
    setUnknownProperty: function(key, value) {
      setUnknownPropertyCalled = true;
    }
  });

  var o = MyClass.create({foo: 'bar'});
  ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});

test("throws if you try to define a computed property", function() {
  expectAssertion(function() {
    EmberObject.create({
      foo: computed(function() {})
    });
  }, 'Ember.Object.create no longer supports defining computed properties. Define computed properties using extend() or reopen() before calling create().');
});

test("throws if you try to call _super in a method", function() {
  expectAssertion(function() {
     EmberObject.create({
      foo: function() {
        this._super();
      }
    });
  }, 'Ember.Object.create no longer supports defining methods that call _super.');
});

test("throws if you try to 'mixin' a definition", function() {
  var myMixin = Mixin.create({
    adder: function(arg1, arg2) {
      return arg1 + arg2;
    }
  });

  expectAssertion(function() {
    var o = EmberObject.create(myMixin);
  }, "Ember.Object.create no longer supports mixing in other definitions, use createWithMixins instead.");
});

// This test is for IE8.
test("property name is the same as own prototype property", function() {
  var MyClass = EmberObject.extend({
    toString: function() { return 'MyClass'; }
  });

  equal(MyClass.create().toString(), 'MyClass', "should inherit property from the arguments of `EmberObject.create`");
});

test("inherits properties from passed in EmberObject", function() {
  var baseObj = EmberObject.create({ foo: 'bar' }),
      secondaryObj = EmberObject.create(baseObj);

  equal(secondaryObj.foo, baseObj.foo, "Em.O.create inherits properties from EmberObject parameter");
});

test("throws if you try to pass anything a string as a parameter", function(){
  var expected = "EmberObject.create only accepts an objects.";

  throws(function() {
    var o = EmberObject.create("some-string");
  }, expected);
});

test("EmberObject.create can take undefined as a parameter", function(){
  var o = EmberObject.create(undefined);
  deepEqual(EmberObject.create(), o);
});

test("EmberObject.create can take null as a parameter", function(){
  var o = EmberObject.create(null);
  deepEqual(EmberObject.create(), o);
});

module('EmberObject.createWithMixins', moduleOptions);

test("Creates a new object that contains passed properties", function() {

  var called = false;
  var obj = EmberObject.createWithMixins({
    prop: 'FOO',
    method: function() { called=true; }
  });

  equal(get(obj, 'prop'), 'FOO', 'obj.prop');
  obj.method();
  ok(called, 'method executed');
});

// ..........................................................
// WORKING WITH MIXINS
//

test("Creates a new object that includes mixins and properties", function() {

  var MixinA = Mixin.create({ mixinA: 'A' });
  var obj = EmberObject.createWithMixins(MixinA, { prop: 'FOO' });

  equal(get(obj, 'mixinA'), 'A', 'obj.mixinA');
  equal(get(obj, 'prop'), 'FOO', 'obj.prop');
});

// ..........................................................
// LIFECYCLE
//

test("Configures _super() on methods with override", function() {
  var completed = false;
  var MixinA = Mixin.create({ method: function() {} });
  var obj = EmberObject.createWithMixins(MixinA, {
    method: function() {
      this._super();
      completed = true;
    }
  });

  obj.method();
  ok(completed, 'should have run method without error');
});

test("Calls init if defined", function() {
  var completed = false;
  var obj = EmberObject.createWithMixins({
    init: function() {
      this._super();
      completed = true;
    }
  });

  ok(completed, 'should have run init without error');
});

test("Calls all mixin inits if defined", function() {
  var completed = 0;
  var Mixin1 = Mixin.create({
    init: function() { this._super(); completed++; }
  });

  var Mixin2 = Mixin.create({
    init: function() { this._super(); completed++; }
  });

  EmberObject.createWithMixins(Mixin1, Mixin2);
  equal(completed, 2, 'should have called init for both mixins.');
});

test("Triggers init", function() {
  var completed = false;
  var obj = EmberObject.createWithMixins({
    markAsCompleted: on("init", function(){
      completed = true;
    })
  });

  ok(completed, 'should have triggered init which should have run markAsCompleted');
});

test('creating an object with required properties', function() {
  var ClassA = EmberObject.extend({
    foo: required()
  });

  var obj = ClassA.createWithMixins({ foo: 'FOO' }); // should not throw
  equal(get(obj,'foo'), 'FOO');
});


// ..........................................................
// BUGS
//

test('create should not break observed values', function() {

  var CountObject = EmberObject.extend({
    value: null,

    _count: 0,

    reset: function() {
      this._count = 0;
      return this;
    },

    valueDidChange: observer('value', function() {
      this._count++;
    })
  });

  var obj = CountObject.createWithMixins({ value: 'foo' });
  equal(obj._count, 0, 'should not fire yet');

  set(obj, 'value', 'BAR');
  equal(obj._count, 1, 'should fire');
});

test('bindings on a class should only sync on instances', function() {
  Ember.lookup['TestObject'] = EmberObject.createWithMixins({
    foo: 'FOO'
  });

  var Class, inst;

  run(function() {
    Class = EmberObject.extend({
      fooBinding: 'TestObject.foo'
    });

    inst = Class.createWithMixins();
  });

  equal(get(Class.prototype, 'foo'), undefined, 'should not sync binding');
  equal(get(inst, 'foo'), 'FOO', 'should sync binding');

});


test('inherited bindings should only sync on instances', function() {
  var TestObject;

  Ember.lookup['TestObject'] = TestObject = EmberObject.createWithMixins({
    foo: 'FOO'
  });

  var Class, Subclass, inst;

  run(function() {
    Class = EmberObject.extend({
      fooBinding: 'TestObject.foo'
    });
  });

  run(function() {
    Subclass = Class.extend();
    inst = Subclass.createWithMixins();
  });

  equal(get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(get(inst, 'foo'), 'FOO', 'should sync binding on inst');

  run(function() {
    set(TestObject, 'foo', 'BAR');
  });

  equal(get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(get(inst, 'foo'), 'BAR', 'should sync binding on inst');

});

test("created objects should not share a guid with their superclass", function() {
  ok(guidFor(EmberObject), "EmberObject has a guid");

  var objA = EmberObject.createWithMixins(),
      objB = EmberObject.createWithMixins();

  ok(guidFor(objA) !== guidFor(objB), "two instances do not share a guid");
});
