import { Component, createRoot, setParentContext, getParentContext } from '@lifeart/gxt';

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

    // Build context from controller via prototype chain so property reads
    // fall through to the controller. GXT cells are installed on this
    // renderContext, and __gxtComponentContexts maps the controller to it
    // so set(controller, key, val) updates propagate.
    const nestedContext: any = controller ? Object.create(controller) : {};
    nestedContext.model = model;
    nestedContext.owner = owner || (globalThis as any).owner;
    nestedContext.outletState = nestedOutlet;
    nestedContext.args = argsObj;
    nestedContext[$ARGS_KEY] = argsObj;
    nestedContext[$SLOTS_KEY] = {};
    nestedContext.$fw = [[], [], []];

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
      // Establish a GXT root context for this outlet element.
      // GXT's internal tree requires a parent context; without this,
      // rendering inside the outlet fails with "Cannot read properties
      // of undefined (reading 'Symbol()')" because te() returns undefined.
      // Use the shared root context (same as runtime-hbs uses).
      const savedParent = getParentContext();
      let gxtRoot = (globalThis as any).__gxtRootContext;
      if (!gxtRoot) {
        gxtRoot = createRoot(document);
        (globalThis as any).__gxtRootContext = gxtRoot;
      }
      setParentContext(gxtRoot);

      // Install GXT cells on the context so property reads inside formulas
      // are tracked. Without this, set(model, 'color', 'blue') won't trigger
      // re-renders because the formula never tracked cell(context, 'model').
      // Use the global cellFor to ensure we use the SAME module instance as
      // compile.ts (which handles __gxtTriggerReRender).
      const _cellFor = (globalThis as any).__gxtCellFor;
      const registerOwner = (globalThis as any).__gxtRegisterObjectValueOwner;
      if (_cellFor) {
        try {
          const internalKeys = new Set([
            'args', 'owner', 'outletState', '$fw', '$slots',
            'constructor', 'init', 'willDestroy', 'toString',
          ]);
          const argsKeys = new Set(['model', 'controller', 'outletState']);
          for (const key of Object.getOwnPropertyNames(nestedContext)) {
            if (key.startsWith('_') || key.startsWith('$') || internalKeys.has(key)) continue;
            const desc = Object.getOwnPropertyDescriptor(nestedContext, key);
            if (desc && !desc.get && !desc.set && desc.configurable &&
                typeof desc.value !== 'function') {
              try {
                _cellFor(nestedContext, key, false);
                // Register reverse mapping for object values so mutations
                // on nested objects dirty the parent cell
                if (desc.value && typeof desc.value === 'object' && registerOwner) {
                  registerOwner(desc.value, nestedContext, key);
                }
              } catch { /* ignore */ }
            }
          }
          // Also install cells on the args object
          for (const key of argsKeys) {
            const desc = Object.getOwnPropertyDescriptor(argsObj, key);
            if (desc && !desc.get && !desc.set && desc.configurable &&
                typeof desc.value !== 'function') {
              try {
                _cellFor(argsObj, key, false);
                if (desc.value && typeof desc.value === 'object' && registerOwner) {
                  registerOwner(desc.value, argsObj, key);
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore cell installation errors */ }
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
      } finally {
        // Restore previous parent context
        if (savedParent) {
          setParentContext(savedParent);
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
 * EmberMountElement - Custom HTML element for Ember's {{mount}} helper.
 *
 * Mounts a routeless engine by:
 * 1. Looking up the engine class from the application container
 * 2. Building (creating + booting) the engine instance
 * 3. Rendering the engine's application template with its controller
 */
class EmberMountElement extends HTMLElement {
  private _rendered = false;
  private _engineInstance: any = null;
  private _everRendered = false;

  connectedCallback() {
    // Only render once per element instance to avoid double-mounting
    if (!this._everRendered) {
      this._everRendered = true;
      this.renderEngine();
    }
  }

  disconnectedCallback() {
    this._rendered = false;
    // During force-rerender elements are removed and recreated; don't destroy
    // the engine instance — it will be reused via __gxtEngineInstances cache.
    if (!(globalThis as any).__gxtIsForceRerender) {
      if (this._engineInstance && typeof this._engineInstance.destroy === 'function') {
        try { this._engineInstance.destroy(); } catch { /* ignore */ }
      }
    }
    this._engineInstance = null;
  }

  renderEngine() {
    if (this._rendered) return;

    const engineName = this.getAttribute('data-engine');
    if (!engineName) return;

    // Intentionally no debug logging in production

    const owner = (globalThis as any).owner;
    if (!owner) return;

    // Use a global cache to prevent duplicate engine instances when the
    // application template is re-rendered (which creates new <ember-mount> elements).
    const engineCache: Map<string, any> = ((globalThis as any).__gxtEngineInstances ||= new Map<string, any>());

    try {
      // Check if we already have an engine instance for this name
      let engineInstance = engineCache.get(engineName);
      if (!engineInstance || engineInstance.isDestroyed || engineInstance.isDestroying) {
        // Look up the engine class from the application
        const engineFactory = owner.factoryFor?.(`engine:${engineName}`);
        if (!engineFactory) {
          if ((globalThis as any).__DEBUG_GXT_RENDER) {
            console.warn(`[ember-mount] Engine "${engineName}" not found in container`);
          }
          return;
        }

        // Build the engine instance
        const EngineClass = engineFactory.class;

        if (EngineClass) {
          // Create the engine instance with the parent owner
          engineInstance = EngineClass.create({
            _parent: owner,
            parent: owner,
          });

          // Build the instance if needed (Ember engines have buildInstance)
          if (typeof engineInstance.buildInstance === 'function') {
            const instance = engineInstance.buildInstance();
            if (instance) engineInstance = instance;
          }
        }

        if (!engineInstance) return;
        engineCache.set(engineName, engineInstance);
      }

      this._engineInstance = engineInstance;

      // Get the engine's application template and controller
      const tpl = engineInstance.lookup?.('template:application') || engineInstance.resolve?.('template:application');
      // Cache controller per engine instance to avoid double-init when re-rendering
      let controller = engineInstance.__gxtCachedController;
      if (!controller) {
        const controllerFactory = engineInstance.factoryFor?.('controller:application');
        controller = controllerFactory ? controllerFactory.create() : null;
        if (controller) engineInstance.__gxtCachedController = controller;
      }

      if (!tpl) {
        if ((globalThis as any).__DEBUG_GXT_RENDER) {
          console.warn(`[ember-mount] Engine "${engineName}" has no application template`);
        }
        return;
      }

      // Set up the rendering context
      const $ARGS_KEY = Symbol.for('gxt-args');
      const $SLOTS_KEY = Symbol.for('gxt-slots');

      const renderContext: any = controller ? Object.create(controller) : {};
      renderContext.owner = engineInstance;
      renderContext.args = {};
      renderContext[$ARGS_KEY] = {};
      renderContext[$SLOTS_KEY] = {};
      renderContext.$fw = [[], [], []];

      // Swap owner to engine for component/helper resolution
      const previousOwner = (globalThis as any).owner;
      (globalThis as any).owner = engineInstance;

      // Set up GXT rendering context
      const savedParent = getParentContext();
      let gxtRoot = (globalThis as any).__gxtRootContext;
      if (!gxtRoot) {
        gxtRoot = createRoot(document);
        (globalThis as any).__gxtRootContext = gxtRoot;
      }
      setParentContext(gxtRoot);

      try {
        if (typeof tpl?.render === 'function') {
          tpl.render(renderContext, this);
          this._rendered = true;
        } else if (typeof tpl === 'function') {
          const resolved = tpl(engineInstance);
          if (resolved && typeof resolved.render === 'function') {
            resolved.render(renderContext, this);
            this._rendered = true;
          }
        }
      } finally {
        if (savedParent) {
          setParentContext(savedParent);
        }
        (globalThis as any).owner = previousOwner;
      }
    } catch (e: any) {
      if ((globalThis as any).__DEBUG_GXT_RENDER) {
        console.warn(`[ember-mount] Engine render failed:`, e?.message);
      }
    }
  }
}

// Register the ember-mount custom element
if (typeof customElements !== 'undefined' && !customElements.get('ember-mount')) {
  customElements.define('ember-mount', EmberMountElement);
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
