// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2012 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp:true */

module('system/binding/registerTransform', {
  setup: function() {
    Ember.Binding.registerTransform('gt', function(min) {
      return this.transform(function(value, binding) {
        return value > min;
      });
    });

    MyApp = {
      foo: 0
    };
  },

  teardown: function() {
    delete Ember.Binding.gt;
    delete Ember.Binding.prototype.gt;
    MyApp = null;
  }
});

test('registerTransform registers a custom transform for use in a binding', function() {
  Ember.setPath('MyApp.foo', 0);

  var binding = Ember.bind(MyApp, 'bar', 'foo').gt(0);
  Ember.run.sync();

  equal(Ember.getPath('MyApp.bar'), false);

  Ember.setPath('MyApp.foo', 1);
  Ember.run.sync();

  equal(Ember.getPath('MyApp.bar'), true);

  binding.disconnect(MyApp);
});

test('registerTransform adds a class method to Ember.Binding', function() {
  Ember.setPath('MyApp.foo', 0);

  var binding = Ember.Binding.gt('foo', 0).to('baz').connect(MyApp);
  Ember.run.sync();

  equal(Ember.getPath('MyApp.baz'), false);

  Ember.setPath('MyApp.foo', 1);
  Ember.run.sync();

  equal(Ember.getPath('MyApp.baz'), true);

  binding.disconnect(MyApp);
});
