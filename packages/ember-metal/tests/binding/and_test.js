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
    Ember.Binding.and("foo", "bar").to("baz").connect(MyApp);
  },
  
  teardown: function() {
    MyApp = null;
  }
});

test('should return second item when both are truthy', function() {
  set(MyApp, 'foo', true);
  set(MyApp, 'bar', 'BAR');
  Ember.run.sync();
  equals(get(MyApp, 'baz'), 'BAR', 'should be false');
});

test('should return false first item', function() {
  set(MyApp, 'foo', 0);
  set(MyApp, 'bar', true);
  Ember.run.sync();
  equals(get(MyApp, 'baz'), 0, 'should be false');
});

test('should return false second item', function() {
  set(MyApp, 'foo', true);
  set(MyApp, 'bar', 0);
  Ember.run.sync();
  equals(get(MyApp, 'baz'), 0, 'should be false');
});

test('should return first item when both are false', function() {
  set(MyApp, 'foo', 0);
  set(MyApp, 'bar', null);
  Ember.run.sync();
  equals(get(MyApp, 'baz'), 0, 'should be false');
});
