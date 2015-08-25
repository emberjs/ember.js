/* globals EmberDev */
import { getDebugFunction, setDebugFunction } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import Libraries from 'ember-metal/libraries';

var libs, registry;

QUnit.module('Libraries registry', {
  setup() {
    libs = new Libraries();
    registry = libs._registry;
  },

  teardown() {
    libs = null;
    registry = null;
  }
});

QUnit.test('core libraries come before other libraries', function() {
  expect(2);

  libs.register('my-lib', '2.0.0a');
  libs.registerCoreLibrary('DS', '1.0.0-beta.2');

  equal(registry[0].name, 'DS');
  equal(registry[1].name, 'my-lib');
});

QUnit.test('only the first registration of a library is stored', function() {
  expect(3);

  libs.register('magic', 1.23);
  libs.register('magic', 2.23);

  equal(registry[0].name, 'magic');
  equal(registry[0].version, 1.23);
  equal(registry.length, 1);
});

if (isEnabled('ember-libraries-isregistered')) {
  QUnit.test('isRegistered returns correct value', function() {
    expect(3);

    equal(libs.isRegistered('magic'), false);

    libs.register('magic', 1.23);
    equal(libs.isRegistered('magic'), true);

    libs.deRegister('magic');
    equal(libs.isRegistered('magic'), false);
  });
}

QUnit.test('attempting to register a library that is already registered warns you', function() {
  if (EmberDev && EmberDev.runningProdBuild) {
    ok(true, 'Logging does not occur in production builds');
    return;
  }

  expect(1);

  let originalWarn = getDebugFunction('warn');

  libs.register('magic', 1.23);

  setDebugFunction('warn', function(msg, test) {
    if (!test) {
      equal(msg, 'Library "magic" is already registered with Ember.');
    }
  });

  // Should warn us
  libs.register('magic', 2.23);

  setDebugFunction('warn', originalWarn);
});

QUnit.test('libraries can be de-registered', function() {
  expect(2);

  libs.register('lib1', '1.0.0b');
  libs.register('lib2', '1.0.0b');
  libs.register('lib3', '1.0.0b');

  libs.deRegister('lib1');
  libs.deRegister('lib3');

  equal(registry[0].name, 'lib2');
  equal(registry.length, 1);
});
