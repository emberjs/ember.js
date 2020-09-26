import { registerWaiter, unregisterWaiter, checkWaiters } from '../../lib/test/waiters';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

class Waiters {
  constructor() {
    this._waiters = [];
  }

  add() {
    this._waiters.push([...arguments]);
  }

  register() {
    this.forEach((...args) => {
      registerWaiter(...args);
    });
  }

  unregister() {
    this.forEach((...args) => {
      unregisterWaiter(...args);
    });
  }

  forEach(callback) {
    for (let i = 0; i < this._waiters.length; i++) {
      let args = this._waiters[i];

      callback(...args);
    }
  }

  check() {
    this.register();
    let result = checkWaiters();
    this.unregister();

    return result;
  }
}

moduleFor(
  'ember-testing: waiters',
  class extends AbstractTestCase {
    constructor() {
      super();
      this.waiters = new Waiters();
    }

    teardown() {
      this.waiters.unregister();
    }

    ['@test registering a waiter'](assert) {
      assert.expect(2);

      let obj = { foo: true };

      this.waiters.add(obj, function () {
        assert.ok(this.foo, 'has proper `this` context');
        return true;
      });

      this.waiters.add(function () {
        assert.ok(true, 'is called');
        return true;
      });

      this.waiters.check();
    }

    ['@test unregistering a waiter'](assert) {
      assert.expect(2);

      let obj = { foo: true };

      this.waiters.add(obj, function () {
        assert.ok(true, 'precond - waiter with context is registered');
        return true;
      });

      this.waiters.add(function () {
        assert.ok(true, 'precond - waiter without context is registered');
        return true;
      });

      this.waiters.check();
      this.waiters.unregister();

      checkWaiters();
    }

    ['@test checkWaiters returns false if all waiters return true'](assert) {
      assert.expect(3);

      this.waiters.add(function () {
        assert.ok(true, 'precond - waiter is registered');

        return true;
      });

      this.waiters.add(function () {
        assert.ok(true, 'precond - waiter is registered');

        return true;
      });

      assert.notOk(this.waiters.check(), 'checkWaiters returns true if all waiters return true');
    }

    ['@test checkWaiters returns true if any waiters return false'](assert) {
      assert.expect(3);

      this.waiters.add(function () {
        assert.ok(true, 'precond - waiter is registered');

        return true;
      });

      this.waiters.add(function () {
        assert.ok(true, 'precond - waiter is registered');

        return false;
      });

      assert.ok(this.waiters.check(), 'checkWaiters returns false if any waiters return false');
    }

    ['@test checkWaiters short circuits after first falsey waiter'](assert) {
      assert.expect(2);

      this.waiters.add(function () {
        assert.ok(true, 'precond - waiter is registered');

        return false;
      });

      this.waiters.add(function () {
        assert.notOk(true, 'waiter should not be called');
      });

      assert.ok(this.waiters.check(), 'checkWaiters returns false if any waiters return false');
    }
  }
);
