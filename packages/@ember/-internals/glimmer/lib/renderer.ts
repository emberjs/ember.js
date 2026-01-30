import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import type { InternalOwner } from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { getViewElement, getViewId } from '@ember/-internals/views';
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
  Bounds,
  Cursor,
  DebugRenderTree,
  Environment,
  DynamicScope as GlimmerDynamicScope,
  RenderResult as GlimmerRenderResult,
  Template,
  TemplateFactory,
  EvaluationContext,
  CurriedComponent,
  TreeBuilder,
  ClassicResolver,
} from '@glimmer/interfaces';

import type { Nullable } from '@ember/-internals/utility-types';
import { artifacts, RuntimeOpImpl } from '@glimmer/program';
import type { Reference } from '@glimmer/reference';
import { createConstRef, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
import type { CurriedValue } from '@glimmer/runtime';
import {
  clientBuilder,
  createCapturedArgs,
  curry,
  EMPTY_POSITIONAL,
  inTransaction,
  renderComponent as glimmerRenderComponent,
  renderMain,
  runtimeOptions,
} from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { unwrapTemplate } from './component-managers/unwrap-template';
import { CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator';
import type { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import RSVP from 'rsvp';
import type Component from './component';
import { hasDOM } from '../../browser-environment';
import type ClassicComponent from './component';
import { BOUNDS } from './component-managers/curly';
import { createRootOutlet } from './component-managers/outlet';
import { RootComponentDefinition } from './component-managers/root';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import type { OutletState } from './utils/outlet';
import OutletView from './views/outlet';
import { makeRouteTemplate } from './component-managers/route-template';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler';

type IBuilder = (env: Environment, cursor: Cursor) => TreeBuilder;

// This wrapper logic prevents us from rerendering in case of a hard failure
// during render. This prevents infinite revalidation type loops from occuring,
// and ensures that errors are not swallowed by subsequent follow on failures.
function errorLoopTransaction(fn: () => void) {
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

type RootState = ClassicRootState | ComponentRootState;

class ComponentRootState {
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

  isFor(_component: ClassicComponent): boolean {
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

class ClassicRootState {
  readonly type = 'classic';
  public id: string;
  public result: GlimmerRenderResult | undefined;
  public destroyed: boolean;
  public render: () => void;
  readonly env: Environment;

  constructor(
    public root: Component | OutletView,
    context: EvaluationContext,
    owner: object,
    template: Template,
    self: Reference<unknown>,
    parentElement: SimpleElement,
    dynamicScope: DynamicScope,
    builder: IBuilder
  ) {
    assert(
      `You cannot render \`${valueForRef(self)}\` without a template.`,
      template !== undefined
    );

    this.id = root instanceof OutletView ? guidFor(root) : getViewId(root);
    this.result = undefined;
    this.destroyed = false;
    this.env = context.env;

    this.render = errorLoopTransaction(() => {
      let layout = unwrapTemplate(template).asLayout();

      let iterator = renderMain(
        context,
        owner,
        self,
        builder(context.env, { element: parentElement, nextSibling: null }),
        layout,
        dynamicScope
      );

      let result = (this.result = iterator.sync());

      associateDestroyableChild(owner, result);

      this.render = errorLoopTransaction(() => {
        if (isDestroying(result) || isDestroyed(result)) return;

        return result.rerender({
          alwaysRevalidate: false,
        });
      });
    });
  }

  isFor(possibleRoot: unknown): boolean {
    return this.root === possibleRoot;
  }

  destroy() {
    let { result, env } = this;

    this.destroyed = true;

    this.root = null as any;
    this.result = undefined;
    this.render = undefined as any;

    if (result !== undefined) {
      /*
       Handles these scenarios:

       * When roots are removed during standard rendering process, a transaction exists already
         `.begin()` / `.commit()` are not needed.
       * When roots are being destroyed manually (`component.append(); component.destroy() case), no
         transaction exists already.
       * When roots are being destroyed during `Renderer#destroy`, no transaction exists

       */

      inTransaction(env, () => destroy(result!));
    }
  }
}

const renderers: BaseRenderer[] = [];

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

let renderSettledDeferred: RSVP.Deferred<void> | null = null;
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
    renderSettledDeferred = RSVP.defer();
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

interface ViewRegistry {
  [viewId: string]: unknown;
}

type Resolver = ClassicResolver;

interface RendererData {
  owner: object;
  context: EvaluationContext;
  builder: IBuilder;
}

class RendererState {
  static create(data: RendererData, renderer: BaseRenderer): RendererState {
    const state = new RendererState(data, renderer);
    associateDestroyableChild(renderer, state);
    return state;
  }

  readonly #data: RendererData;
  #lastRevision = -1;
  #inRenderTransaction = false;
  #destroyed = false;
  #roots: RootState[] = [];
  #removedRoots: RootState[] = [];

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

  renderRoot(root: RootState, renderer: BaseRenderer): RootState {
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

  scheduleRevalidate(renderer: BaseRenderer): void {
    _backburner.scheduleOnce('render', this, this.revalidate, renderer);
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

      // Proposed public API?
      // this family of functions could render to anything
      // (terminal, mobile, webgl, database, whatever)
      emitText;
      emitComponent;
      emitElement;
      applyAttributes;
      applyModifier;
      emitTemplate;
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
  let renderer = BaseRenderer.strict(owner, document, {
    ...env,
    isInteractive: env?.isInteractive ?? true,
    hasDOM: env && 'hasDOM' in env ? Boolean(env?.['hasDOM']) : true,
  });

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
  existing?.destroy();
  /**
   * We can only replace the inner HTML the first time.
   * Because destruction is async, it won't be safe to
   * do this again, and we'll have to rely on the above destroy.
   */
  if (!existing && into instanceof Element) {
    into.innerHTML = '';
  }

  let innerResult = renderer.render(component, { into, args }).result;

  if (innerResult) {
    associateDestroyableChild(owner, innerResult);
  }

  let result = {
    destroy() {
      if (innerResult) {
        destroy(innerResult);
      }
    },
  };

  RENDER_CACHE.set(into, result);

  return result;
}

const RENDER_CACHE = new WeakMap<IntoTarget, RenderResult>();

export class BaseRenderer {
  static strict(
    owner: object,
    document: SimpleDocument | Document,
    options: { isInteractive: boolean; hasDOM?: boolean }
  ) {
    /* ... */
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
  ): RootState {
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
