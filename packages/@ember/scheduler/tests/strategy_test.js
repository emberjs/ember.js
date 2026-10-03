/* globals requestAnimationFrame: false, queueMicrotask: false */
import defaultStrategy, { RenderClockStrategy } from '../strategy';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

// Drives a strategy the way the renderer does: each requested tick
// arrives asynchronously (here on a timer), then _onRendererTick fires
// the phase windows.
function connectTestClock(strategy) {
  let ticks = 0;
  strategy._setTickRequester(() => {
    ticks++;
    setTimeout(() => strategy._onRendererTick(), 0);
  });
  return () => ticks;
}

moduleFor(
  '@ember/scheduler/strategy',
  class extends AbstractTestCase {
    ['@test the default export is a RenderClockStrategy'](assert) {
      assert.ok(defaultStrategy instanceof RenderClockStrategy);
    }

    async ['@test phases resolve in order within a single tick'](assert) {
      let strategy = new RenderClockStrategy();
      connectTestClock(strategy);
      let order = [];

      await Promise.all([
        strategy.next().then(() => order.push('next')),
        strategy.composite().then(() => order.push('composite')),
        strategy.render().then(() => order.push('render')),
        strategy.layout().then(() => order.push('layout')),
      ]);

      assert.deepEqual(order, ['render', 'layout', 'composite', 'next']);
    }

    async ['@test scheduling into render while render is flushing resolves within the current tick'](
      assert
    ) {
      let strategy = new RenderClockStrategy();
      connectTestClock(strategy);
      let order = [];

      let layoutPromise = strategy.layout().then(() => order.push('layout'));

      await strategy.render();
      order.push('render');

      await strategy.render();
      order.push('render again');

      await layoutPromise;

      assert.deepEqual(order, ['render', 'render again', 'layout']);
    }

    async ['@test scheduling just-in-time during the render window resolves within the current tick'](
      assert
    ) {
      let strategy = new RenderClockStrategy();
      let tickCount = connectTestClock(strategy);

      await strategy.render();

      let ticksAfterRender = tickCount();
      let order = [];
      let layoutPromise = strategy.layout().then(() => order.push('layout'));
      let compositePromise = strategy.composite().then(() => order.push('composite'));

      await Promise.all([layoutPromise, compositePromise]);

      assert.deepEqual(order, ['layout', 'composite']);
      assert.strictEqual(
        tickCount(),
        ticksAfterRender,
        'phases ahead of the cascade joined the current tick without requesting another'
      );
    }

    async ['@test scheduling into an already-flushed phase resolves in the next tick'](assert) {
      let strategy = new RenderClockStrategy();
      connectTestClock(strategy);
      let order = [];

      // wait until the layout window of the first tick
      await strategy.layout();

      await Promise.all([
        strategy.composite().then(() => order.push('composite (this tick)')),
        strategy.render().then(() => order.push('render (next tick)')),
        strategy.layout().then(() => order.push('layout (next tick)')),
      ]);

      assert.deepEqual(order, [
        'composite (this tick)',
        'render (next tick)',
        'layout (next tick)',
      ]);
    }

    async ['@test work can be scheduled again after a tick completes'](assert) {
      let strategy = new RenderClockStrategy();
      connectTestClock(strategy);

      await strategy.next();
      await strategy.render();
      await strategy.next();

      assert.ok(true, 'phases continue to resolve in subsequent ticks');
    }

    async ['@test phases resolve without a connected renderer via the self-driven fallback'](
      assert
    ) {
      let strategy = new RenderClockStrategy();
      let order = [];

      await Promise.all([
        strategy.composite().then(() => order.push('composite')),
        strategy.render().then(() => order.push('render')),
        strategy.layout().then(() => order.push('layout')),
      ]);

      assert.deepEqual(order, ['render', 'layout', 'composite']);
    }

    async ['@test a driven tick pre-empts the self-driven fallback'](assert) {
      let strategy = new RenderClockStrategy();
      let requested = 0;
      strategy._setTickRequester(() => {
        requested++;
        // resolve faster than the fallback's frame task
        queueMicrotask(() => strategy._onRendererTick());
      });

      await strategy.render();
      assert.strictEqual(requested, 1, 'the connected clock was asked for a tick');

      // give the fallback's frame task a chance to fire; a double-drive
      // would reject in #openWindow by double-resolving into fresh state
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
      assert.ok(true, 'fallback stood down after the driven tick');
    }

    async ['@test idle resolves'](assert) {
      let strategy = new RenderClockStrategy();

      await strategy.idle();

      assert.ok(true, 'idle resolved');
    }
  }
);
