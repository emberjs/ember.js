import type { Strategy } from '@ember/scheduler';

/**
  The default implementation of the scheduler interface described by
  [RFC 0957](https://rfcs.emberjs.com/id/0957-modernized-scheduler).

  This strategy IS the renderer's clock. The renderer schedules its own
  ticks (microtask-speed for render-coupled continuations, frame-paced
  for streams); each tick that leaves the renderer valid drives this
  strategy's phase windows, so `await render()` resolves against the
  tick that actually updated the DOM -- there is exactly one clock.

  - `render` resolves immediately after a tick's revalidation, before
    the next paint when the tick rode the frame
  - `layout` and `composite` resolve in subsequent microtask
    checkpoints of the same tick, so each phase's awaiters run before
    the next window opens
  - scheduling into `render` while the render window is flushing
    resolves within the current window (recursive render)
  - scheduling into a phase whose window has already flushed this tick
    resolves in the next tick
  - `next()` resolves in a task after the tick completes; `idle()` uses
    `requestIdleCallback` where available

  Awaiting a phase when the renderer has no pending work requests a
  tick, so the promise always resolves; environments with no renderer
  at all (unit tests, workers) fall back to a self-driven tick.

  @module @ember/scheduler/strategy
  @public
*/

type FramePhase = 'render' | 'layout' | 'composite';

const PHASE_ORDER: Record<FramePhase, number> = {
  render: 0,
  layout: 1,
  composite: 2,
};

// requestAnimationFrame is unavailable in SSR environments such as
// FastBoot; there is no paint there, so the self-driven fallback
// degrades to a timer.
function onFrameTask(callback: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => callback());
  } else {
    setTimeout(callback, 0);
  }
}

class Deferred {
  declare promise: Promise<void>;
  declare resolve: () => void;

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
    });
  }
}

export class RenderClockStrategy implements Strategy {
  /** lazily-created pending windows for the upcoming tick */
  #render: Deferred | null = null;
  #layout: Deferred | null = null;
  #composite: Deferred | null = null;
  #complete: Deferred | null = null;

  /** the phase window currently being flushed, if any */
  #flushing: FramePhase | null = null;

  /** bumped per driven tick; lets the self-driven fallback stand down */
  #tickCount = 0;

  /**
   * Injected by the renderer: ensures a tick is scheduled even when no
   * reactive state is dirty, so awaited phases always resolve.
   */
  #requestTick: (() => void) | null = null;

  /** @internal wired up by the renderer at module initialization */
  _setTickRequester(requestTick: () => void): void {
    this.#requestTick = requestTick;
  }

  #ensureTick(): void {
    if (this.#requestTick !== null) {
      this.#requestTick();
    }

    // With no renderer connected (unit tests, workers, pre-boot), or a
    // connected renderer with no roots to tick, self-drive: fire the
    // windows at the next frame opportunity unless a real tick beat us
    // to it.
    const tickAtArm = this.#tickCount;
    onFrameTask(() => {
      if (this.#tickCount === tickAtArm) {
        this._onRendererTick();
      }
    });
  }

  /**
   * Drives the phase windows. Called by the renderer at the end of
   * every tick that leaves it valid; a no-op unless something awaited
   * a phase, so ticks with no scheduled work pay one null check.
   *
   * @internal
   */
  _onRendererTick(): void {
    this.#tickCount++;

    if (
      this.#render === null &&
      this.#layout === null &&
      this.#composite === null &&
      this.#complete === null
    ) {
      return;
    }

    // Each window resolves in its own microtask checkpoint so one
    // phase's awaiters observe their window before the next opens --
    // all within the tick's task, before the next paint when the tick
    // rode the frame.
    this.#openWindow('render');
    queueMicrotask(() => {
      this.#openWindow('layout');
      queueMicrotask(() => {
        this.#openWindow('composite');
        queueMicrotask(() => {
          this.#flushing = null;
          const complete = this.#complete;
          this.#complete = null;
          complete?.resolve();
        });
      });
    });
  }

  #openWindow(phase: FramePhase): void {
    this.#flushing = phase;

    let deferred: Deferred | null;

    if (phase === 'render') {
      deferred = this.#render;
      this.#render = null;
    } else if (phase === 'layout') {
      deferred = this.#layout;
      this.#layout = null;
    } else {
      deferred = this.#composite;
      this.#composite = null;
    }

    deferred?.resolve();
  }

  #phase(name: FramePhase): Promise<void> {
    const flushing = this.#flushing;

    if (flushing === 'render' && name === 'render') {
      // recursive scheduling into `render` resolves within the current
      // render window
      return Promise.resolve();
    }

    // Scheduling into a phase the current tick's cascade has not yet
    // reached joins this tick just-in-time; a phase at or behind the
    // window being flushed gets a fresh deferred, which the NEXT tick's
    // cascade resolves. Either way the bookkeeping is the same: take or
    // create the pending deferred and make sure a tick is coming.
    let deferred: Deferred;

    if (name === 'render') {
      deferred = this.#render ??= new Deferred();
    } else if (name === 'layout') {
      deferred = this.#layout ??= new Deferred();
    } else {
      deferred = this.#composite ??= new Deferred();
    }

    // a phase still ahead of the running cascade resolves within it;
    // anything else needs a tick to be coming
    if (flushing === null || PHASE_ORDER[name] <= PHASE_ORDER[flushing]) {
      this.#ensureTick();
    }

    return deferred.promise;
  }

  render(): Promise<void> {
    return this.#phase('render');
  }

  layout(): Promise<void> {
    return this.#phase('layout');
  }

  composite(): Promise<void> {
    return this.#phase('composite');
  }

  next(): Promise<void> {
    const complete = (this.#complete ??= new Deferred());

    if (this.#flushing === null) {
      this.#ensureTick();
    }

    // the tick's windows all flush before the paint when riding the
    // frame; a timer scheduled from `complete` lands after it
    return complete.promise.then(() => new Promise((resolve) => setTimeout(resolve, 0)));
  }

  idle(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback === 'function') {
        // an idle period may never arrive: fully-idle or backgrounded
        // pages can starve requestIdleCallback indefinitely, so cap the
        // wait to keep the promise resolvable
        requestIdleCallback(() => resolve(), { timeout: 500 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}

const strategy: RenderClockStrategy = new RenderClockStrategy();

export default strategy;
