// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/binding/multiple', {
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

test('forces binding values to be multiple', function() {
  var binding = Ember.bind(MyApp, 'bar.value', 'foo.value').multiple();

  Ember.run.sync();
  same(Ember.getPath('MyApp.bar.value'), ['FOO'], '1 MyApp.bar.value');
  
  Ember.setPath('MyApp.foo.value', ['BAR']);
  Ember.run.sync();
  same(Ember.getPath('MyApp.foo.value'), ['BAR'], '2 MyApp.foo.value');
  same(Ember.getPath('MyApp.bar.value'), ['BAR'], '2 MyApp.bar.value');

  Ember.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  Ember.run.sync();
  same(Ember.getPath('MyApp.foo.value'), ['BAR', 'BAZ'], '3 MyApp.foo.value');
  same(Ember.getPath('MyApp.bar.value'), ['BAR', 'BAZ'], '3 MyApp.bar.value');

  Ember.setPath('MyApp.foo.value', null);
  Ember.run.sync();
  same(Ember.getPath('MyApp.bar.value'), [], '4 MyApp.bar.value');
  
});
