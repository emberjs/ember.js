import ComputedProperty, {
  alias,
  and,
  bool,
  collect,
  deprecatingAlias,
  empty,
  equal,
  expandProperties,
  filter,
  filterBy,
  gt,
  gte,
  intersect,
  lt,
  lte,
  map,
  mapBy,
  match,
  max,
  min,
  none,
  not,
  notEmpty,
  oneWay,
  or,
  readOnly,
  reads,
  setDiff,
  sort,
  sum,
  union,
  uniq,
  uniqBy,
} from '@ember/object/computed';
import { computed } from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';
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

      ['@test the other computed exports are not exported'](assert) {
        let exports = {
          computed,
          dependentKeyCompat,
          ComputedProperty,
          expandProperties,
          empty,
          notEmpty,
          none,
          sum,
          max,
          min,
          map,
          mapBy,
          filter,
          filterBy,
          uniq,
          uniqBy,
          union,
          intersect,
          setDiff,
          collect,
          sort,
        };

        for (let [name, value] of Object.entries(exports)) {
          assert.strictEqual(value, undefined, name);
        }
      }
    }
  );
}
