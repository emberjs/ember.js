import { Simple } from '@glimmer/interfaces';
import { DirtyableTag, VersionedPathReference } from '@glimmer/reference';
import { environment } from 'ember-environment';
import { run } from 'ember-metal';
import { assign } from 'ember-utils';
import { OWNER } from 'ember-utils';
import Environment from '../environment';
import { Renderer } from '../renderer';

export class OutletStateReference implements VersionedPathReference<OutletState> {
  public tag: any;

  constructor(public outletView: OutletView) {
    this.tag = outletView._tag;
  }

  get(key: string): VersionedPathReference<OutletState> {
    return new ChildOutletStateReference(this, key);
  }

  value(): OutletState {
    return this.outletView.outletState;
  }

  getOrphan(name: string): VersionedPathReference<OutletState> {
    return new OrphanedOutletStateReference(this, name);
  }

  update(state: OutletState) {
    this.outletView.setOutletState(state);
  }
}

// So this is a relic of the past that SHOULD go away
// in 3.0. Preferably it is deprecated in the release that
// follows the Glimmer release.
class OrphanedOutletStateReference extends OutletStateReference {
  public root: any;
  public name: string;

  constructor(root, name) {
    super(root.outletView);
    this.root = root;
    this.name = name;
  }

  value(): OutletState {
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
    return { outlets: state, render: undefined };
  }
}

class ChildOutletStateReference {
  public parent: any;
  public key: string;
  public tag: any;

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

export interface OutletState {
  outlets: {
    [name: string]: OutletState;
  };
  render: {
    owner: any | undefined,
    into: string,
    outlet: string,
    name: string,
    controller: any | undefined,
    ViewClass: Function | undefined,
    template: any | undefined,
  };
}

export default class OutletView {
  private _environment: Environment;
  public renderer: Renderer;
  public owner: any;
  public template: any;
  public outletState: OutletState;
  public _tag: DirtyableTag;

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

  appendTo(selector: string | Simple.Element) {
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

  setOutletState(state: OutletState) {
    this.outletState = {
      outlets: {
        main: state,
      },
      render: {
        owner: undefined,
        into: undefined,
        outlet: 'main',
        name: '-top-level',
        controller: undefined,
        ViewClass: undefined,
        template: undefined,
      },
    };
    this._tag.dirty();
  }

  toReference() {
    return new OutletStateReference(this);
  }

  destroy() { }
}
