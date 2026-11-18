import { assert } from '@ember/debug';

/**
  The `@ember/scheduler` package provides a render-aware scheduling interface,
  as described by [RFC 0957](https://rfcs.emberjs.com/id/0957-modernized-scheduler).

  The interface describes *intent* for when work should be performed in
  relation to the native event queues and render cycle of the browser. The
  details of *how* that work is scheduled and flushed are up to the specific
  implementation (referred to as a "strategy"), allowing for experimentation
  in this space.

  Work is scheduled into a phase by awaiting the promise returned from that
  phase's function:

  ```js
  import { render, layout, composite, next, idle } from '@ember/scheduler';

  async function repositionTooltip(tooltip) {
    // wait for updated DOM, before the browser paints
    await render();

    // wait to read layout information, after `render` but before paint
    await layout();
    let rect = tooltip.target.getBoundingClientRect();

    // wait to write DOM, after `layout` but before paint
    await composite();
    tooltip.element.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
  }
  ```

  Since the scheduler does not itself store any callbacks, there is no need
  to tell the scheduler to cancel work. Instead, if your work requires
  cancellation or cleanup, handle this at the point the work was scheduled:

  ```js
  import { render } from '@ember/scheduler';

  class Example extends Component {
    async doWork() {
      await render();
      if (this.isDestroyed) {
        return;
      }
      // ...
    }
  }
  ```

  @module @ember/scheduler
  @public
*/

/**
 * An implementation of the scheduler interface. The strategy chooses when
 * the promise for each phase will resolve, and what happens when a phase is
 * requested while another phase is flushing.
 *
 * Notably, a strategy has no knowledge of the work to be done. This keeps
 * scheduling overhead light and enables async stack traces for scheduled
 * work to maintain the context of where the work was scheduled.
 */
export interface Strategy {
  render(): Promise<void>;
  layout(): Promise<void>;
  composite(): Promise<void>;
  next(): Promise<void>;
  idle(): Promise<void>;
}

let registeredStrategy: Strategy | null = null;

/**
  Registers the scheduling strategy which the phase functions of
  `@ember/scheduler` delegate to.

  The scheduling strategy should be registered once, when defining the
  Application:

  ```js
  import Application from '@ember/application';
  import { registerStrategy } from '@ember/scheduler';

  // the default scheduler implementation
  import strategy from '@ember/scheduler/strategy';

  export default class App extends Application {
    // ...
  }

  registerStrategy(strategy);
  ```

  A strategy is any object implementing the scheduler interface:

  ```ts
  interface Strategy {
    render(): Promise<void>;
    layout(): Promise<void>;
    composite(): Promise<void>;
    next(): Promise<void>;
    idle(): Promise<void>;
  }
  ```

  @method registerStrategy
  @for @ember/scheduler
  @param {Strategy} strategy the scheduling strategy to delegate to
  @static
  @public
*/
export function registerStrategy(strategy: Strategy): void {
  assert(
    'Cannot call `registerStrategy`: a different scheduling strategy has already been registered. The scheduling strategy should be registered exactly once, when defining the Application.',
    registeredStrategy === null || registeredStrategy === strategy
  );
  registeredStrategy = strategy;
}

// Private API used by tests to swap out the registered strategy.
export function _clearRegisteredStrategy(): void {
  registeredStrategy = null;
}

function getStrategy(phaseName: string): Strategy {
  assert(
    `Attempted to schedule work into the '${phaseName}' phase, but no scheduling strategy is registered. Register a strategy when defining your Application, e.g. the default strategy:\n\n\timport { registerStrategy } from '@ember/scheduler';\n\timport strategy from '@ember/scheduler/strategy';\n\n\tregisterStrategy(strategy);`,
    registeredStrategy !== null
  );
  return registeredStrategy;
}

/**
  Returns a promise which resolves once Ember has rendered new DOM containing
  the changes you've just made, guaranteeing that your work has access to that
  DOM prior to the next paint.

  ```js
  import { render } from '@ember/scheduler';

  // ...

  await render();
  ```

  During the render phase, updates to reactive state are allowed, but Ember
  does not guarantee that any updates will rerender before the next paint;
  this is up to the strategy to decide. Writing DOM during this phase will
  error in development.

  @method render
  @for @ember/scheduler
  @return {Promise<void>} a promise which resolves during the render phase
  @static
  @public
*/
export function render(): Promise<void> {
  return getStrategy('render').render();
}

/**
  Returns a promise which resolves after the render phase and prior to the
  next paint.

  ```js
  import { layout } from '@ember/scheduler';

  // ...

  await layout();
  ```

  This phase is for work that needs to read DOM but does not require
  adjusting reactive state. Writing DOM during this phase will error in
  development.

  @method layout
  @for @ember/scheduler
  @return {Promise<void>} a promise which resolves during the layout phase
  @static
  @public
*/
export function layout(): Promise<void> {
  return getStrategy('layout').layout();
}

/**
  Returns a promise which resolves after the layout phase and prior to the
  next paint.

  ```js
  import { composite } from '@ember/scheduler';

  // ...

  await composite();
  ```

  This phase is for work that needs to write DOM but does not require reading
  DOM state or adjusting reactive state. It is ideal for updating animations
  or moving tooltips to a final position based on measurements made during
  the layout phase.

  Users should take every opportunity to avoid reading DOM in this phase to
  avoid forced layouts and interleaved read/write of DOM state.

  @method composite
  @for @ember/scheduler
  @return {Promise<void>} a promise which resolves during the composite phase
  @static
  @public
*/
export function composite(): Promise<void> {
  return getStrategy('composite').composite();
}

/**
  Returns a promise which resolves as a task once the browser has completed
  the current frame.

  ```js
  import { next } from '@ember/scheduler';

  // ...

  await next();
  ```

  This phase is for work that needs to escape the current frame but is still
  a relatively high priority.

  @method next
  @for @ember/scheduler
  @return {Promise<void>} a promise which resolves in a task after the current frame completes
  @static
  @public
*/
export function next(): Promise<void> {
  return getStrategy('next').next();
}

/**
  Returns a promise which resolves once the browser is under less load.

  ```js
  import { idle } from '@ember/scheduler';

  // ...

  await idle();
  ```

  This phase is for work that is low priority, most commonly tasks like
  background fetch, server pings, or analytics processing.

  @method idle
  @for @ember/scheduler
  @return {Promise<void>} a promise which resolves when the browser is idle
  @static
  @public
*/
export function idle(): Promise<void> {
  return getStrategy('idle').idle();
}
