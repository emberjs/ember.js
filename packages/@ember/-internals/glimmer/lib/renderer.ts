import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import type { InternalOwner } from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { getViewElement, getViewId } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { _backburner, _getCurrentRunLoop } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import type {
  Bounds,
  Cursor,
  DebugRenderTree,
  DynamicScope as GlimmerDynamicScope,
  Environment,
  RenderResult,
  Template,
  TemplateFactory,
  EvaluationContext,
  CurriedComponent,
  TreeBuilder,
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
  renderMain,
  runtimeOptions,
} from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { unwrapTemplate } from './component-managers/unwrap-template';
import { CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator';
import type { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import RSVP from 'rsvp';
import type Component from './component';
import { BOUNDS } from './component-managers/curly';
import { createRootOutlet } from './component-managers/outlet';
import { RootComponentDefinition } from './component-managers/root';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import type { OutletState } from './utils/outlet';
import OutletView from './views/outlet';
import { makeRouteTemplate } from './component-managers/route-template';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler';

export type IBuilder = (env: Environment, cursor: Cursor) => TreeBuilder;

export interface View {
  parentView: Nullable<View>;
  renderer: Renderer;
  tagName: string | null;
  elementId: string | null;
  isDestroying: boolean;
  isDestroyed: boolean;
  [BOUNDS]: Bounds | null;
}

export class DynamicScope implements GlimmerDynamicScope {
  constructor(
    public view: View | null,
    public outletState: Reference<OutletState | undefined>
  ) {}

  child() {
    return new DynamicScope(this.view, this.outletState);
  }

  get(key: 'outletState'): Reference<OutletState | undefined> {
    assert(
      `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    return this.outletState;
  }

  set(key: 'outletState', value: Reference<OutletState | undefined>) {
    assert(
      `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    this.outletState = value;
    return value;
  }
}

const NO_OP = () => {};

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

class RootState {
  public id: string;
  public result: RenderResult | undefined;
  public destroyed: boolean;
  public render: () => void;
  readonly env: Environment;

  constructor(
    public root: Component | OutletView,
    context: EvaluationContext,
    owner: InternalOwner,
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

      // override .render function after initial render
      this.render = errorLoopTransaction(() => result.rerender({ alwaysRevalidate: false }));
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

const renderers: Renderer[] = [];

export function _resetRenderers() {
  renderers.length = 0;
}

function register(renderer: Renderer): void {
  assert('Cannot register the same renderer twice', renderers.indexOf(renderer) === -1);
  renderers.push(renderer);
}

function deregister(renderer: Renderer): void {
  let index = renderers.indexOf(renderer);
  assert('Cannot deregister unknown unregistered renderer', index !== -1);
  renderers.splice(index, 1);
}

function loopBegin(): void {
  for (let renderer of renderers) {
    renderer._scheduleRevalidate();
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
    if (!renderer._isValid()) {
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

export class Renderer {
  private _rootTemplate: Template;
  private _viewRegistry: ViewRegistry;
  private _roots: RootState[];
  private _removedRoots: RootState[];
  private _builder: IBuilder;
  private _inRenderTransaction = false;

  private _owner: InternalOwner;
  private _context: EvaluationContext;

  private _lastRevision = -1;
  private _destroyed = false;

  /** @internal */
  _isInteractive: boolean;

  readonly _runtimeResolver: ResolverImpl;
  readonly env: Environment;

  static create(props: { _viewRegistry: any }): Renderer {
    let { _viewRegistry } = props;
    let owner = getOwner(props);
    assert('Renderer is unexpectedly missing an owner', owner);
    let document = owner.lookup('service:-document') as SimpleDocument;
    let env = owner.lookup('-environment:main') as {
      isInteractive: boolean;
      hasDOM: boolean;
    };
    let rootTemplate = owner.lookup(P`template:-root`) as TemplateFactory;
    let builder = owner.lookup('service:-dom-builder') as IBuilder;
    return new this(owner, document, env, rootTemplate, _viewRegistry, builder);
  }

  constructor(
    owner: InternalOwner,
    document: SimpleDocument,
    envOptions: { isInteractive: boolean; hasDOM: boolean },
    rootTemplate: TemplateFactory,
    viewRegistry: ViewRegistry,
    builder = clientBuilder
  ) {
    this._owner = owner;
    this._rootTemplate = rootTemplate(owner);
    this._viewRegistry = viewRegistry || owner.lookup('-view-registry:main');
    this._roots = [];
    this._removedRoots = [];
    this._builder = builder;
    this._isInteractive = envOptions.isInteractive;

    let sharedArtifacts = artifacts();

    // resolver is exposed for tests
    let resolver = (this._runtimeResolver = new ResolverImpl());
    let env = new EmberEnvironmentDelegate(owner, envOptions.isInteractive);
    let options = runtimeOptions({ document }, env, sharedArtifacts, resolver);

    this._context = new EvaluationContextImpl(
      sharedArtifacts,
      (heap) => new RuntimeOpImpl(heap),
      options
    );
    this.env = this._context.env;
  }

  get debugRenderTree(): DebugRenderTree {
    let { debugRenderTree } = this.env;

    assert(
      'Attempted to access the DebugRenderTree, but it did not exist. Is the Ember Inspector open?',
      debugRenderTree
    );

    return debugRenderTree;
  }

  // renderer HOOKS

  appendOutletView(view: OutletView, target: SimpleElement): void {
    // TODO: This bypasses the {{outlet}} syntax so logically duplicates
    // some of the set up code. Since this is all internal (or is it?),
    // we can refactor this to do something more direct/less convoluted
    // and with less setup, but get it working first
    let outlet = createRootOutlet(view);
    let { name, /* controller, */ template } = view.state;

    let named = dict<Reference>();

    named['Component'] = createConstRef(
      makeRouteTemplate(view.owner, name, template as Template),
      '@Component'
    );

    // TODO: is this guaranteed to be undefined? It seems to be the
    // case in the `OutletView` class. Investigate how much that class
    // exists as an internal implementation detail only, or if it was
    // used outside of core. As far as I can tell, test-helpers uses
    // it but only for `setOutletState`.
    // named['controller'] = createConstRef(controller, '@controller');
    // Update: at least according to the debug render tree tests, we
    // appear to always expect this to be undefined. Not a definitive
    // source by any means, but is useful evidence
    named['controller'] = UNDEFINED_REFERENCE;
    named['model'] = UNDEFINED_REFERENCE;

    let args = createCapturedArgs(named, EMPTY_POSITIONAL);

    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, outlet, view.owner, args, true),
      target
    );
  }

  appendTo(view: Component, target: SimpleElement): void {
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, definition, this._owner, null, true),
      target
    );
  }

  _appendDefinition(
    root: OutletView | Component,
    definition: CurriedValue,
    target: SimpleElement
  ): void {
    let self = createConstRef(definition, 'this');
    let dynamicScope = new DynamicScope(null, UNDEFINED_REFERENCE);
    let rootState = new RootState(
      root,
      this._context,
      this._owner,
      this._rootTemplate,
      self,
      target,
      dynamicScope,
      this._builder
    );
    this._renderRoot(rootState);
  }

  rerender(): void {
    this._scheduleRevalidate();
  }

  register(view: any): void {
    let id = getViewId(view);
    assert(
      'Attempted to register a view with an id already in use: ' + id,
      !this._viewRegistry[id]
    );
    this._viewRegistry[id] = view;
  }

  unregister(view: any): void {
    delete this._viewRegistry[getViewId(view)];
  }

  remove(view: Component): void {
    view._transitionTo('destroying');

    this.cleanupRootFor(view);

    if (this._isInteractive) {
      view.trigger('didDestroyElement');
    }
  }

  cleanupRootFor(view: unknown): void {
    // no need to cleanup roots if we have already been destroyed
    if (this._destroyed) {
      return;
    }

    let roots = this._roots;

    // traverse in reverse so we can remove items
    // without mucking up the index
    let i = this._roots.length;
    while (i--) {
      let root = roots[i];
      assert('has root', root);
      if (root.isFor(view)) {
        root.destroy();
        roots.splice(i, 1);
      }
    }
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this._clearAllRoots();
  }

  getElement(view: View): Nullable<Element> {
    if (this._isInteractive) {
      return getViewElement(view);
    } else {
      throw new Error(
        'Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).'
      );
    }
  }

  getBounds(view: View): {
    parentElement: SimpleElement;
    firstNode: SimpleNode;
    lastNode: SimpleNode;
  } {
    let bounds: Bounds | null = view[BOUNDS];

    assert('object passed to getBounds must have the BOUNDS symbol as a property', bounds);

    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();

    return { parentElement, firstNode, lastNode };
  }

  createElement(tagName: string): SimpleElement {
    return this.env.getAppendOperations().createElement(tagName);
  }

  _renderRoot(root: RootState): void {
    let { _roots: roots } = this;

    roots.push(root);

    if (roots.length === 1) {
      register(this);
    }

    this._renderRootsTransaction();
  }

  _renderRoots(): void {
    let { _roots: roots, _removedRoots: removedRoots } = this;
    let initialRootsLength: number;

    do {
      initialRootsLength = roots.length;

      inTransaction(this.env, () => {
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

        this._lastRevision = valueForTag(CURRENT_TAG);
      });
    } while (roots.length > initialRootsLength);

    // remove any roots that were destroyed during this transaction
    while (removedRoots.length) {
      let root = removedRoots.pop();

      let rootIndex = roots.indexOf(root!);
      roots.splice(rootIndex, 1);
    }

    if (this._roots.length === 0) {
      deregister(this);
    }
  }

  _renderRootsTransaction(): void {
    if (this._inRenderTransaction) {
      // currently rendering roots, a new root was added and will
      // be processed by the existing _renderRoots invocation
      return;
    }

    // used to prevent calling _renderRoots again (see above)
    // while we are actively rendering roots
    this._inRenderTransaction = true;

    let completedWithoutError = false;
    try {
      this._renderRoots();
      completedWithoutError = true;
    } finally {
      if (!completedWithoutError) {
        this._lastRevision = valueForTag(CURRENT_TAG);
      }
      this._inRenderTransaction = false;
    }
  }

  _clearAllRoots(): void {
    let roots = this._roots;
    for (let root of roots) {
      root.destroy();
    }

    this._removedRoots.length = 0;
    this._roots = [];

    // if roots were present before destroying
    // deregister this renderer instance
    if (roots.length) {
      deregister(this);
    }
  }

  _scheduleRevalidate(): void {
    _backburner.scheduleOnce('render', this, this._revalidate);
  }

  _isValid(): boolean {
    return (
      this._destroyed || this._roots.length === 0 || validateTag(CURRENT_TAG, this._lastRevision)
    );
  }

  _revalidate(): void {
    if (this._isValid()) {
      return;
    }
    this._renderRootsTransaction();
  }
}
