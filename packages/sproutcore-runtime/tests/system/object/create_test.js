// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises TestObject */

module('Ember.Object.create');

test("Creates a new object that contains passed properties", function() {
  
  var called = false;
  var obj = Ember.Object.create({ 
    prop: 'FOO', 
    method: function() { called=true; }
  });

  //console.log(Ct.dump(obj));
  equals(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
  obj.method();
  ok(called, 'method executed');

});

// ..........................................................
// WORKING WITH MIXINS
// 

test("Creates a new object that includes mixins and properties", function() {
  
  var MixinA = Ember.Mixin.create({ mixinA: 'A' });
  var obj = Ember.Object.create(MixinA, { prop: 'FOO' });

  equals(Ember.get(obj, 'mixinA'), 'A', 'obj.mixinA');
  equals(Ember.get(obj, 'prop'), 'FOO', 'obj.prop');
});

// ..........................................................
// LIFECYCLE
// 

test("Configures _super() on methods with override", function() {
  var completed = false;
  var MixinA = Ember.Mixin.create({ method: function() {} });
  var obj = Ember.Object.create(MixinA, {
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
  var obj = Ember.Object.create({
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
  
  Ember.Object.create(Mixin1, Mixin2);
  equals(completed, 2, 'should have called init for both mixins.');
});

test('creating an object with required properties', function() {
  var ClassA = Ember.Object.extend({
    foo: Ember.required()
  });
  
  var obj = ClassA.create({ foo: 'FOO' }); // should not throw
  equals(Ember.get(obj,'foo'), 'FOO');
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

    valueDidChange: Ember.observer(function() {
      this._count++;
    }, 'value')
  });
  
  var obj = CountObject.create({ value: 'foo' });
  equals(obj._count, 0, 'should not fire yet');
  
  Ember.set(obj, 'value', 'BAR');
  equals(obj._count, 1, 'should fire');
});

test('bindings on a class should only sync on instances', function() {
  TestObject = Ember.Object.create({
    foo: 'FOO'
  });

  var Class, inst;
  
  Ember.run(function() {
    Class = Ember.Object.extend({
      fooBinding: 'TestObject.foo'
    });

    inst = Class.create();
  });
  
  equals(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding');
  equals(Ember.get(inst, 'foo'), 'FOO', 'should sync binding');

});


test('inherited bindings should only sync on instances', function() {
  TestObject = Ember.Object.create({
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
    inst = Subclass.create();
  });
  
  equals(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equals(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equals(Ember.get(inst, 'foo'), 'FOO', 'should sync binding on inst');
  
  Ember.run(function() {
    Ember.set(TestObject, 'foo', 'BAR');
  });
  
  equals(Ember.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equals(Ember.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equals(Ember.get(inst, 'foo'), 'BAR', 'should sync binding on inst');
  
});

test("created objects should not share a guid with their superclass", function() {
  ok(Ember.guidFor(Ember.Object), "Ember.Object has a guid");

  var objA = Ember.Object.create(),
      objB = Ember.Object.create();

  ok(Ember.guidFor(objA) !== Ember.guidFor(objB), "two instances do not share a guid");
});
