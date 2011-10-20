// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/mixin/binding/oneWay_test', {
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

test('oneWay(true) should only sync one way', function() {
  var binding = SC.oneWay(MyApp, 'bar.value', 'foo.value');
  SC.run.sync();
  
  equals(SC.getPath('MyApp.foo.value'), 'FOO', 'foo synced');
  equals(SC.getPath('MyApp.bar.value'), 'FOO', 'bar synced');

  SC.setPath('MyApp.bar.value', 'BAZ');
  SC.run.sync();
  equals(SC.getPath('MyApp.foo.value'), 'FOO', 'foo synced');
  equals(SC.getPath('MyApp.bar.value'), 'BAZ', 'bar not synced');

  SC.setPath('MyApp.foo.value', 'BIFF');
  SC.run.sync();
  equals(SC.getPath('MyApp.foo.value'), 'BIFF', 'foo synced');
  equals(SC.getPath('MyApp.bar.value'), 'BIFF', 'foo synced');

});

