import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { get, set, setHasViews, tracked } from '../..';

import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  const createObj = () => {
    class Obj {
      @tracked string = 'string';
      @tracked number = 23;
      @tracked boolTrue = true;
      @tracked boolFalse = false;
      @tracked nullValue = null;
      @tracked undefinedValue = undefined;
      constructor() {
        this.string = 'string';
        this.number = 23;
        this.boolTrue = true;
        this.boolFalse = false;
        this.nullValue = null;
        this.undefinedValue = undefined;
      }
    }

    return new Obj();
  };

  moduleFor(
    '@tracked set',
    class extends AbstractTestCase {
      teardown() {
        setHasViews(() => false);
      }

      ['@test should set arbitrary properties on an object'](assert: Assert) {
        let obj = createObj();

        class Obj {
          @tracked undefinedValue = 'emberjs';

          constructor() {
            this.undefinedValue = 'emberjs';
          }
        }

        let newObj = new Obj();

        for (let key in obj) {
          assert.equal(set(newObj, key, obj[key]), obj[key], 'should return value');
          assert.equal(get(newObj, key), obj[key], 'should set value');
        }
      }

      ['@test should set a number key on an object'](assert: Assert) {
        class Obj {
          @tracked 1 = 'original';
          constructor() {
            this[1] = 'original';
          }
        }

        let obj = new Obj();

        set(obj, '1', 'first');
        assert.equal(obj[1], 'first');
      }
    }
  );
}
