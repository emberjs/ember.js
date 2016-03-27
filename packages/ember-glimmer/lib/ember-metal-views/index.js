import { RootReference } from '../utils/references';

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

class Renderer {
  constructor({ dom, env, destinedForDOM = false }) {
    this._dom = dom;
    this._env = env;
    this._destinedForDOM = destinedForDOM;
  }

  appendOutletView(view, target) {
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

    return result;
  }

  appendTo(view, target) {
    let env = this._env;
    let self = new RootReference(view);
    let dynamicScope = new DynamicScope({ view });

    env.begin();
    let result = view.template.asEntryPoint().render(self, env, { appendTo: target, dynamicScope });
    env.commit();

    // FIXME: Store this somewhere else
    view['_renderResult'] = result;

    // FIXME: This should happen inside `env.commit()`
    view._transitionTo('inDOM');
  }

  rerender(view) {
    view['_renderResult'].rerender();
  }

  remove(view) {
    view._transitionTo('destroying');
    view['_renderResult'].destroy();
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
