import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { get, getWithDefault, tracked } from '../..';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  let createObj = function() {
    class Obj {
      @tracked string = 'string';
      @tracked number = 23;
      @tracked boolTrue = true;
      @tracked boolFalse = false;
      @tracked nullValue = null;
    }

    return new Obj();
  };

  moduleFor(
    '@tracked decorator: get',
    class extends AbstractTestCase {
      '@test should get arbitrary properties on an object'() {
        let obj = createObj();

        for (let key in obj) {
          this.assert.equal(get(obj, key), obj[key], key);
        }
      }

      '@test should get a @tracked path'() {
        class Key {
          @tracked value = 'value';
        }

        class Path {
          @tracked key = new Key();
        }

        class Obj {
          @tracked path = new Path();
        }

        let obj = new Obj();

        this.assert.equal(get(obj, 'path.key.value'), 'value');
      }

      ['@test should get arbitrary properties on an object']() {
        let obj = createObj();

        for (let key in obj) {
          this.assert.equal(getWithDefault(obj, key, 'fail'), obj[key], key);
        }

        class Obj {
          @tracked undef = undefined;
        }

        let obj2 = new Obj();

        this.assert.equal(
          getWithDefault(obj2, 'undef', 'default'),
          'default',
          'explicit undefined retrieves the default'
        );
        this.assert.equal(
          getWithDefault(obj2, 'not-present', 'default'),
          'default',
          'non-present key retrieves the default'
        );
      }
    }
  );
}
