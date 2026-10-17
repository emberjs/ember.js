import { ENV } from '@ember/-internals/environment/lib/env';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { _backburner, _getCurrentRunLoop } from '@ember/runloop';
import {
  getGxtRenderer,
  getAmbientOwner,
  installCompilePipelinePart,
  setAmbientOwner,
} from '@ember/-internals/gxt-backend/gxt-bridge';
import {
  associateDestroyableChild,
  destroy,
  isDestroyed,
  isDestroying,
  registerDestructor,
} from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import type {
  CapturedRenderNode,
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
// The @glimmer/validator BARREL specifier below is load-bearing for the GXT
// dual backend: the rollup GXT alias map (scripts/gxt-alias-map.mjs) redirects
// the exact barrel key to the gxt-backend shim, while deep lib/* paths would
// resolve to the real vendored VM source and fork the reactive runtime in GXT
// builds. Do not convert it to a deep import.
// eslint-disable-next-line ember-local/no-barrel-imports
import { CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator';
import type { SimpleDocument, SimpleElement } from '@simple-dom/interface';
import { hasDOM } from '../../browser-environment';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import { renderers } from './renderers';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler/lib/program-context';

// Lazy accessor for @lifeart/gxt symbols through the bridge. Every call site
// below is reached only from GXT-mode code paths. Avoiding a static
// `import * as _gxt from '@lifeart/gxt'` keeps the GXT runtime (and its
// module-load side effects) out of the classic bundle.
export function _gxtLib(): any {
  // GXT-only. Body gated on the literal `__GXT_MODE__` so the `getGxtRenderer`
  // reference (and thus the whole gxt-bridge module) tree-shakes out of the
  // unminified classic dist — rollup folds `if (false)` to nothing but does NOT
  // drop the unreferenced declaration of this cyclic helper cluster.
  if (__GXT_MODE__) {
    return getGxtRenderer()?.gxtLib;
  }
}

// GXT-only: the render-pass hooks of gxt-backend/manager.ts. manager.ts installs
// the renderer bridge when it loads, which is before any GXT render.
export function gxtRenderPass() {
  return getGxtRenderer()!.renderPass;
}

// Cached GXT DOM API for destroyElementSync
let gxtDomApi: any = null;

function getGxtDomApi() {
  if (__GXT_MODE__) {
    if (!gxtDomApi) {
      gxtDomApi = new (_gxtLib().HTMLBrowserDOMApi)(document);
    }
    return gxtDomApi;
  }
}

// Wrapper that provides the GXT DOM API
export function destroyElementSync(component: any, skipDom = false) {
  if (__GXT_MODE__) {
    _gxtLib().destroyElementSync(component, skipDom, getGxtDomApi());
  }
}

// Cached GXT root context for the document
let gxtRootContext: any = null;

// Ensure GXT context is initialized before any GXT rendering
export function ensureGxtContext() {
  if (__GXT_MODE__) {
    const lib = _gxtLib();
    if (!gxtRootContext) {
      gxtRootContext = lib.createRoot(document);
      // CRITICAL: Provide the rendering context with DOM API
      // This sets fastRenderingContext which is checked first by initDOM
      const domApi = getGxtDomApi();
      lib.provideContext(gxtRootContext, lib.RENDERING_CONTEXT, domApi);
      // Share this root context with gxt-backend so it reuses it instead of
      // creating new roots that pollute the shared context chain.
      getGxtRenderer()?.compilePipeline.setRootContext?.(gxtRootContext);
    }
    // Always ensure context is set before rendering
    const currentContext = lib.getParentContext();
    if (!currentContext) {
      lib.setParentContext(gxtRootContext);
    }
    return gxtRootContext;
  }
}

// GXT-only: the `{ROOT}` node of each `renderComponent` root, by root (see
// `_renderComponentGxt`).
const GXT_ROOT_NODES = new WeakMap<RendererRoot, () => CapturedRenderNode>();

// GXT-only: the gxt roots of the `renderComponent` renders. The tree under one
// is the `{ROOT}` node of its renderer, so it is not part of the shared tree of
// the classic roots.
const GXT_RENDER_ROOTS = new WeakSet<object>();

// GXT-only: Glimmer's `isArgumentError` for the arguments a debug render tree
// capture could not read (the environment's `isArgumentCaptureError`).
function gxtIsArgumentCaptureError(value: unknown): boolean {
  return getGxtRenderer()?.debugRenderTree?.isArgumentCaptureError(value) ?? false;
}

// GXT-only: the DebugRenderTree of a renderer, backed by gxt's
// `captureRenderTree`. Only `.capture()` is reachable in GXT mode — the
// `begin`/`create`/`update`/`didRender`/`willDestroy`/`commit` bookkeeping
// lives on the classic Glimmer VM environment, which the GXT build does not
// include (see the `debugRenderTree` getter).
//
// `capture()` lists the trees of the renderer's roots, as Glimmer's debug
// render tree lists the renders of its environment:
//
// - a `renderComponent` root is its `{ROOT}` node. With the debug render tree
//   on (the renderer's environment has one), its children are the components
//   and modifiers the render recorded (gxt-backend debug-render-tree.ts);
//   without it, the tree gxt captures under the render;
// - the classic roots (application outlets, classic components) render in
//   gxt's shared tree. gxt captures it from its own registry of render roots
//   (no arguments), less the gxt roots of `renderComponent` renders. gxt
//   returns Ember-compatible `CapturedRenderNode[]` (it adds a harmless
//   `template: null` field and always reports `type: 'component'`).
//
// gxt errors propagate.
function gxtDebugRenderTree(state: RendererState): DebugRenderTree {
  // GXT-only. Body gated on the literal `__GXT_MODE__` so the `_gxtLib`
  // reference tree-shakes out of the classic dist.
  if (__GXT_MODE__) {
    const noop = (): void => {};
    return {
      begin: noop,
      create: noop,
      update: noop,
      didRender: noop,
      willDestroy: noop,
      commit: noop,
      capture: (): CapturedRenderNode[] => {
        const nodes: CapturedRenderNode[] = [];
        let hasClassicRoots = false;
        for (const root of state.roots) {
          const rootNode = GXT_ROOT_NODES.get(root);
          if (rootNode === undefined) {
            hasClassicRoots = true;
          } else if (!root.destroyed) {
            nodes.push(rootNode());
          }
        }
        if (hasClassicRoots) {
          for (const node of _gxtLib().captureRenderTree() as CapturedRenderNode[]) {
            if (!GXT_RENDER_ROOTS.has(node.instance as object)) nodes.push(node);
          }
        }
        return nodes;
      },
    } as DebugRenderTree;
  }
  throw new Error('[gxt] gxtDebugRenderTree() called outside GXT mode');
}

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
      // In GXT mode `renderComponent` escape-hatches to `_renderComponentGxt`
      // BEFORE constructing a ComponentRootState, so this class is
      // classic-only. The gate makes the VM bindings (`glimmerRenderComponent`,
      // `state.context`, `state.builder` / `state.env`) statically dead in the
      // GXT dist so the VM render loop tree-shakes out.
      if (__GXT_MODE__) {
        throw new Error(
          '[gxt] ComponentRootState reached in GXT mode; the GXT backend renders ' +
            'via _renderComponentGxt and ships no Glimmer VM render loop — no fallback.'
        );
      }

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
      if (!completedWithoutError && !__GXT_MODE__) {
        this.#lastRevision = valueForTag(CURRENT_TAG);
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
    let _renderIterations = 0;

    do {
      if (__GXT_MODE__) {
        // GXT safety limit against infinite render loops.
        if (++_renderIterations > 20) {
          break;
        }
        // GXT test-harness loop guard (DEBUG only, so it tree-shakes out of
        // the production dist).
        if (DEBUG && typeof (globalThis as any).__gxtOpCheck === 'function') {
          (globalThis as any).__gxtOpCheck();
        }
      }
      initialRootsLength = roots.length;

      const renderRootsPass = () => {
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

          // In GXT mode, lifecycle errors during re-render (destroy, didInsertElement)
          // are deferred to avoid disabling errorLoopTransaction. Re-throw them here
          // so they propagate to assert.throws() in tests.
          if (__GXT_MODE__ && (root as any).__gxtDeferredError) {
            const err = (root as any).__gxtDeferredError;
            (root as any).__gxtDeferredError = null;
            throw err;
          }
        }

        // GXT: `isValid` does not compare revisions (gxt renders the updates),
        // and reading `CURRENT_TAG` would subscribe the formula a nested
        // `renderComponent` call runs in (a helper that renders a component
        // and adds its root) to every tag: the formula would run again on any
        // change, and render the component again.
        if (!__GXT_MODE__) {
          this.#lastRevision = valueForTag(CURRENT_TAG);
        }
      };

      if (__GXT_MODE__) {
        // GXT roots never enqueue VM-transaction work (no opcodes run), and
        // the GXT renderer has no VM environment to open a transaction on
        // (see the BaseRenderer constructor). Run the pass directly.
        renderRootsPass();
      } else {
        inTransaction(this.context.env, renderRootsPass);
      }
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
   * `CURRENT_TAG` stands for every tag,
   * so one changed value anywhere in the app makes every renderer invalid.
   * Each root then finds out for itself if the change applies to it.
   */
  isValid(): boolean {
    // In GXT mode, rendering is handled by GXT's reactivity system,
    // not by the Ember renderer's revalidation loop. Always report valid
    // to prevent infinite revalidation loops in loopEnd().
    if (__GXT_MODE__) {
      return true;
    }

    return this.#roots.length === 0 || validateTag(CURRENT_TAG, this.#lastRevision);
  }

  revalidate(): void {
    // In GXT mode, isValid() returns true to prevent infinite revalidation.
    // But explicit .rerender() calls (which mark the component through
    // `compilePipeline.forceRerender`) still need a sync pass to flush the
    // hooks.
    //
    // The sync runs here, in the run loop's render queue, as Glimmer's
    // revalidation renders the roots there: an error of the update it renders
    // (the sync throws it) is thrown to the code that ran the run loop. Inside
    // `runTask` / `runAppend` (the test helpers), the helper syncs after its
    // run loop instead.
    if (__GXT_MODE__) {
      const pipeline = getGxtRenderer()?.compilePipeline;
      pipeline?.setPendingSync?.(true);
      if (!pipeline?.getRunTaskActive?.()) pipeline?.syncDomNow?.();
      return;
    }
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

// Default element builder for the classic VM render loop. Under __GXT_MODE__
// the Glimmer VM element-builder is never invoked (renderMain /
// glimmerRenderComponent are gated off and the GXT render path never touches a
// VM builder), so resolving the literal `clientBuilder` here would needlessly
// retain the VM element-builder module. Gate it behind `!__GXT_MODE__` so the
// `clientBuilder` reference is statically dead in the GXT dist; the GXT branch
// is a thrower (fail loud, no VM fallback) that is never reached at runtime.
export const defaultClientBuilder: IBuilder = __GXT_MODE__
  ? (((): never => {
      throw new Error('[gxt] Glimmer VM element builder requested in GXT mode; no VM fallback.');
    }) as unknown as IBuilder)
  : clientBuilder;

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
      defaultClientBuilder
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
    if (__GXT_MODE__) {
      // The GXT backend never executes Glimmer VM opcodes, so it builds no VM
      // evaluation context: the program heap behind one is a 4MB ArrayBuffer
      // per renderer (one renderer per test exhausted the V8 ArrayBuffer cage
      // across the cumulative GXT test run), and leaving the constructors
      // below unreferenced lets the opcode-eval core tree-shake out of the
      // GXT dist. `RendererState` only reads `context.env.isInteractive`.
      //
      // The environment has a debug render tree when `ENV._DEBUG_RENDER_TREE`
      // is on as it is created (DEBUG builds, Ember Inspector), as Glimmer's
      // environment builds one (see `_renderComponentGxt`), with the check for
      // the arguments its capture could not read.
      let debugRenderTree = ENV._DEBUG_RENDER_TREE;
      let context = {
        env: {
          isInteractive: envOptions.isInteractive,
          gxtDebugRenderTree: debugRenderTree,
          isArgumentCaptureError: debugRenderTree ? gxtIsArgumentCaptureError : undefined,
        },
      };
      this.state = new RendererState(this, {
        owner,
        context: context as unknown as EvaluationContext,
        builder,
      });
      return;
    }

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
    if (__GXT_MODE__) {
      // The classic debugRenderTree lives on the Glimmer VM environment, which
      // the GXT backend does not build. Return a minimal DebugRenderTree whose
      // `.capture()` delegates to gxt's `captureRenderTree` instead (consumed by
      // `@ember/debug`'s `captureRenderTree(owner)`, e.g. for Ember Inspector).
      return gxtDebugRenderTree(this.state);
    }

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

// In GXT mode, don't hook into backburner's begin/end events for render
// revalidation. GXT handles rendering via its own reactivity system; pending
// DOM syncs are flushed at the end of the outermost run loop (and explicitly
// by the test helpers).
if (!__GXT_MODE__) {
  _backburner.on('begin', loopBegin);
  _backburner.on('end', loopEnd);
} else {
  // Backburner fires 'end' event listeners BEFORE the onEnd option. Thus
  // we must flush GXT's pending DOM sync here (not rely on runloop.onEnd)
  // so that renderSettled()'s promise resolves AFTER the DOM is up-to-date.
  // Only flush on the outermost runloop end (nextInstance == null) and when
  // not inside runTask (which performs its own explicit sync).
  //
  // What the sync throws (an error of the update it renders) reaches the code
  // that ran the run loop, as a render error of the run loop's render queue
  // does. Thrown from this listener, it would skip the runloop's `onEnd` (the
  // reset of the current run loop, the observer flush), so it is kept here and
  // `onEnd`, the run loop's last step, throws it (`takeRunLoopEndError`).
  let endError: { error: unknown } | null = null;
  installCompilePipelinePart({
    takeRunLoopEndError() {
      const taken = endError;
      endError = null;
      return taken;
    },
  });
  _backburner.on('end', (_curr: unknown, nextInstance: unknown) => {
    loops = 0;
    const _cpBB = getGxtRenderer()?.compilePipeline;
    if (nextInstance == null && _cpBB?.getPendingSync?.() && !_cpBB?.getRunTaskActive?.()) {
      const syncNow = _cpBB?.syncDomNow;
      if (typeof syncNow === 'function') {
        try {
          syncNow();
        } catch (error) {
          endError = { error };
        }
      }
    }
    resolveRenderPromise();
  });
}

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
 * GXT-mode multi-render bookkeeping. Each `renderComponent` call into a
 * given target produces an independent render entry that tracks its own
 * (firstNode, lastNode) DOM range. Multiple entries can coexist within
 * the same target as siblings; each entry's destroy/re-render operates
 * only on the nodes inside its own range, leaving other entries
 * untouched.
 */
interface GxtRenderEntry {
  /**
   * First and last DOM node belonging to this render. The range is
   * inclusive: every node from firstNode to lastNode (walking nextSibling)
   * is owned by this entry. References update on re-render so the entry's
   * range tracks the live DOM range it occupies.
   */
  firstNode: Node | null;
  lastNode: Node | null;
  destroy: () => void;
  result: RenderResult;
  /**
   * The component definition this entry rendered. Used to dedupe
   * "spurious double-fire" cases where GXT's compiled template invokes
   * the same helper twice for a single source-level mustache (the
   * loose-mode helper-lookup path can do this). When a second
   * renderComponent call into the same target arrives in the SAME
   * runloop with the SAME (component, owner) pair as a prior entry,
   * we treat it as a duplicate of the prior call and reuse the prior
   * result instead of creating a sibling. Genuine sibling renders
   * (e.g. `{{render A 'a' owner}}\n{{render A 'a'}}`) differ in their
   * `owner` arg, so they keep distinct identities.
   */
  component: object;
  ownerObj: object;
  /**
   * The runloop instance that was active when this entry was created.
   * Used to distinguish "sibling renders within the same render pass"
   * (same runloop -> coexist) from "re-render of the same target across
   * runloop boundaries" (different runloop -> destroy prior): synchronous
   * back-to-back renders in one run() are siblings; an outer template
   * re-render that calls renderComponent again replaces.
   */
  runloop: object | null;
  /**
   * Tears down the gxt component tree of a raw gxt template function rendered
   * by this entry (see `rawGxtTemplate`), so its components' destructors run.
   */
  teardownRendered?: () => void;
  /**
   * The gxt component a raw gxt template function rendered as (see
   * `rawGxtTemplate`): its tree is the render's tree.
   */
  renderedTree?: object | null;
  /**
   * The bounds of the render, as they are now: the render's nodes are the
   * children of `boundsParent` after `boundsBefore` and before `boundsAfter`,
   * the nodes around the render (`null`: the render starts, or ends, the
   * parent's children). An update changes the nodes of the render, and the
   * nodes around it stay, so these give the render's first and last node
   * whatever an update did at its edges (`gxtEntryFirstNode` /
   * `gxtEntryLastNode`), as Glimmer's bounds of a root block do. A render
   * inserted next to this one becomes this render's neighbour (see
   * `renderIntoRegion`).
   */
  boundsParent: Element | null;
  boundsBefore: Node | null;
  boundsAfter: Node | null;
}

// The first node of a render (see `GxtRenderEntry.boundsParent`), `null` when
// the render has no nodes.
function gxtEntryFirstNode(entry: GxtRenderEntry): Node | null {
  const parent = entry.boundsParent;
  if (parent === null) return null;
  const first = entry.boundsBefore === null ? parent.firstChild : entry.boundsBefore.nextSibling;
  return first === entry.boundsAfter ? null : first;
}

// The last node of a render, `null` when the render has no nodes.
function gxtEntryLastNode(entry: GxtRenderEntry): Node | null {
  const parent = entry.boundsParent;
  if (parent === null) return null;
  const last = entry.boundsAfter === null ? parent.lastChild : entry.boundsAfter.previousSibling;
  return last === entry.boundsBefore ? null : last;
}
interface GxtRenderTargetState {
  entries: GxtRenderEntry[];
  /**
   * True once we've performed the initial innerHTML='' clear of the target.
   * Subsequent renders into the same target must NOT clear, so they appear
   * as siblings of prior render entries.
   */
  cleared: boolean;
}
const GXT_RENDER_STATE = new WeakMap<Element, GxtRenderTargetState>();

/**
 * A raw gxt template function: a strict-mode `<template>` compiled at build
 * time (e.g. `render(<template>…</template>)` in a `.gjs` test, which
 * `@ember/test-helpers` registers as the template of its render-context
 * definition). It must not be called with the owner. The compat compiler emits
 * it as a plain `function () { $_GET_ARGS(this, arguments); … }` (gxt's
 * `$_tpl` brand is native-layer only). A template factory is
 * either branded by the GXT compile pipeline (`__gxtCompiled` / `__gxtFactory`)
 * or a hand-written factory such as the integration tests' `() => template`,
 * which is an arrow (no `prototype`) or takes the owner (`length` 1).
 */
function isRawGxtTemplateFn(value: unknown): value is (...args: unknown[]) => unknown {
  if (typeof value !== 'function') return false;
  const candidate = value as unknown as Record<string, unknown>;
  return (
    !('asLayout' in value) &&
    !candidate['__gxtCompiled'] &&
    !candidate['__gxtFactory'] &&
    value.length === 0 &&
    Object.prototype.hasOwnProperty.call(value, 'prototype')
  );
}

/**
 * A template object (`render(ctx, parentElement)`) for a raw gxt template
 * function: rendered as a gxt component by gxt's own `renderComponent`, with
 * the render context's args. A re-render or the entry's destruction tears the
 * previous gxt component tree down first.
 */
function rawGxtTemplate(fn: (...args: unknown[]) => unknown, entry: GxtRenderEntry) {
  let rendered: unknown = null;
  const teardown = () => {
    if (rendered !== null) {
      const previous = rendered;
      rendered = null;
      entry.renderedTree = null;
      destroyElementSync(previous);
    }
  };
  entry.teardownRendered = teardown;
  return {
    render(ctx: any, parentElement: Element) {
      teardown();
      rendered = _gxtLib().renderComponent(fn, {
        owner: ensureGxtContext(),
        args: ctx?.args ?? {},
        element: parentElement,
        nextSibling: null,
      });
      entry.renderedTree = rendered as object | null;
    },
  };
}

/**
 * The custom component manager factory (`setComponentManager`) of a component
 * definition: its own or the nearest one on its prototype chain, as
 * `getInternalComponentManager` finds it in @glimmer/manager. A definition can
 * be a class or a plain object.
 */
function gxtCustomComponentManagerFactory(
  definition: object
): ((owner: object) => any) | undefined {
  const managers = getGxtRenderer()?.registries.componentManagers;
  if (!managers) return undefined;
  let pointer: object | null = definition;
  while (pointer && pointer !== Object.prototype && pointer !== Function.prototype) {
    const factory = managers.get(pointer);
    if (typeof factory === 'function') return factory;
    pointer = Object.getPrototypeOf(pointer);
  }
  return undefined;
}

/**
 * The internal component manager (`setInternalComponentManager`) of a
 * component definition, its own or the nearest one on its prototype chain,
 * when that manager has the `hasSubOwner` capability. A nearer custom component
 * manager (`setComponentManager`) is the definition's manager instead, as in
 * @glimmer/manager, where both live in one table.
 */
function gxtSubOwnerComponentManager(definition: object): any {
  const registries = getGxtRenderer()?.registries;
  if (!registries) return undefined;
  let pointer: object | null = definition;
  while (pointer && pointer !== Object.prototype && pointer !== Function.prototype) {
    if (registries.componentManagers.has(pointer)) return undefined;
    const manager = registries.internalManagers.get(pointer);
    if (manager !== undefined) {
      return manager.getCapabilities?.(definition)?.hasSubOwner === true ? manager : undefined;
    }
    pointer = Object.getPrototypeOf(pointer);
  }
  return undefined;
}

/**
 * GXT-specific renderComponent implementation.
 * Bypasses Glimmer VM bytecode compilation entirely.
 */
// A getter for the root argument `key` of a `renderComponent` render: it reads
// `args[key]` as Glimmer reads a root argument (`childRefFor` of the args'
// const reference, the environment's `getProp`), through gxt-backend's
// `gxtLib.readProperty`: read once, consuming the key's property tag, so a
// binding that reads it depends on that argument only (its tag, and what
// reading it consumes, e.g. a `trackedObject`'s key). It used to read the
// classic-validator bridge cell too, which every classic tag change bumps: a
// binding that read `@foo` ran again on any change anywhere, such as a write
// to another argument.
function rootArgGetter(args: Record<string, unknown>, key: string): () => unknown {
  return () => _gxtLib().readProperty(args, key);
}

function _renderComponentGxt(
  component: object,
  into: IntoTarget,
  owner: object,
  args: Record<string, unknown> | undefined,
  env: RenderComponentEnv | undefined
): RenderResult {
  const globalTemplates = getGxtRenderer()?.registries.componentTemplates;

  // The render-error queue is global. The errors queued from here on are this
  // render's: it throws the first one when it completes, and drops them when
  // its own error propagates (see the catch at the end of the render).
  const renderErrorMark = gxtRenderPass().renderErrorMark();

  // Get the target element
  const targetElement =
    into instanceof Element ? into : 'element' in into ? (into as any).element : into;

  // A render into a cursor goes before the cursor's `nextSibling`, as the
  // Glimmer element builder inserts there. A `nextSibling` that is no longer a
  // child of the element makes the insertion throw (a DOM `NotFoundError`).
  const cursorNextSibling: Node | null =
    !(into instanceof Element) && isCursor(into)
      ? (into.nextSibling as unknown as Node | null)
      : null;

  // Multi-render scoping: each renderComponent call into a target gets its
  // own (firstNode, lastNode) DOM range. Multiple renders coexist as
  // siblings (per the renderComponent RFC's "subsequent renders to the
  // same element are prepended" semantics); each entry's destroy /
  // re-render only affects its own range, not the other entries' content.
  // Capture the current runloop instance so the new entry can decide
  // whether prior entries in the same target are "siblings" (same runloop,
  // i.e. same render pass) or "stale" (different runloop, i.e. an outer
  // re-render replacing the prior content).
  const currentRunloop = _getCurrentRunLoop();

  // The render entry is created up-front so the destroy/region helpers can
  // close over a single mutable reference. firstNode/lastNode are filled in
  // after the initial render captures the actual rendered DOM range.
  const entry: GxtRenderEntry = {
    firstNode: null,
    lastNode: null,
    destroy: () => {
      /* set below */
    },
    result: undefined as unknown as RenderResult,
    component,
    ownerObj: owner,
    runloop: currentRunloop,
    boundsParent: null,
    boundsBefore: null,
    boundsAfter: null,
  };

  let targetState: GxtRenderTargetState | undefined;
  if (targetElement instanceof Element) {
    targetState = GXT_RENDER_STATE.get(targetElement);
    if (!targetState) {
      targetState = { entries: [], cleared: false };
      GXT_RENDER_STATE.set(targetElement, targetState);
    }
    // Spurious-duplicate guard: GXT's compiled template can invoke the
    // same helper-mustache twice in a single render pass when the helper
    // resolves through a loose-mode owner.lookup chain (the `{{a-helper}}`
    // path in `<Loose />` style components). Without this guard, each
    // mustache produces TWO render entries on the target — the first
    // from the helper's first invocation, the second from its spurious
    // second invocation. Dedupe by checking whether a prior entry with
    // the SAME (component, owner) tuple already exists in the same
    // runloop: if so, return the prior entry's result instead of
    // creating a sibling. Distinct siblings (different component or
    // different owner — e.g. the documented `{{render A 'a' owner}}\n
    // {{render A 'a'}}` pattern where the second omits owner) get
    // distinct identities and proceed normally.
    if (currentRunloop !== null && targetState.entries.length > 0) {
      for (const e of targetState.entries) {
        if (e.component === component && e.ownerObj === owner && e.runloop === currentRunloop) {
          // Skip the rest of the render path; we haven't mutated any
          // global state yet at this point in the function.
          return e.result;
        }
      }
    }
    // Replacement vs. sibling decision for prior entries already in this
    // target. A prior entry must be torn down (REPLACED) only when it
    // was created in a DIFFERENT runloop instance — the canonical
    // "renderComponent is eager, tracks with parent" case where an
    // outer @cached getter re-runs after a tag dirty and calls
    // renderComponent again. Plain back-to-back renderComponent calls
    // in the same runloop are kept as concurrent renders (the
    // documented "siblings" pattern of two `{{render A 'a'}}`
    // invocations in one template). Spurious-duplicate calls from the
    // same runloop with the same identity are caught earlier by the
    // dedupe check above.
    if (currentRunloop !== null && targetState.entries.length > 0) {
      const stale: GxtRenderEntry[] = [];
      for (const e of targetState.entries) {
        if (e.runloop !== currentRunloop) stale.push(e);
      }
      // What the destruction throws (a destructor, a manager's
      // destroyComponent) reaches the caller, as replacing a classic render
      // destroys the last one unguarded.
      for (const e of stale) {
        e.destroy();
      }
    }
    // Initial render into a target that has not yet been claimed by
    // renderComponent: clear any pre-existing contents of the target element.
    // A cursor with a `nextSibling` renders at that position among the
    // element's other nodes, which stay.
    if (!targetState.cleared) {
      if (cursorNextSibling === null) targetElement.innerHTML = '';
      targetState.cleared = true;
    }
  }

  // Set the ambient owner so the manager system can resolve services
  const prevOwner = getAmbientOwner();
  setAmbientOwner(owner);

  // Ensure GXT context is initialized
  ensureGxtContext();

  let destroyed = false;
  let domCleanupDone = false;
  // The render's own gxt root, and the context it rendered its template with.
  // What the render creates hangs off that root in gxt's render tree (see the
  // template's `render`), and gxt registers the destructors of what the
  // template renders at its top level on the context, so destroying the
  // context's tree destroys exactly the render.
  let renderRoot: object | null = null;
  let renderedContext: object | null = null;
  // A custom component manager (`setComponentManager`) and the component it
  // created, for its destroyComponent hook.
  let customManager: any = null;
  let customComponent: unknown = undefined;
  // The owner of everything this render renders: `owner`, or the owner a
  // `hasSubOwner` internal manager returns for its component (set below).
  let renderOwner: object = owner;
  // That manager's destroyable for its component, destroyed with the render.
  let subOwnerDestroyable: object | null = null;
  // The render's root in its renderer (set below), and the component the
  // render created (`null` for a template-only component).
  let root: RendererRoot | null = null;
  let rootInstance: unknown = null;
  // The node the render's components and modifiers are recorded under in the
  // debug render tree, when its renderer has one (set with `root`).
  let debugRoot: object | null = null;

  // Remove all DOM nodes belonging to this entry's range (firstNode through
  // lastNode, inclusive). Used for both destroy and the re-render
  // "clear my region" step. After clearing, firstNode/lastNode are reset
  // so the next render can populate them.
  const clearRegion = () => {
    let first = entry.firstNode;
    const last = entry.lastNode;
    if (!first || !last) return;
    while (first) {
      const next: Node | null = first.nextSibling;
      first.parentNode?.removeChild(first);
      if (first === last) break;
      first = next;
    }
    entry.firstNode = null;
    entry.lastNode = null;
  };

  // DOM teardown: removes this render's content range from the target.
  const doDomCleanup = () => {
    if (domCleanupDone) return;
    domCleanupDone = true;
    if (entry.firstNode || entry.lastNode) {
      clearRegion();
    }
    if (targetState) {
      const idx = targetState.entries.indexOf(entry);
      if (idx >= 0) targetState.entries.splice(idx, 1);
      // Once all entries are destroyed, drop the target's bookkeeping so a
      // future renderComponent call on the same element behaves like a
      // fresh first-render (clears any new pre-existing contents).
      if (targetState.entries.length === 0 && targetElement instanceof Element) {
        GXT_RENDER_STATE.delete(targetElement);
      }
    }
  };

  // The render's bindings stop and its blocks and components are destroyed,
  // as destroying a Glimmer render result destroys its tree.
  const destroyRenderTree = () => {
    if (renderedContext !== null) {
      const context = renderedContext;
      renderedContext = null;
      destroyElementSync(context, true);
    }
    if (renderRoot !== null) {
      const gxtRoot = renderRoot;
      renderRoot = null;
      GXT_RENDER_ROOTS.delete(gxtRoot);
      destroyElementSync(gxtRoot, true);
    }
  };

  // Synchronous teardown: destroy the render's tree and remove its DOM range.
  // Cross-runloop replacement (the eager case) needs sync DOM cleanup so the
  // new render appears alone; the sibling case never reaches doDestroy until
  // the user explicitly calls result.destroy() (e.g. via owner destruction), at
  // which point sync cleanup is also correct.
  const doDestroy = () => {
    if (destroyed) return;
    destroyed = true;
    entry.teardownRendered?.();
    destroyRenderTree();
    doDomCleanup();
    if (
      customManager?.capabilities?.destructor &&
      typeof customManager.destroyComponent === 'function'
    ) {
      customManager.destroyComponent(customComponent);
    }
    if (subOwnerDestroyable !== null) {
      destroy(subOwnerDestroyable);
    }
    // The root leaves its renderer (the destructor `RendererState.renderRoot`
    // registered), and a renderer without roots leaves the renderer list.
    if (root !== null) {
      destroy(root);
    }
  };
  entry.destroy = doDestroy;

  // Render the template into the target. The "direct" path renders into
  // the target (zero DOM movement, letting GXT's processNodes wire
  // effects against the actual ancestor chain) and is used whenever the
  // parent has no foreign live content from OTHER entries and the render goes
  // at its end. The "insert" path renders into a temporary host of the same
  // tag, then moves the resulting children before the cursor's `nextSibling`,
  // or to the FRONT of the actual parent — this gives the documented
  // "subsequent renders are prepended" behavior while preserving live sibling
  // content from prior render entries on the same target.
  const renderTemplate = (template: any, ctx: any, parent: Element) => {
    if (renderRoot === null) {
      const lib = _gxtLib();
      renderRoot = lib.createRoot(document) as object;
      lib.provideContext(renderRoot, lib.RENDERING_CONTEXT, getGxtDomApi());
      GXT_RENDER_ROOTS.add(renderRoot);
    }
    if (ctx !== null && typeof ctx === 'object') renderedContext = ctx;
    template.render(ctx, parent, renderRoot);
  };
  const renderIntoRegion = (template: any, ctx: any) => {
    if (!(targetElement instanceof Element)) {
      renderTemplate(template, ctx, targetElement);
      return;
    }
    const parent: Element = targetElement;
    let hasForeignLiveContent = false;
    if (targetState) {
      for (const e of targetState.entries) {
        if (e === entry) continue;
        if (e.firstNode && e.firstNode.parentNode === parent) {
          hasForeignLiveContent = true;
          break;
        }
      }
    }
    if (!hasForeignLiveContent && cursorNextSibling === null) {
      const lastBefore = parent.lastChild;
      renderTemplate(template, ctx, parent);
      entry.firstNode = parent.firstChild;
      entry.lastNode = parent.lastChild;
      entry.boundsParent = parent;
      entry.boundsBefore = lastBefore;
      entry.boundsAfter = null;
      // A render of this target that ended the parent now ends before this one.
      const firstRendered = lastBefore === null ? parent.firstChild : lastBefore.nextSibling;
      if (firstRendered !== null) {
        for (const e of targetState?.entries ?? []) {
          if (e !== entry && e.boundsParent === parent && e.boundsAfter === null) {
            e.boundsAfter = firstRendered;
          }
        }
      }
      return;
    }
    // Insert render: render into a temporary host of the same tag and namespace
    // (so any tag-sensitive child construction inside <table>, <select>, <svg>,
    // etc. keeps the same parent context), then move the children before the
    // cursor's `nextSibling`, or to the FRONT of the actual parent.
    const host = parent.namespaceURI
      ? document.createElementNS(parent.namespaceURI, parent.localName)
      : document.createElement(parent.localName);
    renderTemplate(template, ctx, host);
    const insertBefore = cursorNextSibling ?? parent.firstChild;
    const previous = insertBefore === null ? parent.lastChild : insertBefore.previousSibling;
    const firstCollected: Node | null = host.firstChild;
    const lastCollected: Node | null = host.lastChild;
    if (firstCollected !== null && lastCollected !== null) {
      const frag = document.createDocumentFragment();
      while (host.firstChild) {
        frag.appendChild(host.firstChild);
      }
      parent.insertBefore(frag, insertBefore);
      entry.firstNode = firstCollected;
      entry.lastNode = lastCollected;
      // The renders of this target that were next to the insertion point now
      // have this render as their neighbour.
      for (const e of targetState?.entries ?? []) {
        if (e === entry || e.boundsParent !== parent) continue;
        if (e.boundsBefore === previous) {
          e.boundsBefore = lastCollected;
        } else if (e.boundsAfter === insertBefore) {
          e.boundsAfter = firstCollected;
        }
      }
    }
    entry.boundsParent = parent;
    entry.boundsBefore = previous;
    entry.boundsAfter = insertBefore;
  };

  // The `{ROOT}` node of the render in its renderer's debug render tree, as
  // Glimmer names the root component of a `renderComponent` render: the
  // component the render created, the render's arguments and bounds, and the
  // nodes under it: those the render recorded (`debugRoot`), else the tree gxt
  // captures under the render.
  const captureRootNode = (): CapturedRenderNode => {
    const named: Record<string, unknown> = {};
    if (args) {
      for (const key of Object.keys(args)) named[key] = args[key];
    }
    const debugRenderTree = getGxtRenderer()?.debugRenderTree;
    let captured: CapturedRenderNode | undefined;
    if (debugRoot !== null && debugRenderTree !== undefined) {
      captured = debugRenderTree.capture(debugRoot);
    } else {
      const tree = entry.renderedTree ?? renderRoot;
      captured =
        tree !== null && tree !== undefined
          ? (_gxtLib().captureRenderTree([tree]) as CapturedRenderNode[])[0]
          : undefined;
    }
    const parentElement = entry.boundsParent;
    const firstNode = gxtEntryFirstNode(entry);
    const lastNode = gxtEntryLastNode(entry);
    return {
      id: captured?.id ?? '',
      type: 'component',
      name: '{ROOT}',
      args: { positional: [], named },
      instance: rootInstance,
      bounds:
        parentElement !== null && firstNode !== null && lastNode !== null
          ? ({ parentElement, firstNode, lastNode } as unknown as CapturedRenderNode['bounds'])
          : null,
      children: captured?.children ?? [],
    };
  };

  // The render is a root of its owner's renderer, as a Glimmer
  // `renderComponent` render is (`RendererState.renderRoot`): the renderer is
  // in Ember's renderer list while it has roots (`captureRenderTree`, Ember
  // Inspector, read the list), and destroying the render removes its root.
  // The root is added before the render, so the roots keep the order of their
  // renders. gxt updates a render in place, so a render pass of the renderer
  // has nothing to render for it (`render`), and the render does not wait for
  // a pass in progress: a render made during another one (a nested
  // `renderComponent`) renders now, as every GXT render does. The root's
  // `result` has the bounds of the render.
  let rendered = false;
  const rootResult = {
    parentElement: () => entry.boundsParent,
    firstNode: () => gxtEntryFirstNode(entry),
    lastNode: () => gxtEntryLastNode(entry),
  } as unknown as GlimmerRenderResult;
  const addRoot = () => {
    const rendererRoot: RendererRoot = {
      type: 'component',
      get result() {
        return rendered ? rootResult : undefined;
      },
      get destroyed() {
        return destroyed;
      },
      render() {
        // gxt updates the render in place.
      },
      destroy: doDestroy,
      isFor: () => false,
    };
    root = rendererRoot;
    GXT_ROOT_NODES.set(rendererRoot, captureRootNode);
    const renderer = rendererFor(owner, env);
    // The render records its components and modifiers when its renderer has a
    // debug render tree, as Glimmer's environment records them in one.
    const rendererEnv = renderer.state.env as unknown as { gxtDebugRenderTree?: boolean };
    if (rendererEnv.gxtDebugRenderTree === true) {
      debugRoot = getGxtRenderer()?.debugRenderTree?.createRoot() ?? null;
    }
    renderer.state.renderRoot(rendererRoot);
    registerDestructor(rendererRoot, doDestroy);
  };

  try {
    addRoot();

    // Resolve template from COMPONENT_TEMPLATES
    let template = globalTemplates?.get(component);

    // Walk prototype chain if not found directly (for class-based components)
    if (!template && component) {
      let proto = Object.getPrototypeOf(component);
      while (proto && proto !== Function.prototype && proto !== Object.prototype) {
        template = globalTemplates?.get(proto);
        if (template) break;
        proto = Object.getPrototypeOf(proto);
      }
    }

    // If template is a factory function, call it with owner to get actual
    // template. A raw gxt template function renders as a gxt component.
    if (typeof template === 'function' && !template.render) {
      template = isRawGxtTemplateFn(template) ? rawGxtTemplate(template, entry) : template(owner);
    }

    // A component class with a component manager (its own or a base class's)
    // and no registered template: a class with a class-body `<template>`,
    // which gxt compiles to an instance field rather than a
    // `setComponentTemplate` call. gxt renders the class as it renders one
    // invoked in a template: the component manager creates the component and
    // renders that template (gxt-backend manager.ts).
    const classBodyComponent =
      !template &&
      typeof component === 'function' &&
      gxtCustomComponentManagerFactory(component) !== undefined;
    if (classBodyComponent) {
      template = rawGxtTemplate(component as (...args: unknown[]) => unknown, entry);
    }

    // A raw gxt template function that is the component itself, which no
    // component manager handles: a `<template>` expression
    // (`renderComponent(<template>…</template>)` in a `.gjs` module) is a
    // template-only component, and the compat compiler emits it as its
    // template function alone, with no definition around it. It renders as its
    // own template.
    const ownTemplateComponent =
      !template &&
      isRawGxtTemplateFn(component) &&
      (globalThis as any).$_MANAGERS?.component?.canHandle?.(component) !== true;
    if (ownTemplateComponent) {
      template = rawGxtTemplate(component as (...args: unknown[]) => unknown, entry);
    }

    if (!template || !template.render) {
      // No template found — try using the manager system directly
      const managers = (globalThis as any).$_MANAGERS;
      if (managers?.component?.canHandle?.(component)) {
        // The root arguments, read as Glimmer reads them (see `rootArgGetter`).
        const gxtArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            Object.defineProperty(gxtArgs, key, {
              get: rootArgGetter(args, key),
              enumerable: true,
              configurable: true,
            });
          }
        }
        const handleResult = managers.component.handle(component, gxtArgs, null, { owner });
        let nodes: Node | null = null;
        if (typeof handleResult === 'function') {
          nodes = handleResult();
        } else {
          nodes = handleResult;
        }
        if (nodes instanceof Node) {
          if (targetElement instanceof Element) {
            // Insert before the cursor's `nextSibling`, or prepend (matches
            // the documented "subsequent renders are prepended" semantic) and
            // capture the inserted node as both firstNode and lastNode of
            // this entry so destroy can scope.
            const insertBefore = cursorNextSibling ?? targetElement.firstChild;
            entry.boundsParent = targetElement;
            entry.boundsBefore =
              insertBefore === null ? targetElement.lastChild : insertBefore.previousSibling;
            entry.boundsAfter = insertBefore;
            targetElement.insertBefore(nodes, insertBefore);
            entry.firstNode = nodes;
            entry.lastNode = nodes;
          } else {
            (targetElement as Element).appendChild(nodes);
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('[renderComponent GXT] No GXT template found for component:', component);
      }
      gxtRenderPass().flushRenderErrors(renderErrorMark);
      rendered = true;

      const result: RenderResult = { destroy: doDestroy };
      entry.result = result;
      if (targetState) {
        targetState.entries.unshift(entry);
      }
      // Register destructor on owner so owner.destroy() cleans up DOM. An
      // owner that is being destroyed throws, as classic's
      // `associateDestroyableChild(owner, root)` does.
      registerDestructor(owner, doDestroy);
      return result;
    }

    // A root render invokes its component dynamically, as Glimmer's
    // VIRTUAL_ROOT_SCOPE opcode does: when the component's internal manager has
    // the `hasSubOwner` capability, the manager creates the component with the
    // caller's owner, and what the component renders sees
    // `manager.getOwner(state)` as its owner (the components it creates, the
    // components, helpers and services looked up in it). Its `this` is the
    // manager's self; this renders the template with no component, as a
    // template-only component. Glimmer passes the manager VM arguments only
    // for `createArgs`, which a GXT render has none of.
    const subOwnerManager = gxtSubOwnerComponentManager(component);
    if (subOwnerManager !== undefined) {
      const state = subOwnerManager.create(owner, component, null, {}, null, null, false);
      renderOwner = subOwnerManager.getOwner(state);
      subOwnerDestroyable = subOwnerManager.getDestroyable(state) ?? null;
      setAmbientOwner(renderOwner);
    }

    // A definition with a custom component manager (a class or a plain
    // object) renders the context its manager creates; a class without one is
    // instantiated; anything else is template-only and renders with `{}`.
    const isClass = typeof component === 'function' && component.prototype;
    const customManagerFactory = gxtCustomComponentManagerFactory(component);
    const isTemplateOnly =
      subOwnerManager !== undefined ||
      classBodyComponent ||
      ownTemplateComponent ||
      (!isClass && !customManagerFactory) ||
      (component as any).__templateOnly === true ||
      getGxtRenderer()?.compilePipeline.isTemplateOnlyDefinition?.(component) === true ||
      getGxtRenderer()?.registries.internalManagers.has(component) === true;

    let instance: any = null;

    // The component is created as part of the render, as Glimmer creates it in
    // the render transaction: what its constructor writes (a tracked field, a
    // `trackedArray` it pushes to) is the state the render starts from, not a
    // change for the next sync to render again.
    const createComponentInstance = () => {
      if (!isTemplateOnly) {
        const ComponentClass = component as any;

        if (customManagerFactory) {
          const manager = customManagerFactory(owner);
          if (manager && typeof manager.createComponent === 'function') {
            customManager = manager;
            // The named args are read lazily, like Glimmer's args proxy.
            const namedArgs: Record<string, unknown> = {};
            if (args) {
              for (const key of Object.keys(args)) {
                Object.defineProperty(namedArgs, key, {
                  get: rootArgGetter(args, key),
                  enumerable: true,
                  configurable: true,
                });
              }
            }
            customComponent = manager.createComponent(component, {
              named: namedArgs,
              positional: [],
            });
            instance = customComponent;
            // Get the rendering context from the manager
            if (typeof manager.getContext === 'function') {
              const ctx = manager.getContext(customComponent);
              if (ctx && ctx !== instance) {
                // Use the manager's context as the render context
                instance = ctx;
              }
            }
          }
        }

        if (!instance && isClass) {
          if (typeof ComponentClass.create === 'function') {
            instance = ComponentClass.create(Object.assign({}, args || {}, { owner }));
          } else {
            instance = new ComponentClass(owner, args || {});
          }
        }

        // Set args on Glimmer-style components
        if (instance && args) {
          if (!instance.args) {
            instance.args = {};
          }
          // Use Object.keys + defineProperty instead of Object.entries to avoid
          // eagerly evaluating arg getters. Arg getters may have side effects
          // (e.g., tracking steps in tests) and should only be called lazily.
          for (const key of Object.keys(args)) {
            Object.defineProperty(instance.args, key, {
              get: rootArgGetter(args, key),
              enumerable: true,
              configurable: true,
            });
          }
        }
      }
    };
    const withCurrentlyRendering = getGxtRenderer()?.compilePipeline.withCurrentlyRendering;
    if (typeof withCurrentlyRendering === 'function') {
      withCurrentlyRendering(createComponentInstance);
    } else {
      createComponentInstance();
    }
    rootInstance = instance;

    // Build render context with reactive arg getters
    const renderContext: any = instance || {};
    if (args) {
      // For template-only components, args go directly on the context as getters
      if (!instance) {
        for (const key of Object.keys(args)) {
          Object.defineProperty(renderContext, key, {
            get: rootArgGetter(args, key),
            enumerable: true,
            configurable: true,
          });
        }
      }
      // The args object the template reads `@foo` from (see `rootArgGetter`).
      const argsObj: any = {};
      for (const key of Object.keys(args)) {
        Object.defineProperty(argsObj, key, {
          get: rootArgGetter(args, key),
          enumerable: true,
          configurable: true,
        });
      }
      renderContext.args = argsObj;
    }
    if (!customManager) {
      renderContext.owner = renderOwner;
    } else if (!('owner' in renderContext)) {
      // A custom manager's context is its own object: it keeps an `owner` it
      // already has, and the one added here is not enumerable.
      Object.defineProperty(renderContext, 'owner', {
        value: owner,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }

    // Render inside `withRendering` so GXT formulas created during
    // template.render() properly track cell dependencies (e.g., trackedObject
    // cells). It is a depth counter, so nested renders are handled correctly.
    //
    // The render updates in place: a binding re-evaluates when what it read
    // changes, as Glimmer's revalidation re-runs only the opcodes whose tags
    // changed. Nothing renders the root again, and a render made while another
    // one is in progress (a nested `renderComponent`) is as live as any other.
    //
    // What it renders is recorded under its own debug render tree node, or not
    // at all (a render made during another one is not part of that one's tree).
    const _withRendering = getGxtRenderer()?.compilePipeline.withRendering;
    const debugRenderTree = getGxtRenderer()?.debugRenderTree;
    const renderRegion = () =>
      debugRenderTree === undefined
        ? renderIntoRegion(template, renderContext)
        : debugRenderTree.renderWith(debugRoot, () => renderIntoRegion(template, renderContext));
    if (typeof _withRendering === 'function') {
      _withRendering(renderRegion);
    } else {
      renderRegion();
    }

    // Flush queued didInsertElement / didRender hooks. What a hook throws
    // aborts the render (below), as a hook error in Glimmer's commit does.
    gxtRenderPass().flushAfterInsertQueue();
    // didCreateComponent runs once the render and its children's hooks are
    // done, as Glimmer's transaction commit runs it.
    if (
      customManager?.capabilities?.asyncLifecycleCallbacks &&
      typeof customManager.didCreateComponent === 'function'
    ) {
      customManager.didCreateComponent(customComponent);
    }
    gxtRenderPass().flushRenderErrors(renderErrorMark);
    rendered = true;
  } catch (error) {
    // The caller receives this error and no result, so nothing can destroy
    // this render: what it rendered before the error is destroyed here, and
    // its root leaves its renderer. (A classic root whose render failed stops
    // rendering too, see errorLoopTransaction.)
    destroyed = true;
    entry.teardownRendered?.();
    destroyRenderTree();
    if (root !== null) {
      destroy(root);
    }
    // The queue can hold a copy of the caller's error (several sites queue an
    // error and also throw it) or errors of this same aborted render; left
    // there, the next unrelated render would throw them.
    gxtRenderPass().dropRenderErrors(renderErrorMark);
    throw error;
  } finally {
    setAmbientOwner(prevOwner);
  }

  const result: RenderResult = { destroy: doDestroy };
  entry.result = result;
  if (targetState) {
    targetState.entries.unshift(entry);
  }

  // Register destructor on owner so that destroying the owner cleans up the DOM.
  // An owner that is being destroyed throws, as classic's
  // `associateDestroyableChild(owner, root)` does.
  registerDestructor(owner, doDestroy);

  return result;
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
  // GXT escape hatch: bypass Glimmer VM entirely for GXT mode.
  // This avoids bytecode compilation which crashes with GXT templates.
  if (__GXT_MODE__) {
    return _renderComponentGxt(component, into, owner, args, env);
  }

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
