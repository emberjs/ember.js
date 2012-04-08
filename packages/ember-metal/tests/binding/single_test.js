// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp:true */

var get = Ember.get, set = Ember.set;

module('system/binding/single', {
  setup: function() {
    MyApp = {
      foo: { value: 'FOO' },
      bar: { value: 'BAR' }
    };
  },

  teardown: function() {
    MyApp = null;
  }
});

test('forces binding values to be single', function() {
  var binding = Ember.bind(MyApp, 'bar.value', 'foo.value').single();

  Ember.run.sync();
  equal(Ember.getPath('MyApp.bar.value'), 'FOO', 'passes single object');

  Ember.setPath('MyApp.foo.value', ['BAR']);
  Ember.run.sync();
  equal(Ember.getPath('MyApp.bar.value'), 'BAR', 'passes single object');

  Ember.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  Ember.run.sync();
  equal(Ember.getPath('MyApp.bar.value'), Ember.MULTIPLE_PLACEHOLDER, 'converts to placeholder');
});

test('Ember.Binding#single(fromPath, placeholder) is available', function() {
  var obj = {
        value: null,
        boundValue: null
      },
      binding = Ember.Binding.single('value', 'placeholder').to('boundValue').connect(obj);

  Ember.run.sync();
  equal(get(obj, 'boundValue'), null, 'intial boundValue is null');

  set(obj, 'value', [1]);
  Ember.run.sync();
  equal(get(obj, 'boundValue'), 1, 'passes single object');

  set(obj, 'value', [1, 2]);
  Ember.run.sync();
  equal(get(obj, 'boundValue'), 'placeholder', 'converts to placeholder');
});
