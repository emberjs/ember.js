import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { get, set, tracked } from '../..';

let createObj = () => {
  class Obj {
    @tracked string = 'string';
    @tracked number = 23;
    @tracked boolTrue = true;
    @tracked boolFalse = false;
    @tracked nullValue = null;
    @tracked undefinedValue = undefined;
  }

  return new Obj();
};

moduleFor(
  '@tracked set',
  class extends AbstractTestCase {
    ['@test should set arbitrary properties on an object'](assert) {
      let obj = createObj();

      class Obj {
        @tracked undefinedValue = 'emberjs';
      }

      let newObj = new Obj();

      for (let key in obj) {
        assert.equal(set(newObj, key, obj[key]), obj[key], 'should return value');
        assert.equal(get(newObj, key), obj[key], 'should set value');
      }
    }

    ['@test set should not throw an error when setting on shadowed properties'](assert) {
      class Obj {
        @tracked value = 'emberjs';

        constructor() {
          Object.defineProperty(this, 'value', { writable: true, value: 'emberjs' });
        }
      }

      let newObj = new Obj();

      set(newObj, 'value', 123);

      assert.equal(newObj.value, 123, 'it worked');
    }
  }
);
