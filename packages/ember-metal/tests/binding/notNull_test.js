// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/binding/notNull', {
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

test('allow empty string as placeholder', function() {
  
  var binding = Ember.bind(MyApp, 'bar.value', 'foo.value').notNull('');

  Ember.run.sync();
  same(Ember.getPath('MyApp.bar.value'), 'FOO', 'value passes through');

  Ember.setPath('MyApp.foo.value', null);
  Ember.run.sync();
  same(Ember.getPath('MyApp.bar.value'), '', 'null gets replaced');

});

