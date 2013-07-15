/*globals MyApp:true */

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
  var binding;
  Ember.run(function() {
    binding = Ember.oneWay(MyApp, 'bar.value', 'foo.value');
  });

  equal(Ember.get('MyApp.foo.value'), 'FOO', 'foo synced');
  equal(Ember.get('MyApp.bar.value'), 'FOO', 'bar synced');

  Ember.run(function() {
    Ember.set('MyApp.bar.value', 'BAZ');
  });

  equal(Ember.get('MyApp.foo.value'), 'FOO', 'foo synced');
  equal(Ember.get('MyApp.bar.value'), 'BAZ', 'bar not synced');

  Ember.run(function() {
    Ember.set('MyApp.foo.value', 'BIFF');
  });

  equal(Ember.get('MyApp.foo.value'), 'BIFF', 'foo synced');
  equal(Ember.get('MyApp.bar.value'), 'BIFF', 'foo synced');

});

