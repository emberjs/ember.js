/**
@module ember
@submodule ember-glimmer
*/
import { assign } from 'ember-utils';
import { DirtyableTag } from '@glimmer/reference';
import { environment } from 'ember-environment';
import { OWNER } from 'ember-utils';
import { run } from 'ember-metal';

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

    let orphans = rootState.outlets.main.outlets.__ember_orphans__;

    if (!orphans) {
      return null;
    }

    let matched = orphans.outlets[this.name];

    if (!matched) {
      return null;
    }

    let state = Object.create(null);
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
    return this.parent.value()[this.key];
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

  static create(options) {
    let { _environment, renderer, template } = options;
    let owner = options[OWNER];
    return new OutletView(_environment, renderer, owner, template);
  }

  constructor(_environment, renderer, owner, template) {
    this._environment = _environment;
    this.renderer = renderer;
    this.owner = owner;
    this.template = template;
    this.outletState = null;
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

    run.schedule('render', this.renderer, 'appendOutletView', this, target);
  }

  rerender() { }

  setOutletState(state) {
    this.outletState = {
      outlets: {
        main: state
      },
      render: {
        owner: undefined,
        into: undefined,
        outlet: 'main',
        name: '-top-level',
        controller: undefined,
        ViewClass: undefined,
        template: undefined
      }
    };
    this._tag.dirty();
  }

  toReference() {
    return new OutletStateReference(this);
  }

  destroy() { }
}
