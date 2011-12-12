// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


module('system/mixin/binding_test');

test('Defining a property ending in Binding should setup binding when applied', function() {

  var MyMixin = Ember.Mixin.create({
    fooBinding: 'bar.baz'
  });
  
  var obj = { bar: { baz: 'BIFF' } };
  MyMixin.apply(obj);
  Ember.run.sync(); // let bindings sync...
  
  ok(Ember.get(obj, 'fooBinding') instanceof Ember.Binding, 'should be a binding object');
  equals(Ember.get(obj, 'foo'), 'BIFF', 'binding should be created and synced');
  
});

test('Defining a property ending in Binding should apply to prototype children', function() {

  var MyMixin = Ember.Mixin.create({
    fooBinding: 'bar.baz'
  });
  
  var obj = { bar: { baz: 'BIFF' } };
  MyMixin.apply(obj);

  var obj2 = Ember.create(obj);
  Ember.set(Ember.get(obj2, 'bar'), 'baz', 'BARG');
  
  Ember.run.sync(); // let bindings sync...
  
  ok(Ember.get(obj2, 'fooBinding') instanceof Ember.Binding, 'should be a binding object');
  equals(Ember.get(obj2, 'foo'), 'BARG', 'binding should be created and synced');
  
});
