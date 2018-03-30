import {
  instrument,
  instrumentationSubscribe as subscribe,
  instrumentationUnsubscribe as unsubscribe,
  instrumentationReset as reset,
} from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Ember Instrumentation',
  class extends AbstractTestCase {
    afterEach() {
      reset();
    }

    ['@test execute block even if no listeners'](assert) {
      let result = instrument('render', {}, function() {
        return 'hello';
      });
      assert.equal(result, 'hello', 'called block');
    }

    ['@test subscribing to a simple path receives the listener'](assert) {
      assert.expect(12);

      let sentPayload = {};
      let count = 0;

      subscribe('render', {
        before(name, timestamp, payload) {
          if (count === 0) {
            assert.strictEqual(name, 'render');
          } else {
            assert.strictEqual(name, 'render.handlebars');
          }

          assert.ok(typeof timestamp === 'number');
          assert.strictEqual(payload, sentPayload);
        },

        after(name, timestamp, payload) {
          if (count === 0) {
            assert.strictEqual(name, 'render');
          } else {
            assert.strictEqual(name, 'render.handlebars');
          }

          assert.ok(typeof timestamp === 'number');
          assert.strictEqual(payload, sentPayload);

          count++;
        },
      });

      instrument('render', sentPayload, function() {});

      instrument('render.handlebars', sentPayload, function() {});
    }

    ['@test returning a value from the before callback passes it to the after callback'](assert) {
      assert.expect(2);

      let passthru1 = {};
      let passthru2 = {};

      subscribe('render', {
        before() {
          return passthru1;
        },
        after(name, timestamp, payload, beforeValue) {
          assert.strictEqual(beforeValue, passthru1);
        },
      });

      subscribe('render', {
        before() {
          return passthru2;
        },
        after(name, timestamp, payload, beforeValue) {
          assert.strictEqual(beforeValue, passthru2);
        },
      });

      instrument('render', null, function() {});
    }

    ['@test instrument with 2 args (name, callback) no payload'](assert) {
      assert.expect(1);

      subscribe('render', {
        before(name, timestamp, payload) {
          assert.deepEqual(payload, {});
        },
        after() {},
      });

      instrument('render', function() {});
    }

    ['@test instrument with 3 args (name, callback, binding) no payload'](assert) {
      assert.expect(2);

      let binding = {};
      subscribe('render', {
        before(name, timestamp, payload) {
          assert.deepEqual(payload, {});
        },
        after() {},
      });

      instrument(
        'render',
        function() {
          assert.deepEqual(this, binding);
        },
        binding
      );
    }

    ['@test instrument with 3 args (name, payload, callback) with payload'](assert) {
      assert.expect(1);

      let expectedPayload = { hi: 1 };
      subscribe('render', {
        before(name, timestamp, payload) {
          assert.deepEqual(payload, expectedPayload);
        },
        after() {},
      });

      instrument('render', expectedPayload, function() {});
    }

    ['@test instrument with 4 args (name, payload, callback, binding) with payload'](assert) {
      assert.expect(2);

      let expectedPayload = { hi: 1 };
      let binding = {};
      subscribe('render', {
        before(name, timestamp, payload) {
          assert.deepEqual(payload, expectedPayload);
        },
        after() {},
      });

      instrument(
        'render',
        expectedPayload,
        function() {
          assert.deepEqual(this, binding);
        },
        binding
      );
    }

    ['@test raising an exception in the instrumentation attaches it to the payload'](assert) {
      assert.expect(2);

      let error = new Error('Instrumentation');

      subscribe('render', {
        before() {},
        after(name, timestamp, payload) {
          assert.strictEqual(payload.exception, error);
        },
      });

      subscribe('render', {
        before() {},
        after(name, timestamp, payload) {
          assert.strictEqual(payload.exception, error);
        },
      });

      instrument('render.handlebars', null, function() {
        throw error;
      });
    }

    ['@test it is possible to add a new subscriber after the first instrument'](assert) {
      instrument('render.handlebars', null, function() {});

      subscribe('render', {
        before() {
          assert.ok(true, 'Before callback was called');
        },
        after() {
          assert.ok(true, 'After callback was called');
        },
      });

      instrument('render.handlebars', null, function() {});
    }

    ['@test it is possible to remove a subscriber'](assert) {
      assert.expect(4);

      let count = 0;

      let subscriber = subscribe('render', {
        before() {
          assert.equal(count, 0);
          assert.ok(true, 'Before callback was called');
        },
        after() {
          assert.equal(count, 0);
          assert.ok(true, 'After callback was called');
          count++;
        },
      });

      instrument('render.handlebars', null, function() {});

      unsubscribe(subscriber);

      instrument('render.handlebars', null, function() {});
    }
  }
);
