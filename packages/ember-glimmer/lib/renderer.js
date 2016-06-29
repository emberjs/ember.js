import { RootReference } from './utils/references';
import run from 'ember-metal/run_loop';
import { setHasViews } from 'ember-metal/tags';
import { CURRENT_TAG, UNDEFINED_REFERENCE } from 'glimmer-reference';

const { backburner } = run;

class DynamicScope {
  constructor({ view, controller, outletState, isTopLevel, targetObject }) {
    this.view = view;
    this.controller = controller;
    this.outletState = outletState;
    this.isTopLevel = isTopLevel;
    this.targetObject = targetObject;
  }

  child() {
    return new DynamicScope(this);
  }
}

class SchedulerRegistrar {
  constructor() {
    this.callback = null;
    this.callbacks = null;

    backburner.on('begin', (arg1, arg2) => {
      if (this.callback) {
        this.callback(arg1, arg2);
      } else if (this.callbacks) {
        for (let i = 0; i < this.callbacks.length; ++i) {
          this.callbacks[i](arg1, arg2);
        }
      }
    });
  }

  register(callback) {
    if (this.callbacks) {
      this.callbacks.push(callback);
    } else if (!this.callback) {
      this.callback = callback;
    } else {
      this.callbacks = [this.callback, callback];
      this.callback = null;
    }
  }

  deregister(callback) {
    let foundCallback = false;
    if (this.callbacks) {
      let callbackIndex = this.callbacks.indexOf(callback);
      foundCallback = ~callbackIndex;
      if (foundCallback) {
        this.callbacks.splice(callbackIndex, 1);
      }
    } else if (this.callback === callback) {
      this.callback = null;
      foundCallback = true;
    }

    if (!foundCallback) {
      throw new TypeError('Cannot deregister a callback that has not been registered.');
    }
  }

  hasRegistrations() {
    return !!this.callback || !!this.callbacks && !!this.callbacks.length;
  }
}
const schedulerRegistrar = new SchedulerRegistrar();

setHasViews(function rendererHasViews() {
  return schedulerRegistrar.hasRegistrations();
});

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
      schedulerRegistrar.register(this._scheduleMaybeUpdate);
      this._root = view;
    } else {
      throw new TypeError('Cannot register more than one root view.');
    }
  }

  deregisterView(view) {
    if (this._root === view) {
      this._root = null;
      schedulerRegistrar.deregister(this._scheduleMaybeUpdate);
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
    let controller = view.outletState.render.controller;
    let dynamicScope = new DynamicScope({
      view,
      controller,
      targetObject: controller,
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
    let dynamicScope = new DynamicScope({
      view,
      controller: undefined,
      // this is generally only used for the test harness, and is not a "supported"
      // mechanism for setting up a template/test environment. We are defaulting the
      // targetObject to the view instance based on the assumption that it is a component
      // instance
      targetObject: view,
      outletState: UNDEFINED_REFERENCE,
      isTopLevel: true
    });

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

    if (!view.isDestroying) {
      view.destroy();
    }
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
