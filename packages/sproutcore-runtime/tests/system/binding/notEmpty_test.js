// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/binding/notEmpty', {
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

test('forces binding values to be notEmpty if enumerable', function() {
  
  var binding = SC.bind(MyApp, 'bar.value', 'foo.value').notEmpty('(EMPTY)');

  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), 'FOO', '1 MyApp.bar.value');

  SC.setPath('MyApp.foo.value', ['FOO']);
  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), ['FOO'], '2 Array passes through');

  SC.setPath('MyApp.foo.value', []);
  SC.run.sync();
  same(SC.getPath('MyApp.bar.value'), '(EMPTY)', '3 uses empty placeholder');

});
