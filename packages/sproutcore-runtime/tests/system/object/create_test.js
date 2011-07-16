// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises TestObject */

module('SC.Object.create');

test("Creates a new object that contains passed properties", function() {
  
  var called = false;
  var obj = SC.Object.create({ 
    prop: 'FOO', 
    method: function() { called=true; }
  });

  //console.log(Ct.dump(obj));
  equals(SC.get(obj, 'prop'), 'FOO', 'obj.prop');
  obj.method();
  ok(called, 'method executed');

});

// ..........................................................
// WORKING WITH MIXINS
// 

test("Creates a new object that includes mixins and properties", function() {
  
  var MixinA = SC.Mixin.create({ mixinA: 'A' });
  var obj = SC.Object.create(MixinA, { prop: 'FOO' });

  equals(SC.get(obj, 'mixinA'), 'A', 'obj.mixinA');
  equals(SC.get(obj, 'prop'), 'FOO', 'obj.prop');
});

// ..........................................................
// LIFECYCLE
// 

test("Configures _super() on methods with override", function() {
  var completed = false;
  var MixinA = SC.Mixin.create({ method: function() {} });
  var obj = SC.Object.create(MixinA, {
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
  var obj = SC.Object.create({
    init: function() {
      this._super();
      completed = true;
    }
  });
  
  ok(completed, 'should have run init without error');
});

test("Calls all mixin inits if defined", function() {
  var completed = 0;
  var Mixin1 = SC.Mixin.create({ 
    init: function() { this._super(); completed++; } 
  });
  
  var Mixin2 = SC.Mixin.create({ 
    init: function() { this._super(); completed++; } 
  });
  
  SC.Object.create(Mixin1, Mixin2);
  equals(completed, 2, 'should have called init for both mixins.');
});

test('creating an object with required properties', function() {
  var ClassA = SC.Object.extend({
    foo: SC.required()
  });
  
  var obj = ClassA.create({ foo: 'FOO' }); // should not throw
  equals(SC.get(obj,'foo'), 'FOO');
});


// ..........................................................
// BUGS
// 

test('create should not break observed values', function() {
  
  var CountObject = SC.Object.extend({
    value: null,

    _count: 0,

    reset: function() {  
      this._count = 0;
      return this;
    },

    valueDidChange: SC.observer(function() {
      this._count++;
    }, 'value')
  });
  
  var obj = CountObject.create({ value: 'foo' });
  equals(obj._count, 0, 'should not fire yet');
  
  SC.set(obj, 'value', 'BAR');
  equals(obj._count, 1, 'should fire');
});

test('bindings on a class should only sync on instances', function() {
  TestObject = SC.Object.create({
    foo: 'FOO'
  });

  var Class, inst;
  
  SC.run(function() {
    Class = SC.Object.extend({
      fooBinding: 'TestObject.foo'
    });

    inst = Class.create();
  });
  
  equals(SC.get(Class.prototype, 'foo'), undefined, 'should not sync binding');
  equals(SC.get(inst, 'foo'), 'FOO', 'should sync binding');

});


test('inherited bindings should only sync on instances', function() {
  TestObject = SC.Object.create({
    foo: 'FOO'
  });

  var Class, Subclass, inst;

  SC.run(function() {
    Class = SC.Object.extend({
      fooBinding: 'TestObject.foo'
    });
  });
  
  SC.run(function() {
    Subclass = Class.extend();
    inst = Subclass.create();
  });
  
  equals(SC.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equals(SC.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equals(SC.get(inst, 'foo'), 'FOO', 'should sync binding on inst');
  
  SC.run(function() {
    SC.set(TestObject, 'foo', 'BAR');
  });
  
  equals(SC.get(Class.prototype, 'foo'), undefined, 'should not sync binding on Class');
  equals(SC.get(Subclass.prototype, 'foo'), undefined, 'should not sync binding on Subclass');
  equals(SC.get(inst, 'foo'), 'BAR', 'should sync binding on inst');
  
});

test("created objects should not share a guid with their superclass", function() {
  ok(SC.guidFor(SC.Object), "SC.Object has a guid");

  var objA = SC.Object.create(),
      objB = SC.Object.create();

  ok(SC.guidFor(objA) !== SC.guidFor(objB), "two instances do not share a guid");
});
