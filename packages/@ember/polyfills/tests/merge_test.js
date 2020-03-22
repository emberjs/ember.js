import { merge } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember.merge',
  class extends AbstractTestCase {
    ['@test merging objects'](assert) {
      let src1 = { a: 1 };
      let src2 = { b: 2 };
      expectDeprecation(() => {
        merge(src1, src2);
      }, 'Use of `merge` has been deprecated. Please use `assign` instead.');

      assert.deepEqual(
        src1,
        { a: 1, b: 2 },
        'merge copies values from second source object to first object'
      );
    }
  }
);
