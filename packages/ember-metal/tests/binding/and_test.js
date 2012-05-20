// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var MyApp, set = Ember.set, get = Ember.get;

module('binding/and', {
  setup: function() {
    MyApp = {
      foo: false,
      bar: false
    };
    
    Ember.run(function(){
      Ember.Binding.and("foo", "bar").to("baz").connect(MyApp);
      
    });
  },

  teardown: function() {
    MyApp = null;
  }
});

test('should return second item when both are truthy', function() {
  Ember.run(function(){
    set(MyApp, 'foo', true);
    set(MyApp, 'bar', 'BAR');
  });
  
  equal(get(MyApp, 'baz'), 'BAR', 'should be false');
});

test('should return false first item', function() {
  Ember.run(function(){
    set(MyApp, 'foo', 0);
    set(MyApp, 'bar', true);
  });
  equal(get(MyApp, 'baz'), 0, 'should be false');
});

test('should return false second item', function() {
  Ember.run(function(){
    set(MyApp, 'foo', true);
    set(MyApp, 'bar', 0);
  });
  equal(get(MyApp, 'baz'), 0, 'should be false');
});

test('should return first item when both are false', function() {
  Ember.run(function(){
    set(MyApp, 'foo', 0);
    set(MyApp, 'bar', null);
  });
  equal(get(MyApp, 'baz'), 0, 'should be false');
});
