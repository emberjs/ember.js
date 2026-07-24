import { ENV } from '@ember/-internals/environment/lib/env';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { _backburner, _getCurrentRunLoop } from '@ember/runloop';
import {
  associateDestroyableChild,
  destroy,
  isDestroyed,
  isDestroying,
  registerDestructor,
} from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import type {
  Cursor,
  DebugRenderTree,
  Environment,
  RenderResult as GlimmerRenderResult,
  EvaluationContext,
  TreeBuilder,
  ClassicResolver,
} from '@glimmer/interfaces';

import { artifacts } from '@glimmer/program/lib/helpers';
import { RuntimeOpImpl } from '@glimmer/program/lib/opcode';
import { clientBuilder } from '@glimmer/runtime/lib/vm/element-builder';
import { inTransaction, runtimeOptions } from '@glimmer/runtime/lib/environment';
import { renderComponent as glimmerRenderComponent } from '@glimmer/runtime/lib/render';
import { CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator/lib/validators';
import type { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { hasDOM } from '../../browser-environment';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler/lib/program-context';

export type IBuilder = (env: Environment, cursor: Cursor) => TreeBuilder;

const NO_OP = () => {};

// This wrapper logic prevents us from rerendering in case of a hard failure
// during render. This prevents infinite revalidation type loops from occuring,
// and ensures that errors are not swallowed by subsequent follow on failures.
export function errorLoopTransaction(fn: () => void) {
  if (DEBUG) {
    return () => {
      let didError = true;

      try {
        fn();
        didError = false;
      } finally {
        if (didError) {
          // Noop the function so that we won't keep calling it and causing
          // infinite looping failures;
          fn = () => {
            // eslint-disable-next-line no-console
            console.warn(
              'Attempted to rerender, but the Ember application has had an unrecoverable error occur during render. You should reload the application after fixing the cause of the error.'
            );
          };
        }
      }
    };
  } else {
    return fn;
  }
}

/**
 * The interface the `RendererState` needs from a render root. The base
 * renderer only ever creates `ComponentRootState`s; the classic renderer
 * (`./renderer`) adds `ClassicRootState` for outlet/classic-component roots.
 */
export interface RendererRoot {
  readonly type: string;
  readonly result: GlimmerRenderResult | undefined;
  readonly destroyed: boolean;
  render(): void;
  destroy(): void;
  isFor(possibleRoot: unknown): boolean;
}

export class ComponentRootState implements RendererRoot {
  readonly type = 'component';

  #result: GlimmerRenderResult | undefined;
  #render: () => void;

  constructor(
    state: RendererState,
    definition: object,
    options: { into: Cursor; args?: Record<string, unknown> }
  ) {
    this.#render = errorLoopTransaction(() => {
      let iterator = glimmerRenderComponent(
        state.context,
        state.builder(state.env, options.into),
        state.owner,
        definition,
        options?.args
      );

      let result = (this.#result = iterator.sync());

      associateDestroyableChild(this, this.#result);

      this.#render = errorLoopTransaction(() => {
        if (isDestroying(result) || isDestroyed(result)) return;

        return result.rerender({
          alwaysRevalidate: false,
        });
      });
    });
  }

  isFor(_possibleRoot: unknown): boolean {
    return false;
  }

  render(): void {
    this.#render();
  }

  destroy(): void {
    destroy(this);
  }

  get destroyed(): boolean {
    return isDestroyed(this);
  }

  get result(): GlimmerRenderResult | undefined {
    return this.#result;
  }
}

function flushViaChannel(state: RendererState): void {
  // eslint-disable-next-line dot-notation -- private access helper
  (state as any).runChannelFlush();
}

const renderers: BaseRenderer[] = [];

export function _resetRenderers() {
  renderers.length = 0;
}

function register(renderer: BaseRenderer): void {
  assert('Cannot register the same renderer twice', renderers.indexOf(renderer) === -1);
  renderers.push(renderer);
}

function deregister(renderer: BaseRenderer): void {
  let index = renderers.indexOf(renderer);
  assert('Cannot deregister unknown unregistered renderer', index !== -1);
  renderers.splice(index, 1);
}

function loopBegin(): void {
  for (let renderer of renderers) {
    renderer.rerender();
  }
}

interface RenderSettledDeferred {
  promise: Promise<void>;
  resolve: () => void;
}

let renderSettledDeferred: RenderSettledDeferred | null = null;
/*
  Returns a promise which will resolve when rendering has settled. Settled in
  this context is defined as when all of the tags in use are "current" (e.g.
  `renderers.every(r => r._isValid())`). When this is checked at the _end_ of
  the run loop, this essentially guarantees that all rendering is completed.

  @method renderSettled
  @returns {Promise<void>} a promise which fulfills when rendering has settled
*/
export function renderSettled() {
  if (renderSettledDeferred === null) {
    let resolve!: () => void;
    let promise = new Promise<void>((r) => (resolve = r));
    renderSettledDeferred = { promise, resolve };
    // if there is no current runloop, the promise created above will not have
    // a chance to resolve (because its resolved in backburner's "end" event)
    if (!_getCurrentRunLoop()) {
      // ensure a runloop has been kicked off
      _backburner.schedule('actions', null, NO_OP);
    }
  }

  return renderSettledDeferred.promise;
}

function resolveRenderPromise() {
  if (renderSettledDeferred !== null) {
    let resolve = renderSettledDeferred.resolve;
    renderSettledDeferred = null;

    _backburner.join(null, resolve);
  }
}

/**
 * SPIKE: revalidation deferred to an animation frame is *expected* to
 * leave the renderer invalid at runloop end -- the frame will handle
 * it. Without this, loopEnd spins NO_OP runloops (recursing via join)
 * until the loop guard throws.
 */
let framePending = false;

export function setFramePending(value: boolean) {
  framePending = value;
}

let loops = 0;
function loopEnd() {
  for (let renderer of renderers) {
    if (!renderer.isValid()) {
      if (framePending) {
        // the scheduled frame will revalidate; its own runloop will
        // re-enter loopEnd and resolve the render promise
        return;
      }

      if (loops > ENV._RERENDER_LOOP_LIMIT) {
        loops = 0;
        // TODO: do something better
        renderer.destroy();
        throw new Error('infinite rendering invalidation detected');
      }
      loops++;
      return _backburner.join(null, NO_OP);
    }
  }
  loops = 0;
  resolveRenderPromise();
}

_backburner.on('begin', loopBegin);
_backburner.on('end', loopEnd);

type Resolver = ClassicResolver;

interface RendererData {
  owner: object;
  context: EvaluationContext;
  builder: IBuilder;
}

export class RendererState {
  static create(data: RendererData, renderer: BaseRenderer): RendererState {
    const state = new RendererState(data, renderer);
    associateDestroyableChild(renderer, state);
    return state;
  }

  readonly #data: RendererData;
  #lastRevision = -1;
  #inRenderTransaction = false;
  #destroyed = false;
  #roots: RendererRoot[] = [];
  #removedRoots: RendererRoot[] = [];

  private constructor(data: RendererData, renderer: BaseRenderer) {
    this.#data = data;

    registerDestructor(this, () => {
      this.clearAllRoots(renderer);
    });
  }

  get debug() {
    return {
      roots: this.#roots,
      inRenderTransaction: this.#inRenderTransaction,
      isInteractive: this.isInteractive,
    };
  }

  get roots() {
    return this.#roots;
  }

  get owner(): object {
    return this.#data.owner;
  }

  get builder(): IBuilder {
    return this.#data.builder;
  }

  get context(): EvaluationContext {
    return this.#data.context;
  }

  get env(): Environment {
    return this.context.env;
  }

  get isInteractive(): boolean {
    return this.#data.context.env.isInteractive;
  }

  renderRoot(root: RendererRoot, renderer: BaseRenderer): RendererRoot {
    let roots = this.#roots;

    roots.push(root);
    associateDestroyableChild(this, root);

    if (roots.length === 1) {
      register(renderer);
    }

    this.#renderRootsTransaction(renderer);

    return root;
  }

  #renderRootsTransaction(renderer: BaseRenderer): void {
    if (this.#inRenderTransaction) {
      // currently rendering roots, a new root was added and will
      // be processed by the existing _renderRoots invocation
      return;
    }

    // used to prevent calling _renderRoots again (see above)
    // while we are actively rendering roots
    this.#inRenderTransaction = true;

    let completedWithoutError = false;
    try {
      this.renderRoots(renderer);
      completedWithoutError = true;
    } finally {
      if (!completedWithoutError) {
        this.#lastRevision = valueForTag(CURRENT_TAG);
      }
      this.#inRenderTransaction = false;
    }
  }

  renderRoots(renderer: BaseRenderer): void {
    let roots = this.#roots;
    let removedRoots = this.#removedRoots;
    let initialRootsLength: number;

    do {
      initialRootsLength = roots.length;

      inTransaction(this.context.env, () => {
        // ensure that for the first iteration of the loop
        // each root is processed
        for (let i = 0; i < roots.length; i++) {
          let root = roots[i];
          assert('has root', root);

          if (root.destroyed) {
            // add to the list of roots to be removed
            // they will be removed from `this._roots` later
            removedRoots.push(root);

            // skip over roots that have been marked as destroyed
            continue;
          }

          // when processing non-initial reflush loops,
          // do not process more roots than needed
          if (i >= initialRootsLength) {
            continue;
          }

          root.render();
        }

        this.#lastRevision = valueForTag(CURRENT_TAG);
      });
    } while (roots.length > initialRootsLength);

    // remove any roots that were destroyed during this transaction
    while (removedRoots.length) {
      let root = removedRoots.pop();

      let rootIndex = roots.indexOf(root!);
      roots.splice(rootIndex, 1);
    }

    if (this.#roots.length === 0) {
      deregister(renderer);
    }
  }

  #flushScheduled = false;
  #rafHandle: number | null = null;
  #channel: MessageChannel | null = null;
  #channelArmed = false;
  #flushesThisFrame = 0;
  #lastFlushEnd = 0;

  /**
   * SPIKE: task-coalesced flushing, zoneless-Angular shaped but
   * adaptive:
   *
   * - a flush is scheduled as a race between an UNCLAMPED macrotask
   *   (MessageChannel -- setTimeout's 4ms nesting clamp would make
   *   render->microtask->set chains crawl) and requestAnimationFrame
   * - every update inside the current task + microtasks coalesces into
   *   one flush; awaited (microtask) update loops stop paying a render
   *   per resume
   * - adaptive frame alignment: when several flushes land within one
   *   frame (a sustained external stream like a worker firehose), the
   *   macrotask leg stands down and flushes ride rAF until the burst
   *   subsides
   */
  scheduleRevalidate(renderer: BaseRenderer): void {
    if (typeof requestAnimationFrame !== 'function') {
      _backburner.scheduleOnce('render', this, this.revalidate, renderer);
      return;
    }

    if (this.#flushScheduled) {
      return;
    }

    this.#flushScheduled = true;
    setFramePending(true);

    const flush = (viaFrame: boolean) => {
      if (!this.#flushScheduled) return;

      if (viaFrame) {
        this.#flushesThisFrame = 0;
        this.#rafHandle = null;
      } else {
        this.#flushesThisFrame++;
        if (this.#rafHandle !== null) {
          cancelAnimationFrame(this.#rafHandle);
          this.#rafHandle = null;
        }
      }

      this.#flushScheduled = false;
      setFramePending(false);

      _backburner.join(() => {
        this.revalidate(renderer);

        // dirt produced synchronously by the render itself (e.g. an
        // after-render effect advancing a loop) flushes in the same
        // task; only dirt arriving between tasks waits
        let guard = 0;

        while (!this.isValid() && guard++ < 1_000_000) {
          this.revalidate(renderer);
        }
      });

      this.#lastFlushEnd = performance.now();
    };

    // Distinguish dependent chains from external streams: chain dirt
    // (render -> microtask -> set) arrives ~immediately after the last
    // flush; it flushes at MICROTASK speed (same task turn, like the
    // classic runloop) so sequential render-coupled loops don't pay a
    // task hop per step. This cannot defeat coalescing of awaited
    // update loops: those drain their entire microtask chain before
    // their FIRST flush ever runs. Stream dirt (worker messages)
    // arrives whole milliseconds later in fresh tasks: it flushes on a
    // race of unclamped macrotask + rAF, standing the macrotask leg
    // down under sustained bursts so flushes ride the frame.
    const isChain = performance.now() - this.#lastFlushEnd < 1;

    if (isChain) {
      queueMicrotask(() => flush(false));
      return;
    }

    this.#rafHandle = requestAnimationFrame(() => flush(true));

    if (this.#flushesThisFrame < 3) {
      if (this.#channel === null) {
        this.#channel = new MessageChannel();
        this.#channel.port1.onmessage = () => {
          this.#channelArmed = false;
          flushViaChannel(this);
        };
      }

      if (!this.#channelArmed) {
        this.#channelArmed = true;
        this.#currentFlush = flush;
        this.#channel.port2.postMessage(null);
      }
    }
  }

  #currentFlush: ((viaFrame: boolean) => void) | null = null;

  /** @internal channel-leg trampoline */
  runChannelFlush(): void {
    this.#currentFlush?.(false);
  }

  isValid(): boolean {
    return (
      this.#destroyed || this.#roots.length === 0 || validateTag(CURRENT_TAG, this.#lastRevision)
    );
  }

  revalidate(renderer: BaseRenderer): void {
    if (this.isValid()) {
      return;
    }
    this.#renderRootsTransaction(renderer);
  }

  clearAllRoots(renderer: BaseRenderer): void {
    let roots = this.#roots;
    for (let root of roots) {
      destroy(root);
    }

    this.#removedRoots.length = 0;
    this.#roots = [];

    // if roots were present before destroying
    // deregister this renderer instance
    if (roots.length) {
      deregister(renderer);
    }
  }
}

type IntoTarget = Cursor | Element | SimpleElement;

/**
 * The returned object from `renderComponent`
 * @public
 * @module @ember/renderer
 */
export interface RenderResult {
  /**
   * Destroys the render tree and removes all rendered content from the element rendered into
   */
  destroy(): void;
}

interface RenderCacheEntry {
  result: RenderResult;
  /**
   * The GlimmerRenderResult from the last render. Used to get positional
   * information (firstNode) when a re-render replaces the content, so
   * that the new content is placed at the same DOM position.
   */
  glimmerResult: GlimmerRenderResult | undefined;
}

function intoTarget(into: IntoTarget): Cursor {
  if ('element' in into) {
    return into;
  } else {
    return { element: into as SimpleElement, nextSibling: null };
  }
}

/**
 * Render a component into a DOM element.
 *
 * @method renderComponent
 * @static
 * @for @ember/renderer
 * @param {Object} component The component to render.
 * @param {Object} options
 * @param {Element} options.into Where to render the component in to.
 * @param {Object} [options.owner] Optionally specify the owner to use. This will be used for injections, and overall cleanup.
 * @param {Object} [options.env] Optional renderer configuration
 * @param {Object} [options.args] Optionally pass args in to the component. These may be reactive as long as it is an object or object-like
 * @public
 */
export function renderComponent(
  /**
   * The component definition to render.
   *
   * Any component that has had its manager registered is valid.
   * For the component-types that ship with ember, manager registration
   * does not need to be worried about.
   */
  component: object,
  {
    owner = {},
    env,
    into,
    args,
  }: {
    /**
     * The element to render the component in to.
     */
    into: IntoTarget;

    /**
     * Optional owner. Defaults to `{}`, can be any object, but will need to implement the [Owner](https://api.emberjs.com/ember/release/classes/Owner) API for components within this render tree to access services.
     */
    owner?: object;
    /**
     * Optionally configure the rendering environment
     */
    env?: {
      /**
       * When false, modifiers will not run.
       */
      isInteractive?: boolean;
      /**
       * All other options are forwarded to the underlying renderer.
       * (its API is currently private and out of scope for this RFC,
       *  so passing additional things here is also considered private API)
       */
      [rendererOption: string]: unknown;
    };

    /**
     * These args get passed to the rendered component
     *
     * If your args are reactive, re-rendering will happen automatically.
     *
     */
    args?: Record<string, unknown>;
  }
): RenderResult {
  /**
   * SAFETY: we should figure out what we need out of a `document` and narrow the API.
   *         this exercise should also end up beginning to define what we need for CLI rendering (or to other outputs)
   */
  let document =
    env && 'document' in env
      ? (env?.['document'] as SimpleDocument | Document)
      : globalThis.document;

  // Reuse renderer per owner to avoid creating multiple EvaluationContexts
  // which can cause tracking frame conflicts
  let renderer = RENDERER_CACHE.get(owner);
  if (!renderer) {
    renderer = BaseRenderer.strict(owner, document, {
      ...env,
      isInteractive: env?.isInteractive ?? true,
      hasDOM: env && 'hasDOM' in env ? Boolean(env?.['hasDOM']) : true,
    });
    RENDERER_CACHE.set(owner, renderer);
  }

  /**
   * Replace all contents, if we've rendered multiple times.
   *
   * https://github.com/emberjs/rfcs/pull/1099/files#diff-2b962105b9083ca84579cdc957f27f49407440f3c5078083fa369ec18cc46da8R365
   *
   * We could later add an option to not do this behavior
   *
   * NOTE: destruction is async
   */
  let existing = RENDER_CACHE.get(into);
  existing?.result.destroy();
  /**
   * We can only replace the inner HTML the first time.
   * Because destruction is async, it won't be safe to
   * do this again, and we'll have to rely on the above destroy.
   */
  if (!existing && into instanceof Element) {
    into.innerHTML = '';
  }

  /**
   * If there's an existing render result with valid bounds, use its
   * firstNode as the nextSibling so that new content is inserted at
   * the same DOM position. This ensures stable ordering when multiple
   * renderComponent calls target the same element and one is re-invoked
   * (e.g., due to tracked dependency changes).
   *
   * The old content's DOM nodes are still present (destruction is async),
   * so firstNode() is a valid position reference. The new content is placed
   * BEFORE the old content. When the old content is eventually destroyed
   * (async clear of bounds), the new content remains in the correct position.
   */
  let renderTarget: IntoTarget = into;
  if (existing?.glimmerResult) {
    let parentElement =
      into instanceof Element ? (into as unknown as SimpleElement) : (into as Cursor).element;
    let firstNode = existing.glimmerResult.firstNode();
    renderTarget = { element: parentElement, nextSibling: firstNode };
  }

  let innerResult = renderer.render(component, { into: renderTarget, args }).result;

  if (innerResult) {
    associateDestroyableChild(owner, innerResult);
  }

  let result: RenderResult = {
    destroy() {
      if (innerResult) {
        destroy(innerResult);
      }
    },
  };

  RENDER_CACHE.set(into, { result, glimmerResult: innerResult });

  return result;
}

const RENDER_CACHE = new WeakMap<IntoTarget, RenderCacheEntry>();
const RENDERER_CACHE = new WeakMap<object, BaseRenderer>();

export class BaseRenderer {
  static strict(
    owner: object,
    document: SimpleDocument | Document,
    options: { isInteractive: boolean; hasDOM?: boolean }
  ) {
    return new BaseRenderer(
      owner,
      { hasDOM: hasDOM, ...options },
      document as SimpleDocument,
      new ResolverImpl(),
      clientBuilder
    );
  }

  readonly state: RendererState;

  constructor(
    owner: object,
    envOptions: { isInteractive: boolean; hasDOM: boolean },
    document: SimpleDocument,
    resolver: Resolver,
    builder: IBuilder
  ) {
    let sharedArtifacts = artifacts();

    /**
     * SAFETY: are there consequences for being looser with *this* owner?
     *         the public API for `owner` is kinda `Partial<InternalOwner>`
     *         aka: implement only what you need.
     *         But for actual ember apps, you *need* to implement everything
     *         an app needs (which will actually change and become less over time)
     */
    let env = new EmberEnvironmentDelegate(owner as InternalOwner, envOptions.isInteractive);
    let options = runtimeOptions({ document }, env, sharedArtifacts, resolver);
    let context = new EvaluationContextImpl(
      sharedArtifacts,
      (heap) => new RuntimeOpImpl(heap),
      options
    );

    this.state = RendererState.create(
      {
        owner,
        context,
        builder,
      },
      this
    );
  }

  get debugRenderTree(): DebugRenderTree {
    let { debugRenderTree } = this.state.env;

    assert(
      'Attempted to access the DebugRenderTree, but it did not exist. Is the Ember Inspector open?',
      debugRenderTree
    );

    return debugRenderTree;
  }

  isValid(): boolean {
    return this.state.isValid();
  }

  destroy() {
    destroy(this);
  }

  render(
    component: object,
    options: { into: IntoTarget; args?: Record<string, unknown> }
  ): RendererRoot {
    const root = new ComponentRootState(this.state, component, {
      args: options.args,
      into: intoTarget(options.into),
    });
    return this.state.renderRoot(root, this);
  }

  rerender(): void {
    this.state.scheduleRevalidate(this);
  }
}
