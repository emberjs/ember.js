import type { Strategy } from '@ember/scheduler';

/**
  The default implementation of the scheduler interface described by
  [RFC 0957](https://rfcs.emberjs.com/id/0957-modernized-scheduler).

  ```js
  import { registerStrategy } from '@ember/scheduler';
  import strategy from '@ember/scheduler/strategy';

  registerStrategy(strategy);
  ```

  This strategy conceptualizes work as belonging to a "Frame", where a Frame
  constitutes the time between when states of the DOM are observable to a
  user. Each Frame flushes the `render`, `layout` and `composite` phases in
  order via `requestAnimationFrame`, prior to the browser's next paint.

  - work scheduled while no Frame is flushing resolves in the corresponding
    phase of the upcoming Frame
  - scheduling into a phase that the flushing Frame has not yet reached
    resolves "just-in-time" within the current Frame
  - scheduling into `render` while `render` is flushing resolves recursively
    within the current Frame's render phase
  - scheduling into a phase the flushing Frame has already passed (or into
    `layout`/`composite` while that same phase is flushing) resolves in the
    next Frame

  @module @ember/scheduler/strategy
  @public
*/

type FramePhase = 'render' | 'layout' | 'composite';

const PHASE_ORDER: Record<FramePhase, number> = {
  render: 0,
  layout: 1,
  composite: 2,
};

// requestAnimationFrame is unavailable in SSR environments such as FastBoot.
// There is no paint to schedule against there, so degrade to timers: phases
// still resolve in order, since equal-delay timeouts run FIFO.
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

class Frame {
  render = new Deferred();
  layout = new Deferred();
  composite = new Deferred();
  complete = new Deferred();
}

export class FrameStrategy implements Strategy {
  /** the frame whose phase callbacks are registered but have not yet completed */
  private _frame: Frame | null = null;

  /** while a frame is flushing, the frame scheduled to run after it */
  private _nextFrame: Frame | null = null;

  /** the phase window currently being flushed, if any */
  private _flushing: FramePhase | null = null;

  render(): Promise<void> {
    if (this._flushing === 'render') {
      // recursive scheduling into `render` resolves within the current
      // render window
      return Promise.resolve();
    }
    return this._phase('render');
  }

  layout(): Promise<void> {
    return this._phase('layout');
  }

  composite(): Promise<void> {
    return this._phase('composite');
  }

  next(): Promise<void> {
    // once the frame in flight (or the upcoming frame) has completed, yield
    // to a new task. `requestAnimationFrame` callbacks run before the paint,
    // so a timer scheduled from `complete` lands after it.
    return this._ensureFrame().complete.promise.then(
      () => new Promise((resolve) => setTimeout(resolve, 0))
    );
  }

  idle(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  private _phase(name: FramePhase): Promise<void> {
    let flushing = this._flushing;

    if (flushing === null) {
      return this._ensureFrame()[name].promise;
    }

    if (PHASE_ORDER[name] > PHASE_ORDER[flushing]) {
      // this phase of the flushing frame is still upcoming, resolve
      // just-in-time within the current frame
      return this._frame![name].promise;
    }

    // the window for this phase has already flushed this frame
    return this._ensureNextFrame()[name].promise;
  }

  private _ensureFrame(): Frame {
    if (this._frame === null) {
      this._frame = this._scheduleFrame();
    }
    return this._frame;
  }

  private _ensureNextFrame(): Frame {
    if (this._nextFrame === null) {
      this._nextFrame = this._scheduleFrame();
    }
    return this._nextFrame;
  }

  private _scheduleFrame(): Frame {
    let frame = new Frame();

    // callbacks registered with the browser in the same frame run in
    // registration order, giving us ordered phase windows within a single
    // frame, all before the next paint. Microtasks (and thus work awaiting a
    // phase) flush between callbacks. When a frame is scheduled while another
    // frame is flushing, the browser runs these callbacks in the next frame.
    onFrameTask(() => {
      this._flushing = 'render';
      frame.render.resolve();
    });
    onFrameTask(() => {
      this._flushing = 'layout';
      frame.layout.resolve();
    });
    onFrameTask(() => {
      this._flushing = 'composite';
      frame.composite.resolve();
    });
    onFrameTask(() => {
      this._flushing = null;
      if (this._frame === frame) {
        this._frame = this._nextFrame;
        this._nextFrame = null;
      }
      frame.complete.resolve();
    });

    return frame;
  }
}

const strategy: Strategy = new FrameStrategy();

export default strategy;
