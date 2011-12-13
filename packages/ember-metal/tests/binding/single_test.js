// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

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
  equals(Ember.getPath('MyApp.bar.value'), 'FOO', 'passes single object');

  Ember.setPath('MyApp.foo.value', ['BAR']);
  Ember.run.sync();
  equals(Ember.getPath('MyApp.bar.value'), 'BAR', 'passes single object');

  Ember.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  Ember.run.sync();
  equals(Ember.getPath('MyApp.bar.value'), Ember.MULTIPLE_PLACEHOLDER, 'converts to placeholder');
  
});
