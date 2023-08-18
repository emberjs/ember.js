import TestPromise, { getLastPromise } from '../../lib/test/promise';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'TestPromise',
  class extends AbstractTestCase {
    ['does not throw error when falsy value passed to then'](assert) {
      assert.expect(1);
      return new TestPromise(function (resolve) {
        resolve();
      })
        .then(null)
        .then(function () {
          assert.ok(true);
        });
    }

    ['able to get last Promise'](assert) {
      assert.expect(2);

      let p1 = new TestPromise(function (resolve) {
        resolve();
      }).then(function () {
        assert.ok(true);
      });

      let p2 = new TestPromise(function (resolve) {
        resolve();
      });

      assert.deepEqual(getLastPromise(), p2);
      return p1;
    }
  }
);
