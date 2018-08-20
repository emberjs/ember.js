import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { get, getWithDefault, tracked } from '../..';

if (EMBER_METAL_TRACKED_PROPERTIES) {
  function createObj() {
    class Obj {
      @tracked string = 'string';
      @tracked number = 23;
      @tracked boolTrue = true;
      @tracked boolFalse = false;
      @tracked nullValue = null;
      constructor() {
        this.string = 'string';
        this.number = 23;
        this.boolTrue = true;
        this.boolFalse = false;
        this.nullValue = null;
      }
    }

    return new Obj();
  }

  moduleFor(
    '@tracked decorator: get',
    class extends AbstractTestCase {
      '@test should get arbitrary properties on an object'() {
        let obj = createObj();

        for (let key in obj) {
          this.assert.equal(get(obj, key), obj[key], key);
        }
      }

      '@test should retrieve a number key on an object'() {
        class Obj {
          @tracked 1 = 'first';
          constructor() {
            this[1] = 'first';
          }
        }

        let obj = new Obj();

        this.assert.equal(get(obj, '1'), 'first');
      }

      '@test should retrieve an empty key on an object'() {
        class Obj {
          @tracked '' = 'empty';
          constructor() {
            this[''] = 'empty';
          }
        }

        let obj = new Obj();

        this.assert.equal(get(obj, ''), 'empty');
      }

      '@test should get a @tracked path'() {
        class Key {
          @tracked value = 'value';
          constructor() {
            this.value = 'value';
          }
        }

        class Path {
          @tracked key = new Key();
          constructor() {
            this.key = new Key();
          }
        }

        class Obj {
          @tracked path = new Path();
          constructor() {
            this.path = new Path();
          }
        }

        let obj = new Obj();

        this.assert.equal(get(obj, 'path.key.value'), 'value');
      }

      '@test should not access a property more than once'() {
        let count = 20;

        class Count {
          @tracked
          get id() {
            return ++count;
          }
        }

        let obj = new Count();

        get(obj, 'id');

        this.assert.equal(count, 21);
      }
    }
  );

  moduleFor(
    '@tracked decorator: getWithDefault',
    class extends AbstractTestCase {
      ['@test should get arbitrary properties on an object']() {
        let obj = createObj();

        for (let key in obj) {
          this.assert.equal(getWithDefault(obj, key as any, 'fail'), obj[key], key);
        }

        class Obj {
          @tracked undef: string | undefined = undefined;
          constructor() {
            this.undef = undefined;
          }
        }

        let obj2 = new Obj();

        this.assert.equal(
          getWithDefault(obj2, 'undef', 'default'),
          'default',
          'explicit undefined retrieves the default'
        );
        this.assert.equal(
          getWithDefault(obj2, 'not-present' as any, 'default'),
          'default',
          'non-present key retrieves the default'
        );
      }
    }
  );
}
