import { Simple } from '@glimmer/interfaces';
import { DirtyableTag, Tag, TagWrapper, VersionedPathReference } from '@glimmer/reference';
import { Opaque, Option } from '@glimmer/util';
import { environment } from 'ember-environment';
import { run } from 'ember-metal';
import { assign, OWNER } from 'ember-utils';
import { Renderer } from '../renderer';
import { Container, OwnedTemplate } from '../template';

export class RootOutletStateReference implements VersionedPathReference<Option<OutletState>> {
  tag: Tag;

  constructor(public outletView: OutletView) {
    this.tag = outletView._tag;
  }

  get(key: string): VersionedPathReference<Option<OutletState>> {
    return new ChildOutletStateReference(this, key);
  }

  value(): Option<OutletState> {
    return this.outletView.outletState;
  }

  getOrphan(name: string): VersionedPathReference<Option<OutletState>> {
    return new OrphanedOutletStateReference(this, name);
  }

  update(state: OutletState) {
    this.outletView.setOutletState(state);
  }
}

// So this is a relic of the past that SHOULD go away
// in 3.0. Preferably it is deprecated in the release that
// follows the Glimmer release.
class OrphanedOutletStateReference extends RootOutletStateReference {
  public root: any;
  public name: string;

  constructor(root: RootOutletStateReference, name: string) {
    super(root.outletView);
    this.root = root;
    this.name = name;
  }

  value(): Option<OutletState> {
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

class ChildOutletStateReference implements VersionedPathReference<Option<OutletState>> {
  public parent: VersionedPathReference<Option<OutletState>>;
  public key: string;
  public tag: Tag;

  constructor(parent: VersionedPathReference<Option<OutletState>>, key: string) {
    this.parent = parent;
    this.key = key;
    this.tag = parent.tag;
  }

  get(key) {
    return new ChildOutletStateReference(this, key);
  }

  value() {
    let parent = this.parent.value();
    return parent && parent[this.key];
  }
}

export interface RenderState {
  owner: Container | undefined;
  into: string | undefined;
  outlet: string;
  name: string;
  controller: Opaque;
  template: OwnedTemplate | undefined;
}

export interface OutletState {
  outlets: {
    [name: string]: OutletState | undefined;
  };
  render: RenderState | undefined;
}

export interface BootEnvironment {
  hasDOM: boolean;
  isInteractive: boolean;
  options: any;
}

export default class OutletView {
  private _environment: BootEnvironment;
  public renderer: Renderer;
  public owner: Container;
  public template: OwnedTemplate;
  public outletState: Option<OutletState>;
  public _tag: TagWrapper<DirtyableTag>;

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

  constructor(_environment: BootEnvironment, renderer: Renderer, owner: Container, template: OwnedTemplate) {
    this._environment = _environment;
    this.renderer = renderer;
    this.owner = owner;
    this.template = template;
    this.outletState = null;
    this._tag = DirtyableTag.create();
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

  rerender() { /**/ }

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
        template: undefined,
      },
    };
    this._tag.inner.dirty();
  }

  toReference() {
    return new RootOutletStateReference(this);
  }

  destroy() { /**/ }
}
