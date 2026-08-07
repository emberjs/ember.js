import { _backburner, next as runloopNext, schedule } from '@ember/runloop';
import type { Strategy } from '@ember/scheduler';

/**
 * The ambient default strategy: schedules exactly the way Ember works
 * today, so existing applications observe no change in timing. Phases
 * map onto the runloop's queues (`render`, then `afterRender`, with
 * `composite` re-scheduled behind `layout`'s queue entries within the
 * same flush), and the renderer's revalidation is a
 * `scheduleOnce('render', ...)`, just as it always was.
 *
 * Render-aware scheduling (frame-aligned phases, coalesced
 * revalidation) is what a swapped-in strategy provides -- see
 * `@ember/scheduler/strategy` -- and becomes the source of performance
 * wins when it becomes the default.
 *
 * @internal
 */
class ClassicStrategy implements Strategy {
  render(): Promise<void> {
    return new Promise((resolve) => schedule('render', null, resolve));
  }

  layout(): Promise<void> {
    return new Promise((resolve) => schedule('afterRender', null, resolve));
  }

  composite(): Promise<void> {
    return new Promise((resolve) =>
      schedule('afterRender', null, () => schedule('afterRender', null, resolve))
    );
  }

  next(): Promise<void> {
    return new Promise((resolve) => runloopNext(null, resolve));
  }

  idle(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback === 'function') {
        // fully-idle or backgrounded pages can starve requestIdleCallback
        // indefinitely; cap the wait to keep the promise resolvable
        requestIdleCallback(() => resolve(), { timeout: 500 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  /**
   * The renderer's internal seam: how revalidation gets scheduled.
   * Classic behavior is a runloop `scheduleOnce`, preserving today's
   * timing exactly (the flush callback is stable per renderer, so
   * scheduleOnce's dedupe applies as before).
   */
  _scheduleRevalidate(flush: () => void): void {
    _backburner.scheduleOnce('render', null, flush);
  }
}

const classicStrategy: ClassicStrategy = new ClassicStrategy();

export default classicStrategy;
