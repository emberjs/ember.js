import { AbstractTestCase, moduleFor } from 'internal-test-helpers';
import { get, tracked } from '../..';

let createObj = function () {
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
        key = 'some-key';
        @tracked value = `value for ${this.key}`;
      }

      class Path {
        @tracked key = new Key();
      }

      class Obj {
        @tracked path = new Path();
      }

      let obj = new Obj();

      this.assert.equal(get(obj, 'path.key.value'), 'value for some-key');
    }
  }
);
