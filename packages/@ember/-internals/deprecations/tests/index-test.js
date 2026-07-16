import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { DEPRECATIONS, deprecation, deprecateUntil, isRemoved, emberVersionGte } from '../index';
import { ENV } from '@ember/-internals/environment';
import { setDeprecationStagesConfig } from '@ember/debug';
import * as DEPRECATED_FEATURES from '@ember/deprecated-features';

let originalEnvValue;

moduleFor(
  '@ember/-internals/deprecations',
  class extends AbstractTestCase {
    constructor() {
      super();
      originalEnvValue = ENV.RAISE_ON_DEPRECATION;
      ENV.RAISE_ON_DEPRECATION = false;
    }

    teardown() {
      setDeprecationStagesConfig(null);
      ENV.RAISE_ON_DEPRECATION = originalEnvValue;
    }

    ['@test every @ember/deprecated-features flag matches a DEPRECATIONS registry key'](assert) {
      let flagNames = Object.keys(DEPRECATED_FEATURES);
      assert.notStrictEqual(flagNames.length, 0, 'flags exist');

      for (let flagName of flagNames) {
        assert.true(
          flagName in DEPRECATIONS,
          `${flagName} has a matching DEPRECATIONS registry entry`
        );
        assert.strictEqual(
          // eslint-disable-next-line import/namespace -- iterating the namespace's own keys
          typeof DEPRECATED_FEATURES[flagName],
          'boolean',
          `${flagName} is a boolean`
        );
      }
    }

    ['@test a deprecation whose flag is false reports itself as removed'](assert) {
      let options = {
        id: 'test-flagged-off',
        until: '30.0.0',
        for: 'ember-source',
        url: 'http://example.com/deprecations/test-flagged-off',
        since: { available: '1.0.0', enabled: '1.0.0' },
      };

      assert.false(deprecation(options, true).isRemoved, 'flag true: not removed');
      assert.false(deprecation(options).isRemoved, 'no flag: not removed');
      assert.true(deprecation(options, false).isRemoved, 'flag false: removed');

      assert.throws(
        () => deprecateUntil('Shaken API reached', deprecation(options, false)),
        /was removed in ember-source 30\.0\.0/,
        'deprecateUntil throws for a flagged-off deprecation'
      );
    }

    ['@test available-stage deprecations reflect stage config changes'](assert) {
      let AVAILABLE_DEPRECATION = deprecation({
        id: 'test-available-stage',
        until: '30.0.0',
        for: 'ember-source',
        url: 'http://example.com/deprecations/test-available-stage',
        since: { available: '1.0.0' },
      });

      assert.true(AVAILABLE_DEPRECATION.test, 'suppressed with no config');
      assert.false(AVAILABLE_DEPRECATION.isEnabled, 'not enabled with no config');

      setDeprecationStagesConfig({ enable: ['test-available-stage'] });

      assert.false(AVAILABLE_DEPRECATION.test, 'fires once enabled by config');
      assert.true(AVAILABLE_DEPRECATION.isEnabled, 'enabled by config');

      setDeprecationStagesConfig({ enable: ['some-other-id'] });

      assert.true(AVAILABLE_DEPRECATION.test, 'suppressed again when config changes');
    }

    ['@test deprecateUntil fires an available-stage deprecation enabled by config'](assert) {
      let AVAILABLE_DEPRECATION = deprecation({
        id: 'test-available-fires',
        until: '30.0.0',
        for: 'ember-source',
        url: 'http://example.com/deprecations/test-available-fires',
        since: { available: '1.0.0' },
      });

      expectNoDeprecation(() => {
        deprecateUntil('This deprecation is suppressed', AVAILABLE_DEPRECATION);
      });

      setDeprecationStagesConfig({ enable: ['test-available-fires'] });

      expectDeprecation(() => {
        deprecateUntil('This deprecation fires', AVAILABLE_DEPRECATION);
      }, /This deprecation fires/);

      assert.ok(true, 'ran without throwing');
    }

    ['@test deprecateUntil throws when deprecation has been removed'](assert) {
      assert.expect(1);

      let MY_DEPRECATION = {
        options: {
          id: 'test',
          until: '3.0.0',
          for: 'ember-source',
          url: 'http://example.com/deprecations/test',
          since: {
            available: '1.0.0',
            enabled: '1.0.0',
          },
        },
        isRemoved: true,
      };

      assert.throws(
        () => deprecateUntil('Old long gone api is deprecated', MY_DEPRECATION),
        /Error: The API deprecated by test was removed in ember-source 3.0.0. The message was: Old long gone api is deprecated. Please see http:\/\/example.com\/deprecations\/test for more details./,
        'deprecateUntil throws when isRemoved is true on deprecation'
      );
    }

    ['@test deprecateUntil does not throw when isRemoved is false on deprecation'](assert) {
      assert.expect(1);

      let MY_DEPRECATION = {
        options: {
          id: 'test',
          until: '3.0.0',
          for: 'ember-source',
          url: 'http://example.com/deprecations/test',
          since: {
            available: '1.0.0',
            enabled: '1.0.0',
          },
        },
        isRemoved: false,
      };

      deprecateUntil('Deprecation is thrown', MY_DEPRECATION);

      assert.ok(true, 'exception on until was not thrown');
    }
    ['@test isRemoved is true when until has passed current ember version'](assert) {
      assert.expect(1);

      let options = {
        id: 'test',
        until: '3.0.0',
        for: 'ember-source',
        url: 'http://example.com/deprecations/test',
        since: { available: '1.0.0', enabled: '1.0.0' },
      };

      assert.strictEqual(isRemoved(options), true, 'isRemoved is true when until has passed');
    }

    ['@test isRemoved is false before until has passed current ember version'](assert) {
      assert.expect(1);

      let options = {
        id: 'test',
        until: '30.0.0',
        for: 'ember-source',
        url: 'http://example.com/deprecations/test',
        since: { available: '1.0.0', enabled: '1.0.0' },
      };

      assert.strictEqual(
        isRemoved(options),
        false,
        'isRemoved is false until the until has passed'
      );
    }

    ['@test emberVersionGte returns whether the ember version is greater than or equal to the provided version'](
      assert
    ) {
      assert.strictEqual(
        emberVersionGte('3.0.0', parseFloat('5.0.0')),
        true,
        '5.0.0 is after 3.0.0'
      );
      assert.strictEqual(
        emberVersionGte('30.0.0', parseFloat('5.0.0')),
        false,
        '5.0.0 is before 30.0.0'
      );
      assert.strictEqual(
        emberVersionGte('5.0.0-beta.1', parseFloat('5.0.0')),
        true,
        '5.0.0 is after 5.0.0-beta.1'
      );
      assert.strictEqual(
        emberVersionGte('5.0.1', parseFloat('5.0.0-beta.1')),
        false,
        '5.0.0-beta.1 is before 5.0.1'
      );
      assert.strictEqual(
        emberVersionGte('5.0.0-alpha.abcde', parseFloat('5.0.0')),
        true,
        '5.0.0 is after 5.0.0-alpha'
      );
      assert.strictEqual(
        emberVersionGte('5.9.0', parseFloat('5.8.9')),
        false,
        '5.8.9 is before 5.9.0'
      );
      assert.strictEqual(
        emberVersionGte('5.10.0', parseFloat('5.9.2')),
        true,
        '5.10.1 is after 5.9.2'
      );
    }
  }
);
