import { getOwner, Owner } from '@ember/-internals/owner';
import { assign } from '@ember/polyfills';
import { schedule } from '@ember/runloop';
import { Template } from '@glimmer/interfaces';
import { createComputeRef, Reference, updateRef } from '@glimmer/reference';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import { OutletDefinitionState } from '../component-managers/outlet';
import { Renderer } from '../renderer';
import { OutletState } from '../utils/outlet';

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
    let owner = getOwner(options);
    let template = templateFactory(owner);
    return new OutletView(_environment, renderer, owner, template);
  }

  private ref: Reference;
  public state: OutletDefinitionState;

  constructor(
    private _environment: BootEnvironment,
    public renderer: Renderer,
    public owner: Owner,
    public template: Template
  ) {
    let outletStateTag = createTag();
    let outletState: OutletState = {
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
    };

    let ref = (this.ref = createComputeRef(
      () => {
        consumeTag(outletStateTag);
        return outletState;
      },
      (state: OutletState) => {
        dirtyTag(outletStateTag);
        outletState.outlets.main = state;
      }
    ));

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
    updateRef(this.ref, state);
  }

  destroy() {
    /**/
  }
}
