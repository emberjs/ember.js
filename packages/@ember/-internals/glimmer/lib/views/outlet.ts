import { type InternalOwner, getOwner } from '@ember/-internals/owner';
import type { BootOptions } from '@ember/engine/instance';
import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import type { Template, TemplateFactory } from '@glimmer/interfaces';
import type { SimpleElement } from '@simple-dom/interface';
import type { OutletDefinitionState } from '../component-managers/outlet';
import type { Renderer } from '../renderer';
import type { OutletState } from '../utils/outlet';
import { rootOutletCell } from '../gxt-outlet';
import { syncDom as gxtSyncDom } from '@lifeart/gxt';

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

  // Kept for backwards compat — outlet component managers read this.
  public state: OutletDefinitionState;

  constructor(
    private _environment: BootEnvironment,
    public owner: InternalOwner,
    public template: Template,
    public namespace: any
  ) {
    // Seed the GXT root cell with the top-level outlet state so GXTRootOutlet
    // can read it reactively.
    const initialState: OutletState = {
      outlets: { main: undefined },
      render: {
        owner,
        name: TOP_LEVEL_NAME,
        controller: undefined,
        model: undefined,
        template,
      },
    };
    rootOutletCell.update(initialState);

    // state is still used by the outlet component manager for the ref.
    // We provide a minimal compatible object; the GXT outlet system reads
    // directly from rootOutletCell rather than from this.state.ref.
    this.state = {
      // Provide a fake ref for code that still accesses it.
      ref: {
        value: initialState,
        // GXT-aware: when state changes, the cell is updated instead.
      } as any,
      name: TOP_LEVEL_NAME,
      template,
      controller: undefined,
    };
  }

  appendTo(selector: string | SimpleElement): void {
    let target: SimpleElement | null;

    if (this._environment.hasDOM) {
      target =
        typeof selector === 'string'
          ? (document.querySelector(selector) as unknown as SimpleElement)
          : selector;
    } else {
      target = selector as SimpleElement;
    }

    let renderer = this.owner.lookup('renderer:-dom') as Renderer;
    schedule('render', renderer, 'appendOutletView', this, target);
  }

  rerender(): void {
    /**/
  }

  /**
   * Called by the router when routes transition.  Updates the GXT cell so
   * GXTRootOutlet / GXTOutlet re-renders automatically.
   */
  setOutletState(state: OutletState): void {
    // Merge the new route tree into the root outlet state so the top-level
    // render info (owner, name, template) is preserved.
    const current = rootOutletCell.value;
    if (current) {
      rootOutletCell.update({ ...current, outlets: { main: state } });
    } else {
      rootOutletCell.update(state);
    }
    // Synchronously flush GXT's DOM updates so the DOM reflects the new outlet
    // state before ember's test helpers call settled() / renderSettled().
    // GXT normally uses queueMicrotask for reactivity but that fires after
    // ember's timing checks.
    gxtSyncDom();
  }

  destroy(): void {
    /**/
  }
}
