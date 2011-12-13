// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp */

module('system/mixin/binding/oneWay_test', {
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

test('oneWay(true) should only sync one way', function() {
  var binding = Ember.oneWay(MyApp, 'bar.value', 'foo.value');
  Ember.run.sync();
  
  equals(Ember.getPath('MyApp.foo.value'), 'FOO', 'foo synced');
  equals(Ember.getPath('MyApp.bar.value'), 'FOO', 'bar synced');

  Ember.setPath('MyApp.bar.value', 'BAZ');
  Ember.run.sync();
  equals(Ember.getPath('MyApp.foo.value'), 'FOO', 'foo synced');
  equals(Ember.getPath('MyApp.bar.value'), 'BAZ', 'bar not synced');

  Ember.setPath('MyApp.foo.value', 'BIFF');
  Ember.run.sync();
  equals(Ember.getPath('MyApp.foo.value'), 'BIFF', 'foo synced');
  equals(Ember.getPath('MyApp.bar.value'), 'BIFF', 'foo synced');

});

