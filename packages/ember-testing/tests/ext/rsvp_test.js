import RSVP from '../../lib/ext/rsvp';
import { getAdapter, setAdapter } from '../../lib/test/adapter';
import TestPromise, { getLastPromise } from '../../lib/test/promise';
import { getCurrentRunLoop } from '@ember/runloop';
import { isTesting, setTesting } from 'ember-debug';
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

      assert.ok(!getCurrentRunLoop(), 'expect no run-loop');

      setTesting(true);

      assert.equal(asyncStarted, 0);
      assert.equal(asyncEnded, 0);

      let user = RSVP.Promise.resolve({ name: 'tomster' });

      assert.equal(asyncStarted, 0);
      assert.equal(asyncEnded, 0);

      user
        .then(function(user) {
          assert.equal(asyncStarted, 1);
          assert.equal(asyncEnded, 1);

          assert.equal(user.name, 'tomster');

          return RSVP.Promise.resolve(1).then(function() {
            assert.equal(asyncStarted, 1);
            assert.equal(asyncEnded, 1);
          });
        })
        .then(function() {
          assert.equal(asyncStarted, 1);
          assert.equal(asyncEnded, 1);

          return new RSVP.Promise(function(resolve) {
            setTimeout(function() {
              assert.equal(asyncStarted, 1);
              assert.equal(asyncEnded, 1);

              resolve({ name: 'async tomster' });

              assert.equal(asyncStarted, 2);
              assert.equal(asyncEnded, 1);
            }, 0);
          });
        })
        .then(function(user) {
          assert.equal(user.name, 'async tomster');
          assert.equal(asyncStarted, 2);
          assert.equal(asyncEnded, 2);
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
      return new TestPromise(function(resolve) {
        resolve();
      })
        .then(null)
        .then(function() {
          assert.ok(true);
        });
    }

    ['able to get last Promise'](assert) {
      assert.expect(2);

      var p1 = new TestPromise(function(resolve) {
        resolve();
      }).then(function() {
        assert.ok(true);
      });

      var p2 = new TestPromise(function(resolve) {
        resolve();
      });

      assert.deepEqual(getLastPromise(), p2);
      return p1;
    }
  }
);
