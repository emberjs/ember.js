// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Ember.Object observer');

testBoth('observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = new MyClass();
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on subclass', function(get, set) {

  var MyClass = Ember.Object.extend({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var Subclass = MyClass.extend({
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'baz')
  });
  
  var obj = new Subclass();
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should not invoke observer after change');

});

testBoth('observer on instance', function(get, set) {

  var obj = Ember.Object.create({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 1, 'should invoke observer after change');

});

testBoth('observer on instance overridding class', function(get, set) {

  var MyClass = Ember.Object.extend({
    
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')

  });

  var obj = MyClass.create({
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'baz') // <-- change property we observe
  });
  
  equals(get(obj, 'count'), 0, 'should not invoke observer immediately');

  set(obj, 'bar', "BAZ");
  equals(get(obj, 'count'), 0, 'should not invoke observer after change');

  set(obj, 'baz', "BAZ");
  equals(get(obj, 'count'), 1, 'should not invoke observer after change');

});

testBoth('observer should not fire after being destroyed', function(get, set) {

  var obj = Ember.Object.create({
    count: 0,
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar')
  });

  equals(get(obj, 'count'), 0, 'precond - should not invoke observer immediately');

  Ember.run(function() { obj.destroy(); });

  if (Ember.platform.hasPropertyAccessors) {
    raises(function() {
      set(obj, 'bar', "BAZ");
    }, Error, "raises error when setting a property");
  } else {
    set(obj, 'bar', "BAZ");
  }

  equals(get(obj, 'count'), 0, 'should not invoke observer after change');
});
// ..........................................................
// COMPLEX PROPERTIES
// 


testBoth('chain observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });
  
  var obj1 = MyClass.create({
    bar: { baz: 'biff' }
  });
  
  var obj2 = MyClass.create({
    bar: { baz: 'biff2' }
  });
  
  equals(get(obj1, 'count'), 0, 'should not invoke yet');
  equals(get(obj2, 'count'), 0, 'should not invoke yet');
  
  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equals(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equals(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equals(get(obj1, 'count'), 1, 'should not invoke again');
  equals(get(obj2, 'count'), 1, 'should invoke observer on obj2');  
});


testBoth('chain observer on class', function(get, set) {

  var MyClass = Ember.Object.extend({
    count: 0,
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar.baz')
  });
  
  var obj1 = MyClass.create({
    bar: { baz: 'biff' }
  });
  
  var obj2 = MyClass.create({
    bar: { baz: 'biff2' },
    bar2: { baz: 'biff3' },
    
    foo: Ember.observer(function() {
      set(this, 'count', get(this, 'count')+1);
    }, 'bar2.baz')
  });
  
  equals(get(obj1, 'count'), 0, 'should not invoke yet');
  equals(get(obj2, 'count'), 0, 'should not invoke yet');
  
  set(get(obj1, 'bar'), 'baz', 'BIFF1');
  equals(get(obj1, 'count'), 1, 'should invoke observer on obj1');
  equals(get(obj2, 'count'), 0, 'should not invoke yet');

  set(get(obj2, 'bar'), 'baz', 'BIFF2');
  equals(get(obj1, 'count'), 1, 'should not invoke again');
  equals(get(obj2, 'count'), 0, 'should not invoke yet');  

  set(get(obj2, 'bar2'), 'baz', 'BIFF3');
  equals(get(obj1, 'count'), 1, 'should not invoke again');
  equals(get(obj2, 'count'), 1, 'should invoke observer on obj2');  
});
