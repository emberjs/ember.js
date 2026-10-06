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
import { currentRevision } from '@glimmer/signals/lib/tags';
import type { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { hasDOM } from '../../browser-environment';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import { renderers } from './renderers';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler/lib/program-context';

/**
 * The parts of this module, in the order that they appear:
 *
 *   renderComponent()
 *         │
 *         │ finds or creates, one per owner
 *         ▼
 *   BaseRenderer ───► RendererState ───► RendererRoot[] ───► GlimmerRenderResult
 *
 *   the public        the roots and      one per             the rendered
 *   surface           the render loop    rendered tree       DOM
 *
 * Each arrow is also a destroyable parent → child link.
 * The destruction of a part destroys everything to its right.
 *
 * The run loop hooks keep every renderer in the `renderers` list current.
 * They come after `BaseRenderer`.
 */

export type IBuilder = (env: Environment, cursor: Cursor) => TreeBuilder;

type IntoTarget = Cursor | Element | SimpleElement;

const NO_OP = () => {};

/**
 * Wraps a render function so that it runs until its first error.
 * After an error, each call only warns.
 *
 * A failed render leaves the tree in an unknown state.
 * A second render on that tree throws again and hides the first error,
 * and it can repeat without end.
 *
 * Production builds return `fn` as it is.
 */
export function errorLoopTransaction(fn: () => void) {
  if (DEBUG) {
    return () => {
      let didError = true;

      try {
        fn();
        didError = false;
      } finally {
        if (didError) {
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
 * ----------------------------------------------------------------------------
 * Roots
 * ----------------------------------------------------------------------------
 */

/**
 * What `RendererState` needs from a root.
 *
 * - `ComponentRootState` is the only root that this module creates.
 * - `ClassicRootState` in `./renderer` covers outlets and classic components.
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
    /**
     * One guard covers the first render and every rerender.
     * An error in either one stops all later renders of this root.
     */
    this.#render = errorLoopTransaction(() => {
      let result = this.#result;

      if (result === undefined) {
        let iterator = glimmerRenderComponent(
          state.context,
          state.builder(state.env, options.into),
          state.owner,
          definition,
          options.args
        );

        this.#result = associateDestroyableChild(this, iterator.sync());
      } else if (!isDestroying(result)) {
        result.rerender({ alwaysRevalidate: false });
      }
    });
  }

  isFor(_possibleRoot: unknown): boolean {
    return false;
  }

  render(): void {
    /**
     * A root can be destroyed before its first render.
     * For example, a render transaction adds the root,
     * and the root is destroyed before the transaction gets to it.
     */
    if (isDestroying(this)) return;

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

/**
 * ----------------------------------------------------------------------------
 * RendererState
 * ----------------------------------------------------------------------------
 */

/**
 * The roots of one renderer, and the loop that renders them.
 */
export class RendererState {
  readonly owner: object;
  readonly context: EvaluationContext;
  readonly builder: IBuilder;

  readonly #renderer: BaseRenderer;

  #roots: RendererRoot[] = [];

  /**
   * Roots that were destroyed while `renderRoots` iterated `#roots`.
   * `renderRoots` removes them when it finishes.
   */
  #removedRoots: RendererRoot[] = [];

  /**
   * The value of the global revision counter at the end of the last render.
   * See `isValid`.
   */
  #lastRevision = -1;

  #inRenderTransaction = false;

  /**
   * True while the renderer is in the global `renderers` list.
   */
  #registered = false;

  constructor(
    renderer: BaseRenderer,
    data: { owner: object; context: EvaluationContext; builder: IBuilder }
  ) {
    this.#renderer = renderer;
    this.owner = data.owner;
    this.context = data.context;
    this.builder = data.builder;

    associateDestroyableChild(renderer, this);
    registerDestructor(this, () => this.clearAllRoots());
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

  get env(): Environment {
    return this.context.env;
  }

  get isInteractive(): boolean {
    return this.context.env.isInteractive;
  }

  /**
   * Adds a root, and renders it.
   *
   * If a render is in progress, this returns before the root renders.
   * `root.result` is then `undefined` until the next pass of `renderRoots`.
   */
  renderRoot(root: RendererRoot): RendererRoot {
    this.#roots.push(root);
    associateDestroyableChild(this, root);

    /**
     * A destroyed root must leave `#roots`.
     *
     * If it stays, the root never becomes garbage.
     * The renderer does not become garbage either,
     * because a renderer with roots stays in the global `renderers` list.
     */
    registerDestructor(root, () => {
      if (this.#inRenderTransaction) {
        if (!this.#removedRoots.includes(root)) this.#removedRoots.push(root);
      } else {
        this.#removeRoot(root);
      }
    });

    this.#register();
    this.#renderRootsTransaction();

    return root;
  }

  #renderRootsTransaction(): void {
    /**
     * The `renderRoots` call that is in progress picks up new roots.
     */
    if (this.#inRenderTransaction) return;

    this.#inRenderTransaction = true;

    let completedWithoutError = false;
    try {
      this.renderRoots();
      completedWithoutError = true;
    } finally {
      /**
       * After an error, mark the state as current.
       * If it stays invalid, `loopEnd` starts one more run loop,
       * and that run loop throws the same error again.
       */
      if (!completedWithoutError) {
        this.#lastRevision = currentRevision();
      }
      this.#inRenderTransaction = false;
    }
  }

  /**
   * Renders every root, and repeats while a render adds more roots.
   *
   * A component can call `renderComponent` while it renders.
   * The new root waits for the next pass:
   *
   *   pass 1   roots = [a, b]      render a, render b      b adds c
   *   pass 2   roots = [a, b, c]   rerender a, b           render c
   *   stop     pass 2 added no root
   *
   * A rerender of a root with no changes does no DOM work.
   */
  renderRoots(): void {
    let roots = this.#roots;
    let removedRoots = this.#removedRoots;
    let initialRootsLength: number;

    do {
      initialRootsLength = roots.length;

      inTransaction(this.context.env, () => {
        /**
         * `roots.length` is read on each iteration, because a render can
         *
         * - add roots, which this pass skips
         * - remove roots, which makes the array shorter
         */
        for (let i = 0; i < roots.length; i++) {
          let root = roots[i];
          assert('has root', root);

          if (root.destroyed) {
            removedRoots.push(root);
            continue;
          }

          if (i >= initialRootsLength) continue;

          root.render();
        }

        this.#lastRevision = currentRevision();
      });
    } while (roots.length > initialRootsLength);

    while (removedRoots.length) {
      this.#removeRoot(removedRoots.pop()!);
    }
  }

  #removeRoot(root: RendererRoot): void {
    let roots = this.#roots;
    let rootIndex = roots.indexOf(root);

    if (rootIndex !== -1) {
      roots.splice(rootIndex, 1);
    }

    if (roots.length === 0) {
      this.#deregister();
    }
  }

  #register(): void {
    if (!this.#registered) {
      this.#registered = true;
      register(this.#renderer);
    }
  }

  #deregister(): void {
    if (this.#registered) {
      this.#registered = false;
      deregister(this.#renderer);
    }
  }

  scheduleRevalidate(): void {
    _backburner.scheduleOnce('render', this, this.revalidate);
  }

  /**
   * True when there is nothing to render:
   * no roots, or no tracked value changed after the last render.
   *
   * `currentRevision()` changes with a write to any tag,
   * so one changed value anywhere in the app makes every renderer invalid.
   * Each root then finds out for itself if the change applies to it.
   */
  isValid(): boolean {
    return this.#roots.length === 0 || this.#lastRevision === currentRevision();
  }

  revalidate(): void {
    if (this.isValid()) {
      return;
    }
    this.#renderRootsTransaction();
  }

  clearAllRoots(): void {
    let roots = this.#roots;
    for (let root of roots) {
      destroy(root);
    }

    this.#removedRoots.length = 0;
    this.#roots = [];

    this.#deregister();
  }
}

/**
 * ----------------------------------------------------------------------------
 * BaseRenderer
 * ----------------------------------------------------------------------------
 */

export class BaseRenderer {
  /**
   * Creates a renderer that has no router.
   *
   * Its resolver does not know `{{outlet}}` and `{{mount}}`.
   * The `Renderer` in `./renderer` adds those.
   */
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
    resolver: ClassicResolver,
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

    this.state = new RendererState(this, { owner, context, builder });
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
      into: toCursor(options.into),
    });
    return this.state.renderRoot(root);
  }

  rerender(): void {
    this.state.scheduleRevalidate();
  }
}

/**
 * ----------------------------------------------------------------------------
 * Run loop hooks
 * ----------------------------------------------------------------------------
 *
 * Backburner emits `begin` and `end` for each run loop.
 * These two events keep every registered renderer current:
 *
 *   begin ───► loopBegin   each renderer schedules `revalidate`
 *     │                    in the `render` queue
 *     ▼
 *   queues flush           `revalidate` renders the roots,
 *     │                    if a tracked value changed
 *     ▼
 *   end ─────► loopEnd     is every renderer valid?
 *
 *                            yes → resolve `renderSettled()`
 *                            no  → start one more run loop, back to `begin`
 *
 * The answer is "no" when code that ran after the `render` queue
 * changed a tracked value.
 */

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

/**
 * The number of run loops in a row that `loopEnd` started.
 */
let loops = 0;

function loopEnd() {
  for (let renderer of renderers) {
    if (!renderer.isValid()) {
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

interface RenderSettledDeferred {
  promise: Promise<void>;
  resolve: () => void;
}

let renderSettledDeferred: RenderSettledDeferred | null = null;

/**
 * Returns a promise that resolves when rendering settles.
 *
 * Rendering is settled when every renderer is valid at the end of a run loop.
 * All callers that wait at the same time get the same promise.
 */
export function renderSettled() {
  if (renderSettledDeferred === null) {
    let resolve!: () => void;
    let promise = new Promise<void>((r) => (resolve = r));
    renderSettledDeferred = { promise, resolve };

    /**
     * Only the `end` event of a run loop resolves the promise.
     * With no run loop open, start one.
     */
    if (!_getCurrentRunLoop()) {
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
 * ----------------------------------------------------------------------------
 * renderComponent
 * ----------------------------------------------------------------------------
 */

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

interface RenderComponentEnv {
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
}

interface LastRender {
  result: RenderResult;
  /**
   * `undefined` when the render waits for a render transaction to get to it.
   */
  glimmerResult: GlimmerRenderResult | undefined;
}

/**
 * One renderer per owner.
 *
 * Two renderers for one owner have two `EvaluationContext`s,
 * and their tracking frames can conflict.
 */
const RENDERER_FOR_OWNER = new WeakMap<object, BaseRenderer>();

/**
 * The last `renderComponent` call for each element.
 * The next call for the same element replaces that content.
 *
 * The key is the element, also when the caller passes a `Cursor`.
 * A `Cursor` is a new object on each call, and it fails during application teardown.
 */
const LAST_RENDER_INTO = new WeakMap<Element | SimpleElement, LastRender>();

/**
 * The application seeds its `renderer:-dom` service which allows for
 * router-aware resolver to resolve {{mount}}
 */
export function setRenderer(owner: object, renderer: BaseRenderer): void {
  RENDERER_FOR_OWNER.set(owner, renderer);
}

/**
 * `env` applies only to the first render for an owner.
 * Later renders use the renderer that the first render created.
 */
function rendererFor(owner: object, env: RenderComponentEnv | undefined): BaseRenderer {
  let renderer = RENDERER_FOR_OWNER.get(owner);

  if (!renderer) {
    /**
     * SAFETY: we should figure out what we need out of a `document` and narrow the API.
     *         this exercise should also end up beginning to define what we need for CLI rendering (or to other outputs)
     */
    let document =
      env && 'document' in env
        ? (env['document'] as SimpleDocument | Document)
        : globalThis.document;

    renderer = BaseRenderer.strict(owner, document, {
      ...env,
      isInteractive: env?.isInteractive ?? true,
      hasDOM: env && 'hasDOM' in env ? Boolean(env['hasDOM']) : true,
    });
    RENDERER_FOR_OWNER.set(owner, renderer);
  }

  return renderer;
}

const isCursor = (into: IntoTarget): into is Cursor => 'element' in into;

const isDOMElement = (into: IntoTarget): into is Element => 'innerHTML' in into;

function toCursor(into: IntoTarget): Cursor {
  return isCursor(into) ? into : { element: into as SimpleElement, nextSibling: null };
}

/**
 * Makes room for a render into `element`, and returns where to render.
 *
 * A second `renderComponent` call for one element replaces the first
 * ([RFC 1099](https://github.com/emberjs/rfcs/blob/main/text/1099-renderComponent.md)).
 * `destroy()` only schedules the removal of the old nodes,
 * so they are still in the DOM when the new content renders.
 * The new content goes before the first old node, and keeps that position:
 *
 *   start                   <into> x a1 a2 y </into>      `a` is the last render
 *   destroy a (scheduled)   <into> x a1 a2 y </into>
 *   render b before a1      <into> x b1 b2 a1 a2 y </into>
 *   removal of a runs       <into> x b1 b2 y </into>
 *
 * `x` and `y` are nodes that `renderComponent` did not make.
 *
 * For the first render into a DOM element, there is nothing to destroy.
 * That render clears the element.
 * A `Cursor` target is never cleared.
 */
function replaceLastRender(into: IntoTarget, element: Element | SimpleElement): IntoTarget {
  let last = LAST_RENDER_INTO.get(element);

  if (last?.glimmerResult) {
    last.result.destroy();

    return { element: element as SimpleElement, nextSibling: last.glimmerResult.firstNode() };
  }

  if (!last && isDOMElement(into)) {
    into.innerHTML = '';
  }

  return into;
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
    env?: RenderComponentEnv;

    /**
     * These args get passed to the rendered component
     *
     * If your args are reactive, re-rendering will happen automatically.
     *
     */
    args?: Record<string, unknown>;
  }
): RenderResult {
  let renderer = rendererFor(owner, env);
  let element = isCursor(into) ? into.element : into;

  let root = renderer.render(component, { into: replaceLastRender(into, element), args });
  let glimmerResult = root.result;

  /**
   * The destruction of the root, and not only of its Glimmer result,
   * also removes the root from the renderer.
   * After that, nothing holds the root or `into`.
   */
  associateDestroyableChild(owner, root);

  let result: RenderResult = {
    destroy() {
      destroy(root);
    },
  };

  LAST_RENDER_INTO.set(element, { result, glimmerResult });

  if (glimmerResult) {
    /**
     * A later render into the same element can own the entry at this time.
     * Delete the entry only if it still belongs to this render.
     */
    registerDestructor(glimmerResult, () => {
      if (LAST_RENDER_INTO.get(element)?.glimmerResult === glimmerResult) {
        LAST_RENDER_INTO.delete(element);
      }
    });
  }

  return result;
}
