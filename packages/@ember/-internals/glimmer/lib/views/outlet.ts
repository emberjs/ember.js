// We use the `InternalOwner` notion here because we actually need all of its
// API for using with renderers (normally, it will be `EngineInstance`).
// We use `getOwner` from our internal home for it rather than the narrower
// public API for the same reason.
import { type InternalOwner, getOwner } from '@ember/-internals/owner';
import type { BootOptions } from '@ember/engine/instance';
import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import type { Template, TemplateFactory } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createComputeRef, updateRef } from '@glimmer/reference';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';
import type { SimpleElement } from '@simple-dom/interface';
import type { OutletDefinitionState } from '../component-managers/outlet';
import type { Renderer } from '../renderer';
import type { OutletState } from '../utils/outlet';

export interface BootEnvironment {
  hasDOM: boolean;
  isInteractive: boolean;
  _renderMode?: string;
  options: BootOptions;
}

const TOP_LEVEL_NAME = '-top-level';

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

  static create(options: {
    environment: BootEnvironment;
    application: InternalOwner;
    template: TemplateFactory;
  }): OutletView {
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
    public owner: InternalOwner,
    public template: Template,
    public namespace: any
  ) {
    let outletStateTag = createTag();
    let outletState: OutletState = {
      outlets: { main: undefined },
      render: {
        owner: owner,
        into: undefined,
        outlet: 'main',
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
        outletState.outlets['main'] = state;
      }
    ));

    this.state = {
      ref,
      name: TOP_LEVEL_NAME,
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
