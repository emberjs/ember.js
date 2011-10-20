// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/binding/multiple', {
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

test('forces binding values to be multiple', function() {
  var binding = SC.bind(MyApp, 'bar.value', 'foo.value').multiple();

  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), ['FOO'], '1 MyApp.bar.value');
  
  SC.setPath('MyApp.foo.value', ['BAR']);
  SC.run.sync();
  same(SC.getPath('MyApp.foo.value'), ['BAR'], '2 MyApp.foo.value');
  same(SC.getPath('MyApp.bar.value'), ['BAR'], '2 MyApp.bar.value');

  SC.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  SC.run.sync();
  same(SC.getPath('MyApp.foo.value'), ['BAR', 'BAZ'], '3 MyApp.foo.value');
  same(SC.getPath('MyApp.bar.value'), ['BAR', 'BAZ'], '3 MyApp.bar.value');

  SC.setPath('MyApp.foo.value', null);
  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), [], '4 MyApp.bar.value');
  
});
