// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/binding/single', {
  setup: function() {
    MyApp = SC.Object.create({
      foo: SC.Object.create({ value: 'FOO' }),
      bar: SC.Object.create({ value: 'BAR' })
    });
  },

  teardown: function() {
    MyApp = null;
  }
});

test('forces binding values to be single', function() {
  var binding = SC.bind(MyApp, 'bar.value', 'foo.value').single();

  SC.run.sync();
  equals(SC.getPath('MyApp.bar.value'), 'FOO', 'passes single object');

  SC.setPath('MyApp.foo.value', ['BAR']);
  SC.run.sync();
  equals(SC.getPath('MyApp.bar.value'), 'BAR', 'passes single object');

  SC.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  SC.run.sync();
  equals(SC.getPath('MyApp.bar.value'), SC.MULTIPLE_PLACEHOLDER, 'converts to placeholder');
  
});
