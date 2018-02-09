import Ember from '..'; // testing reexports

// From https://github.com/semver/semver.org/issues/59 & https://regex101.com/r/vW1jA8/6
const SEMVER_REGEX = /^((?:0|(?:[1-9]\d*)))\.((?:0|(?:[1-9]\d*)))\.((?:0|(?:[1-9]\d*)))(?:-([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*))?$/;

QUnit.module('ember-metal/core/main');

QUnit.test('Ember registers itself', function(assert) {
  let lib = Ember.libraries._registry[0];

  assert.equal(lib.name, 'Ember');
  assert.equal(lib.version, Ember.VERSION);
});

QUnit.test('Ember.VERSION is in alignment with SemVer v2.0.0', function(assert) {
  assert.ok(SEMVER_REGEX.test(Ember.VERSION), `Ember.VERSION (${Ember.VERSION})is valid SemVer v2.0.0`);
});

QUnit.test('SEMVER_REGEX properly validates and invalidates version numbers', function(assert) {
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
});
