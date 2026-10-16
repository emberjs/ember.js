import { createRoot, setParentContext, getParentContext, $SLOTS_SYMBOL } from '@lifeart/gxt';
import { getGxtRenderer, getAmbientOwner, setAmbientOwner, GXT_ARGS_SYMBOL } from './gxt-bridge';

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
    // the engine instance — it will be reused via the shared engine cache
    // (`compilePipeline.getEngineInstances()`).
    if (!(getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false)) {
      // `destroy()` is a no-op on an instance already destroying; an error
      // the engine's destructors throw is the engine's own and is reported.
      if (this._engineInstance && typeof this._engineInstance.destroy === 'function') {
        this._engineInstance.destroy();
      }
    }
    this._engineInstance = null;
  }

  renderEngine() {
    if (this._rendered) return;

    const engineName = this.getAttribute('data-engine');
    if (!engineName) return;

    // Intentionally no debug logging in production

    const owner = getAmbientOwner();
    if (!owner) return;

    // Use a shared cache to prevent duplicate engine instances when the
    // application template is re-rendered (which creates new <ember-mount> elements).
    // The cache is compile.ts's `_gxtEngineInstances` Map, reached through
    // `compilePipeline.getEngineInstances()`; without the bridge, bail out.
    const engineCache = getGxtRenderer()?.compilePipeline.getEngineInstances?.();
    if (!engineCache) return;

    try {
      // Check if we already have an engine instance for this name
      let engineInstance = engineCache.get(engineName);
      if (!engineInstance || engineInstance.isDestroyed || engineInstance.isDestroying) {
        // Prefer upstream's engine machinery: buildChildEngineInstance sets
        // the engine parent and _bootSync runs cloneParentDependencies, which
        // injects the parent's `router:main`, `-environment:main`,
        // `service:-routing`, … into the child registry. Without those a
        // routeless engine's <LinkTo> cannot resolve `router:main` and
        // crashes with `undefined.setupRouter()` in production builds, where
        // the DEBUG routeless-engine assert (which fires first in dev and
        // masks the gap) is stripped.
        if (typeof owner.buildChildEngineInstance === 'function') {
          try {
            engineInstance = owner.buildChildEngineInstance(engineName);
            engineInstance._bootSync?.();
          } catch {
            // Not registered with the parent (or boot failed) — fall back to
            // the legacy hand-rolled construction below.
            engineInstance = null;
          }
        }
        if (engineInstance) {
          engineCache.set(engineName, engineInstance);
        }
      }
      if (!engineInstance || engineInstance.isDestroyed || engineInstance.isDestroying) {
        // Look up the engine class from the application
        const engineFactory = owner.factoryFor?.(`engine:${engineName}`);
        if (!engineFactory) {
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
            if (instance) {
              // Store the original engine class instance so it can be destroyed
              // during cleanup (its init() added it to NAMESPACES).
              instance.__gxtOriginalEngine = engineInstance;
              engineInstance = instance;
            }
          }
        }

        if (!engineInstance) return;
        engineCache.set(engineName, engineInstance);
      }

      this._engineInstance = engineInstance;

      // Get the engine's application template and controller
      const tpl =
        engineInstance.lookup?.('template:application') ||
        engineInstance.resolve?.('template:application');
      // Cache controller per engine instance to avoid double-init when re-rendering
      let controller = engineInstance.__gxtCachedController;
      if (!controller) {
        const controllerFactory = engineInstance.factoryFor?.('controller:application');
        controller = controllerFactory ? controllerFactory.create() : null;
        if (controller) engineInstance.__gxtCachedController = controller;
      }

      if (!tpl) {
        return;
      }

      // Set up the rendering context
      const renderContext: any = controller ? Object.create(controller) : {};
      renderContext.owner = engineInstance;
      renderContext.args = {};
      renderContext[GXT_ARGS_SYMBOL] = {};
      renderContext[$SLOTS_SYMBOL] = {};
      renderContext.$fw = [[], [], []];

      // Swap owner to engine for component/helper resolution
      const previousOwner = getAmbientOwner();
      setAmbientOwner(engineInstance);

      // Set up GXT rendering context (the shared root context, owned by
      // compile.ts and read/written via the compilePipeline bridge).
      const savedParent = getParentContext();
      const _cp119 = getGxtRenderer()?.compilePipeline;
      let gxtRoot = _cp119?.getRootContext?.();
      if (!gxtRoot) {
        gxtRoot = createRoot(document);
        _cp119?.setRootContext?.(gxtRoot);
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
        setAmbientOwner(previousOwner);
      }
    } catch (e: any) {
      // Route render errors to the render-error queue so `visit()` rejects —
      // e.g. the DEBUG routeless-engine assert thrown by <LinkTo>'s
      // validateArguments during the engine template render. Swallowing it
      // here would let the visit promise resolve and break
      // `assert.rejectsAssertion`-style tests.
      const capture = getGxtRenderer()?.compilePipeline.captureRenderError;
      if (typeof capture === 'function') {
        capture(e);
      }
    }
  }
}

/**
 * Define the `<ember-mount>` custom element, which the gxt compiler lowers
 * `{{mount}}` to. Called once by compile.ts, which every GXT compat build
 * loads.
 */
export function defineEmberMountElement(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('ember-mount')) {
    customElements.define('ember-mount', EmberMountElement);
  }
}
