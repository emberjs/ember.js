import { set } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';
import run from 'ember-metal/run_loop';
import { oneWay } from 'ember-metal/binding';

var MyApp;

QUnit.module('system/mixin/binding/oneWay_test', {
  setup() {
    MyApp = {
      foo: { value: 'FOO' },
      bar: { value: 'BAR' }
    };
  },

  teardown() {
    MyApp = null;
  }
});

QUnit.test('oneWay(true) should only sync one way', function() {
  var binding;
  run(function() {
    binding = oneWay(MyApp, 'bar.value', 'foo.value');
  });

  equal(get(MyApp, 'foo.value'), 'FOO', 'foo synced');
  equal(get(MyApp, 'bar.value'), 'FOO', 'bar synced');

  run(function() {
    set(MyApp, 'bar.value', 'BAZ');
  });

  equal(get(MyApp, 'foo.value'), 'FOO', 'foo synced');
  equal(get(MyApp, 'bar.value'), 'BAZ', 'bar not synced');

  run(function() {
    set(MyApp, 'foo.value', 'BIFF');
  });

  equal(get(MyApp, 'foo.value'), 'BIFF', 'foo synced');
  equal(get(MyApp, 'bar.value'), 'BIFF', 'foo synced');

});

