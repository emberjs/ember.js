import { RootReference } from './utils/references';
import run from 'ember-metal/run_loop';
import { CURRENT_TAG } from 'glimmer-reference';

const { backburner } = run;

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

class SchedulerRegistrar {
  constructor() {
    let schedulerRegistrar = this;
    this._eventCallbacks = {
      begin: []
    };

    this._trigger = backburner._trigger;
    this.register = backburner.on;
    this.deregister = backburner.off;

    function bindEventName(eventName) {
      return function trigger(arg1, arg2) {
        schedulerRegistrar._trigger(eventName, arg1, arg2);
      };
    }

    for (let eventName in this._eventCallbacks) {
      if (backburner._eventCallbacks.hasOwnProperty(eventName)) {
        backburner.on(eventName, bindEventName(eventName));
      }
    }
  }

  hasRegistrations() {
    return !!this._eventCallbacks.length;
  }
}
export const schedulerRegistrar = new SchedulerRegistrar();

class Scheduler {
  constructor() {
    this._root = null;
    this._scheduleMaybeUpdate = () => {
      run.backburner.schedule('render', this, this._maybeUpdate, CURRENT_TAG.value());
    };
  }

  destroy() {
    if (this._root) {
      this.deregisterView(this._root);
    }
  }

  registerView(view) {
    if (!this.root) {
      schedulerRegistrar.register('begin', this._scheduleMaybeUpdate);
      this._root = view;
    } else {
      throw new TypeError('Cannot register more than one root view.');
    }
  }

  deregisterView(view) {
    if (this._root === view) {
      this._root = null;
      schedulerRegistrar.deregister('begin', this._scheduleMaybeUpdate);
    }
  }

  _maybeUpdate(lastTagValue) {
    if (CURRENT_TAG.validate(lastTagValue)) { return; }
    let view = this._root;
    if (view) {
      view.renderer.rerender(view);
    }
  }
}

class Renderer {
  constructor({ dom, env, destinedForDOM = false }) {
    this._root = null;
    this._dom = dom;
    this._env = env;
    this._destinedForDOM = destinedForDOM;
    this._scheduler = new Scheduler();
  }

  destroy() {
    this._scheduler.destroy();
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

    this._scheduler.registerView(view);

    return result;
  }

  appendTo(view, target) {
    let env = this._env;
    let self = new RootReference(view);
    let dynamicScope = new DynamicScope({ view });

    env.begin();
    let result = view.template.asEntryPoint().render(self, env, { appendTo: target, dynamicScope });
    env.commit();

    this._scheduler.registerView(view);

    // FIXME: Store this somewhere else
    view['_renderResult'] = result;

    // FIXME: This should happen inside `env.commit()`
    view._transitionTo('inDOM');
  }

  rerender(view) {
    (view['_renderResult'] || this._root['_renderResult']).rerender();
  }

  remove(view) {
    this._scheduler.deregisterView(view);
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
