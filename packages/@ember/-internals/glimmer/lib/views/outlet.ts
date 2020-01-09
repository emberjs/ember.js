import { OWNER, Owner } from '@ember/-internals/owner';
import { assign } from '@ember/polyfills';
import { schedule } from '@ember/runloop';
import { SimpleElement } from '@simple-dom/interface';
import { OutletDefinitionState } from '../component-managers/outlet';
import { Renderer } from '../renderer';
import { OwnedTemplate } from '../template';
import { OutletState, RootOutletReference } from '../utils/outlet';

export interface BootEnvironment {
  hasDOM: boolean;
  isInteractive: boolean;
  options: any;
}

const TOP_LEVEL_NAME = '-top-level';
const TOP_LEVEL_OUTLET = 'main';

export default class OutletView {
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
    let { _environment, renderer, template: templateFactory } = options;
    let owner = options[OWNER];
    let template = templateFactory(owner);
    return new OutletView(_environment, renderer, owner, template);
  }

  public ref: RootOutletReference;
  public state: OutletDefinitionState;

  constructor(
    private _environment: BootEnvironment,
    public renderer: Renderer,
    public owner: Owner,
    public template: OwnedTemplate
  ) {
    let ref = (this.ref = new RootOutletReference({
      outlets: { main: undefined },
      render: {
        owner: owner,
        into: undefined,
        outlet: TOP_LEVEL_OUTLET,
        name: TOP_LEVEL_NAME,
        controller: undefined,
        model: undefined,
        template,
      },
    }));
    this.state = {
      ref,
      name: TOP_LEVEL_NAME,
      outlet: TOP_LEVEL_OUTLET,
      template,
      controller: undefined,
      model: undefined,
    };
  }

  appendTo(selector: string | SimpleElement) {
    let target;

    if (this._environment.hasDOM) {
      target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    } else {
      target = selector;
    }

    schedule('render', this.renderer, 'appendOutletView', this, target);
  }

  rerender() {
    /**/
  }

  setOutletState(state: OutletState) {
    this.ref.update(state);
  }

  destroy() {
    /**/
  }
}
