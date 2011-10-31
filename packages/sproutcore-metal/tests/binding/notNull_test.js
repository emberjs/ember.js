// ==========================================================================
// Project:  SproutCore Runtime
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
  
  var binding = SC.bind(MyApp, 'bar.value', 'foo.value').notNull('');

  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), 'FOO', 'value passes through');

  SC.setPath('MyApp.foo.value', null);
  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), '', 'null gets replaced');

});

