import { dependentKeyCompat } from '@ember/object/compat';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: @ember/object/compat',
    class extends AbstractTestCase {
      ['@test dependentKeyCompat does not exist'](assert) {
        assert.strictEqual(dependentKeyCompat, undefined);
      }
    }
  );
}
