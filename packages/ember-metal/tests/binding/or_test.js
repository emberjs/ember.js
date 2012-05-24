// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var MyApp, set = Ember.set, get = Ember.get;

module('binding/or', {
  setup: function() {
    MyApp = {
      foo: false,
      bar: false
    };
    Ember.run(function(){
      Ember.Binding.or("foo", "bar").to("baz").connect(MyApp);
    });
    
  },

  teardown: function() {
    MyApp = null;
  }
});

test('should return first item when both are truthy', function() {
  Ember.run(function(){
    set(MyApp, 'foo', 'FOO');
    set(MyApp, 'bar', 'BAR');
  });
  
  equal(get(MyApp, 'baz'), 'FOO', 'should be false');
});

test('should return true first item', function() {
  Ember.run(function(){
    set(MyApp, 'foo', 1);
    set(MyApp, 'bar', false);
  });
  
  equal(get(MyApp, 'baz'), 1, 'should be false');
});

test('should return true second item', function() {
  Ember.run(function(){
    set(MyApp, 'foo', false);
    set(MyApp, 'bar', 10);
  });
  
  equal(get(MyApp, 'baz'), 10, 'should be false');
});

test('should return second item when both are false', function() {
  Ember.run(function(){
    set(MyApp, 'foo', null);
    set(MyApp, 'bar', 0);
  });
  
  equal(get(MyApp, 'baz'), 0, 'should be false');
});
