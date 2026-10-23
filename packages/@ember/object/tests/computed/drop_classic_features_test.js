import { alias, and, not, readOnly } from '@ember/object/computed';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: computed macros',
    class extends AbstractTestCase {
      ['@test the computed macros throw'](assert) {
        assert.throws(
          () => not('isOpen'),
          /`not` from `@ember\/object\/computed` is not available, because the `EMBER_DROP_CLASSIC_FEATURES` build flag is set/
        );
        assert.throws(() => and('isOpen', 'isReady'), /`and` from .* is not available/);
        assert.throws(() => readOnly('user.name'), /`readOnly` from .* is not available/);
        assert.throws(() => alias('user.name'), /`alias` from .* is not available/);
      }
    }
  );
}
