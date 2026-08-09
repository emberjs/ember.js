import {
  render,
  layout,
  composite,
  next,
  idle,
  registerStrategy,
  _clearRegisteredStrategy,
} from '..';
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

    async ['@test phase functions fall back to the default renderer-clock strategy'](assert) {
      // no registerStrategy call: the ambient default handles phases
      let order = [];

      await Promise.all([
        composite().then(() => order.push('composite')),
        render().then(() => order.push('render')),
        layout().then(() => order.push('layout')),
      ]);

      assert.deepEqual(order, ['render', 'layout', 'composite']);
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
