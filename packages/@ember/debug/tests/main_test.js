import { ENV } from '@ember/-internals/environment';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { HANDLERS } from '../lib/handlers';
import {
  registerHandler,
  missingOptionsDeprecation,
  missingOptionsIdDeprecation,
  missingOptionsUntilDeprecation,
} from '../lib/deprecate';

import {
  missingOptionsIdDeprecation as missingWarnOptionsIdDeprecation,
  missingOptionsDeprecation as missingWarnOptionsDeprecation,
  registerHandler as registerWarnHandler,
} from '../lib/warn';

import { deprecate, warn, assert as emberAssert } from '../index';

import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

let originalEnvValue;
let originalDeprecateHandler;
let originalWarnHandler;

const originalConsoleWarn = console.warn; // eslint-disable-line no-console
const noop = function() {};

moduleFor(
  'ember-debug',
  class extends TestCase {
    constructor() {
      super();

      originalEnvValue = ENV.RAISE_ON_DEPRECATION;
      originalDeprecateHandler = HANDLERS.deprecate;
      originalWarnHandler = HANDLERS.warn;

      ENV.RAISE_ON_DEPRECATION = true;
    }

    teardown() {
      HANDLERS.deprecate = originalDeprecateHandler;
      HANDLERS.warn = originalWarnHandler;

      ENV.RAISE_ON_DEPRECATION = originalEnvValue;
    }

    afterEach() {
      console.warn = originalConsoleWarn; // eslint-disable-line no-console
    }

    ['@test deprecate does not throw if RAISE_ON_DEPRECATION is false'](assert) {
      assert.expect(1);
      console.warn = noop; // eslint-disable-line no-console

      ENV.RAISE_ON_DEPRECATION = false;

      try {
        deprecate('Should not throw', false, { id: 'test', until: 'forever' });
        assert.ok(true, 'deprecate did not throw');
      } catch (e) {
        assert.ok(false, `Expected deprecate not to throw but it did: ${e.message}`);
      }
    }

    ['@test deprecate resets deprecation level to RAISE if ENV.RAISE_ON_DEPRECATION is set'](
      assert
    ) {
      assert.expect(2);
      console.warn = noop; // eslint-disable-line no-console

      ENV.RAISE_ON_DEPRECATION = false;

      try {
        deprecate('Should not throw', false, { id: 'test', until: 'forever' });
        assert.ok(true, 'deprecate did not throw');
      } catch (e) {
        assert.ok(false, `Expected deprecate not to throw but it did: ${e.message}`);
      }

      ENV.RAISE_ON_DEPRECATION = true;

      assert.throws(() => {
        deprecate('Should throw', false, { id: 'test', until: 'forever' });
      }, /Should throw/);
    }

    ['@test When ENV.RAISE_ON_DEPRECATION is true, it is still possible to silence a deprecation by id'](
      assert
    ) {
      assert.expect(3);

      ENV.RAISE_ON_DEPRECATION = true;
      registerHandler(function(message, options, next) {
        if (!options || options.id !== 'my-deprecation') {
          next(...arguments);
        }
      });

      try {
        deprecate('should be silenced with matching id', false, {
          id: 'my-deprecation',
          until: 'forever',
        });
        assert.ok(true, 'Did not throw when level is set by id');
      } catch (e) {
        assert.ok(false, `Expected deprecate not to throw but it did: ${e.message}`);
      }

      assert.throws(() => {
        deprecate('Should throw with no matching id', false, {
          id: 'test',
          until: 'forever',
        });
      }, /Should throw with no matching id/);

      assert.throws(() => {
        deprecate('Should throw with non-matching id', false, {
          id: 'other-id',
          until: 'forever',
        });
      }, /Should throw with non-matching id/);
    }

    ['@test deprecate throws deprecation if second argument is falsy'](assert) {
      assert.expect(3);

      assert.throws(() =>
        deprecate('Deprecation is thrown', false, {
          id: 'test',
          until: 'forever',
        })
      );
      assert.throws(() => deprecate('Deprecation is thrown', '', { id: 'test', until: 'forever' }));
      assert.throws(() => deprecate('Deprecation is thrown', 0, { id: 'test', until: 'forever' }));
    }

    ['@test deprecate does not invoke a function as the second argument'](assert) {
      assert.expect(1);

      deprecate(
        'Deprecation is thrown',
        function() {
          assert.ok(false, 'this function should not be invoked');
        },
        { id: 'test', until: 'forever' }
      );

      assert.ok(true, 'deprecations were not thrown');
    }

    ['@test deprecate does not throw deprecations if second argument is truthy'](assert) {
      assert.expect(1);

      deprecate('Deprecation is thrown', true, {
        id: 'test',
        until: 'forever',
      });
      deprecate('Deprecation is thrown', '1', { id: 'test', until: 'forever' });
      deprecate('Deprecation is thrown', 1, { id: 'test', until: 'forever' });

      assert.ok(true, 'deprecations were not thrown');
    }

    ['@test assert throws if second argument is falsy'](assert) {
      assert.expect(3);

      assert.throws(() => emberAssert('Assertion is thrown', false));
      assert.throws(() => emberAssert('Assertion is thrown', ''));
      assert.throws(() => emberAssert('Assertion is thrown', 0));
    }

    ['@test assert does not throw if second argument is a function'](assert) {
      assert.expect(1);

      emberAssert('Assertion is thrown', () => true);

      assert.ok(true, 'assertions were not thrown');
    }

    ['@test assert does not throw if second argument is falsy'](assert) {
      assert.expect(1);

      emberAssert('Assertion is thrown', true);
      emberAssert('Assertion is thrown', '1');
      emberAssert('Assertion is thrown', 1);

      assert.ok(true, 'assertions were not thrown');
    }

    ['@test assert does not throw if second argument is an object'](assert) {
      assert.expect(1);
      let Igor = EmberObject.extend();

      emberAssert('is truthy', Igor);
      emberAssert('is truthy', Igor.create());

      assert.ok(true, 'assertions were not thrown');
    }

    ['@test deprecate does not throw a deprecation at log and silence'](assert) {
      assert.expect(4);
      let id = 'ABC';
      let until = 'forever';
      let shouldThrow = false;

      registerHandler(function(message, options) {
        if (options && options.id === id) {
          if (shouldThrow) {
            throw new Error(message);
          }
        }
      });

      try {
        deprecate('Deprecation for testing purposes', false, { id, until });
        assert.ok(true, 'Deprecation did not throw');
      } catch (e) {
        assert.ok(false, 'Deprecation was thrown despite being added to blacklist');
      }

      try {
        deprecate('Deprecation for testing purposes', false, { id, until });
        assert.ok(true, 'Deprecation did not throw');
      } catch (e) {
        assert.ok(false, 'Deprecation was thrown despite being added to blacklist');
      }

      shouldThrow = true;

      assert.throws(function() {
        deprecate('Deprecation is thrown', false, { id, until });
      });

      assert.throws(function() {
        deprecate('Deprecation is thrown', false, { id, until });
      });
    }

    ['@test deprecate without options triggers an assertion'](assert) {
      assert.expect(2);

      assert.throws(
        () => deprecate('foo'),
        new RegExp(missingOptionsDeprecation),
        'proper assertion is triggered when options is missing'
      );

      assert.throws(
        () => deprecate('foo', false, {}),
        new RegExp(missingOptionsDeprecation),
        'proper assertion is triggered when options is missing'
      );
    }

    ['@test deprecate without options.id triggers an assertion'](assert) {
      assert.expect(1);

      assert.throws(
        () => deprecate('foo', false, { until: 'forever' }),
        new RegExp(missingOptionsIdDeprecation),
        'proper assertion is triggered when options.id is missing'
      );
    }

    ['@test deprecate without options.until triggers an assertion'](assert) {
      assert.expect(1);

      assert.throws(
        () => deprecate('foo', false, { id: 'test' }),
        new RegExp(missingOptionsUntilDeprecation),
        'proper assertion is triggered when options.until is missing'
      );
    }

    ['@test warn without options triggers an assert'](assert) {
      assert.expect(1);

      assert.throws(
        () => warn('foo'),
        new RegExp(missingWarnOptionsDeprecation),
        'deprecation is triggered when options is missing'
      );
    }

    ['@test warn without options.id triggers an assertion'](assert) {
      assert.expect(1);

      assert.throws(
        () => warn('foo', false, {}),
        new RegExp(missingWarnOptionsIdDeprecation),
        'deprecation is triggered when options is missing'
      );
    }

    ['@test warn without options.id nor test triggers an assertion'](assert) {
      assert.expect(1);

      assert.throws(
        () => warn('foo', {}),
        new RegExp(missingWarnOptionsIdDeprecation),
        'deprecation is triggered when options is missing'
      );
    }

    ['@test warn without test but with options does not trigger an assertion'](assert) {
      assert.expect(1);

      registerWarnHandler(function(message) {
        assert.equal(message, 'foo', 'warning was triggered');
      });

      warn('foo', { id: 'ember-debug.do-not-raise' });
    }
  }
);
