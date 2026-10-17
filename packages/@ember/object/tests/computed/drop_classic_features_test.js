import {
  alias,
  and,
  bool,
  deprecatingAlias,
  equal,
  gt,
  gte,
  lt,
  lte,
  match,
  not,
  oneWay,
  or,
  readOnly,
  reads,
} from '@ember/object/computed';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: computed macros',
    class extends AbstractTestCase {
      ['@test the computed macros are not exported'](assert) {
        let macros = {
          alias,
          and,
          bool,
          deprecatingAlias,
          equal,
          gt,
          gte,
          lt,
          lte,
          match,
          not,
          oneWay,
          or,
          readOnly,
          reads,
        };

        for (let [name, macro] of Object.entries(macros)) {
          assert.strictEqual(macro, undefined, name);
        }
      }
    }
  );
}
