// @ts-check

import { RootReference } from './utils/references';
import {
  run,
  setHasViews,
  runInTransaction
} from 'ember-metal';
import { CURRENT_TAG } from '@glimmer/reference';
import { Dict } from '@glimmer/util';
import { UNDEFINED_REFERENCE } from '@glimmer/runtime';
import {
  fallbackViewRegistry,
  getViewElement,
  setViewElement,
  getViewId
} from 'ember-views';
import { BOUNDS } from './component';
import { RootComponentDefinition } from './component-managers/root';
import { TopLevelOutletComponentDefinition } from './component-managers/outlet';
import { assert } from 'ember-debug';

import Environment from './environment';

const { backburner } = run;

export class DynamicScope {
  constructor(public view: any, public outletState: any, public rootOutletState: any) {}

  child() {
    return new DynamicScope(
      this.view, this.outletState, this.rootOutletState
    );
  }

  get(key) {
    assert(`Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`, key === 'outletState');
    return this.outletState;
  }

  set(key, value) {
    assert(`Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`, key === 'outletState');
    this.outletState = value;
    return value;
  }
}

class RootState {
  public id: string;
  public result: any = undefined;
  public shouldReflush = false;
  public destroyed = false;
  public _removing = false;
  public options = { alwaysRevalidate: false };
  public render: () => void;

  constructor(public root: any, public env: Environment, template, self, parentElement, dynamicScope) {
    assert(`You cannot render \`${self.value()}\` without a template.`, template);

    this.id = getViewId(root);

    this.render = () => {
      let iterator = template.render(self, parentElement, dynamicScope);
      let iteratorResult;

      do {
        iteratorResult = iterator.next();
      } while (!iteratorResult.done);

      let result = this.result = iteratorResult.value;

      // override .render function after initial render
      this.render = () => result.rerender(this.options);
    };
  }

  isFor(possibleRoot) {
    return this.root === possibleRoot;
  }

  destroy() {
    let { result, env } = this;

    this.destroyed = true;

    this.env = null;
    this.root = null;
    this.result = null;
    this.render = null;

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

      result.destroy();

      if (needsTransaction) {
        env.commit();
      }
    }
  }
}

const renderers: Renderer[] = [];

export function _resetRenderers() {
  renderers.length = 0;
}

setHasViews(() => renderers.length > 0);

function register(renderer: Renderer) {
  assert('Cannot register the same renderer twice', renderers.indexOf(renderer) === -1);
  renderers.push(renderer);
}

function deregister(renderer: Renderer) {
  let index = renderers.indexOf(renderer);
  assert('Cannot deregister unknown unregistered renderer', index !== -1);
  renderers.splice(index, 1);
}

function loopBegin() {
  for (let i = 0; i < renderers.length; i++) {
    renderers[i]._scheduleRevalidate();
  }
}

function K() {}

let loops = 0;
function loopEnd(current, next) {
  for (let i = 0; i < renderers.length; i++) {
    if (!renderers[i]._isValid()) {
      if (loops > 10) {
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
}

backburner.on('begin', loopBegin);
backburner.on('end', loopEnd);

class Renderer {
  public _destroyed = false;
  public _roots: any[] = [];
  public _lastRevision: any = null;
  public _isRenderingRoots = false;
  public _removedRoots: any[] = [];

  constructor(
    public _env: Environment,
    public _rootTemplate: any,
    public _viewRegistry: Dict<any> = fallbackViewRegistry,
    public _destinedForDOM = false
  ) {}

  // renderer HOOKS

  appendOutletView(view, target) {
    let definition = new TopLevelOutletComponentDefinition(view);
    let outletStateReference = view.toReference();
    let targetObject = view.outletState.render.controller;

    this._appendDefinition(view, definition, target, outletStateReference, targetObject);
  }

  appendTo(view, target) {
    let rootDef = new RootComponentDefinition(view);

    this._appendDefinition(view, rootDef, target);
  }

  _appendDefinition(root, definition, target, outletStateReference = UNDEFINED_REFERENCE, targetObject = null) {
    let self = new RootReference(definition);
    let dynamicScope = new DynamicScope(null, outletStateReference, outletStateReference);
    let rootState = new RootState(root, this._env, this._rootTemplate, self, target, dynamicScope);

    this._renderRoot(rootState);
  }

  rerender(view) {
    this._scheduleRevalidate();
  }

  register(view) {
    let id = getViewId(view);
    assert('Attempted to register a view with an id already in use: ' + id, !this._viewRegistry[id]);
    this._viewRegistry[id] = view;
  }

  unregister(view) {
    delete this._viewRegistry[getViewId(view)];
  }

  remove(view) {
    view._transitionTo('destroying');

    this.cleanupRootFor(view);

    setViewElement(view, null);

    if (this._destinedForDOM) {
      view.trigger('didDestroyElement');
    }

    if (!view.isDestroying) {
      view.destroy();
    }
  }

  cleanupRootFor(view) {
    // no need to cleanup roots if we have already been destroyed
    if (this._destroyed) { return; }

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

  getElement(view) {
    // overridden in the subclasses
  }

  getBounds(view) {
    let bounds = view[BOUNDS];

    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();

    return { parentElement, firstNode, lastNode };
  }

  createElement(tagName) {
    return this._env.getAppendOperations().createElement(tagName);
  }

  _renderRoot(root) {
    let { _roots: roots } = this;

    roots.push(root);

    if (roots.length === 1) {
      register(this);
    }

    this._renderRootsTransaction();
  }

  _renderRoots() {
    let { _roots: roots, _env: env, _removedRoots: removedRoots } = this;
    let globalShouldReflush, initialRootsLength;

    do {
      env.begin();

      // ensure that for the first iteration of the loop
      // each root is processed
      initialRootsLength = roots.length;
      globalShouldReflush = false;

      for (let i = 0; i < roots.length; i++) {
        let root = roots[i];

        if (root.destroyed) {
          // add to the list of roots to be removed
          // they will be removed from `this._roots` later
          removedRoots.push(root);

          // skip over roots that have been marked as destroyed
          continue;
        }

        let { shouldReflush } = root;

        // when processing non-initial reflush loops,
        // do not process more roots than needed
        if (i >= initialRootsLength && !shouldReflush) {
          continue;
        }

        root.options.alwaysRevalidate = shouldReflush;
        // track shouldReflush based on this roots render result
        shouldReflush = root.shouldReflush = runInTransaction(root, 'render');

        // globalShouldReflush should be `true` if *any* of
        // the roots need to reflush
        globalShouldReflush = globalShouldReflush || shouldReflush;
      }

      this._lastRevision = CURRENT_TAG.value();

      env.commit();
    } while (globalShouldReflush || roots.length > initialRootsLength);

    // remove any roots that were destroyed during this transaction
    while (removedRoots.length) {
      let root = removedRoots.pop();

      let rootIndex = roots.indexOf(root);
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
        this._lastRevision = CURRENT_TAG.value();
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
    this._roots = null;

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
    return this._destroyed || this._roots.length === 0 || CURRENT_TAG.validate(this._lastRevision);
  }

  _revalidate() {
    if (this._isValid()) {
      return;
    }
    this._renderRootsTransaction();
  }
}

export class InertRenderer extends Renderer {
  static create({ env, rootTemplate, _viewRegistry }) {
    return new this(env, rootTemplate, _viewRegistry, false);
  }

  getElement(view) {
    throw new Error('Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).');
  }
}

export class InteractiveRenderer extends Renderer {
  static create({ env, rootTemplate, _viewRegistry }) {
    return new this(env, rootTemplate, _viewRegistry, true);
  }

  getElement(view) {
    return getViewElement(view);
  }
}
