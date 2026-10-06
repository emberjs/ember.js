import { ENV } from '@ember/-internals/environment';
import { _clearRegisteredStrategy } from '@ember/scheduler';
import { renderSettled } from '@ember/-internals/glimmer';
import {
  run,
  join,
  bind,
  schedule,
  scheduleOnce,
  once,
  next,
  later,
  cancel,
  debounce,
  throttle,
  _hasScheduledTimers,
  _cancelTimers,
} from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/run_loop/use_async_scheduler_test',
  class extends AbstractTestCase {
    beforeEach() {
      ENV._USE_ASYNC_SCHEDULER = true;
      _clearRegisteredStrategy();
    }

    teardown() {
      _cancelTimers();
      ENV._USE_ASYNC_SCHEDULER = false;
      _clearRegisteredStrategy();
    }

    ['@test run executes the callback synchronously and returns its value'](assert) {
      let order = [];

      let result = run(() => {
        order.push('inside');
        return 42;
      });

      order.push('after');

      assert.equal(result, 42, 'returns the callback value');
      assert.deepEqual(order, ['inside', 'after'], 'callback ran synchronously');
    }

    ['@test run resolves a string method on a target'](assert) {
      let target = {
        count: 0,
        increment(amount) {
          this.count += amount;
          return this.count;
        },
      };

      let result = run(target, 'increment', 5);

      assert.equal(result, 5, 'method invoked with target as this');
    }

    ['@test join executes directly and returns its value'](assert) {
      let result = join(() => 'joined');
      assert.equal(result, 'joined', 'join returns the callback value');
    }

    ['@test bind returns a function that executes in the bound context'](assert) {
      let target = {
        name: 'target',
        getName() {
          return this.name;
        },
      };

      let bound = bind(target, target.getName);

      assert.equal(bound(), 'target', 'bound function sees its target');
    }

    async ['@test schedule("actions") defers to a microtask'](assert) {
      let order = [];

      schedule('actions', () => order.push('scheduled'));
      order.push('sync');

      assert.deepEqual(order, ['sync'], 'not invoked synchronously');

      await Promise.resolve();

      assert.deepEqual(order, ['sync', 'scheduled'], 'invoked on the microtask queue');
    }

    async ['@test schedule("render") and schedule("afterRender") run in phase order'](assert) {
      let order = [];
      let done = new Promise((resolve) => {
        schedule('afterRender', () => {
          order.push('afterRender');
          resolve();
        });
      });
      schedule('render', () => order.push('render'));
      schedule('actions', () => order.push('actions'));

      await done;

      assert.deepEqual(
        order,
        ['actions', 'render', 'afterRender'],
        'microtask before render phase before layout phase'
      );
    }

    async ['@test a scheduled item can be cancelled'](assert) {
      let hasRan = false;

      let timer = schedule('actions', () => (hasRan = true));
      let cancelled = cancel(timer);

      await Promise.resolve();

      assert.true(cancelled, 'cancel reported success');
      assert.false(hasRan, 'cancelled item did not run');
    }

    async ['@test scheduleOnce deduplicates by queue, target and method'](assert) {
      let invocations = [];
      let target = {
        record(value) {
          invocations.push(value);
        },
      };

      let first = scheduleOnce('actions', target, 'record', 1);
      let second = scheduleOnce('actions', target, 'record', 2);

      assert.strictEqual(first, second, 'both calls share one timer');

      await Promise.resolve();

      assert.deepEqual(invocations, [2], 'ran once, with the latest arguments');
    }

    async ['@test once deduplicates on the actions queue'](assert) {
      let count = 0;
      let increment = () => count++;

      once(increment);
      once(increment);

      await Promise.resolve();

      assert.equal(count, 1, 'ran once');
    }

    async ['@test next schedules into the next phase'](assert) {
      let hasRan = false;

      await new Promise((resolve) => {
        next(() => {
          hasRan = true;
          resolve();
        });
      });

      assert.true(hasRan, 'next callback ran');
    }

    async ['@test later fires after the wait and can be cancelled'](assert) {
      let fired = [];

      later(() => fired.push('kept'), 1);
      let timer = later(() => fired.push('cancelled'), 1);

      assert.true(_hasScheduledTimers(), 'timers are pending');

      cancel(timer);

      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.deepEqual(fired, ['kept'], 'only the un-cancelled timer fired');
      assert.false(_hasScheduledTimers(), 'no timers remain');
    }

    async ['@test debounce collapses repeated calls into one trailing invocation'](assert) {
      let invocations = [];
      let record = (value) => invocations.push(value);

      debounce(null, record, 1, 5);
      debounce(null, record, 2, 5);
      debounce(null, record, 3, 5);

      await new Promise((resolve) => setTimeout(resolve, 30));

      assert.deepEqual(invocations, [3], 'ran once with the latest arguments');
    }

    async ['@test throttle invokes on the leading edge and coalesces the rest'](assert) {
      let invocations = [];
      let record = (value) => invocations.push(value);

      throttle(null, record, 1, 20);
      throttle(null, record, 2, 20);
      throttle(null, record, 3, 20);

      assert.deepEqual(invocations, [1], 'invoked immediately, once');

      await new Promise((resolve) => setTimeout(resolve, 40));

      assert.deepEqual(invocations, [1], 'no trailing invocation');
    }

    async ['@test renderSettled resolves through the scheduler'](assert) {
      await renderSettled();
      assert.ok(true, 'renderSettled resolved with no backburner runloop');
    }
  }
);
