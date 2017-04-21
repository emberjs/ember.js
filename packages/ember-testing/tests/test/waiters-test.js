import {
  registerWaiter,
  unregisterWaiter,
  checkWaiters,
  generateDeprecatedWaitersArray
} from '../../test/waiters';

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

QUnit.module('ember-testing: waiters', {
  setup() {
    this.waiters = new Waiters();
  },

  teardown() {
    this.waiters.unregister();
  }
});

QUnit.test('registering a waiter', function(assert) {
  assert.expect(2);

  let obj = { foo: true };

  this.waiters.add(obj, function() {
    assert.ok(this.foo, 'has proper `this` context');
    return true;
  });

  this.waiters.add(function() {
    assert.ok(true, 'is called');
    return true;
  });

  this.waiters.check();
});

QUnit.test('unregistering a waiter', function(assert) {
  assert.expect(2);

  let obj = { foo: true };

  this.waiters.add(obj, function() {
    assert.ok(true, 'precond - waiter with context is registered');
    return true;
  });

  this.waiters.add(function() {
    assert.ok(true, 'precond - waiter without context is registered');
    return true;
  });


  this.waiters.check();
  this.waiters.unregister();

  checkWaiters();
});

QUnit.test('checkWaiters returns false if all waiters return true', function(assert) {
  assert.expect(3);

  this.waiters.add(function() {
    assert.ok(true, 'precond - waiter is registered');

    return true;
  });

  this.waiters.add(function() {
    assert.ok(true, 'precond - waiter is registered');

    return true;
  });

  assert.notOk(this.waiters.check(), 'checkWaiters returns true if all waiters return true');
});

QUnit.test('checkWaiters returns true if any waiters return false', function(assert) {
  assert.expect(3);

  this.waiters.add(function() {
    assert.ok(true, 'precond - waiter is registered');

    return true;
  });

  this.waiters.add(function() {
    assert.ok(true, 'precond - waiter is registered');

    return false;
  });

  assert.ok(this.waiters.check(), 'checkWaiters returns false if any waiters return false');
});

QUnit.test('checkWaiters short circuits after first falsey waiter', function(assert) {
  assert.expect(2);

  this.waiters.add(function() {
    assert.ok(true, 'precond - waiter is registered');

    return false;
  });

  this.waiters.add(function() {
    assert.notOk(true, 'waiter should not be called');
  });

  assert.ok(this.waiters.check(), 'checkWaiters returns false if any waiters return false');
});

QUnit.test('generateDeprecatedWaitersArray provides deprecated access to waiters array', function(assert) {
  let waiter1 = () => {};
  let waiter2 = () => {};

  this.waiters.add(waiter1);
  this.waiters.add(waiter2);

  this.waiters.register();

  let waiters;
  expectDeprecation(function() {
    waiters = generateDeprecatedWaitersArray();
  }, /Usage of `Ember.Test.waiters` is deprecated/);

  assert.deepEqual(waiters, [
    [null, waiter1],
    [null, waiter2]
  ]);
});
