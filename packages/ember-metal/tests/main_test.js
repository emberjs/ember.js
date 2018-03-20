import Ember from '..'; // testing reexports
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

// From https://github.com/semver/semver.org/issues/59 & https://regex101.com/r/vW1jA8/6
const SEMVER_REGEX = /^((?:0|(?:[1-9]\d*)))\.((?:0|(?:[1-9]\d*)))\.((?:0|(?:[1-9]\d*)))(?:-([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$/;

moduleFor('ember-metal/core/main', class extends AbstractTestCase {
  ['@test Ember registers itself'](assert) {
    let lib = Ember.libraries._registry[0];

    assert.equal(lib.name, 'Ember');
    assert.equal(lib.version, Ember.VERSION);
  }

  ['@test Ember.VERSION is in alignment with SemVer v2.0.0'](assert) {
    assert.ok(SEMVER_REGEX.test(Ember.VERSION), `Ember.VERSION (${Ember.VERSION})is valid SemVer v2.0.0`);
  }

  ['@test SEMVER_REGEX properly validates and invalidates version numbers'](assert) {
    function validateVersionString(versionString, expectedResult) {
      assert.equal(SEMVER_REGEX.test(versionString), expectedResult);
    }

    // Positive test cases
    validateVersionString('1.11.3', true);
    validateVersionString('1.0.0-beta.16.1', true);
    validateVersionString('1.12.1+canary.aba1412', true);
    validateVersionString('2.0.0-beta.1+canary.bb344775', true);
    validateVersionString('3.1.0-foobarBaz+30d70bd3', true);

    // Negative test cases
    validateVersionString('1.11.3.aba18a', false);
    validateVersionString('1.11', false);
  }
});

