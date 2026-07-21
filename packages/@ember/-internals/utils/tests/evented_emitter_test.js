import { EventedEmitter } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'EventedEmitter',
  class extends AbstractTestCase {
    ['@test on/trigger/off with a function listener'](assert) {
      let host = {};
      let emitter = new EventedEmitter(host);
      let received = [];
      let listener = (...args) => received.push(args);

      emitter.on('thing', listener);
      emitter.trigger('thing', 1, 2);
      assert.deepEqual(received, [[1, 2]]);

      emitter.off('thing', listener);
      emitter.trigger('thing', 3);
      assert.deepEqual(received, [[1, 2]], 'removed listener does not fire');
    }

    ['@test listeners without a target are invoked with the host as this'](assert) {
      let host = {};
      let emitter = new EventedEmitter(host);
      let self;

      emitter.on('thing', function () {
        self = this;
      });
      emitter.trigger('thing');

      assert.strictEqual(self, host);
    }

    ['@test target and string method listeners'](assert) {
      let emitter = new EventedEmitter({});
      let target = {
        calls: 0,
        handler() {
          this.calls++;
        },
      };

      emitter.on('thing', target, 'handler');
      emitter.trigger('thing');
      assert.equal(target.calls, 1);

      emitter.off('thing', target, 'handler');
      emitter.trigger('thing');
      assert.equal(target.calls, 1);
    }

    ['@test one fires exactly once'](assert) {
      let emitter = new EventedEmitter({});
      let calls = 0;

      emitter.one('thing', () => calls++);
      emitter.trigger('thing');
      emitter.trigger('thing');

      assert.equal(calls, 1);
    }

    ['@test most-recently-added listeners fire first, matching metal sendEvent'](assert) {
      let emitter = new EventedEmitter({});
      let order = [];

      emitter.on('thing', () => order.push('first'));
      emitter.on('thing', () => order.push('second'));
      emitter.trigger('thing');

      assert.deepEqual(order, ['second', 'first']);
    }

    ['@test duplicate target/method pairs are only registered once'](assert) {
      let emitter = new EventedEmitter({});
      let calls = 0;
      let listener = () => calls++;

      emitter.on('thing', listener);
      emitter.on('thing', listener);
      emitter.trigger('thing');

      assert.equal(calls, 1);
    }

    ['@test has reflects listener presence'](assert) {
      let emitter = new EventedEmitter({});
      let listener = () => {};

      assert.false(emitter.has('thing'));
      emitter.on('thing', listener);
      assert.true(emitter.has('thing'));
      emitter.off('thing', listener);
      assert.false(emitter.has('thing'));
    }

    ['@test listeners added during dispatch do not fire in that dispatch'](assert) {
      let emitter = new EventedEmitter({});
      let calls = 0;

      emitter.on('thing', () => {
        emitter.on('thing', () => calls++);
      });
      emitter.trigger('thing');

      assert.equal(calls, 0);
      emitter.trigger('thing');
      assert.equal(calls, 1);
    }
  }
);
