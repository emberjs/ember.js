// We use the `InternalOwner` notion here because we actually need all of its
// API for using with renderers (normally, it will be `EngineInstance`).
// We use `getOwner` from our internal home for it rather than the narrower
// public API for the same reason.
import { type InternalOwner, getOwner } from '@ember/-internals/owner';
import type { BootOptions } from '@ember/engine/instance';
import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import type { Template, TemplateFactory } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef, updateRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';
import type { SimpleElement } from '@simple-dom/interface';
// (Cluster B slice 113) Bridge reader for the root-outlet rerender dispatcher.
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';
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

  // In GXT mode `ref` is the raw OutletState (used directly for cellFor-based
  // reactivity). In classic mode `ref` is a Glimmer Reference returned by
  // createComputeRef, with outletStateTag as the invalidation handle. Both
  // shapes pose as Reference<OutletState | undefined> via the cast below so
  // that `state.ref` carries the same type to consumers.
  private ref: Reference<OutletState | undefined>;
  private outletStateTag: ReturnType<typeof createTag> | null = null;
  public state: OutletDefinitionState;

  constructor(
    private _environment: BootEnvironment,
    public owner: InternalOwner,
    public template: Template,
    public namespace: any
  ) {
    let outletState: OutletState = {
      outlets: { main: undefined },
      render: {
        owner: owner,
        name: TOP_LEVEL_NAME,
        controller: undefined,
        model: undefined,
        template,
      },
    };

    if (__GXT_MODE__) {
      // GXT mode: install a cellFor-backed reactive slot on outletState.outlets.main
      // and pass the raw outletState through as `ref` (consumers in this branch
      // dereference it directly). cellFor is read lazily from the gxt-backend's
      // globalThis.__lifeartGxt stash so classic-mode bundles (benchmark-app)
      // don't statically import @lifeart/gxt.
      (globalThis as any).__lifeartGxt.cellFor(outletState.outlets, 'main');
      this.ref = outletState as unknown as Reference<OutletState | undefined>;
    } else {
      // Classic mode: restore upstream's createComputeRef + tag pattern so that
      // standard Glimmer VM revalidation drives outlet re-renders. Without this,
      // setOutletState has no invalidation hook and the renderer hangs on
      // subsequent revalidation cycles (observed as the bench's clearItems4
      // hang in benchmark-app, which never sets __GXT_MODE__).
      const tag = (this.outletStateTag = createTag());
      this.ref = createComputeRef(
        () => {
          consumeTag(tag);
          return outletState;
        },
        (state: OutletState) => {
          dirtyTag(tag);
          outletState.outlets['main'] = state;
        }
      );
    }

    this.state = {
      ref: this.ref,
      name: TOP_LEVEL_NAME,
      template,
      controller: undefined,
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
    if (!__GXT_MODE__) {
      // Classic mode: route through the createComputeRef updater so the
      // outletStateTag dirties and Glimmer VM revalidates on the next pass.
      updateRef(this.ref, state);
      return;
    }

    // GXT mode: directly mutate the raw OutletState (this.ref IS that state in
    // GXT mode — see constructor) and drive re-render through GXT's outlet
    // chain.
    (this.ref as any).outlets['main'] = state;

    // Update the global outlet state so <ember-outlet> elements can access it
    (globalThis as any).__currentOutletState = this.ref;

    // In GXT mode, trigger re-render of the root outlet content first.
    // The root render function handles the top-level route (the one that
    // root.ts renders directly, skipping the -outlet template).
    {
      // Slice-113 (Cluster B): routed through
      // `compilePipeline.getRootOutletRerender?.() ?? null` — the `?? null`
      // fallback matches the pre-slice-113 `(globalThis as any)
      // .__gxtRootOutletRerender` `undefined` semantics which the
      // `typeof === 'function'` guard treated as falsy. See
      // `getRootOutletRerender` doc in gxt-bridge.ts.
      const rootRenderFn = getGxtRenderer()?.compilePipeline.getRootOutletRerender?.() ?? null;
      if (typeof rootRenderFn === 'function') {
        // Snapshot active outlets BEFORE the root re-render. The root re-render
        // may create new <ember-outlet> elements (via innerHTML='' + renderOutletState).
        // We only want to notify PRE-EXISTING outlets about the state change —
        // newly created outlets already render via connectedCallback.
        const preExistingOutlets = (globalThis as any).__activeOutletElements
          ? new Set((globalThis as any).__activeOutletElements)
          : null;

        rootRenderFn(this.ref);

        // After the root re-render, notify pre-existing outlet elements about
        // nested state changes (e.g., engine-internal route transitions where
        // the outlet element stays in the DOM but nested content changes).
        if (preExistingOutlets) {
          const currentOutlets = (globalThis as any).__activeOutletElements;
          for (const outlet of preExistingOutlets as Iterable<any>) {
            // Only notify outlets that survived the root re-render (still in DOM)
            if (currentOutlets?.has(outlet) && typeof outlet.updateOutletState === 'function') {
              outlet.updateOutletState(this.ref);
            }
          }
        }
        return;
      }
    }

    // Fallback: Notify active outlet elements about the state change
    const activeOutlets = (globalThis as any).__activeOutletElements;
    if (activeOutlets) {
      for (const outlet of activeOutlets) {
        if (typeof outlet.updateOutletState === 'function') {
          outlet.updateOutletState(this.ref);
        }
      }
    }
  }

  destroy(): void {
    /**/
  }
}
