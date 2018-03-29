import { assignPolyfill as assign } from '..';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.assign',
  class extends TestCase {
    ['@test merging objects'](assert) {
      let trgt = { a: 1 };
      let src1 = { b: 2 };
      let src2 = { c: 3 };
      assign(trgt, src1, src2);

      assert.deepEqual(
        trgt,
        { a: 1, b: 2, c: 3 },
        'assign copies values from one or more source objects to a target object'
      );
      assert.deepEqual(
        src1,
        { b: 2 },
        'assign does not change source object 1'
      );
      assert.deepEqual(
        src2,
        { c: 3 },
        'assign does not change source object 2'
      );
    }

    ['@test merging objects with same property'](assert) {
      let trgt = { a: 1, b: 1 };
      let src1 = { a: 2, b: 2 };
      let src2 = { a: 3 };
      assign(trgt, src1, src2);

      assert.deepEqual(
        trgt,
        { a: 3, b: 2 },
        'properties are overwritten by other objects that have the same properties later in the parameters order'
      );
    }

    ['@test null'](assert) {
      let trgt = { a: 1 };
      assign(trgt, null);

      assert.deepEqual(trgt, { a: 1 }, 'null as a source parameter is ignored');
    }

    ['@test undefined'](assert) {
      let trgt = { a: 1 };
      assign(trgt, null);

      assert.deepEqual(
        trgt,
        { a: 1 },
        'undefined as a source parameter is ignored'
      );
    }
  }
);
