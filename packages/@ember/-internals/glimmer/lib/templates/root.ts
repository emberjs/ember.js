import { getComponentTemplate } from '@glimmer/manager';
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  getParentContext as gxtGetParentContext,
  provideContext as gxtProvideContext,
  RENDERING_CONTEXT as GXT_RENDERING_CONTEXT,
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
      // Regular function - call it
      template = tpl(owner);
    }

    if (DEBUG_TEMPLATE_LOOKUP) {
      console.log('[root.ts] Factory result:', template ? 'exists' : 'null', 'type:', typeof template, 'hasRender:', typeof template?.render, 'same:', template === tpl);
    }

    // Check if the result has $nodes array (GXT template result)
    const hasNodes = template && Array.isArray(template.nodes || template.$nodes);
    if (hasNodes) {
      if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Template has $nodes, appending to target');
      const nodes = template.nodes || template.$nodes;
      for (const node of nodes) {
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
        // Build render context that inherits from component for {{this.xxx}} access
        // CRITICAL: Use Object.create to preserve prototype chain and getters
        // DO NOT copy properties as values - that breaks reactivity!
        // When component.customId is updated via set(), we need renderContext.customId
        // to also return the new value (via prototype chain delegation).
        const renderContext: any = Object.create(component);

        // Only add the properties that we need to override
        renderContext.owner = owner;
        renderContext.args = component.args || {};

        // Store ALL render contexts derived from this component
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
    function renderOutletState(outletRef: any) {
      const mainOutlet = outletRef?.outlets?.main;
      if (!mainOutlet?.render?.template) return;

      let routeTemplate = mainOutlet.render.template;
      let controller = mainOutlet.render.controller;
      let model = mainOutlet.render.model;
      let outletState = mainOutlet;

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
      }

      // Check if routeTemplate is a component (e.g., from template('First'))
      // rather than a regular template factory. Components have templates
      // set via setComponentTemplate which we can retrieve.
      if (routeTemplate && typeof routeTemplate?.render !== 'function') {
        const componentTpl = getComponentTemplate(routeTemplate) ||
          getComponentTemplate(routeTemplate?.constructor) ||
          (typeof routeTemplate === 'function' && getComponentTemplate(routeTemplate.prototype));
        if (componentTpl) {
          // Instantiate the template factory with the owner
          const resolvedTemplate = typeof componentTpl === 'function' ? componentTpl(instance.owner) : componentTpl;
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

      // Build render context from controller (this = controller in route templates).
      // Use controller.model for this.model (the route sets it via controller.set('model', ...)),
      // and use the route model for @model (through args).
      const renderContext: any = {
        ...(controller || {}),
        owner: instance.owner,
        outletState: outletState,
        args: argsObj,
        [$ARGS_KEY]: argsObj,
        [$SLOTS_KEY]: {},
        $fw: [[], [], []],
      };

      // Install model as a getter delegating to the controller so tracked/set changes
      // on controller.model are reflected in this.model (route template context).
      if (controller) {
        const ctrl = controller;
        Object.defineProperty(renderContext, 'model', {
          get() { return ctrl.model; },
          set(v: any) { ctrl.model = v; },
          enumerable: true,
          configurable: true,
        });
      } else {
        renderContext.model = model;
      }

      // Set global outlet state for nested <ember-outlet> elements
      (globalThis as any).__currentOutletState = outletState;

      renderTemplateWithContext(routeTemplate, parentElement, renderContext, instance.owner);
    }

    // Store the top-level outlet ref for re-rendering on property changes
    (globalThis as any).__gxtTopOutletRef = instance.outletRef;

    // Register a re-render function that setOutletState can call
    (globalThis as any).__gxtRootOutletRerender = (outletRef: any) => {
      // Clear current content
      parentElement.innerHTML = '';
      renderOutletState(outletRef);
    };

    // Perform initial render
    renderOutletState(instance.outletRef);

    return { nodes: [], ctx: context };
  };

  return factory;
}
