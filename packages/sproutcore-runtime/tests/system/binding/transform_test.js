// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

var foo, bar, binding, set = SC.set, get = SC.get, setPath = SC.setPath;

var CountObject = SC.Object.extend({
  value: null,

  _count: 0,

  reset: function() {  
    this._count = 0;
    return this;
  },
  
  valueDidChange: function() {
    this._count++;
  }.observes('value')
});

module('system/mixin/binding/transform_test', {
  setup: function() {
    MyApp = SC.Object.create({
      foo: CountObject.create({ value: 'FOO' }),
      bar: CountObject.create({ value: 'BAR' })
    });
    
    foo = SC.getPath('MyApp.foo');
    bar = SC.getPath('MyApp.bar');
  },
  
  teardown: function() {
    binding.disconnect(MyApp);
    MyApp = null;
  }
});

test('returns this', function() {
  binding = new SC.Binding('foo.value', 'bar.value');

  var ret = binding.transform({ from: function() {}, to: function() {} });
  equals(ret, binding);
});

test('transform function should be invoked on fwd change', function() {
  
  binding = SC.bind(MyApp, 'foo.value', 'bar.value');
  binding.transform({ to: function(value) { return 'TRANSFORMED'; }});
  SC.run.sync();
  
  // should have transformed...
  equals(SC.getPath('MyApp.foo.value'), 'TRANSFORMED', 'should transform');
  equals(SC.getPath('MyApp.bar.value'), 'BAR', 'should stay original');  
});

test('two-way transforms work', function() {
  SC.run(function() {
    binding = SC.bind(MyApp, 'foo.value', 'bar.value');
    binding.transform({
      to: function(string) {
        return parseInt(string) || null;
      },
      from: function(integer) {
        return String(integer);
      }
    });
  });

  SC.run(function() {
    setPath(MyApp, 'bar.value', "1");
  });

  equals(SC.getPath('MyApp.foo.value'), 1, "sets the value to a number");

  setPath(MyApp, 'foo.value', 1);
  equals(SC.getPath('MyApp.bar.value'), "1", "sets the value to a string");
});

test('transform function should NOT be invoked on fwd change', function() {
  
  var count = 0;
  binding = SC.bind(MyApp, 'foo.value', 'bar.value');
  var lastSeenValue;
  binding.transform({
    to: function(value) {
      if (value !== lastSeenValue) count++; // transform must be consistent
      lastSeenValue = value;
      return 'TRANSFORMED '+count;
    }
  });

  SC.run.sync();

  // should have transformed...
  foo.reset();
  bar.reset();
  
  SC.setPath('MyApp.bar.value', 'FOOBAR');
  SC.run.sync();

  equals(SC.getPath('MyApp.foo.value'), 'TRANSFORMED 2', 'should transform');
  equals(SC.getPath('MyApp.bar.value'), 'FOOBAR', 'should stay original');  
  
  equals(foo._count, 1, 'observer should have fired on set');
  equals(bar._count, 1, 'observer should have fired on set');
});

test('transforms should chain', function() {
  binding = SC.bind(MyApp, 'foo.value', 'bar.value');
  binding.transform({
    to: function(value) { return value+' T1'; }
  });
  binding.transform({
    to: function(value) { return value+' T2'; }
  });
  SC.run.sync();

  // should have transformed...
  equals(SC.getPath('MyApp.foo.value'), 'BAR T1 T2', 'should transform');
  equals(SC.getPath('MyApp.bar.value'), 'BAR', 'should stay original');  
});

test('resetTransforms() should clear', function() {
  binding = SC.bind(MyApp, 'foo.value', 'bar.value');
  binding.transform({
    to: function(value) { return value+' T1'; }
  });
  binding.resetTransforms();
  binding.transform({
    to: function(value) { return value+' T2'; }
  });
  SC.run.sync();

  // should have transformed...
  equals(SC.getPath('MyApp.foo.value'), 'BAR T2', 'should transform');
  equals(SC.getPath('MyApp.bar.value'), 'BAR', 'should stay original');  
});

