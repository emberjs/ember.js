// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals MyApp:true */

var get = Ember.get, set = Ember.set;

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
  var binding;
  Ember.run(function(){
    binding = Ember.bind(MyApp, 'bar.value', 'foo.value').single();
  });
  

  equal(Ember.getPath('MyApp.bar.value'), 'FOO', 'passes single object');

  Ember.run(function(){
    Ember.setPath('MyApp.foo.value', ['BAR']);
  });
  
  equal(Ember.getPath('MyApp.bar.value'), 'BAR', 'passes single object');

  Ember.run(function(){
    Ember.setPath('MyApp.foo.value', ['BAR', 'BAZ']);
  });
  
  equal(Ember.getPath('MyApp.bar.value'), Ember.MULTIPLE_PLACEHOLDER, 'converts to placeholder');
});

test('Ember.Binding#single(fromPath, placeholder) is available', function() {
  var binding;

  var obj = {
    value: null,
    boundValue: null
  };

  Ember.run(function(){
    binding = Ember.Binding.single('value', 'placeholder').to('boundValue').connect(obj);
  });

  equal(get(obj, 'boundValue'), null, 'intial boundValue is null');

  Ember.run(function(){
    set(obj, 'value', [1]);
  });
  
  equal(get(obj, 'boundValue'), 1, 'passes single object');

  Ember.run(function(){
    set(obj, 'value', [1, 2]);
  });

  equal(get(obj, 'boundValue'), 'placeholder', 'converts to placeholder');
});
