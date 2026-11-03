/* globals requestAnimationFrame: false */
import defaultStrategy, { FrameStrategy } from '../strategy';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  '@ember/scheduler/strategy',
  class extends AbstractTestCase {
    ['@test the default export is a FrameStrategy'](assert) {
      assert.ok(defaultStrategy instanceof FrameStrategy);
    }

    async ['@test phases resolve in order within a single frame'](assert) {
      let strategy = new FrameStrategy();
      let order = [];

      await Promise.all([
        strategy.next().then(() => order.push('next')),
        strategy.composite().then(() => order.push('composite')),
        strategy.render().then(() => order.push('render')),
        strategy.layout().then(() => order.push('layout')),
      ]);

      assert.deepEqual(order, ['render', 'layout', 'composite', 'next']);
    }

    async ['@test scheduling into render while render is flushing resolves within the current frame'](
      assert
    ) {
      let strategy = new FrameStrategy();
      let order = [];

      let layoutPromise = strategy.layout().then(() => order.push('layout'));

      await strategy.render();
      order.push('render');

      await strategy.render();
      order.push('render again');

      await layoutPromise;

      assert.deepEqual(order, ['render', 'render again', 'layout']);
    }

    async ['@test scheduling just-in-time during the render window resolves within the current frame'](
      assert
    ) {
      let strategy = new FrameStrategy();
      let order = [];

      await strategy.render();

      let layoutPromise = strategy.layout().then(() => order.push('layout'));
      let compositePromise = strategy.composite().then(() => order.push('composite'));
      let nextPromise = strategy.next().then(() => order.push('next'));

      await Promise.all([layoutPromise, compositePromise, nextPromise]);

      assert.deepEqual(order, ['layout', 'composite', 'next']);
    }

    async ['@test scheduling into an already-flushed phase resolves in the next frame'](assert) {
      let strategy = new FrameStrategy();
      let order = [];

      // wait until the layout window of the first frame
      await strategy.layout();

      await Promise.all([
        strategy.composite().then(() => order.push('composite (this frame)')),
        strategy.render().then(() => order.push('render (next frame)')),
        strategy.layout().then(() => order.push('layout (next frame)')),
      ]);

      assert.deepEqual(order, [
        'composite (this frame)',
        'render (next frame)',
        'layout (next frame)',
      ]);
    }

    async ['@test scheduling into composite while composite is flushing resolves in the next frame'](
      assert
    ) {
      let strategy = new FrameStrategy();
      let order = [];

      await strategy.composite();

      // a raw requestAnimationFrame registered now (during frame 1's
      // composite window) marks the start of frame 2, ahead of the phase
      // windows the strategy schedules for it below. Anchoring to the rAF
      // channel keeps this deterministic: whether a timer task scheduled
      // during frame 1 runs before or after frame 2's rAF callbacks is
      // browser-defined (Safari orders it differently than Chrome).
      let frameBoundary = new Promise((resolve) =>
        requestAnimationFrame(() => {
          order.push('frame 2 began');
          resolve();
        })
      );
      let compositePromise = strategy.composite().then(() => order.push('composite (next frame)'));

      await Promise.all([frameBoundary, compositePromise]);

      assert.deepEqual(order, ['frame 2 began', 'composite (next frame)']);
    }

    async ['@test work can be scheduled again after a frame completes'](assert) {
      let strategy = new FrameStrategy();

      await strategy.next();
      await strategy.render();
      await strategy.next();

      assert.ok(true, 'phases continue to resolve in subsequent frames');
    }

    async ['@test idle resolves'](assert) {
      let strategy = new FrameStrategy();

      await strategy.idle();

      assert.ok(true, 'idle resolved');
    }
  }
);
