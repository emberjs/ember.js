/*globals TestObject:true */

module('Ember.Object.create');

test("simple properties are set", function() {
  var o = Ember.Object.create({ohai: 'there'});
  equal(o.get('ohai'), 'there');
});

test("calls computed property setters", function() {
  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function(key, val) {
      if (arguments.length === 2) { return val; }
      return "this is not the value you're looking for";
    })
  });

  var o = MyClass.create({foo: 'bar'});
  equal(o.get('foo'), 'bar');
});

test("sets up mandatory setters for watched simple properties", function() {
  var MyClass = Ember.Object.extend({
    foo: null,
    bar: null,
    fooDidChange: Ember.observer('foo', function() {})
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

test("allows bindings to be defined", function() {
  var obj = Ember.Object.create({
    foo: 'foo',
    barBinding: 'foo'
  });

  equal(obj.get('bar'), 'foo', 'The binding value is correct');
});

test("calls setUnknownProperty if defined", function() {
  var setUnknownPropertyCalled = false;

  var MyClass = Ember.Object.extend({
    setUnknownProperty: function(key, value) {
      setUnknownPropertyCalled = true;
    }
  });

  var o = MyClass.create({foo: 'bar'});
  ok(setUnknownPropertyCalled, 'setUnknownProperty was called');
});

test("throws if you try to define a computed property", function() {
  expectAssertion(function() {
    Ember.Object.create({
      foo: Ember.computed(function() {})
    });
  }, 'Ember.Object.create no longer supports defining computed properties.');
});

test("throws if you try to call _super in a method", function() {
  expectAssertion(function() {
     Ember.Object.create({
      foo: function() {
        this._super();
      }
    });
  }, 'Ember.Object.create no longer supports defining methods that call _super.');
});

test("throws if you try to 'mixin' a definition", function() {
  var myMixin = Ember.Mixin.create({
    adder: function(arg1, arg2) {
      return arg1 + arg2;
    }
  });

  expectAssertion(function() {
    var o = Ember.Object.create(myMixin);
  }, "Ember.Object.create no longer supports mixing in other definitions, use createWithMixins instead.");
});

// This test is for IE8.
test("property name is the same as own prototype property", function() {
  var MyClass = Ember.Object.extend({
    toString: function() { return 'MyClass'; }
  });

  equal(MyClass.create().toString(), 'MyClass', "should inherit property from the arguments of `Ember.Object.create`");
});

test("inherits properties from passed in Ember.Object", function() {
  var baseObj = Ember.Object.create({ foo: 'bar' }),
      secondaryObj = Ember.Object.create(baseObj);

  equal(secondaryObj.foo, baseObj.foo, "Em.O.create inherits properties from Ember.Object parameter");
});

test("throws if you try to pass anything a string as a parameter", function(){
  var expected = "Ember.Object.create only accepts an objects.";

  throws(function() {
    var o = Ember.Object.create("some-string");
  }, expected);
});

test("Ember.Object.create can take undefined as a parameter", function(){
  var o = Ember.Object.create(undefined);
  deepEqual(Ember.Object.create(), o);
});

test("Ember.Object.create can take null as a parameter", function(){
  var o = Ember.Object.create(null);
  deepEqual(Ember.Object.create(), o);
});

module('Ember.Object.createWithMixins');

test("Creates a new object that contains passed properties", function() {

  var called = false;
  var obj = Ember.Object.createWithMixins({
    prop: 'FOO',
    method: function() { called=true; }
  });

  equal(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
  obj.method();
  ok(called, 'method executed');
});

// ..........................................................
// WORKING WITH MIXINS
//

test("Creates a new object that includes mixins and properties", function() {

  var MixinA = Ember.Mixin.create({ mixinA: 'A' });
  var obj = Ember.Object.createWithMixins(MixinA, { prop: 'FOO' });

  equal(Ember.get(obj, 'mixinA'), 'A', 'obj.mixinA');
  equal(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
});

// ..........................................................
// LIFECYCLE
//

test("Configures _super() on methods with override", function() {
  var completed = false;
  var MixinA = Ember.Mixin.create({ method: function() {} });
  var obj = Ember.Object.createWithMixins(MixinA, {
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
  var obj = Ember.Object.createWithMixins({
    init: function() {
      this._super();
      completed = true;
    }
  });

  ok(completed, 'should have run init without error');
});

test("Calls all mixin inits if defined", function() {
  var completed = 0;
  var Mixin1 = Ember.Mixin.create({
    init: function() { this._super(); completed++; }
  });

  var Mixin2 = Ember.Mixin.create({
    init: function() { this._super(); completed++; }
  });

  Ember.Object.createWithMixins(Mixin1, Mixin2);
  equal(completed, 2, 'should have called init for both mixins.');
});

test("Triggers init", function() {
  var completed = false;
  var obj = Ember.Object.createWithMixins({
    markAsCompleted: Ember.on("init", function(){
      completed = true;
    })
  });

  ok(completed, 'should have triggered init which should have run markAsCompleted');
});

test('creating an object with required properties', function() {
  var ClassA = Ember.Object.extend({
    foo: Ember.required()
  });

  var obj = ClassA.createWithMixins({ foo: 'FOO' }); // should not throw
  equal(Ember.get(obj,'foo'), 'FOO');
});


// ..........................................................
// BUGS
//

test('create should not break observed values', function() {

  var CountObject = Ember.Object.extend({
    value: null,

    _count: 0,

    reset: function() {
      this._count = 0;
      return this;
    },

    valueDidChange: Ember.observer('value', function() {
      this._count++;
    })
  });

  var obj = CountObject.createWithMixins({ value: 'foo' });
  equal(obj._count, 0, 'should not fire yet');

  Ember.set(obj, 'value', 'BAR');
  equal(obj._count, 1, 'should fire');
});

test('bindings on a class should only sync on instances', function() {
  TestObject = Ember.Object.createWithMixins({
    foo: 'FOO'
  });

  var Class, inst;

  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });

    inst = Class.createWithMixins();
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding');
  equal(Ember.get(inst, 'foo'), 'FOO', 'should sync binding');

});


test('inherited bindings should only sync on instances', function() {
  TestObject = Ember.Object.createWithMixins({
    foo: 'FOO'
  });

  var Class, Subclass, inst;

  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });
  });

  Ember.run(function() {
    Subclass = Class.extend();
    inst = Subclass.createWithMixins();
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(Ember.get(inst, 'foo'), 'FOO', 'should sync binding on inst');

  Ember.run(function() {
    Ember.set(TestObject, 'foo', 'BAR');
  });

  equal(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equal(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equal(Ember.get(inst, 'foo'), 'BAR', 'should sync binding on inst');

});

test("created objects should not share a guid with their superclass", function() {
  ok(Ember.guidFor(Ember.Object), "Ember.Object has a guid");

  var objA = Ember.Object.createWithMixins(),
      objB = Ember.Object.createWithMixins();

  ok(Ember.guidFor(objA) !== Ember.guidFor(objB), "two instances do not share a guid");
});
