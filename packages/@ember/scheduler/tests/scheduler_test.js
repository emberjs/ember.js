import {
  render,
  layout,
  composite,
  next,
  idle,
  registerStrategy,
  _clearRegisteredStrategy,
  _registeredStrategy,
} from '..';
import classicStrategy from '../-private/classic';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

class StubStrategy {
  calls = [];

  render() {
    this.calls.push('render');
    return Promise.resolve();
  }

  layout() {
    this.calls.push('layout');
    return Promise.resolve();
  }

  composite() {
    this.calls.push('composite');
    return Promise.resolve();
  }

  next() {
    this.calls.push('next');
    return Promise.resolve();
  }

  idle() {
    this.calls.push('idle');
    return Promise.resolve();
  }
}

moduleFor(
  '@ember/scheduler',
  class extends AbstractTestCase {
    teardown() {
      _clearRegisteredStrategy();
    }

    ['@test phase functions assert before any strategy is registered'](assert) {
      // the framework hookup registered classic when the bundle loaded;
      // simulate the pre-boot state
      _clearRegisteredStrategy();

      for (let phase of [render, layout, composite, next, idle]) {
        expectAssertion(() => {
          phase();
        }, /before a scheduling strategy was available/);
      }

      assert.expect(5);
    }

    async ['@test the classic strategy resolves phases in runloop order'](assert) {
      // the framework registers this at the glimmer<->ember hookup
      // during boot; tests clear registration, so re-register here
      registerStrategy(classicStrategy);

      let order = [];

      await Promise.all([
        composite().then(() => order.push('composite')),
        layout().then(() => order.push('layout')),
        render().then(() => order.push('render')),
      ]);

      assert.deepEqual(order, ['render', 'layout', 'composite']);
    }

    ['@test the renderer seam prefers a registered strategy that implements it'](assert) {
      let scheduled = [];

      registerStrategy({
        render: () => Promise.resolve(),
        layout: () => Promise.resolve(),
        composite: () => Promise.resolve(),
        next: () => Promise.resolve(),
        idle: () => Promise.resolve(),
        _scheduleRevalidate(flush) {
          scheduled.push(flush);
        },
      });

      let flush = () => {};
      _registeredStrategy._scheduleRevalidate(flush);

      assert.strictEqual(scheduled.length, 1, 'the registered strategy received the flush');
      assert.strictEqual(scheduled[0], flush, 'with the stable callback');
    }

    ['@test phase functions delegate to the registered strategy'](assert) {
      let strategy = new StubStrategy();
      registerStrategy(strategy);

      render();
      layout();
      composite();
      next();
      idle();

      assert.deepEqual(strategy.calls, ['render', 'layout', 'composite', 'next', 'idle']);
    }

    ['@test phase functions return the promise produced by the strategy'](assert) {
      let expected = Promise.resolve();

      registerStrategy({
        render: () => expected,
        layout: () => expected,
        composite: () => expected,
        next: () => expected,
        idle: () => expected,
      });

      for (let phase of [render, layout, composite, next, idle]) {
        assert.strictEqual(phase(), expected);
      }
    }

    ['@test registerStrategy may replace the classic default, once'](assert) {
      registerStrategy(classicStrategy);

      let strategy = new StubStrategy();
      registerStrategy(strategy);

      render();
      assert.deepEqual(strategy.calls, ['render'], 'the swapped-in strategy is active');

      expectAssertion(() => {
        registerStrategy(new StubStrategy());
      }, /a different scheduling strategy has already been registered/);
    }

    ['@test registerStrategy asserts when a different strategy is already registered'](assert) {
      let strategy = new StubStrategy();
      registerStrategy(strategy);

      // re-registering the same strategy is a no-op
      registerStrategy(strategy);

      expectAssertion(() => {
        registerStrategy(new StubStrategy());
      }, /a different scheduling strategy has already been registered/);

      render();
      assert.deepEqual(strategy.calls, ['render'], 'the original strategy remains registered');
    }
  }
);
