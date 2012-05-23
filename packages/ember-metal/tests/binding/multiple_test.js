// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp:true */

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
  var binding;
  Ember.run(function(){
    binding = Ember.bind(MyApp, 'bar.value', 'foo.value').multiple();
  });
  
  deepEqual(Ember.getPath('MyApp.bar.value'), ['FOO'], '1 MyApp.bar.value');

  Ember.run(function(){
    Ember.setPath('MyApp.foo.value', ['BAR']);
  });
  
  deepEqual(Ember.getPath('MyApp.foo.value'), ['BAR'], '2 MyApp.foo.value');
  deepEqual(Ember.getPath('MyApp.bar.value'), ['BAR'], '2 MyApp.bar.value');

  Ember.run(function(){
    Ember.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  });
  
  deepEqual(Ember.getPath('MyApp.foo.value'), ['BAR', 'BAZ'], '3 MyApp.foo.value');
  deepEqual(Ember.getPath('MyApp.bar.value'), ['BAR', 'BAZ'], '3 MyApp.bar.value');

  Ember.run(function(){
    Ember.setPath('MyApp.foo.value', null);
  });
  
  deepEqual(Ember.getPath('MyApp.bar.value'), [], '4 MyApp.bar.value');

});
