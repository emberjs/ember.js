import { ENV } from '@ember/-internals/environment';
import { runInAutotrackingTransaction } from '@ember/-internals/metal';
import { getViewElement, getViewId } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { backburner, getCurrentRunLoop } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { Option } from '@glimmer/interfaces';
import { CURRENT_TAG, validate, value, VersionedPathReference } from '@glimmer/reference';
import {
  Bounds,
  clientBuilder,
  CurriedComponentDefinition,
  curry,
  Cursor,
  DynamicScope as GlimmerDynamicScope,
  ElementBuilder,
  IteratorResult,
  renderMain,
  RenderResult,
  UNDEFINED_REFERENCE,
} from '@glimmer/runtime';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import RSVP from 'rsvp';
import { BOUNDS } from './component';
import { createRootOutlet } from './component-managers/outlet';
import { RootComponentDefinition } from './component-managers/root';
import Environment from './environment';
import { Factory as TemplateFactory, OwnedTemplate } from './template';
import { Component } from './utils/curly-component-state-bucket';
import { OutletState } from './utils/outlet';
import { UnboundReference } from './utils/references';
import OutletView from './views/outlet';

export type IBuilder = (env: Environment, cursor: Cursor) => ElementBuilder;

export class DynamicScope implements GlimmerDynamicScope {
  constructor(
    public view: Component | {} | null,
    public outletState: VersionedPathReference<OutletState | undefined>
  ) {}

  child() {
    return new DynamicScope(this.view, this.outletState);
  }

  get(key: 'outletState'): VersionedPathReference<OutletState | undefined> {
    // tslint:disable-next-line:max-line-length
    assert(
      `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    return this.outletState;
  }

  set(key: 'outletState', value: VersionedPathReference<OutletState | undefined>) {
    // tslint:disable-next-line:max-line-length
    assert(
      `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    this.outletState = value;
    return value;
  }
}

class RootState {
  public id: string;
  public env: Environment;
  public root: Component | OutletView;
  public result: RenderResult | undefined;
  public shouldReflush: boolean;
  public destroyed: boolean;
  public render: () => void;

  constructor(
    root: Component | OutletView,
    env: Environment,
    template: OwnedTemplate,
    self: VersionedPathReference<unknown>,
    parentElement: SimpleElement,
    dynamicScope: DynamicScope,
    builder: IBuilder
  ) {
    assert(`You cannot render \`${self.value()}\` without a template.`, template !== undefined);

    this.id = getViewId(root);
    this.env = env;
    this.root = root;
    this.result = undefined;
    this.shouldReflush = false;
    this.destroyed = false;

    this.render = () => {
      let layout = template.asLayout();
      let handle = layout.compile();
      let iterator = renderMain(
        layout['compiler'].program,
        env,
        self,
        dynamicScope,
        builder(env, { element: parentElement, nextSibling: null }),
        handle
      );
      let iteratorResult: IteratorResult<RenderResult>;
      do {
        iteratorResult = iterator.next();
      } while (!iteratorResult.done);

      let result = (this.result = iteratorResult.value);

      // override .render function after initial render
      this.render = () => result.rerender({ alwaysRevalidate: false });
    };
  }

  isFor(possibleRoot: unknown): boolean {
    return this.root === possibleRoot;
  }

  destroy() {
    let { result, env } = this;

    this.destroyed = true;

    this.env = undefined as any;
    this.root = null as any;
    this.result = undefined;
    this.render = undefined as any;

    if (result) {
      /*
       Handles these scenarios:

       * When roots are removed during standard rendering process, a transaction exists already
         `.begin()` / `.commit()` are not needed.
       * When roots are being destroyed manually (`component.append(); component.destroy() case), no
         transaction exists already.
       * When roots are being destroyed during `Renderer#destroy`, no transaction exists

       */
      let needsTransaction = !env.inTransaction;

      if (needsTransaction) {
        env.begin();
      }
      try {
        result.destroy();
      } finally {
        if (needsTransaction) {
          env.commit();
        }
      }
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
  for (let i = 0; i < renderers.length; i++) {
    renderers[i]._scheduleRevalidate();
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
    if (!getCurrentRunLoop()) {
      // ensure a runloop has been kicked off
      backburner.schedule('actions', null, K);
    }
  }

  return renderSettledDeferred.promise;
}

function resolveRenderPromise() {
  if (renderSettledDeferred !== null) {
    let resolve = renderSettledDeferred.resolve;
    renderSettledDeferred = null;

    backburner.join(null, resolve);
  }
}

let loops = 0;
function loopEnd() {
  for (let i = 0; i < renderers.length; i++) {
    if (!renderers[i]._isValid()) {
      if (loops > ENV._RERENDER_LOOP_LIMIT) {
        loops = 0;
        // TODO: do something better
        renderers[i].destroy();
        throw new Error('infinite rendering invalidation detected');
      }
      loops++;
      return backburner.join(null, K);
    }
  }
  loops = 0;
  resolveRenderPromise();
}

backburner.on('begin', loopBegin);
backburner.on('end', loopEnd);

interface ViewRegistry {
  [viewId: string]: unknown;
}

export abstract class Renderer {
  private _env: Environment;
  private _rootTemplate: OwnedTemplate;
  private _viewRegistry: ViewRegistry;
  private _destinedForDOM: boolean;
  private _destroyed: boolean;
  private _roots: RootState[];
  private _lastRevision: number;
  private _isRenderingRoots: boolean;
  private _removedRoots: RootState[];
  private _builder: IBuilder;

  constructor(
    env: Environment,
    rootTemplate: TemplateFactory,
    viewRegistry: ViewRegistry,
    destinedForDOM = false,
    builder = clientBuilder
  ) {
    this._env = env;
    this._rootTemplate = rootTemplate(env.owner);
    this._viewRegistry = viewRegistry;
    this._destinedForDOM = destinedForDOM;
    this._destroyed = false;
    this._roots = [];
    this._lastRevision = -1;
    this._isRenderingRoots = false;
    this._removedRoots = [];
    this._builder = builder;
  }

  // renderer HOOKS

  appendOutletView(view: OutletView, target: SimpleElement) {
    let definition = createRootOutlet(view);
    this._appendDefinition(view, curry(definition), target);
  }

  appendTo(view: Component, target: SimpleElement) {
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(view, curry(definition), target);
  }

  _appendDefinition(
    root: OutletView | Component,
    definition: CurriedComponentDefinition,
    target: SimpleElement
  ) {
    let self = new UnboundReference(definition);
    let dynamicScope = new DynamicScope(null, UNDEFINED_REFERENCE);
    let rootState = new RootState(
      root,
      this._env,
      this._rootTemplate,
      self,
      target,
      dynamicScope,
      this._builder
    );
    this._renderRoot(rootState);
  }

  rerender() {
    this._scheduleRevalidate();
  }

  register(view: any) {
    let id = getViewId(view);
    assert(
      'Attempted to register a view with an id already in use: ' + id,
      !this._viewRegistry[id]
    );
    this._viewRegistry[id] = view;
  }

  unregister(view: any) {
    delete this._viewRegistry[getViewId(view)];
  }

  remove(view: Component) {
    view._transitionTo('destroying');

    this.cleanupRootFor(view);

    if (this._destinedForDOM) {
      view.trigger('didDestroyElement');
    }
  }

  cleanupRootFor(view: unknown) {
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

  abstract getElement(view: unknown): Option<SimpleElement>;

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
    return this._env.getAppendOperations().createElement(tagName);
  }

  _renderRoot(root: RootState) {
    let { _roots: roots } = this;

    roots.push(root);

    if (roots.length === 1) {
      register(this);
    }

    this._renderRootsTransaction();
  }

  _renderRoots() {
    let { _roots: roots, _env: env, _removedRoots: removedRoots } = this;
    let initialRootsLength: number;

    do {
      env.begin();
      try {
        // ensure that for the first iteration of the loop
        // each root is processed
        initialRootsLength = roots.length;

        for (let i = 0; i < roots.length; i++) {
          let root = roots[i];

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

          if (DEBUG) {
            // run in an autotracking transaction to prevent backflow errors.
            // we use `bind` here to avoid creating a closure (and requiring a
            // hoisted variable).
            runInAutotrackingTransaction!(root.render.bind(root));
          } else {
            root.render();
          }
        }

        this._lastRevision = value(CURRENT_TAG);
      } finally {
        env.commit();
      }
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

  _renderRootsTransaction() {
    if (this._isRenderingRoots) {
      // currently rendering roots, a new root was added and will
      // be processed by the existing _renderRoots invocation
      return;
    }

    // used to prevent calling _renderRoots again (see above)
    // while we are actively rendering roots
    this._isRenderingRoots = true;

    let completedWithoutError = false;
    try {
      this._renderRoots();
      completedWithoutError = true;
    } finally {
      if (!completedWithoutError) {
        this._lastRevision = value(CURRENT_TAG);
        if (this._env.inTransaction === true) {
          this._env.commit();
        }
      }
      this._isRenderingRoots = false;
    }
  }

  _clearAllRoots() {
    let roots = this._roots;
    for (let i = 0; i < roots.length; i++) {
      let root = roots[i];
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

  _scheduleRevalidate() {
    backburner.scheduleOnce('render', this, this._revalidate);
  }

  _isValid() {
    return this._destroyed || this._roots.length === 0 || validate(CURRENT_TAG, this._lastRevision);
  }

  _revalidate() {
    if (this._isValid()) {
      return;
    }
    this._renderRootsTransaction();
  }
}

export class InertRenderer extends Renderer {
  static create({
    env,
    rootTemplate,
    _viewRegistry,
    builder,
  }: {
    env: Environment;
    rootTemplate: TemplateFactory;
    _viewRegistry: any;
    builder: any;
  }) {
    return new this(env, rootTemplate, _viewRegistry, false, builder);
  }

  getElement(_view: unknown): Option<SimpleElement> {
    throw new Error(
      'Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).'
    );
  }
}

export class InteractiveRenderer extends Renderer {
  static create({
    env,
    rootTemplate,
    _viewRegistry,
    builder,
  }: {
    env: Environment;
    rootTemplate: TemplateFactory;
    _viewRegistry: any;
    builder: any;
  }) {
    return new this(env, rootTemplate, _viewRegistry, true, builder);
  }

  getElement(view: unknown): Option<SimpleElement> {
    return getViewElement(view);
  }
}
