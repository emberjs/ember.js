import { getOwner, Owner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
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
  static extend(injections: any): typeof OutletView {
    return class extends OutletView {
      static create(options: any) {
        if (options) {
          return super.create(Object.assign({}, injections, options));
        } else {
          return super.create(injections);
        }
      }
    };
  }

  static reopenClass(injections: any): void {
    Object.assign(this, injections);
  }

  static create(options: any): OutletView {
    let { environment: _environment, application: namespace, template: templateFactory } = options;
    let owner = getOwner(options);
    assert('OutletView is unexpectedly missing an owner', owner);
    let template = templateFactory(owner);
    return new OutletView(_environment, owner, template, namespace);
  }

  private ref: Reference;
  public state: OutletDefinitionState;

  constructor(
    private _environment: BootEnvironment,
    public owner: Owner,
    public template: Template,
    public namespace: any
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

  appendTo(selector: string | SimpleElement): void {
    let target;

    if (this._environment.hasDOM) {
      target = typeof selector === 'string' ? document.querySelector(selector) : selector;
    } else {
      target = selector;
    }

    let renderer = this.owner.lookup('renderer:-dom') as Renderer;

    // SAFETY: It's not clear that this cast is safe.
    // The types for appendOutletView may be incorrect or this is a potential bug.
    schedule('render', renderer, 'appendOutletView', this, target as SimpleElement);
  }

  rerender(): void {
    /**/
  }

  setOutletState(state: OutletState): void {
    updateRef(this.ref, state);
  }

  destroy(): void {
    /**/
  }
}
