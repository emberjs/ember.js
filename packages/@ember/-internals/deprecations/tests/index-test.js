import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { deprecateUntil, isRemoved } from '../index';
import { ENV } from '@ember/-internals/environment';

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
      ENV.RAISE_ON_DEPRECATION = originalEnvValue;
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
  }
);
