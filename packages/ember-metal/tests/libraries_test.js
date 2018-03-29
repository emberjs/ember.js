/* globals EmberDev */
import { getDebugFunction, setDebugFunction } from 'ember-debug';
import { Libraries } from '..';
import { EMBER_LIBRARIES_ISREGISTERED } from 'ember/features';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let libs, registry;
let originalWarn = getDebugFunction('warn');
function noop() {}

moduleFor(
  'Libraries registry',
  class extends AbstractTestCase {
    beforeEach() {
      libs = new Libraries();
      registry = libs._registry;
    }

    afterEach() {
      libs = null;
      registry = null;

      setDebugFunction('warn', originalWarn);
    }

    ['@test core libraries come before other libraries'](assert) {
      assert.expect(2);

      libs.register('my-lib', '2.0.0a');
      libs.registerCoreLibrary('DS', '1.0.0-beta.2');

      assert.equal(registry[0].name, 'DS');
      assert.equal(registry[1].name, 'my-lib');
    }

    ['@test only the first registration of a library is stored'](assert) {
      assert.expect(3);

      // overwrite warn to supress the double registration warning (see https://github.com/emberjs/ember.js/issues/16391)
      setDebugFunction('warn', noop);
      libs.register('magic', 1.23);
      libs.register('magic', 2.23);

      assert.equal(registry[0].name, 'magic');
      assert.equal(registry[0].version, 1.23);
      assert.equal(registry.length, 1);
    }

    ['@test isRegistered returns correct value'](assert) {
      if (EMBER_LIBRARIES_ISREGISTERED) {
        assert.expect(3);

        assert.equal(libs.isRegistered('magic'), false);

        libs.register('magic', 1.23);
        assert.equal(libs.isRegistered('magic'), true);

        libs.deRegister('magic');
        assert.equal(libs.isRegistered('magic'), false);
      } else {
        assert.expect(0);
      }
    }

    ['@test attempting to register a library that is already registered warns you'](
      assert
    ) {
      if (EmberDev && EmberDev.runningProdBuild) {
        assert.ok(true, 'Logging does not occur in production builds');
        return;
      }

      assert.expect(1);

      libs.register('magic', 1.23);

      setDebugFunction('warn', function(msg, test) {
        if (!test) {
          assert.equal(
            msg,
            'Library "magic" is already registered with Ember.'
          );
        }
      });

      // Should warn us
      libs.register('magic', 2.23);
    }

    ['@test libraries can be de-registered'](assert) {
      assert.expect(2);

      libs.register('lib1', '1.0.0b');
      libs.register('lib2', '1.0.0b');
      libs.register('lib3', '1.0.0b');

      libs.deRegister('lib1');
      libs.deRegister('lib3');

      assert.equal(registry[0].name, 'lib2');
      assert.equal(registry.length, 1);
    }
  }
);
