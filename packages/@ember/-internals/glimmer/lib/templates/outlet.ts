/**
 * EmberOutletElement - Custom HTML element for Ember's {{outlet}} helper.
 *
 * GXT compiles {{outlet}} (transformed to <ember-outlet />) as $_tag("ember-outlet", ...),
 * which creates this custom element. The element then renders the nested route template
 * by reading from the outlet state stored in globalThis.__currentOutletState.
 */
class EmberOutletElement extends HTMLElement {
  private _rendered = false;
  private _outletState: any = null;
  private _lastRenderedTemplate: any = null;

  connectedCallback() {
    // Get outlet state from the global context
    this._outletState = (globalThis as any).__currentOutletState;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[ember-outlet] connectedCallback, outletState:', this._outletState ? 'exists' : 'null');
    }

    this.renderOutlet();

    // Register this outlet element for re-rendering when state changes
    const outlets = (globalThis as any).__activeOutletElements;
    if (outlets) {
      outlets.add(this);
    }
  }

  disconnectedCallback() {
    this._rendered = false;
    this._lastRenderedTemplate = null;

    // Unregister from active outlets
    const outlets = (globalThis as any).__activeOutletElements;
    if (outlets) {
      outlets.delete(this);
    }
  }

  // Called when outlet state changes to re-render with new content
  updateOutletState(newState: any) {
    this._outletState = newState;

    // Check if the template actually changed
    const nestedOutlet = newState?.outlets?.main;
    const newTemplate = nestedOutlet?.render?.template;

    if (newTemplate !== this._lastRenderedTemplate) {
      // Schedule re-render outside of the backburner run loop to avoid
      // infinite synchronous loops. GXT template rendering during backburner's
      // queue processing can trigger notifyPropertyChange which schedules more
      // backburner work, creating a deadlock.
      setTimeout(() => {
        this._rendered = false;
        this.innerHTML = '';
        this.renderOutlet();
      }, 0);
    }
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

    // Track which template we rendered so we can detect changes
    this._lastRenderedTemplate = tpl;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[ember-outlet] Rendering nested template:', tpl?.moduleName || typeof tpl);
    }

    // Build context from controller via prototype chain.
    const nestedContext: any = controller ? Object.create(controller) : {};
    nestedContext.model = model;
    nestedContext.owner = owner || (globalThis as any).owner;
    nestedContext.outletState = nestedOutlet;
    nestedContext.args = { model, controller, outletState: nestedOutlet };

    // Update the global outlet state for nested outlets
    const previousOutletState = (globalThis as any).__currentOutletState;
    (globalThis as any).__currentOutletState = nestedOutlet;

    try {
      if (typeof tpl?.render === 'function') {
        tpl.render(nestedContext, this);
        this._rendered = true;
      } else if (typeof tpl === 'function') {
        const resolved = tpl(nestedContext.owner);
        if (resolved && typeof resolved.render === 'function') {
          resolved.render(nestedContext, this);
          this._rendered = true;
        }
      }
    } finally {
      (globalThis as any).__currentOutletState = previousOutletState;
    }
  }
}

// Global set of active outlet elements for re-rendering on state change
(globalThis as any).__activeOutletElements = new Set<EmberOutletElement>();

// Register the custom element (only once)
if (typeof customElements !== 'undefined' && !customElements.get('ember-outlet')) {
  customElements.define('ember-outlet', EmberOutletElement);
}

// Export as a factory function for Ember's template registration system
// This is a simplified outlet that just renders nested templates - no GXT primitives needed
export default function createOutletTemplate(_owner: any) {
  // The outlet template factory
  const factory = () => {
    // Return empty nodes - the actual rendering is done via the render method
    return { nodes: [] };
  };

  // Mark as gxt template
  (factory as any).__gxtCompiled = true;
  (factory as any).moduleName = 'template:-outlet';

  // Add required interface methods
  (factory as any).asLayout = () => ({
    moduleName: 'template:-outlet',
    symbolTable: { hasEval: false, symbols: [], upvars: [] },
    meta: { moduleName: 'template:-outlet', owner: _owner, size: 0 },
    compile: () => 999999, // gxt handle
  });

  (factory as any).asWrappedLayout = (factory as any).asLayout;
  (factory as any).result = 'ok';

  // Add render method for runtime gxt rendering
  // This is the main entry point - it just delegates to the nested template
  (factory as any).render = (context: any, parentElement: Element) => {
    // The outlet state comes from the context - root.ts passes outletState directly
    const outletState = context?.outletState || context?.state || context;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[outlet.ts] render called');
      console.log('[outlet.ts] context keys:', context ? Object.keys(context).slice(0, 8).join(',') : 'null');
      console.log('[outlet.ts] outletState:', outletState ? 'exists' : 'null');
    }

    // The outlet state has the CURRENT route's info in .render
    // and NESTED route's info in .outlets.main
    // For the {{outlet}} helper, we want to render the nested route
    const nestedOutlet = outletState?.outlets?.main;
    const nestedTemplate = nestedOutlet?.render?.template;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[outlet.ts] nestedOutlet:', nestedOutlet ? 'exists' : 'null');
      console.log('[outlet.ts] nestedTemplate:', nestedTemplate ? 'exists' : 'null', 'type:', typeof nestedTemplate);
    }

    if (nestedTemplate && typeof nestedTemplate.render === 'function') {
      // Build context using controller DIRECTLY to preserve identity
      const nestedCtrl = nestedOutlet?.render?.controller;
      const nestedCtx: any = nestedCtrl ? Object.create(nestedCtrl) : {};
      nestedCtx.model = nestedOutlet?.render?.model;
      nestedCtx.owner = nestedOutlet?.render?.owner || context?.owner;
      nestedCtx.outletState = nestedOutlet;
      nestedCtx.args = {
        model: nestedOutlet?.render?.model,
        controller: nestedOutlet?.render?.controller,
        outletState: nestedOutlet,
      };
      nestedTemplate.render(nestedCtx, parentElement);
    } else if (nestedTemplate && typeof nestedTemplate === 'function') {
      const tpl = nestedTemplate(context?.owner);
      if (tpl && typeof tpl.render === 'function') {
        const nestedCtrl = nestedOutlet?.render?.controller;
        const nestedCtx: any = nestedCtrl ? Object.create(nestedCtrl) : {};
        nestedCtx.model = nestedOutlet?.render?.model;
        nestedCtx.owner = nestedOutlet?.render?.owner || context?.owner;
        nestedCtx.outletState = nestedOutlet;
        nestedCtx.args = {
          model: nestedOutlet?.render?.model,
          controller: nestedOutlet?.render?.controller,
          outletState: nestedOutlet,
        };
        tpl.render(nestedCtx, parentElement);
      }
    }
    // If no nested template, just return empty - outlet has nothing to show
    return { nodes: [], ctx: context };
  };

  return factory;
}
