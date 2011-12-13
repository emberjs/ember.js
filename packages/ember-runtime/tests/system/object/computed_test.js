// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-runtime/~tests/props_helper');

module('Ember.Object computed property');

testBoth('computed property on instance', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; }).cacheable()
  });
  
  equals(get(new MyClass(), 'foo'), 'FOO');
  
});


testBoth('computed property on subclass', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; }).cacheable()
  });
  
  var Subclass = MyClass.extend({
    foo: Ember.computed(function() { return 'BAR'; }).cacheable()
  });
  
  equals(get(new Subclass(), 'foo'), 'BAR');
  
});


testBoth('replacing computed property with regular val', function(get, set) {

  var MyClass = Ember.Object.extend({
    foo: Ember.computed(function() { return 'FOO'; }).cacheable()
  });
  
  var Subclass = MyClass.extend({
    foo: 'BAR'
  });
  
  equals(get(new Subclass(), 'foo'), 'BAR');
  
});

testBoth('complex depndent keys', function(get, set) {

  var MyClass = Ember.Object.extend({
    
    init: function() {
      this._super();
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0, 
    
    foo: Ember.computed(function() { 
      set(this, 'count', get(this, 'count')+1);
      return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count'); 
    }).property('bar.baz').cacheable()

  });
  
  var Subclass = MyClass.extend({
    count: 20
  });

  var obj1 = new MyClass(),
      obj2 = new Subclass();
      
  equals(get(obj1, 'foo'), 'BIFF 1');
  equals(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj1, 'bar'), 'baz', 'BLARG');
  
  equals(get(obj1, 'foo'), 'BLARG 2');
  equals(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj2, 'bar'), 'baz', 'BOOM');

  equals(get(obj1, 'foo'), 'BLARG 2');
  equals(get(obj2, 'foo'), 'BOOM 22');
});

testBoth('complex depndent keys changing complex dependent keys', function(get, set) {

  var MyClass = Ember.Object.extend({
    
    init: function() {
      this._super();
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0, 
    
    foo: Ember.computed(function() { 
      set(this, 'count', get(this, 'count')+1);
      return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count'); 
    }).property('bar.baz').cacheable()

  });
  
  var Subclass = MyClass.extend({
    
    init: function() {
      this._super();
      set(this, 'bar2', { baz: 'BIFF2' });
    },
    
    count: 0,
    
    foo: Ember.computed(function() {
      set(this, 'count', get(this, 'count')+1);
      return get(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
    }).property('bar2.baz').cacheable()
  });

  var obj2 = new Subclass();
      
  equals(get(obj2, 'foo'), 'BIFF2 1');

  set(get(obj2, 'bar'), 'baz', 'BLARG');
  equals(get(obj2, 'foo'), 'BIFF2 1', 'should not invalidate property');

  set(get(obj2, 'bar2'), 'baz', 'BLARG');
  equals(get(obj2, 'foo'), 'BLARG 2', 'should invalidate property');
});
