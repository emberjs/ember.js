import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import { getOwner, Owner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { getViewElement, getViewId } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { _backburner, _getCurrentRunLoop } from '@ember/runloop';
import { destroy } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  CompileTimeCompilationContext,
  CurriedType,
  Cursor,
  DebugRenderTree,
  DynamicScope as GlimmerDynamicScope,
  ElementBuilder,
  Environment,
  Option,
  RenderResult,
  RuntimeContext,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import { programCompilationContext } from '@glimmer/opcode-compiler';
import { artifacts } from '@glimmer/program';
import { createConstRef, Reference, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
import {
  clientBuilder,
  CurriedValue,
  curry,
  DOMChanges,
  DOMTreeConstruction,
  inTransaction,
  renderMain,
  runtimeContext,
} from '@glimmer/runtime';
import { unwrapTemplate } from '@glimmer/util';
import { CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator';
import { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import RSVP from 'rsvp';
import Component from './component';
import { BOUNDS } from './component-managers/curly';
import { createRootOutlet } from './component-managers/outlet';
import { RootComponentDefinition } from './component-managers/root';
import { NodeDOMTreeConstruction } from './dom';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import { OutletState } from './utils/outlet';
import OutletView from './views/outlet';

export type IBuilder = (env: Environment, cursor: Cursor) => ElementBuilder;

export interface View {
  parentView: Option<View>;
  renderer: Renderer;
  tagName: string | null;
  elementId: string | null;
  isDestroying: boolean;
  isDestroyed: boolean;
}

export class DynamicScope implements GlimmerDynamicScope {
  constructor(public view: View | null, public outletState: Reference<OutletState | undefined>) {}

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

  constructor(
    public root: Component | OutletView,
    public runtime: RuntimeContext,
    context: CompileTimeCompilationContext,
    owner: Owner,
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

    this.render = errorLoopTransaction(() => {
      let layout = unwrapTemplate(template).asLayout();

      let iterator = renderMain(
        runtime,
        context,
        owner,
        self,
        builder(runtime.env, { element: parentElement, nextSibling: null }),
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
    let {
      result,
      runtime: { env },
    } = this;

    this.destroyed = true;

    this.runtime = undefined as any;
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

function K() {
  /* noop */
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
      _backburner.schedule('actions', null, K);
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
      return _backburner.join(null, K);
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

  private _owner: Owner;
  private _context: CompileTimeCompilationContext;
  private _runtime: RuntimeContext;

  private _lastRevision = -1;
  private _destroyed = false;
  private _isInteractive: boolean;

  readonly _runtimeResolver: ResolverImpl;

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
    owner: Owner,
    document: SimpleDocument,
    env: { isInteractive: boolean; hasDOM: boolean },
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
    this._isInteractive = env.isInteractive;

    // resolver is exposed for tests
    let resolver = (this._runtimeResolver = new ResolverImpl());

    let sharedArtifacts = artifacts();

    this._context = programCompilationContext(sharedArtifacts, resolver);

    let runtimeEnvironmentDelegate = new EmberEnvironmentDelegate(owner, env.isInteractive);
    this._runtime = runtimeContext(
      {
        appendOperations: env.hasDOM
          ? new DOMTreeConstruction(document)
          : new NodeDOMTreeConstruction(document),
        updateOperations: new DOMChanges(document),
      },
      runtimeEnvironmentDelegate,
      sharedArtifacts,
      resolver
    );
  }

  get debugRenderTree(): DebugRenderTree {
    let { debugRenderTree } = this._runtime.env;

    assert(
      'Attempted to access the DebugRenderTree, but it did not exist. Is the Ember Inspector open?',
      debugRenderTree
    );

    return debugRenderTree;
  }

  // renderer HOOKS

  appendOutletView(view: OutletView, target: SimpleElement): void {
    let definition = createRootOutlet(view);
    this._appendDefinition(
      view,
      curry(CurriedType.Component, definition, view.owner, null, true),
      target
    );
  }

  appendTo(view: Component, target: SimpleElement): void {
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(
      view,
      curry(CurriedType.Component, definition, this._owner, null, true),
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
      this._runtime,
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

  getElement(view: View): Option<SimpleElement> {
    if (this._isInteractive) {
      return getViewElement(view);
    } else {
      throw new Error(
        'Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).'
      );
    }
  }

  getBounds(
    view: object
  ): { parentElement: SimpleElement; firstNode: SimpleNode; lastNode: SimpleNode } {
    let bounds: Bounds = view[BOUNDS];

    assert('object passed to getBounds must have the BOUNDS symbol as a property', Boolean(bounds));

    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();

    return { parentElement, firstNode, lastNode };
  }

  createElement(tagName: string): SimpleElement {
    return this._runtime.env.getAppendOperations().createElement(tagName);
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
    let { _roots: roots, _runtime: runtime, _removedRoots: removedRoots } = this;
    let initialRootsLength: number;

    do {
      initialRootsLength = roots.length;

      inTransaction(runtime.env, () => {
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
