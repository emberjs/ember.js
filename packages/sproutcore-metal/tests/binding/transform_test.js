// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

var foo, bar, binding, set = Ember.set, get = Ember.get, setPath = Ember.setPath;

var CountObject = function(data){
  for (var item in data){
    this[item] = data[item];
  }

  Ember.addObserver(this, 'value', this.valueDidChange);
};

CountObject.prototype = {
  value: null,

  _count: 0,

  reset: function() {  
    this._count = 0;
    return this;
  },

  valueDidChange: function() {
    this._count++;
  }
};

module('system/mixin/binding/transform_test', {
  setup: function() {
    MyApp = {
      foo: new CountObject({ value: 'FOO' }),
      bar: new CountObject({ value: 'BAR' })
    };
    
    foo = Ember.getPath('MyApp.foo');
    bar = Ember.getPath('MyApp.bar');
  },
  
  teardown: function() {
    binding.disconnect(MyApp);
    MyApp = null;
  }
});

test('returns this', function() {
  binding = new Ember.Binding('foo.value', 'bar.value');

  var ret = binding.transform({ from: function() {}, to: function() {} });
  equals(ret, binding);
});

test('transform function should be invoked on fwd change', function() {
  
  binding = Ember.bind(MyApp, 'foo.value', 'bar.value');
  binding.transform({ to: function(value) { return 'TRANSFORMED'; }});
  Ember.run.sync();
  
  // should have transformed...
  equals(Ember.getPath('MyApp.foo.value'), 'TRANSFORMED', 'should transform');
  equals(Ember.getPath('MyApp.bar.value'), 'BAR', 'should stay original');  
});

test('two-way transforms work', function() {
  Ember.run(function() {
    binding = Ember.bind(MyApp, 'foo.value', 'bar.value');
    binding.transform({
      to: function(string) {
        return parseInt(string) || null;
      },
      from: function(integer) {
        return String(integer);
      }
    });
  });

  Ember.run(function() {
    setPath(MyApp, 'bar.value', "1");
  });

  equals(Ember.getPath('MyApp.foo.value'), 1, "sets the value to a number");

  setPath(MyApp, 'foo.value', 1);
  equals(Ember.getPath('MyApp.bar.value'), "1", "sets the value to a string");
});

test('transform function should NOT be invoked on fwd change', function() {
  
  var count = 0;
  binding = Ember.bind(MyApp, 'foo.value', 'bar.value');
  var lastSeenValue;
  binding.transform({
    to: function(value) {
      if (value !== lastSeenValue) count++; // transform must be consistent
      lastSeenValue = value;
      return 'TRANSFORMED '+count;
    }
  });

  Ember.run.sync();

  // should have transformed...
  foo.reset();
  bar.reset();
  
  Ember.setPath('MyApp.bar.value', 'FOOBAR');
  Ember.run.sync();

  equals(Ember.getPath('MyApp.foo.value'), 'TRANSFORMED 2', 'should transform');
  equals(Ember.getPath('MyApp.bar.value'), 'FOOBAR', 'should stay original');  
  
  equals(foo._count, 1, 'observer should have fired on set');
  equals(bar._count, 1, 'observer should have fired on set');
});

test('transforms should chain', function() {
  binding = Ember.bind(MyApp, 'foo.value', 'bar.value');
  binding.transform({
    to: function(value) { return value+' T1'; }
  });
  binding.transform({
    to: function(value) { return value+' T2'; }
  });
  Ember.run.sync();

  // should have transformed...
  equals(Ember.getPath('MyApp.foo.value'), 'BAR T1 T2', 'should transform');
  equals(Ember.getPath('MyApp.bar.value'), 'BAR', 'should stay original');  
});

test('resetTransforms() should clear', function() {
  binding = Ember.bind(MyApp, 'foo.value', 'bar.value');
  binding.transform({
    to: function(value) { return value+' T1'; }
  });
  binding.resetTransforms();
  binding.transform({
    to: function(value) { return value+' T2'; }
  });
  Ember.run.sync();

  // should have transformed...
  equals(Ember.getPath('MyApp.foo.value'), 'BAR T2', 'should transform');
  equals(Ember.getPath('MyApp.bar.value'), 'BAR', 'should stay original');  
});

