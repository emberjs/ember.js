// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var MyApp, set = SC.set, get = SC.get;

module('binding/and', {
  setup: function() {
    MyApp = SC.Object.create({
      foo: false,
      bar: false,
      bazBinding: SC.Binding.and('foo', 'bar')
    });
  },
  
  teardown: function() {
    MyApp = null;
  }
});

test('should return second item when both are truthy', function() {
  set(MyApp, 'foo', true);
  set(MyApp, 'bar', 'BAR');
  SC.run.sync();
  equals(get(MyApp, 'baz'), 'BAR', 'should be false');
});

test('should return false first item', function() {
  set(MyApp, 'foo', 0);
  set(MyApp, 'bar', true);
  SC.run.sync();
  equals(get(MyApp, 'baz'), 0, 'should be false');
});

test('should return false second item', function() {
  set(MyApp, 'foo', true);
  set(MyApp, 'bar', 0);
  SC.run.sync();
  equals(get(MyApp, 'baz'), 0, 'should be false');
});

test('should return first item when both are false', function() {
  set(MyApp, 'foo', 0);
  set(MyApp, 'bar', null);
  SC.run.sync();
  equals(get(MyApp, 'baz'), 0, 'should be false');
});
