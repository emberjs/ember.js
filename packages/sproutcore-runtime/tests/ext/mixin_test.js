// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


module('system/mixin/binding_test');

test('Defining a property ending in Binding should setup binding when applied', function() {

  var MyMixin = SC.Mixin.create({
    fooBinding: 'bar.baz'
  });
  
  var obj = { bar: { baz: 'BIFF' } };
  MyMixin.apply(obj);
  SC.run.sync(); // let bindings sync...
  
  ok(SC.get(obj, 'fooBinding') instanceof SC.Binding, 'should be a binding object');
  equals(SC.get(obj, 'foo'), 'BIFF', 'binding should be created and synced');
  
});

test('Defining a property ending in Binding should apply to prototype children', function() {

  var MyMixin = SC.Mixin.create({
    fooBinding: 'bar.baz'
  });
  
  var obj = { bar: { baz: 'BIFF' } };
  MyMixin.apply(obj);

  var obj2 = SC.create(obj);
  SC.set(SC.get(obj2, 'bar'), 'baz', 'BARG');
  
  SC.run.sync(); // let bindings sync...
  
  ok(SC.get(obj2, 'fooBinding') instanceof SC.Binding, 'should be a binding object');
  equals(SC.get(obj2, 'foo'), 'BARG', 'binding should be created and synced');
  
});
