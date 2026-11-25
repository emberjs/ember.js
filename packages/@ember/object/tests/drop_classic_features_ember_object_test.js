import EmberObject from '@ember/object';
import CoreObject from '@ember/object/core';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: EmberObject',
    class extends AbstractTestCase {
      ['@test EmberObject and CoreObject are not exported'](assert) {
        assert.strictEqual(EmberObject, undefined, '@ember/object');
        assert.strictEqual(CoreObject, undefined, '@ember/object/core');
      }
    }
  );
}
