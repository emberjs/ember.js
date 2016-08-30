import { RootReference } from './utils/references';
import run from 'ember-metal/run_loop';
import { setHasViews } from 'ember-metal/tags';
import { CURRENT_TAG, UNDEFINED_REFERENCE } from 'glimmer-reference';
import fallbackViewRegistry from 'ember-views/compat/fallback-view-registry';
import { assert } from 'ember-metal/debug';
import _runInTransaction from 'ember-metal/transaction';
import isEnabled from 'ember-metal/features';
import { BOUNDS } from './component';
import { RootComponentDefinition } from './syntax/curly-component';
import { getViewId } from 'ember-views/system/utils';

let runInTransaction;

if (isEnabled('ember-glimmer-detect-backtracking-rerender') ||
    isEnabled('ember-glimmer-allow-backtracking-rerender')) {
  runInTransaction = _runInTransaction;
} else {
  runInTransaction = callback => {
    callback();
    return false;
  };
}

const { backburner } = run;

class DynamicScope {
  constructor(view, outletState, rootOutletState, isTopLevel, targetObject) {
    this.view = view;
    this.outletState = outletState;
    this.rootOutletState = rootOutletState;
    this.isTopLevel = isTopLevel;
    this.targetObject = targetObject;
  }

  child() {
    return new DynamicScope(
      this.view, this.outletState, this.rootOutletState, this.isTopLevel, this.targetObject
    );
  }
}

const renderers = [];

setHasViews(() => renderers.length > 0);

function register(renderer) {
  assert('Cannot register the same renderer twice', renderers.indexOf(renderer) === -1);
  renderers.push(renderer);
}

function deregister(renderer) {
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

export class Renderer {
  constructor(env, rootTemplate, _viewRegistry = fallbackViewRegistry, destinedForDOM = false) {
    this._env = env;
    this._rootTemplate = rootTemplate;
    this._viewRegistry = _viewRegistry;
    this._destinedForDOM = destinedForDOM;
    this._destroyed = false;
    this._root = null;
    this._result = null;
    this._lastRevision = null;
    this._transaction = null;
  }

  // renderer HOOKS

  appendOutletView(view, target) {
    let self = new RootReference(view);
    let targetObject = view.outletState.render.controller;
    let ref = view.toReference();
    let dynamicScope = new DynamicScope(null, ref, ref, true, targetObject);
    this._renderRoot(view, view.template, self, target, dynamicScope);
  }

  appendTo(view, target) {
    let rootDef = new RootComponentDefinition(view);
    let self = new RootReference(rootDef);
    let dynamicScope = new DynamicScope(null, UNDEFINED_REFERENCE, UNDEFINED_REFERENCE, true, null);
    this._renderRoot(view, this._rootTemplate, self, target, dynamicScope);
  }

  rerender(view) {
    this._scheduleRevalidate();
  }

  componentInitAttrs() {
    // TODO: Remove me
  }

  ensureViewNotRendering() {
    // TODO: Implement this
    // throw new Error('Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.');
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
    view.trigger('willDestroyElement');
    view.trigger('willClearRender');
    view._transitionTo('destroying');

    if (this._root === view) {
      this._clearRoot();
    }

    if (!view.isDestroying) {
      view.destroy();
    }
  }

  destroy() {
    if (this._destroyed) {
      return;
    }
    this._destroyed = true;
    this._clearRoot();
  }

  getBounds(view) {
    let bounds = view[BOUNDS];

    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();

    return { parentElement, firstNode, lastNode };
  }

  _renderRoot(root, template, self, parentElement, dynamicScope) {
    assert('Cannot append multiple root views', !this._root);
    this._root = root;
    register(this);

    let options = {
      alwaysRevalidate: false
    };
    let { _env: env } = this;
    let render = () => {
      assert(`You cannot render \`${self.value()}\` without a template.`, template);

      let result = template.asEntryPoint().render(self, env, {
        appendTo: parentElement,
        dynamicScope
      });
      this._result = result;
      this._lastRevision = CURRENT_TAG.value();

      render = () => {
        result.rerender(options);
        this._lastRevision = CURRENT_TAG.value();
      };
    };

    let transaction = () => {
      let shouldReflush = false;
      do {
        env.begin();
        options.alwaysRevalidate = shouldReflush;
        shouldReflush = runInTransaction(render);
        env.commit();
      } while (shouldReflush);
    };

    this._transaction = () => {
      try {
        transaction();
      } catch (e) {
        this.destroy();
        throw e;
      }
    };

    this._transaction();
  }

  _clearRoot() {
    let root = this._root;
    let result = this._result;
    this._root = null;
    this._result = null;
    this._lastRevision = null;
    this._transaction = null;

    if (root) {
      deregister(this);
    }

    if (result) {
      result.destroy();
    }
  }

  _scheduleRevalidate() {
    backburner.scheduleOnce('render', this, this._revalidate);
  }

  _isValid() {
    return !this._root || CURRENT_TAG.validate(this._lastRevision);
  }

  _revalidate() {
    if (this._isValid()) {
      return;
    }
    this._transaction();
  }
}

export const InertRenderer = {
  create({ env, rootTemplate, _viewRegistry }) {
    return new Renderer(env, rootTemplate, _viewRegistry, false);
  }
};

export const InteractiveRenderer = {
  create({ env, rootTemplate, _viewRegistry }) {
    return new Renderer(env, rootTemplate, _viewRegistry, true);
  }
};
