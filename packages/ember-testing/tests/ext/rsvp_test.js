import RSVP from '../../lib/ext/rsvp';
import { getAdapter, setAdapter } from '../../lib/test/adapter';
import TestPromise, { getLastPromise } from '../../lib/test/promise';
import { _getCurrentRunLoop } from '@ember/runloop';
import { isTesting, setTesting } from '@ember/debug';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

const originalTestAdapter = getAdapter();
const originalTestingFlag = isTesting();

let asyncStarted = 0;
let asyncEnded = 0;

moduleFor(
  'ember-testing RSVP',
  class extends AbstractTestCase {
    constructor() {
      super();
      setTesting(true);
      setAdapter({
        asyncStart() {
          asyncStarted++;
        },
        asyncEnd() {
          asyncEnded++;
        },
      });
    }

    teardown() {
      asyncStarted = 0;
      asyncEnded = 0;
      setAdapter(originalTestAdapter);
      setTesting(originalTestingFlag);
    }

    ['@test given `Ember.testing = true`, correctly informs the test suite about async steps'](
      assert
    ) {
      let done = assert.async();
      assert.expect(19);

      assert.ok(!_getCurrentRunLoop(), 'expect no run-loop');

      setTesting(true);

      assert.strictEqual(asyncStarted, 0);
      assert.strictEqual(asyncEnded, 0);

      let user = RSVP.Promise.resolve({ name: 'tomster' });

      assert.strictEqual(asyncStarted, 0);
      assert.strictEqual(asyncEnded, 0);

      user
        .then(function (user) {
          assert.strictEqual(asyncStarted, 1);
          assert.strictEqual(asyncEnded, 1);

          assert.strictEqual(user.name, 'tomster');

          return RSVP.Promise.resolve(1).then(function () {
            assert.strictEqual(asyncStarted, 1);
            assert.strictEqual(asyncEnded, 1);
          });
        })
        .then(function () {
          assert.strictEqual(asyncStarted, 1);
          assert.strictEqual(asyncEnded, 1);

          return new RSVP.Promise(function (resolve) {
            setTimeout(function () {
              assert.strictEqual(asyncStarted, 1);
              assert.strictEqual(asyncEnded, 1);

              resolve({ name: 'async tomster' });

              assert.strictEqual(asyncStarted, 2);
              assert.strictEqual(asyncEnded, 1);
            }, 0);
          });
        })
        .then(function (user) {
          assert.strictEqual(user.name, 'async tomster');
          assert.strictEqual(asyncStarted, 2);
          assert.strictEqual(asyncEnded, 2);
          done();
        });
    }
  }
);

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
