import { getComponentTemplate } from '@glimmer/manager';
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  getParentContext as gxtGetParentContext,
  provideContext as gxtProvideContext,
  RENDERING_CONTEXT as GXT_RENDERING_CONTEXT,
  RENDERED_NODES_PROPERTY as GXT_RENDERED_NODES,
  HTMLBrowserDOMApi as GxtHTMLBrowserDOMApi,
  renderComponent as gxtRenderComponent,
  Component as GxtComponent,
// @ts-ignore
} from '@lifeart/gxt';

// Ensure GXT context is initialized for the document
// Uses a shared root context on globalThis to avoid multiple roots
// fighting over the parent context when modules are deduplicated.
let gxtDomApi: any = null;

function ensureGxtContext() {
  let gxtRootContext = (globalThis as any).__gxtRootContext;
  if (!gxtRootContext) {
    gxtRootContext = gxtCreateRoot(document);
    // Create proper DOM API and provide it to the context
    // This sets fastRenderingContext which is checked first by initDOM
    gxtDomApi = new GxtHTMLBrowserDOMApi(document);
    gxtProvideContext(gxtRootContext, GXT_RENDERING_CONTEXT, gxtDomApi);
    (globalThis as any).__gxtRootContext = gxtRootContext;
  }
  // Always set the context before rendering
  const currentContext = gxtGetParentContext();
  if (!currentContext) {
    gxtSetParentContext(gxtRootContext);
  }
  return gxtRootContext;
}

interface RootState {
  root: {
    ref: any;
    template: any;
  };
  render: {
    owner: any;
  };
}

// RootTemplate - helper class to access outlet state structure
class RootTemplate {
  args: { rootState: RootState };

  constructor(args: { rootState: RootState }) {
    this.args = args;
  }

  // The outlet ref contains the outlet state structure
  get outletRef() {
    return this.args.rootState?.root?.ref;
  }

  // The main outlet contains the application route's render info
  get mainOutlet() {
    return this.outletRef?.outlets?.main;
  }

  get owner() {
    return this.args.rootState?.render?.owner;
  }

  // The application template is in the main outlet's render
  get routeTemplate() {
    return this.mainOutlet?.render?.template;
  }

  get routeModel() {
    return this.mainOutlet?.render?.model;
  }

  get routeController() {
    return this.mainOutlet?.render?.controller;
  }

  get outletState() {
    return this.mainOutlet;
  }
}

// Helper to render a template with context
function renderTemplateWithContext(tpl: any, target: Element, ctx: any, owner: any, depth = 0) {
  if (depth > 5) {
    if (DEBUG_TEMPLATE_LOOKUP) console.warn('[root.ts] Max render depth exceeded');
    return;
  }

  // CRITICAL: Set globalThis.owner before any template rendering
  // This ensures $_tag_ember can resolve Ember components via the registry
  if (owner) {
    (globalThis as any).owner = owner;
  }

  // CRITICAL: Ensure GXT context is set up before any rendering
  // This provides the parent context chain that GXT's $_if, $_c, etc. need
  ensureGxtContext();

  // Ensure context always has args property (even if empty)
  // This prevents "Cannot read properties of undefined (reading 'args')" errors
  if (ctx && !ctx.args) {
    ctx.args = {};
  }

  if (DEBUG_TEMPLATE_LOOKUP) {
    const tplName = tpl?.moduleName || tpl?.id || tpl?.name || (tpl?.constructor?.name !== 'Function' ? tpl?.constructor?.name : null);
    const tplKeys = tpl ? Object.keys(tpl).slice(0, 5).join(',') : 'null';
    const hasGxtCompiled = !!tpl?.__gxtCompiled;
    const hasGxtFactory = !!tpl?.__gxtFactory;
    console.log('[root.ts] renderTemplateWithContext depth:', depth, 'type:', typeof tpl, 'hasRender:', typeof tpl?.render, 'name:', tplName, 'gxt:', hasGxtCompiled, 'factory:', hasGxtFactory, 'keys:', tplKeys);
  }

  // PRIORITY 1: If it has a render method, use it directly
  if (typeof tpl?.render === 'function') {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Calling tpl.render()');
    try {
      tpl.render(ctx, target);
    } catch (err: any) {
      if (DEBUG_TEMPLATE_LOOKUP) console.error('[root.ts] render error:', err?.message || err, 'for template:', tpl?.moduleName || tpl?.name);
      // Only rethrow assertion errors
      if (err?.message?.includes('Assertion Failed')) throw err;
    }
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] After render, target innerHTML length:', target.innerHTML?.length);
  }
  // PRIORITY 2: If it's a function without render, call it as factory
  else if (typeof tpl === 'function') {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Calling tpl as factory');

    // Check if it's a class constructor (needs 'new')
    let template: any;
    const fnStr = tpl.toString();
    const isClass = fnStr.startsWith('class ') || fnStr.startsWith('class{');

    if (isClass) {
      // It's a class (GXT Component) - instantiate with new
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Function is a class, using new');
      try {
        // Check if it's a GXT Component class (has $template symbol or extends GxtComponent)
        const isGxtComponent = tpl.prototype instanceof GxtComponent ||
          tpl.prototype?.constructor?.name === 'Component' ||
          tpl.prototype?.$template ||
          typeof tpl.prototype?.template === 'function';

        if (isGxtComponent) {
          // Use GXT's proper rendering flow for GXT components
          if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Using gxtRenderComponent for GXT component');
          gxtRenderComponent(tpl, {
            element: target,
            args: ctx?.args || {},
            owner: gxtRootContext,
          });
          return; // gxtRenderComponent handles everything
        }

        // Non-GXT class - instantiate manually
        const componentInstance = new tpl(ctx?.args || {});

        // GXT components have a 'template' property that is a function
        // The function must be called with the component instance as `this`
        const templateProp = componentInstance.template || componentInstance['template'];
        if (typeof templateProp === 'function') {
          if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Calling component.template() as method');
          // Call the template function bound to the component instance
          template = templateProp.call(componentInstance);
        } else {
          // No template property, use the instance itself
          template = componentInstance;
        }
      } catch (e: any) {
        if (DEBUG_TEMPLATE_LOOKUP) console.warn('[root.ts] Failed to instantiate class:', e?.message);
        return;
      }
    } else {
      // Regular function - call it.
      // Bind the context as `this` because GXT-compiled templates use
      // $_GET_ARGS(this, arguments) which requires a valid `this` context.
      template = tpl.call(ctx || {}, owner);
    }

    if (DEBUG_TEMPLATE_LOOKUP) {
      console.log('[root.ts] Factory result:', template ? 'exists' : 'null', 'type:', typeof template, 'hasRender:', typeof template?.render, 'same:', template === tpl);
    }

    // Check if the result has $nodes array (GXT template result)
    // GXT's $_fin stores nodes under a symbol key (RENDERED_NODES_PROPERTY),
    // also check .nodes and .$nodes for compatibility.
    const gxtNodes = template && GXT_RENDERED_NODES ? template[GXT_RENDERED_NODES as any] : null;
    const nodesArray = gxtNodes || template?.nodes || template?.$nodes;
    const hasNodes = nodesArray && Array.isArray(nodesArray);
    if (hasNodes) {
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Template has $nodes, appending to target');
      for (const node of nodesArray) {
        if (node instanceof Node) {
          target.appendChild(node);
        }
      }
      return;
    }

    // Avoid infinite recursion
    if (template && template !== tpl) {
      renderTemplateWithContext(template, target, ctx, owner, depth + 1);
    } else if (template === tpl && typeof template.render === 'function') {
      template.render(ctx, target);
    } else if (template && typeof template.render === 'function') {
      // Template has render even if it's same as factory
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Calling template.render from factory result');
      template.render(ctx, target);
    }
  }
  // PRIORITY 3: Check create method (Ember factory pattern)
  else if (typeof tpl?.create === 'function') {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Using create method');
    const created = tpl.create({ owner });
    if (created && typeof created.render === 'function') {
      created.render(ctx, target);
    }
  }
  // PRIORITY 4: Check if it's an object with a nested template property
  else if (tpl && typeof tpl === 'object' && 'template' in tpl) {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Found nested template property');
    renderTemplateWithContext(tpl.template, target, ctx, owner, depth + 1);
  }
  // PRIORITY 5: If it has __wire__, it's a Glimmer compiled template - try to use ember-template-compiler
  else if (tpl && typeof tpl === 'object') {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Object without render - trying runtime compilation');
    // Try to get the template source if available and compile at runtime
    // For now, just log that we can't render this
    if (DEBUG_TEMPLATE_LOOKUP) console.warn('[root.ts] Cannot render template:', tpl);
  } else {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] No render path matched for template');
  }
}

// Debug flag for template lookup
const DEBUG_TEMPLATE_LOOKUP = (globalThis as any).__DEBUG_GXT_RENDER || false;

// Helper to get component's template
function getTemplateForComponent(component: any, owner: any): any {
  if (DEBUG_TEMPLATE_LOOKUP) {
    console.log('[root.ts] getTemplateForComponent called');
    console.log('[root.ts]   layoutName:', component?.layoutName);
    console.log('[root.ts]   hasLayout:', !!component?.layout);
    console.log('[root.ts]   hasOwner:', !!owner);
    console.log('[root.ts]   componentKeys:', component ? Object.keys(component).slice(0, 8).join(',') : 'null');
  }

  // Try getComponentTemplate from @glimmer/manager
  try {
    const tpl = getComponentTemplate(component.constructor || component);
    if (tpl) {
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Found via getComponentTemplate');
      return tpl;
    }
  } catch {
    // Not set via setComponentTemplate
  }

  // Try globalThis.COMPONENT_TEMPLATES
  const globalTemplates = (globalThis as any).COMPONENT_TEMPLATES;
  if (globalTemplates) {
    const tpl = globalTemplates.get(component.constructor) || globalTemplates.get(component);
    if (tpl) {
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Found via COMPONENT_TEMPLATES');
      return tpl;
    }
  }

  // Try layout or layoutName lookup
  if (component.layout) {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Found via component.layout');
    return component.layout;
  }

  if (component.layoutName && owner) {
    const tpl = owner.lookup(`template:${component.layoutName}`);
    if (tpl) {
      if (DEBUG_TEMPLATE_LOOKUP) {
        console.log('[root.ts] Found via layoutName lookup:', component.layoutName);
        console.log('[root.ts] Template from lookup has render:', typeof tpl?.render, 'gxt:', !!tpl?.__gxtCompiled, 'keys:', tpl ? Object.keys(tpl).slice(0, 5).join(',') : 'null');
      }
      return tpl;
    } else {
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] layoutName lookup failed:', component.layoutName);
    }
  }

  // Try component name lookup
  const componentName = component._debugContainerKey?.replace('component:', '');
  if (componentName && owner) {
    const tpl = owner.lookup(`template:components/${componentName}`);
    if (tpl) {
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Found via component name lookup:', componentName);
      return tpl;
    }
  }

  if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] No template found for component');
  return null;
}

// Export as a factory function for Ember's template registration system
export default function createRootTemplate(_owner: any) {
  // Create a factory that returns a gxt-compatible result
  const factory = () => {
    // Return empty nodes - the actual rendering is done via the render method
    return { nodes: [] };
  };

  // Mark as gxt template
  (factory as any).__gxtCompiled = true;
  (factory as any).moduleName = 'template:-root';

  // Add required interface methods
  (factory as any).asLayout = () => ({
    moduleName: 'template:-root',
    symbolTable: { hasEval: false, symbols: [], upvars: [] },
    meta: { moduleName: 'template:-root', owner: _owner, size: 0 },
    compile: () => 999999, // gxt handle
  });

  (factory as any).asWrappedLayout = (factory as any).asLayout;
  (factory as any).result = 'ok';

  // Add render method for runtime gxt rendering
  (factory as any).render = (context: any, parentElement: Element) => {
    if (DEBUG_TEMPLATE_LOOKUP) {
      console.log('[root.ts] render called, context keys:', context ? Object.keys(context).slice(0, 8).join(',') : 'null');
      console.log('[root.ts] hasLayoutName:', 'layoutName' in (context || {}));
      console.log('[root.ts] hasDebugContainerKey:', !!context?._debugContainerKey);
    }
    // CASE 1: ClassicComponent rendering (from RenderingTestCase.appendTo)
    // Detect by checking for layoutName property (ClassicComponent indicator)
    if (context && ('layoutName' in context || context._debugContainerKey?.startsWith('component:'))) {
      const component = context;
      const owner = context.owner || _owner;


      // Get the component's template
      const componentTemplate = getTemplateForComponent(component, owner);

      if (componentTemplate) {
        // Use the component itself as the render context so that `{{log this}}`
        // and strict equality checks (like in log-test.js) compare against the
        // same object that owner.lookup() returned.
        // Previously this used Object.create(component) to avoid mutating the
        // component, but that created a separate object with a different guidFor
        // identity, causing `this` in the template to differ from this.context.
        const renderContext: any = component;

        // Ensure required GXT properties are present
        if (!renderContext.args) {
          renderContext.args = {};
        }

        // Store the render context for cross-cell dirtying
        if (!(globalThis as any).__gxtComponentContexts) {
          (globalThis as any).__gxtComponentContexts = new WeakMap();
        }
        const ctxsMap = (globalThis as any).__gxtComponentContexts;
        if (!ctxsMap.has(component)) {
          ctxsMap.set(component, new Set());
        }
        ctxsMap.get(component).add(renderContext);

        renderTemplateWithContext(componentTemplate, parentElement, renderContext, owner);
      }

      return { nodes: [], ctx: context };
    }

    // CASE 2: OutletView rendering (routes)
    // When called from __gxtForceEmberRerender (force re-render path), skip the
    // re-render entirely. OutletView content is managed by __gxtRootOutletRerender
    // (called from setOutletState). Re-rendering here would APPEND a second copy
    // of the application template to parentElement, creating duplicate components
    // and corrupting the view registry (e.g., root-1 appearing twice, root-6 missing).
    if ((globalThis as any).__gxtIsForceRerender && (globalThis as any).__gxtRootOutletRerender) {
      return { nodes: [], ctx: context };
    }
    // Create component instance to access outlet state
    const args = context.rootState ? { rootState: context.rootState } : context;
    const instance = new RootTemplate(args) as any;

    if (DEBUG_TEMPLATE_LOOKUP) {
      console.log('[root.ts] CASE 2: OutletView rendering');
      console.log('[root.ts] outletRef:', instance.outletRef ? 'exists' : 'null');
      console.log('[root.ts] mainOutlet:', instance.mainOutlet ? 'exists' : 'null');
      console.log('[root.ts] routeTemplate:', instance.routeTemplate ? 'exists' : 'null');
    }

    // Render the outlet state into the parent element.
    // This function is also called by setOutletState to re-render on route changes.
    function renderOutletState(outletRef: any, targetElement?: Element) {
      const mainOutlet = outletRef?.outlets?.main;
      if (!mainOutlet?.render?.template) return;

      let routeTemplate = mainOutlet.render.template;
      let controller = mainOutlet.render.controller;
      let model = mainOutlet.render.model;
      let outletState = mainOutlet;
      // Track the owner for this outlet level (may be an engine instance)
      let outletOwner = mainOutlet.render.owner || instance.owner;

      // If the route template is the outlet template itself, skip it and render nested directly
      if (routeTemplate?.moduleName === 'template:-outlet' && mainOutlet?.outlets?.main?.render?.template) {
        if (DEBUG_TEMPLATE_LOOKUP) {
          console.log('[root.ts] Route template is outlet, rendering nested template directly');
        }
        const nestedOutlet = mainOutlet.outlets.main;
        routeTemplate = nestedOutlet.render.template;
        controller = nestedOutlet.render.controller;
        model = nestedOutlet.render.model;
        outletState = nestedOutlet;
        // Use the nested outlet's owner (important for engines)
        outletOwner = nestedOutlet.render.owner || outletOwner;
      }

      // Check if routeTemplate is a component (e.g., from template('First'))
      // rather than a regular template factory. Components have templates
      // set via setComponentTemplate which we can retrieve.
      let componentInstance: any = null;
      if (routeTemplate && typeof routeTemplate?.render !== 'function') {
        const componentTpl = getComponentTemplate(routeTemplate) ||
          getComponentTemplate(routeTemplate?.constructor) ||
          (typeof routeTemplate === 'function' && getComponentTemplate(routeTemplate.prototype));
        if (componentTpl) {
          // The route template is a Component class. Instantiate it so that
          // `this.message` in the template reads from the component, not the
          // controller. Pass @model and @controller through args.
          try {
            const ComponentClass = typeof routeTemplate === 'function'
              ? routeTemplate
              : routeTemplate?.constructor;
            if (ComponentClass && typeof ComponentClass === 'function') {
              componentInstance = new ComponentClass();
            }
          } catch { /* ignore instantiation errors */ }

          // Instantiate the template factory with the owner
          const resolvedTemplate = typeof componentTpl === 'function' ? componentTpl(outletOwner) : componentTpl;
          if (resolvedTemplate) {
            routeTemplate = resolvedTemplate;
          }
        }
      }

      // Build render context with GXT args symbols so @model works
      const $ARGS_KEY = Symbol.for('gxt-args');
      const $SLOTS_KEY = Symbol.for('gxt-slots');
      const argsObj: any = {
        model: model,
        controller: controller,
        outletState: outletState,
      };
      let renderContext: any;
      if (componentInstance) {
        // When a Component class is the route template, use the component
        // instance as the render context so `this.message` reads from the
        // component. Pass @model and @controller through args.
        renderContext = componentInstance;
      } else if (controller) {
        // Build render context via Object.create(controller) so property
        // reads fall through to the controller via prototype chain.
        // GXT cells are installed on this renderContext, and
        // __gxtComponentContexts maps the controller (prototype) to
        // this renderContext, so set(controller, key, val) updates propagate.
        renderContext = Object.create(controller);
      } else {
        renderContext = {};
      }
      renderContext.owner = outletOwner;
      renderContext.outletState = outletState;
      renderContext.args = argsObj;
      renderContext[$ARGS_KEY] = argsObj;
      renderContext[$SLOTS_KEY] = {};
      renderContext.$fw = [[], [], []];

      // Install model as a live getter so this.model reads from
      // the controller (which gets model set via controller.set('model', ...)).
      if (controller) {
        const ctrl = controller;
        Object.defineProperty(renderContext, 'model', {
          get() { return ctrl.model; },
          set(v: any) { ctrl.model = v; },
          enumerable: true,
          configurable: true,
        });
      } else if (!componentInstance) {
        renderContext.model = model;
      }

      // Register the renderContext in __gxtComponentContexts so that
      // __gxtTriggerReRender(controller, key) can find and update cells
      // on this renderContext. The map is keyed by prototype.
      if (controller && typeof controller === 'object') {
        if (!(globalThis as any).__gxtComponentContexts) {
          (globalThis as any).__gxtComponentContexts = new WeakMap();
        }
        const ctxsMap = (globalThis as any).__gxtComponentContexts;
        if (!ctxsMap.has(controller)) {
          ctxsMap.set(controller, new Set());
        }
        ctxsMap.get(controller).add(renderContext);
      }

      // Install GXT cells on the render context so property reads inside formulas
      // are tracked. Without this, set(model, 'color', 'blue') won't trigger
      // re-renders because the formula never tracked cell(context, 'model').
      const _cellFor = (globalThis as any).__gxtCellFor;
      const _registerOwner = (globalThis as any).__gxtRegisterObjectValueOwner;
      if (_cellFor) {
        try {
          const skipKeys = new Set([
            'args', 'owner', 'outletState', '$fw', '$slots',
            'constructor', 'init', 'willDestroy', 'toString',
            'isDestroying', 'isDestroyed',
          ]);
          for (const key of Object.getOwnPropertyNames(renderContext)) {
            if (key.startsWith('_') || key.startsWith('$') || skipKeys.has(key)) continue;
            const desc = Object.getOwnPropertyDescriptor(renderContext, key);
            if (desc && !desc.get && !desc.set && desc.configurable &&
                typeof desc.value !== 'function') {
              try {
                _cellFor(renderContext, key, false);
                // Register reverse mapping so nested object mutations
                // dirty the parent cell (e.g., model.color changes → dirty cell(ctx, 'model'))
                if (desc.value && typeof desc.value === 'object' && _registerOwner) {
                  _registerOwner(desc.value, renderContext, key);
                }
              } catch { /* ignore non-configurable properties */ }
            }
          }
          // Also install cells on argsObj for @model etc.
          for (const key of ['model', 'controller']) {
            const desc = Object.getOwnPropertyDescriptor(argsObj, key);
            if (desc && !desc.get && !desc.set && desc.configurable &&
                typeof desc.value !== 'function') {
              try {
                _cellFor(argsObj, key, false);
                if (desc.value && typeof desc.value === 'object' && _registerOwner) {
                  _registerOwner(desc.value, argsObj, key);
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore cell installation errors */ }
      }

      // Fix for @tracked properties on controller prototype:
      // Object.create(controller) makes prototype getters run with `this = renderContext`
      // instead of `this = controller`. The @tracked getter's trackedData is keyed by
      // `this`, so it creates a fresh storage entry for renderContext and returns the
      // initial value (e.g., `false` for `@tracked isExpanded = false`), ignoring the
      // actual current value on the controller (e.g., `true` after a toggle click).
      //
      // Fix: iterate the controller's prototype chain, find getter-based properties
      // (likely @tracked), read the ACTUAL current value from `controller` (with the
      // correct `this`), and update the GXT cell on renderContext to that value.
      // This must happen BEFORE renderTemplateWithContext so the initial render sees
      // the correct values.
      if (controller && _cellFor) {
        try {
          const visitedKeys = new Set<string>();
          let proto = Object.getPrototypeOf(controller);
          while (proto && proto !== Object.prototype) {
            for (const key of Object.getOwnPropertyNames(proto)) {
              if (visitedKeys.has(key)) continue;
              visitedKeys.add(key);
              if (key.startsWith('_') || key.startsWith('$')) continue;
              const protoDesc = Object.getOwnPropertyDescriptor(proto, key);
              // Only process getter-only or getter+setter properties (likely @tracked)
              if (!protoDesc?.get) continue;
              // Don't override already-installed own properties on renderContext
              if (Object.getOwnPropertyDescriptor(renderContext, key)) continue;
              try {
                // Read the actual value using the controller as `this`, not renderContext.
                // This correctly reads trackedData.get(controller) instead of a fresh entry.
                const actualValue = (controller as any)[key];
                // Install a GXT cell on renderContext for this key
                _cellFor(renderContext, key, /* skipDefine */ false);
                // Update the cell to the actual current value from the controller
                const cell = _cellFor(renderContext, key, /* skipDefine */ true);
                if (cell) cell.update(actualValue);
              } catch { /* ignore */ }
            }
            proto = Object.getPrototypeOf(proto);
          }
        } catch { /* ignore */ }
      }

      // Set global outlet state for nested <ember-outlet> elements
      (globalThis as any).__currentOutletState = outletState;

      // Begin render pass for backtracking detection (detects mutations
      // to already-consumed values during rendering, e.g., component init
      // setting a property that was already read by the template).
      const _beginRenderPass = (globalThis as any).__gxtBeginRenderPass;
      const _endRenderPass = (globalThis as any).__gxtEndRenderPass;
      const _markRendered = (globalThis as any).__gxtMarkTemplateRendered;
      if (typeof _beginRenderPass === 'function') _beginRenderPass();
      // Mark the render context and model as rendered so backtracking
      // detection can catch mutations during child component init().
      if (typeof _markRendered === 'function') {
        _markRendered(renderContext);
        if (model && typeof model === 'object') _markRendered(model);
      }
      (globalThis as any).__gxtInOutletRender = true;
      try {
        renderTemplateWithContext(routeTemplate, targetElement || parentElement, renderContext, outletOwner);
      } finally {
        (globalThis as any).__gxtInOutletRender = false;
        if (typeof _endRenderPass === 'function') _endRenderPass();
      }

      // Track render context for cell-based updates on re-render.
      // Use the outletState's render name (which may be the nested route after
      // -outlet skip) rather than mainOutlet.render.name (always 'application').
      lastRenderContext = renderContext;
      lastArgsObj = argsObj;
      lastRouteName = outletState.render?.name || mainOutlet.render.name;
    }

    // Store the top-level outlet ref for re-rendering on property changes
    (globalThis as any).__gxtTopOutletRef = instance.outletRef;

    // Track the last render context and args for cell-based updates
    let lastRenderContext: any = null;
    let lastArgsObj: any = null;
    let lastRouteName: string | undefined = undefined;

    // Register a re-render function that setOutletState can call
    (globalThis as any).__gxtRootOutletRerender = (outletRef: any) => {
      let mainOutlet = outletRef?.outlets?.main;

      // When the main outlet is a -outlet template, look at the nested route
      // (same skip logic as renderOutletState uses for the initial render).
      let effectiveOutlet = mainOutlet;
      if (mainOutlet?.render?.template?.moduleName === 'template:-outlet' &&
          mainOutlet?.outlets?.main?.render?.template) {
        effectiveOutlet = mainOutlet.outlets.main;
      }

      const newModel = effectiveOutlet?.render?.model;
      const newRouteName = effectiveOutlet?.render?.name;
      const newTemplate = effectiveOutlet?.render?.template;

      // Check if nested outlet structure changed at any depth (error/loading
      // substates, engine-internal route transitions, etc.)
      const nestedOutletChanged = (() => {
        if (!lastRenderContext?.outletState) return false;
        // Walk the outlet tree comparing old vs new at each level
        let oldLevel = lastRenderContext.outletState;
        let newLevel = effectiveOutlet;
        for (let depth = 0; depth < 10; depth++) {
          const oldNested = oldLevel?.outlets?.main;
          const newNested = newLevel?.outlets?.main;
          if (!oldNested && !newNested) return false; // Both empty, no change
          if (!!oldNested !== !!newNested) return true; // One exists, other doesn't
          if (oldNested?.render?.template !== newNested?.render?.template) return true;
          if (oldNested?.render?.name !== newNested?.render?.name) return true;
          oldLevel = oldNested;
          newLevel = newNested;
        }
        return false;
      })();

      // If same route template AND nested outlets haven't changed, try to
      // update existing cells in-place to preserve DOM node identity.
      if (lastRenderContext && lastArgsObj && newRouteName && newRouteName === lastRouteName && newTemplate && !nestedOutletChanged) {
        const _cellFor = (globalThis as any).__gxtCellFor;
        if (_cellFor) {
          try {
            // Update the model cell on the args object
            const cell = _cellFor(lastArgsObj, 'model', /* skipDefine */ true);
            if (cell) {
              cell.value = newModel;
            }
            // Re-register the new model object for interior mutation tracking.
            // The previous model was registered via registerObjectValueOwner,
            // but the new model is a different object reference that needs its
            // own entry in _objectValueCellMap.
            const _registerOwner = (globalThis as any).__gxtRegisterObjectValueOwner;
            if (newModel && typeof newModel === 'object' && _registerOwner) {
              _registerOwner(newModel, lastArgsObj, 'model');
              _registerOwner(newModel, lastRenderContext, 'model');
            }
            // Also update model on the render context if it's a direct property
            const ctxDesc = Object.getOwnPropertyDescriptor(lastRenderContext, 'model');
            if (ctxDesc && !ctxDesc.get) {
              const ctxCell = _cellFor(lastRenderContext, 'model', /* skipDefine */ true);
              if (ctxCell) {
                ctxCell.value = newModel;
              }
            }
            // Update outletState
            lastRenderContext.outletState = effectiveOutlet;
            // Sync DOM now so GXT formulas re-evaluate and update text nodes
            const syncDomNow = (globalThis as any).__gxtSyncDomNow;
            if (typeof syncDomNow === 'function') {
              (globalThis as any).__gxtPendingSync = true;
              (globalThis as any).__gxtPendingSyncFromPropertyChange = true;
              syncDomNow();
            }
            return;
          } catch { /* fall through to full re-render */ }
        }
      }

      // Full re-render: clear and re-render from scratch.
      // Don't use morphing for outlet re-renders — morphChildren can't handle
      // <ember-outlet> custom elements properly (they render via connectedCallback
      // which doesn't fire when morph updates in-place). Instead, clear the
      // parent and re-render. The <ember-outlet> elements will fire connectedCallback
      // when inserted into the live DOM and render their nested content.
      parentElement.innerHTML = '';
      renderOutletState(outletRef);
    };

    // Perform initial render
    renderOutletState(instance.outletRef);

    return { nodes: [], ctx: context };
  };

  return factory;
}
