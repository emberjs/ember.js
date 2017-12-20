import { Simple } from '@glimmer/interfaces';
import { Tag, Reference } from '@glimmer/reference';
import { Option } from '@glimmer/util';
import { environment } from 'ember-environment';
import { run } from 'ember-metal';
import { assign, OWNER } from 'ember-utils';
import { Renderer } from '../renderer';
import { Container, OwnedTemplate } from '../template';
import { RouteInfo, privateAccess } from 'ember-routing';
import { UpdatableReference } from '../utils/references';

export class RouteInfoReference {
  tag: Tag;
  protected _ref: Reference<any>;

  protected constructor(ref: Reference<any>) {
    this._ref = ref;
    this.tag = ref.tag;
  }

  static fromRef(ref: Reference<any>) : RouteInfoReference {
    if (ref instanceof RouteInfoReference) {
      return ref;
    } else {
      return new RouteInfoReference(ref);
    }
  }

  get(outletName: string): RouteInfoReference {
    return new ChildRouteInfoReference(this, outletName);
  }

  value(): Option<RouteInfo> {
    let value = this._ref.value();
    if (value instanceof RouteInfo) {
      return value;
    }
    return null;
  }
}

class ChildRouteInfoReference extends RouteInfoReference {
  private outletName: string;

  constructor(parent: RouteInfoReference, outletName: string) {
    super(parent);
    this.outletName = outletName;
  }

  value(): Option<RouteInfo> {
    let parentValue = this._ref.value();
    if (parentValue) {
      let value = privateAccess(parentValue).getChild(this.outletName);
      if (value) {
        privateAccess(value).markAsUsed();
      }
      return value;
    }
    return null;
  }
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
  public outletState: Option<RouteInfo>;
  private _outletStateReference: UpdatableReference | null;

  static extend(injections: any) {
    return class extends OutletView {
      static create(options: any) {
        if (options) {
          return super.create(assign({}, injections, options));
        } else {
          return super.create(injections);
        }
      }
    };
  }

  static reopenClass(injections: any) {
    assign(this, injections);
  }

  static create(options: any) {
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
    this._outletStateReference = null;
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

  setOutletState(state: RouteInfo) {
    let routeInfo = new RouteInfo('-top-level');
    privateAccess(routeInfo).setChild(routeInfo, 'main', state);
    this.outletState = routeInfo;
    if (this._outletStateReference) {
      this._outletStateReference.update(routeInfo);
    }
  }

  toReference() {
    if (!this._outletStateReference) {
      this._outletStateReference = new UpdatableReference(this.outletState);
    }
    return this._outletStateReference;
  }

  destroy() { /**/ }
}
