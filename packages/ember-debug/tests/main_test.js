import Ember from 'ember-metal/core';
import EmberObject from 'ember-runtime/system/object';
import { HANDLERS, generateTestAsFunctionDeprecation } from 'ember-debug/handlers';
import {
  registerHandler,
  missingOptionsDeprecation,
  missingOptionsIdDeprecation,
  missingOptionsUntilDeprecation
} from 'ember-debug/deprecate';

import {
  missingOptionsIdDeprecation as missingWarnOptionsIdDeprecation,
  missingOptionsDeprecation as missingWarnOptionsDeprecation,
  registerHandler as registerWarnHandler
} from 'ember-debug/warn';
import deprecate from 'ember-debug/deprecate';

let originalEnvValue;
let originalDeprecateHandler;

QUnit.module('ember-debug', {
  setup() {
    originalEnvValue = Ember.ENV.RAISE_ON_DEPRECATION;
    originalDeprecateHandler = HANDLERS.deprecate;

    Ember.ENV.RAISE_ON_DEPRECATION = true;
  },

  teardown() {
    HANDLERS.deprecate = originalDeprecateHandler;

    Ember.ENV.RAISE_ON_DEPRECATION = originalEnvValue;
  }
});

QUnit.test('Ember.deprecate does not throw if RAISE_ON_DEPRECATION is false', function(assert) {
  assert.expect(1);

  Ember.ENV.RAISE_ON_DEPRECATION = false;

  try {
    Ember.deprecate('Should not throw', false, { id: 'test', until: 'forever' });
    assert.ok(true, 'Ember.deprecate did not throw');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }
});

QUnit.test('Ember.deprecate re-sets deprecation level to RAISE if ENV.RAISE_ON_DEPRECATION is set', function(assert) {
  assert.expect(2);

  Ember.ENV.RAISE_ON_DEPRECATION = false;

  try {
    Ember.deprecate('Should not throw', false, { id: 'test', until: 'forever' });
    assert.ok(true, 'Ember.deprecate did not throw');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }

  Ember.ENV.RAISE_ON_DEPRECATION = true;

  assert.throws(function() {
    Ember.deprecate('Should throw', false, { id: 'test', until: 'forever' });
  }, /Should throw/);
});

QUnit.test('When ENV.RAISE_ON_DEPRECATION is true, it is still possible to silence a deprecation by id', function(assert) {
  assert.expect(3);

  Ember.ENV.RAISE_ON_DEPRECATION = true;
  registerHandler(function(message, options, next) {
    if (!options || options.id !== 'my-deprecation') {
      next(...arguments);
    }
  });

  try {
    Ember.deprecate('should be silenced with matching id', false, { id: 'my-deprecation', until: 'forever' });
    assert.ok(true, 'Did not throw when level is set by id');
  } catch(e) {
    assert.ok(false, `Expected Ember.deprecate not to throw but it did: ${e.message}`);
  }

  assert.throws(function() {
    Ember.deprecate('Should throw with no matching id', false, { id: 'test', until: 'forever' });
  }, /Should throw with no matching id/);

  assert.throws(function() {
    Ember.deprecate('Should throw with non-matching id', false, { id: 'other-id', until: 'forever' });
  }, /Should throw with non-matching id/);
});

QUnit.test('Ember.deprecate throws deprecation if second argument is falsy', function() {
  expect(3);

  throws(function() {
    Ember.deprecate('Deprecation is thrown', false, { id: 'test', until: 'forever' });
  });

  throws(function() {
    Ember.deprecate('Deprecation is thrown', '', { id: 'test', until: 'forever' });
  });

  throws(function() {
    Ember.deprecate('Deprecation is thrown', 0, { id: 'test', until: 'forever' });
  });
});

QUnit.test('Ember.deprecate throws deprecation if second argument is a function and it returns true', function(assert) {
  assert.expect(1);

  throws(() => {
    Ember.deprecate('This deprecation is not thrown, but argument deprecation is thrown', () => true, { id: 'test', until: 'forever' });
  });
});

QUnit.test('Ember.deprecate throws if second argument is a function and it returns false', function() {
  expect(1);
  throws(function() {
    Ember.deprecate('Deprecation is thrown', function() {
      return false;
    }, { id: 'test', until: 'forever' });
  });
});

QUnit.test('Ember.deprecate does not throw deprecations if second argument is truthy', function() {
  expect(1);

  Ember.deprecate('Deprecation is thrown', true, { id: 'test', until: 'forever' });
  Ember.deprecate('Deprecation is thrown', '1', { id: 'test', until: 'forever' });
  Ember.deprecate('Deprecation is thrown', 1, { id: 'test', until: 'forever' });

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

QUnit.test('Ember.assert does not throw if second argument is a function and it returns true', function(assert) {
  assert.expect(1);

  // shouldn't trigger an assertion, but deprecation from using function as test is expected
  expectDeprecation(
    () => Ember.assert('Assertion is thrown', () => true),
    generateTestAsFunctionDeprecation('Ember.assert')
  );
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
  let Igor = EmberObject.extend();

  Ember.assert('is truthy', Igor);
  Ember.assert('is truthy', Igor.create());

  ok(true, 'assertions were not thrown');
});

QUnit.test('Ember.deprecate does not throw a deprecation at log and silence levels', function() {
  expect(4);
  let id = 'ABC';
  let until = 'forever';
  let shouldThrow = false;

  registerHandler(function(message, options, next) {
    if (options && options.id === id) {
      if (shouldThrow) {
        throw new Error(message);
      }
    }
  });

  try {
    Ember.deprecate('Deprecation for testing purposes', false, { id, until });
    ok(true, 'Deprecation did not throw');
  } catch(e) {
    ok(false, 'Deprecation was thrown despite being added to blacklist');
  }

  try {
    Ember.deprecate('Deprecation for testing purposes', false, { id, until });
    ok(true, 'Deprecation did not throw');
  } catch(e) {
    ok(false, 'Deprecation was thrown despite being added to blacklist');
  }

  shouldThrow = true;

  throws(function() {
    Ember.deprecate('Deprecation is thrown', false, { id, until });
  });

  throws(function() {
    Ember.deprecate('Deprecation is thrown', false, { id, until });
  });
});

QUnit.test('Ember.deprecate without options triggers a deprecation', function(assert) {
  assert.expect(4);

  registerHandler(function(message) {
    if (message === missingOptionsDeprecation) {
      assert.ok(true, 'proper deprecation is triggered when options is missing');
    } else if (message === 'foo') {
      assert.ok(true, 'original deprecation is still triggered');
    }
  });

  Ember.deprecate('foo');
  Ember.deprecate('foo', false, { });
});

QUnit.test('Ember.deprecate without options.id triggers a deprecation', function(assert) {
  assert.expect(2);

  registerHandler(function(message) {
    if (message === missingOptionsIdDeprecation) {
      assert.ok(true, 'proper deprecation is triggered when options.id is missing');
    } else if (message === 'foo') {
      assert.ok(true, 'original deprecation is still triggered');
    }
  });

  Ember.deprecate('foo', false, { until: 'forever' });
});

QUnit.test('Ember.deprecate without options.until triggers a deprecation', function(assert) {
  assert.expect(2);

  registerHandler(function(message) {
    if (message === missingOptionsUntilDeprecation) {
      assert.ok(true, 'proper deprecation is triggered when options.until is missing');
    } else if (message === 'foo') {
      assert.ok(true, 'original deprecation is still triggered');
    }
  });

  Ember.deprecate('foo', false, { id: 'test' });
});

QUnit.test('Ember.warn without options triggers a deprecation', function(assert) {
  assert.expect(2);

  registerHandler(function(message) {
    assert.equal(message, missingWarnOptionsDeprecation, 'deprecation is triggered when options is missing');
  });

  registerWarnHandler(function(message) {
    assert.equal(message, 'foo', 'original warning is triggered');
  });

  Ember.warn('foo');
});

QUnit.test('Ember.warn without options.id triggers a deprecation', function(assert) {
  assert.expect(2);

  registerHandler(function(message) {
    assert.equal(message, missingWarnOptionsIdDeprecation, 'deprecation is triggered when options is missing');
  });

  registerWarnHandler(function(message) {
    assert.equal(message, 'foo', 'original warning is triggered');
  });

  Ember.warn('foo', false, { });
});

QUnit.test('Ember.deprecate triggers a deprecation when test argument is a function', function(assert) {
  assert.expect(1);

  registerHandler(message => assert.equal(
    message,
    generateTestAsFunctionDeprecation('Ember.deprecate'),
    'proper deprecation is triggered when test argument is a function'
  ));

  deprecate('Deprecation is thrown', () => true, { id: 'test', until: 'forever' });
});

QUnit.test('Ember.warn triggers a deprecation when test argument is a function', function(assert) {
  assert.expect(1);

  registerHandler(message => assert.equal(
    message,
    generateTestAsFunctionDeprecation('Ember.warn'),
    'proper deprecation is triggered when test argument is a function'
  ));

  Ember.warn('Warning is thrown', () => true, { id: 'test' });
});

QUnit.test('Ember.assert triggers a deprecation when test argument is a function', function(assert) {
  assert.expect(1);

  registerHandler(message => assert.equal(
    message,
    generateTestAsFunctionDeprecation('Ember.assert'),
    'proper deprecation is triggered when test argument is a function'
  ));

  Ember.assert('Assertion is thrown', () => true);
});
