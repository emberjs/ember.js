import Ember from 'ember-metal/core';
import deprecationManager, { deprecationLevels } from 'ember-debug/deprecation-manager';

let originalEnvValue;
let originalDeprecationDefault;
let originalDeprecationLevels;

QUnit.module('ember-debug', {
  setup() {
    originalDeprecationDefault = deprecationManager.defaultLevel;
    originalDeprecationLevels = deprecationManager.individualLevels;
    originalEnvValue = Ember.ENV.RAISE_ON_DEPRECATION;

    Ember.ENV.RAISE_ON_DEPRECATION = false;
    deprecationManager.setDefaultLevel(deprecationLevels.RAISE);
  },

  teardown() {
    deprecationManager.defaultLevel = originalDeprecationDefault;
    deprecationManager.individualLevels = originalDeprecationLevels;
    Ember.ENV.RAISE_ON_DEPRECATION = originalEnvValue;
  }
});

QUnit.test('Ember.deprecate does not throw if default level is silence', function(assert) {
  assert.expect(1);
  deprecationManager.setDefaultLevel(deprecationLevels.SILENCE);

  try {
    Ember.deprecate('Should not throw', false);
    assert.ok(true, 'Ember.deprecate did not throw');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }
});

QUnit.test('Ember.deprecate re-sets deprecation level to RAISE if ENV.RAISE_ON_DEPRECATION is set', function(assert) {
  assert.expect(2);

  deprecationManager.setDefaultLevel(deprecationLevels.SILENCE);

  Ember.ENV.RAISE_ON_DEPRECATION = true;

  assert.throws(function() {
    Ember.deprecate('Should throw', false);
  }, /Should throw/);

  assert.equal(deprecationManager.defaultLevel, deprecationLevels.RAISE,
               'default level re-set to RAISE');
});

QUnit.test('When ENV.RAISE_ON_DEPRECATION is true, it is still possible to silence a deprecation by id', function(assert) {
  assert.expect(3);

  Ember.ENV.RAISE_ON_DEPRECATION = true;
  deprecationManager.setLevel('my-deprecation', deprecationLevels.SILENCE);

  try {
    Ember.deprecate('should be silenced with matching id', false, { id: 'my-deprecation' });
    assert.ok(true, 'Did not throw when level is set by id');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }

  assert.throws(function() {
    Ember.deprecate('Should throw with no id', false);
  }, /Should throw with no id/);

  assert.throws(function() {
    Ember.deprecate('Should throw with non-matching id', false, { id: 'other-id' });
  }, /Should throw with non-matching id/);
});

QUnit.test('Ember.deprecate throws deprecation if second argument is falsy', function() {
  expect(3);

  throws(function() {
    Ember.deprecate('Deprecation is thrown', false);
  });

  throws(function() {
    Ember.deprecate('Deprecation is thrown', '');
  });

  throws(function() {
    Ember.deprecate('Deprecation is thrown', 0);
  });
});

QUnit.test('Ember.deprecate does not throw deprecation if second argument is a function and it returns true', function() {
  expect(1);

  Ember.deprecate('Deprecation is thrown', function() {
    return true;
  });

  ok(true, 'deprecation was not thrown');
});

QUnit.test('Ember.deprecate throws if second argument is a function and it returns false', function() {
  expect(1);
  throws(function() {
    Ember.deprecate('Deprecation is thrown', function() {
      return false;
    });
  });
});

QUnit.test('Ember.deprecate does not throw deprecations if second argument is truthy', function() {
  expect(1);

  Ember.deprecate('Deprecation is thrown', true);
  Ember.deprecate('Deprecation is thrown', '1');
  Ember.deprecate('Deprecation is thrown', 1);

  ok(true, 'deprecations were not thrown');
});

QUnit.test('Ember.assert throws if second argument is falsy', function() {
  expect(3);

  throws(function() {
    Ember.assert('Assertion is thrown', false);
  });

  throws(function() {
    Ember.assert('Assertion is thrown', '');
  });

  throws(function() {
    Ember.assert('Assertion is thrown', 0);
  });
});

QUnit.test('Ember.assert does not throw if second argument is a function and it returns true', function() {
  expect(1);

  Ember.assert('Assertion is thrown', function() {
    return true;
  });

  ok(true, 'assertion was not thrown');
});

QUnit.test('Ember.assert throws if second argument is a function and it returns false', function() {
  expect(1);
  throws(function() {
    Ember.assert('Assertion is thrown', function() {
      return false;
    });
  });
});

QUnit.test('Ember.assert does not throw if second argument is truthy', function() {
  expect(1);

  Ember.assert('Assertion is thrown', true);
  Ember.assert('Assertion is thrown', '1');
  Ember.assert('Assertion is thrown', 1);

  ok(true, 'assertions were not thrown');
});

QUnit.test('Ember.assert does not throw if second argument is an object', function() {
  expect(1);
  var Igor = Ember.Object.extend();

  Ember.assert('is truthy', Igor);
  Ember.assert('is truthy', Igor.create());

  ok(true, 'assertions were not thrown');
});

QUnit.test('Ember.deprecate does not throw a deprecation at log and silence levels', function() {
  expect(4);
  var id = 'ABC';

  deprecationManager.setLevel(id, deprecationLevels.LOG);
  try {
    Ember.deprecate('Deprecation for testing purposes', false, { id });
    ok(true, 'Deprecation did not throw');
  } catch(e) {
    ok(false, 'Deprecation was thrown despite being added to blacklist');
  }

  deprecationManager.setLevel(id, deprecationLevels.SILENCE);
  try {
    Ember.deprecate('Deprecation for testing purposes', false, { id });
    ok(true, 'Deprecation did not throw');
  } catch(e) {
    ok(false, 'Deprecation was thrown despite being added to blacklist');
  }

  deprecationManager.setLevel(id, deprecationLevels.RAISE);

  throws(function() {
    Ember.deprecate('Deprecation is thrown', false, { id });
  });

  deprecationManager.setLevel(id, null);

  throws(function() {
    Ember.deprecate('Deprecation is thrown', false, { id });
  });
});
