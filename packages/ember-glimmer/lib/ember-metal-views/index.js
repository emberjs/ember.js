import { RootReference } from '../utils/references';
import run from 'ember-metal/run_loop';
// import { CURRENT_TAG } from 'glimmer-reference';

class DynamicScope {
  constructor({ view, controller, outletState, isTopLevel }) {
    this.view = view;
    this.controller = controller;
    this.outletState = outletState;
    this.isTopLevel = isTopLevel;
  }

  child() {
    return new DynamicScope(this);
  }
}

const RENDERED_ROOTS = [];
// let LAST_TAG_VALUE;

function maybeUpdate() {
  // if (CURRENT_TAG.validate(LAST_TAG_VALUE)) { return; }
  for (let i = 0; i < RENDERED_ROOTS.length; ++i) {
    let view = RENDERED_ROOTS[i];
    view.renderer.rerender(view);
  }
  // LAST_TAG_VALUE = CURRENT_TAG.value();
}

function scheduleMaybeUpdate() {
  run.backburner.schedule('render', maybeUpdate);
}

function registerView(view) {
  // LAST_TAG_VALUE = LAST_TAG_VALUE || CURRENT_TAG.value();
  if (!RENDERED_ROOTS.length) {
    run.backburner.on('begin', scheduleMaybeUpdate);
  }
  RENDERED_ROOTS.push(view);
}

function deregisterView(view) {
  let viewIndex = RENDERED_ROOTS.indexOf(view);
  if (~viewIndex) {
    RENDERED_ROOTS.splice(viewIndex, 1);
    if (!RENDERED_ROOTS.length) {
      run.backburner.off('begin', scheduleMaybeUpdate);
    }
  }
}

class Renderer {
  constructor({ dom, env, destinedForDOM = false }) {
    this._root = null;
    this._dom = dom;
    this._env = env;
    this._destinedForDOM = destinedForDOM;
  }

  appendOutletView(view, target) {
    this._root = view;

    let env = this._env;
    let self = new RootReference(view);
    let dynamicScope = new DynamicScope({
      view,
      controller: view.outletState.render.controller,
      outletState: view.toReference(),
      isTopLevel: true
    });

    env.begin();
    let result = view.template.asEntryPoint().render(self, env, { appendTo: target, dynamicScope });
    env.commit();

    registerView(view);

    return result;
  }

  appendTo(view, target) {
    let env = this._env;
    let self = new RootReference(view);
    let dynamicScope = new DynamicScope({ view });

    env.begin();
    let result = view.template.asEntryPoint().render(self, env, { appendTo: target, dynamicScope });
    env.commit();

    registerView(view);

    // FIXME: Store this somewhere else
    view['_renderResult'] = result;

    // FIXME: This should happen inside `env.commit()`
    view._transitionTo('inDOM');
  }

  rerender(view) {
    (view['_renderResult'] || this._root['_renderResult']).rerender();
  }

  remove(view) {
    deregisterView(view);
    view.trigger('willDestroyElement');
    view._transitionTo('destroying');

    let { _renderResult } = view;

    if (_renderResult) {
      _renderResult.destroy();
    }

    view.destroy();
  }

  componentInitAttrs() {
    // TODO: Remove me
  }

  ensureViewNotRendering() {
    // TODO: Implement this
    // throw new Error('Something you did caused a view to re-render after it rendered but before it was inserted into the DOM.');
  }
}

export const InertRenderer = {
  create({ dom, env }) {
    return new Renderer({ dom, env, destinedForDOM: false });
  }
};

export const InteractiveRenderer = {
  create({ dom, env }) {
    return new Renderer({ dom, env, destinedForDOM: true });
  }
};
