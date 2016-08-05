import assign from 'ember-metal/assign';
import { DirtyableTag } from 'glimmer-reference';
import EmptyObject from 'ember-metal/empty_object';
import { environment } from 'ember-environment';

/**
@module ember
@submodule ember-templates
*/

class OutletStateReference {
  constructor(outletView) {
    this.outletView = outletView;
    this.tag = outletView._tag;
  }

  get(key) {
    return new ChildOutletStateReference(this, key);
  }

  value() {
    return this.outletView.outletState;
  }

  get isTopLevel() {
    return true;
  }

  getOrphan(name) {
    return new OrphanedOutletStateReference(this, name);
  }

  update(state) {
    this.outletView.setOutletState(state);
  }
}

// So this is a relic of the past that SHOULD go away
// in 3.0. Preferably it is deprecated in the release that
// follows the Glimmer release.
class OrphanedOutletStateReference extends OutletStateReference {
  constructor(root, name) {
    super(root.outletView);
    this.root = root;
    this.name = name;
  }

  value() {
    let rootState = this.root.value();

    let orphans = rootState.outlets.__ember_orphans__;

    if (!orphans) {
      return null;
    }

    let matched = orphans.outlets[this.name];

    if (!matched) {
      return null;
    }

    let state = new EmptyObject();
    state[matched.render.outlet] = matched;
    matched.wasUsed = true;
    return { outlets: state };
  }
}

class ChildOutletStateReference {
  constructor(parent, key) {
    this.parent = parent;
    this.key = key;
    this.tag = parent.tag;
  }

  get(key) {
    return new ChildOutletStateReference(this, key);
  }

  value() {
    return this.parent.value().outlets[this.key];
  }

  get isTopLevel() {
    return false;
  }
}

export default class OutletView {
  static extend(injections) {
    return class extends OutletView {
      static create(options) {
        if (options) {
          return super.create(assign({}, injections, options));
        } else {
          return super.create(injections);
        }
      }
    };
  }

  static reopenClass(injections) {
    assign(this, injections);
  }

  static create({ _environment, renderer, template }) {
    return new OutletView(_environment, renderer, template);
  }

  constructor(_environment, renderer, template) {
    this._environment = _environment;
    this.renderer = renderer;
    this.template = template;
    this.outletState = null;
    this._renderResult = null;
    this._tag = new DirtyableTag();
  }

  appendTo(selector) {
    let env = this._environment || environment;
    let target;

    if (env.hasDOM) {
      target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    } else {
      target = selector;
    }

    this._renderResult = this.renderer.appendOutletView(this, target);
  }

  appendChild(instance) {
    instance.parentView = this;
    instance.ownerView = this;
  }

  rerender() {
    if (this._renderResult) { this.renderer.rerender(this); }
  }

  setOutletState(state) {
    this.outletState = state;
    this._tag.dirty();
  }

  toReference() {
    return new OutletStateReference(this);
  }

  destroy() {
    if (this._renderResult) { this._renderResult.destroy(); }
  }
}
