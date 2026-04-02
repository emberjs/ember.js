import { Component } from '@lifeart/gxt';

/**
 * EmberOutletElement - Custom HTML element for Ember's {{outlet}} helper.
 *
 * GXT compiles {{outlet}} (transformed to <ember-outlet />) as $_tag("ember-outlet", ...),
 * which creates this custom element. The element then renders the nested route template
 * by reading from the outlet state stored in globalThis.__currentOutletState.
 *
 * This approach bridges GXT's compilation model with Ember's routing/outlet system.
 */
class EmberOutletElement extends HTMLElement {
  private _rendered = false;
  private _outletState: any = null;

  connectedCallback() {
    // Get outlet state from the global context
    this._outletState = (globalThis as any).__currentOutletState;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[ember-outlet] connectedCallback, outletState:', this._outletState ? 'exists' : 'null');
    }

    // Register this outlet element for state change notifications
    if (!(globalThis as any).__activeOutletElements) {
      (globalThis as any).__activeOutletElements = new Set();
    }
    (globalThis as any).__activeOutletElements.add(this);

    this.renderOutlet();
  }

  disconnectedCallback() {
    // Unregister from active outlets
    const activeOutlets = (globalThis as any).__activeOutletElements;
    if (activeOutlets) {
      activeOutlets.delete(this);
    }
    this._rendered = false;
  }

  /**
   * Called by OutletView.setOutletState when the route changes.
   * Re-renders the outlet with the new state.
   */
  updateOutletState(newState: any) {
    this._outletState = newState;
    // Clear and re-render
    this.innerHTML = '';
    this._rendered = false;
    this.renderOutlet();
  }

  renderOutlet() {
    if (this._rendered) return;

    const outletState = this._outletState;
    if (!outletState) {
      if ((globalThis as any).__DEBUG_GXT_RENDER) {
        console.log('[ember-outlet] No outlet state available');
      }
      return;
    }

    // Get the nested outlet (outlets.main)
    const nestedOutlet = outletState?.outlets?.main;
    if (!nestedOutlet?.render?.template) {
      if ((globalThis as any).__DEBUG_GXT_RENDER) {
        console.log('[ember-outlet] No nested template to render');
      }
      return;
    }

    // Use 'tpl' instead of 'template' to avoid GXT's CallExpression transform
    // GXT's Babel plugin treats any function named 'template' as an Ember template function
    const { template: tpl, controller, model, owner } = nestedOutlet.render;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[ember-outlet] Rendering nested template:', tpl?.moduleName || typeof tpl);
    }

    // Build the args object with proper GXT symbols so @model, @controller work
    const $ARGS_KEY = Symbol.for('gxt-args');
    const $SLOTS_KEY = Symbol.for('gxt-slots');
    const argsObj: any = {
      model,
      controller,
      outletState: nestedOutlet,
    };

    // Build context for nested template
    // Spread controller properties so `this.value` on the controller works
    const nestedContext: any = {
      ...(controller || {}),
      model,
      owner: owner || (globalThis as any).owner,
      outletState: nestedOutlet,
      args: argsObj,
      [$ARGS_KEY]: argsObj,
      [$SLOTS_KEY]: {},
      $fw: [[], [], []],
    };

    // Update the global outlet state for nested outlets
    const previousOutletState = (globalThis as any).__currentOutletState;
    (globalThis as any).__currentOutletState = nestedOutlet;

    // Set globalThis.owner to the route's owner (may be an engine instance)
    // so that $_tag_ember can resolve components from the correct registry
    const previousOwner = (globalThis as any).owner;
    if (owner) {
      (globalThis as any).owner = owner;
    }

    try {
      // Render the template
      if (typeof tpl?.render === 'function') {
        tpl.render(nestedContext, this);
        this._rendered = true;
      } else if (typeof tpl === 'function') {
        // Factory function - call it to get the template
        const resolved = tpl(nestedContext.owner);
        if (resolved && typeof resolved.render === 'function') {
          resolved.render(nestedContext, this);
          this._rendered = true;
        }
      }
    } catch (e: any) {
      // Handle GXT context errors gracefully
      if ((globalThis as any).__DEBUG_GXT_RENDER) {
        console.warn('[ember-outlet] Template render failed:', e?.message);
      }
    } finally {
      // Restore previous outlet state and owner
      (globalThis as any).__currentOutletState = previousOutletState;
      (globalThis as any).owner = previousOwner;
    }
  }
}

// Register the custom element (only once)
if (typeof customElements !== 'undefined' && !customElements.get('ember-outlet')) {
  customElements.define('ember-outlet', EmberOutletElement);
}

/**
 * GXT-compatible Outlet component for Ember routing.
 * (Legacy - kept for compatibility but prefer using custom element)
 */
export class Outlet extends Component {
  get outletState() {
    // Get outlet state from context - passed down from parent route
    const ctx = (this as any).ctx || (this as any).args?._ctx;
    return ctx?.outletState;
  }

  get nestedOutlet() {
    // For {{outlet}} we need to render the NESTED route
    // which is in outlets.main, not the current route (outletState.render)
    return this.outletState?.outlets?.main;
  }

  get hasContent() {
    const nested = this.nestedOutlet;
    return nested && nested.render && nested.render.template;
  }

  <template>
    <ember-outlet></ember-outlet>
  </template>
}

export default Outlet;
