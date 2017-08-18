import Ember from '..'; // testing reexports

// From sindresourhus/semver-regex https://github.com/sindresorhus/semver-regex/blob/795b05628d96597ebcbe6d31ef4a432858365582/index.js#L3
const SEMVER_REGEX = /^\bv?(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[\da-z\-]+(?:\.[\da-z\-]+)*)?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?\b$/;

QUnit.module('ember-metal/core/main');

QUnit.test('Ember registers itself', function() {
  let lib = Ember.libraries._registry[0];

  equal(lib.name, 'Ember');
  equal(lib.version, Ember.VERSION);
});

QUnit.test('Ember.VERSION is in alignment with SemVer v2.0.0', function () {
  ok(SEMVER_REGEX.test(Ember.VERSION), `Ember.VERSION (${Ember.VERSION})is valid SemVer v2.0.0`);
});

QUnit.test('SEMVER_REGEX properly validates and invalidates version numbers', function () {
  function validateVersionString(versionString, expectedResult) {
    equal(SEMVER_REGEX.test(versionString), expectedResult);
  }

  // Positive test cases
  validateVersionString('1.11.3', true);
  validateVersionString('1.0.0-beta.16.1', true);
  validateVersionString('1.12.1+canary.aba1412', true);
  validateVersionString('2.0.0-beta.1+canary.bb344775', true);

  // Negative test cases
  validateVersionString('1.11.3.aba18a', false);
  validateVersionString('1.11', false);
});

QUnit.test('Ember.K is deprecated', function(assert) {
  expectDeprecation(function() {
    let obj = {
      noop: Ember.K
    };

    assert.equal(obj, obj.noop());
  }, 'Ember.K is deprecated in favor of defining a function inline.');
});
