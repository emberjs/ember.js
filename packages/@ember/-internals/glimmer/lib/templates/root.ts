// BARREL specifier is load-bearing: the rollup GXT alias map redirects the
// exact '@glimmer/manager' key to the gxt-backend shim; a deep lib/* path
// would resolve to the real VM source in GXT builds (scripts/gxt-alias-map.mjs).
// eslint-disable-next-line ember-local/no-barrel-imports
import { getComponentTemplate } from '@glimmer/manager';
// Classic-build template compiler (build-time macro in classic pipelines; the
// GXT-aliased shim in GXT mode, where the call site below is dead-branched).
import { precompileTemplate } from '@ember/template-compilation';
import {
  getGxtRenderer,
  getRouteOutletHooks,
  setCurrentOutletState,
  setAmbientOwner,
  setControllerOutletRerender,
  GXT_ARGS_SYMBOL,
  GXT_CONTEXT_SKIP_KEYS,
  GXT_VIEW_SKIP_KEYS,
} from '@ember/-internals/gxt-backend/gxt-bridge';
// Lazy accessor for @lifeart/gxt symbols through the bridge. Avoiding a static
// `import * as _gxt from '@lifeart/gxt'` keeps the GXT runtime out of the
// classic bundle; classic mode never reaches these call sites.
function _gxtLib(): any {
  return getGxtRenderer()?.gxtLib;
}

// DOM API provided to the shared GXT root context (see `ensureGxtContext`).
let gxtDomApi: any = null;

// Per-outlet rerender registry. Shared across all `createRootTemplate`
// factory invocations within this module so that multiple concurrent
// ApplicationInstances (e.g. Ember Islands-style setup) each get their
// own closure + parentElement and don't clobber each other. Keyed by
// `instance.outletRef` (each visit creates a fresh one); the root-outlet
// rerender dispatcher looks up the closure for the incoming outletRef.
const _gxtRootOutletRerenderMap = new Map<any, (ref: any, cellOnlyKey?: string) => void>();

// Maps each controller bound to a rendered outlet to that outlet's
// `outletRef`, so a controller property write can find the outlet and run its
// `rerenderForThisRoot` closure. The cells themselves update through the
// component-contexts fan-out, but the outlet template's text-binding effects
// don't always flush without that rerender pass.
const _gxtControllerToOutletRefMap: WeakMap<object, any> = new WeakMap();
let _gxtInControllerRerender = false;

// The GXT re-render trigger calls this hook after a controller property
// write. It is a no-op when no outlet is registered for the controller (e.g.
// controllers that have been torn down). The re-entrancy guard prevents
// infinite recursion when the rerender's own `set()` cascades fire the hook
// again for the same controller.
if (__GXT_MODE__) {
  setControllerOutletRerender(function (controller: object, keyName?: string): void {
    if (_gxtInControllerRerender) return;
    if (!controller || typeof controller !== 'object') return;
    const outletRef = _gxtControllerToOutletRefMap.get(controller);
    if (!outletRef) return;
    const rerender = _gxtRootOutletRerenderMap.get(outletRef);
    if (typeof rerender !== 'function') return;
    // Take the cell-only fast path for ALL controller-property writes rather
    // than a full (innerHTML='' + renderOutletState) re-render. The fast path
    // covers each write kind:
    //
    // - route-MODEL identity swap (`set(controller,'model',newModel)` from
    //   `setupController` on a dynamic-segment transition): the cell-only fast
    //   path re-evaluates `{{@model.…}}` bindings (leaf-owner re-registration)
    //   WITHOUT destroying the route template's components. A full re-render
    //   would re-instantiate those components and fire `didInsertElement` again.
    // - QP-tracked / other controller properties: `set(controller, qpKey,
    //   value)`'s cell was ALREADY updated by the component-contexts fan-out
    //   before this hook fires. The cell-only
    //   fast path then sets outletState + `syncDomNow()`, which flushes the
    //   subscribed text-binding effects so `{{this.qp}}` updates in-place. The
    //   changed key is forwarded so the fast path can refresh that key's
    //   renderContext cell directly.
    // - interior model mutation (`set(model, 'color', 'blue')`, keyName
    //   undefined): the interior leaf cell was already dirtied by the `set()`,
    //   and the cell-only path's `syncDomNow()` flushes it.
    _gxtInControllerRerender = true;
    try {
      // Cell-only fast path; the changed key is forwarded so its renderContext
      // cell is refreshed before syncDomNow().
      rerender(outletRef, keyName);
    } catch (e) {
      // Surface via warn rather than swallowing. Rerender failures shouldn't
      // break the set() that triggered them; the next legitimate
      // setOutletState will retry.
      // eslint-disable-next-line no-console
      console.warn('[gxt] controller-outlet-rerender failed', e);
    } finally {
      _gxtInControllerRerender = false;
    }
  });
}

function ensureGxtContext() {
  const lib = _gxtLib();
  // The canonical root context is the module-local `_gxtRootContext` in
  // compile.ts; it is read/written through the `compilePipeline.getRootContext`
  // / `setRootContext` bridge.
  const _cp119 = getGxtRenderer()?.compilePipeline;
  let gxtRootContext = _cp119?.getRootContext?.();
  if (!gxtRootContext) {
    gxtRootContext = lib.createRoot(document);
    // Create proper DOM API and provide it to the context
    // This sets fastRenderingContext which is checked first by initDOM
    gxtDomApi = new lib.HTMLBrowserDOMApi(document);
    lib.provideContext(gxtRootContext, lib.RENDERING_CONTEXT, gxtDomApi);
    _cp119?.setRootContext?.(gxtRootContext);
  }
  // Always set the context before rendering
  const currentContext = lib.getParentContext();
  if (!currentContext) {
    lib.setParentContext(gxtRootContext);
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
    return;
  }

  // CRITICAL: Set the ambient owner before any template rendering
  // This ensures $_tag_ember can resolve Ember components via the registry
  if (owner) {
    setAmbientOwner(owner);
  }

  // CRITICAL: Ensure GXT context is set up before any rendering
  // This provides the parent context chain that GXT's $_if, $_c, etc. need
  ensureGxtContext();

  // Ensure context always has args property (even if empty)
  // This prevents "Cannot read properties of undefined (reading 'args')" errors
  if (ctx && !ctx.args) {
    ctx.args = {};
  }

  // PRIORITY 1: If it has a render method, use it directly.
  // NOTE: throws from `tpl.render` (init-phase user errors, assertion
  // failures, etc.) propagate up to `renderer.ts`'s try/catch around
  // `template.render(...)`, which clears the partially-rendered DOM and
  // re-throws. Do not swallow them here.
  if (typeof tpl?.render === 'function') {
    tpl.render(ctx, target);
  }
  // PRIORITY 2: If it's a function without render, call it as factory
  else if (typeof tpl === 'function') {
    // Check if it's a class constructor (needs 'new')
    let template: any;
    const fnStr = tpl.toString();
    const isClass = fnStr.startsWith('class ') || fnStr.startsWith('class{');

    if (isClass) {
      // It's a class (GXT Component) - instantiate with new
      try {
        // Check if it's a GXT Component class (has $template symbol or extends GxtComponent)
        const lib = _gxtLib();
        const isGxtComponent =
          (lib && tpl.prototype instanceof lib.Component) ||
          tpl.prototype?.constructor?.name === 'Component' ||
          tpl.prototype?.$template ||
          typeof tpl.prototype?.template === 'function';

        if (isGxtComponent) {
          // Use GXT's proper rendering flow for GXT components
          lib.renderComponent(tpl, {
            element: target,
            args: ctx?.args || {},
            owner: getGxtRenderer()?.compilePipeline.getRootContext?.(),
          });
          return; // renderComponent handles everything
        }

        // Non-GXT class - instantiate manually
        const componentInstance = new tpl(ctx?.args || {});

        // GXT components have a 'template' property that is a function
        // The function must be called with the component instance as `this`
        const templateProp = componentInstance.template || componentInstance['template'];
        if (typeof templateProp === 'function') {
          // Call the template function bound to the component instance
          template = templateProp.call(componentInstance);
        } else {
          // No template property, use the instance itself
          template = componentInstance;
        }
      } catch {
        return;
      }
    } else {
      // Regular function - call it.
      // Bind the context as `this` because GXT-compiled templates use
      // $_GET_ARGS(this, arguments) which requires a valid `this` context.
      template = tpl.call(ctx || {}, owner);
    }

    // Check if the result has $nodes array (GXT template result)
    // GXT's $_fin stores nodes under a symbol key (RENDERED_NODES_PROPERTY),
    // also check .nodes and .$nodes for compatibility.
    //
    // Module-dedup note: root.ts's `RENDERED_NODES_PROPERTY` import may be a
    // different symbol instance than the one used by the compiled template
    // (e.g. when build-time compiled templates bundle their own copy of the
    // GXT dom helpers). Fall back to scanning every symbol key on `template`
    // for an Array value so the rendered nodes are detected regardless of which
    // module copy produced them.
    const _renderedNodesKey = _gxtLib()?.RENDERED_NODES_PROPERTY;
    let gxtNodes = template && _renderedNodesKey ? template[_renderedNodesKey as any] : null;
    if (!gxtNodes && template && typeof template === 'object') {
      for (const sym of Object.getOwnPropertySymbols(template)) {
        const val = (template as any)[sym];
        if (Array.isArray(val)) {
          // Prefer arrays containing Nodes or nested arrays/primitives (the
          // shape of GXT's root node list). Skip arrays that clearly belong
          // to other GXT internals (e.g. destructor lists of functions).
          if (
            val.length === 0 ||
            val.some(
              (v) =>
                v instanceof Node ||
                typeof v === 'string' ||
                Array.isArray(v) ||
                (v && typeof v === 'object' && !((v as any) instanceof Function))
            )
          ) {
            gxtNodes = val;
            break;
          }
        }
      }
    }
    const nodesArray = gxtNodes || template?.nodes || template?.$nodes;
    const hasNodes = nodesArray && Array.isArray(nodesArray);
    if (hasNodes) {
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
      template.render(ctx, target);
    }
  }
  // PRIORITY 3: Check create method (Ember factory pattern)
  else if (typeof tpl?.create === 'function') {
    const created = tpl.create({ owner });
    if (created && typeof created.render === 'function') {
      created.render(ctx, target);
    }
  }
  // PRIORITY 4: Check if it's an object with a nested template property
  else if (tpl && typeof tpl === 'object' && 'template' in tpl) {
    renderTemplateWithContext(tpl.template, target, ctx, owner, depth + 1);
  }
}

// The component manager factory (`setComponentManager`) a component class has
// or inherits from a base class, as @glimmer/component's subclasses do; none
// for a component with an internal manager (classic, template-only).
function customComponentManagerFactory(definition: object): Function | undefined {
  const registries = getGxtRenderer()?.registries;
  if (!registries) return undefined;
  for (
    let pointer: any = definition;
    pointer && pointer !== Function.prototype && pointer !== Object.prototype;
    pointer = Object.getPrototypeOf(pointer)
  ) {
    if (registries.internalManagers.has(pointer)) return undefined;
    const factory = registries.componentManagers.get(pointer);
    if (factory !== undefined) return typeof factory === 'function' ? factory : undefined;
  }
  return undefined;
}

// Helper to get component's template
function getTemplateForComponent(component: any, owner: any): any {
  // Try getComponentTemplate from @glimmer/manager
  try {
    const tpl = getComponentTemplate(component.constructor || component);
    if (tpl) {
      return tpl;
    }
  } catch {
    // Not set via setComponentTemplate
  }

  // Try the bridge component-template registry
  const globalTemplates = getGxtRenderer()?.registries.componentTemplates;
  if (globalTemplates) {
    const tpl = globalTemplates.get(component.constructor) || globalTemplates.get(component);
    if (tpl) {
      return tpl;
    }
  }

  // Try layout or layoutName lookup
  if (component.layout) {
    return component.layout;
  }

  if (component.layoutName && owner) {
    const tpl = owner.lookup(`template:${component.layoutName}`);
    if (tpl) {
      return tpl;
    }
  }

  // Try component name lookup
  const componentName = component._debugContainerKey?.replace('component:', '');
  if (componentName && owner) {
    const tpl = owner.lookup(`template:components/${componentName}`);
    if (tpl) {
      return tpl;
    }
  }

  return null;
}

// Factory function for Ember's template registration system (GXT backend).
// The default export below picks this or the classic precompiled template by
// build-time backend flag.
function createRootTemplate(_owner: any) {
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
    // CASE 1: ClassicComponent rendering (from RenderingTestCase.appendTo)
    // Detect by checking for layoutName property (ClassicComponent indicator)
    if (
      context &&
      ('layoutName' in context || context._debugContainerKey?.startsWith('component:'))
    ) {
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

        // Store the render context for cross-cell dirtying.
        const ctxsMap = getGxtRenderer()?.compilePipeline.getComponentContextsMap?.();
        if (ctxsMap) {
          if (!ctxsMap.has(component)) {
            ctxsMap.set(component, new Set());
          }
          ctxsMap.get(component)!.add(renderContext);
        }

        // Install GXT cells for keys declared on the component's
        // `Component.extend({ key: value })` properties that never became
        // own properties on the instance because Ember's Mixin system skips
        // entries whose value is `undefined` (see `mergeProps` in
        // `@ember/object/mixin.ts`). Without this, a template binding like
        // `<input value={{this.value}}>` on `{ value: undefined }` has no
        // cell to track on initial render. The formula is marked `isConst`
        // and a subsequent `set(component, 'value', 'hello')` never dirties
        // anything, leaving the DOM stale.
        //
        // Recover the original keys from the class's `PrototypeMixin` chain
        // and pre-install cells for any missing keys. This mirrors the cell
        // install that CASE 2 (OutletView rendering) performs for controllers.
        const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
        if (_cellFor) {
          const skipKeys = new Set([...GXT_CONTEXT_SKIP_KEYS, ...GXT_VIEW_SKIP_KEYS, 'ownerView']);
          try {
            const ctor: any = (component as any).constructor;
            if (ctor && ctor.PrototypeMixin) {
              const collected = new Set<string>();
              const walk = (mx: any, depth = 0) => {
                if (!mx || depth > 20) return;
                if (mx.properties && typeof mx.properties === 'object') {
                  for (const k of Object.keys(mx.properties)) collected.add(k);
                }
                if (Array.isArray(mx.mixins)) {
                  for (const inner of mx.mixins) walk(inner, depth + 1);
                }
              };
              walk(ctor.PrototypeMixin);
              for (const key of collected) {
                if (key.startsWith('_') || key.startsWith('$') || skipKeys.has(key)) continue;
                // Only install a cell if the component doesn't already have
                // an own descriptor for this key. If the key is already on
                // the component (with a value or as a cell-backed
                // getter/setter), renderer.ts's earlier pass has handled it.
                const existing = Object.getOwnPropertyDescriptor(renderContext, key);
                if (existing) continue;
                // Walk the prototype chain of the COMPONENT to detect
                // mixin-installed accessors (computed properties like
                // `actionContextObject` from TargetActionSupport). If any
                // ancestor has an accessor descriptor (get OR set) for this
                // key, skip cellFor install — otherwise `_cellFor(..., false)`
                // would install a cell-backed own getter whose `__fn = () =>
                // component[key]` would re-read the CP's getter through the
                // prototype chain, recursing without bound (`cell.value →
                // __fn() → component[key] → cell.value → ...`). Matches the
                // same guard in renderer.ts. `properties[key]` holds the
                // ComputedProperty itself, so the proto descriptor is the
                // reliable signal.
                let hasAccessor = false;
                let proto: any = Object.getPrototypeOf(component);
                while (proto && proto !== Object.prototype) {
                  const protoDesc = Object.getOwnPropertyDescriptor(proto, key);
                  if (protoDesc) {
                    if (protoDesc.get || protoDesc.set) hasAccessor = true;
                    break;
                  }
                  proto = Object.getPrototypeOf(proto);
                }
                if (hasAccessor) continue;
                try {
                  // `cellFor(..., skipDefine=false)` creates a cell and
                  // installs a tracked getter/setter for the key, even if
                  // the property did not previously exist on the object.
                  _cellFor(renderContext, key, /* skipDefine */ false);
                } catch {
                  /* ignore non-configurable properties */
                }
              }
            }
          } catch {
            /* ignore PrototypeMixin walk errors */
          }
        }

        renderTemplateWithContext(componentTemplate, parentElement, renderContext, owner);
      }

      return { nodes: [], ctx: context };
    }

    // CASE 2: OutletView rendering (routes)
    // During a forced full rerender, skip this once the root-outlet rerender
    // dispatcher exists: OutletView content is managed by that dispatcher
    // (called from setOutletState). Re-rendering here would APPEND a second
    // copy of the application template to parentElement, creating duplicate
    // components and corrupting the view registry.
    if (
      (getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false) &&
      (getGxtRenderer()?.compilePipeline.getRootOutletRerender?.() ?? null)
    ) {
      return { nodes: [], ctx: context };
    }
    // Create component instance to access outlet state
    const args = context.rootState ? { rootState: context.rootState } : context;
    const instance = new RootTemplate(args) as any;

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
      if (
        routeTemplate?.moduleName === 'template:-outlet' &&
        mainOutlet?.outlets?.main?.render?.template
      ) {
        const nestedOutlet = mainOutlet.outlets.main;
        routeTemplate = nestedOutlet.render.template;
        controller = nestedOutlet.render.controller;
        model = nestedOutlet.render.model;
        outletState = nestedOutlet;
        // Use the nested outlet's owner (important for engines)
        outletOwner = nestedOutlet.render.owner || outletOwner;
      }

      // A level whose route manager provides its own wrapper renders through
      // it (gxt-backend/outlet.ts), with the level as the current outlet state
      // of its `{{outlet}}`s, as a classic level below.
      if (outletState.render.wrapped !== undefined) {
        const level = outletState;
        const target = targetElement || parentElement;
        setAmbientOwner(outletOwner);
        ensureGxtContext();
        setCurrentOutletState(level);
        const _renderPass = getGxtRenderer()?.renderPass;
        _renderPass?.beginRenderPass();
        const renderWrapped = (): void => {
          getRouteOutletHooks()!.renderWrappedLevel(level, target);
        };
        const _cp = getGxtRenderer()?.compilePipeline;
        try {
          if (_cp?.withInOutletRender) {
            _cp.withInOutletRender(renderWrapped);
          } else {
            renderWrapped();
          }
        } finally {
          _renderPass?.endRenderPass();
        }
        // No classic render context: a route change re-renders the level.
        lastRenderContext = null;
        lastArgsObj = null;
        lastRouteName = level.render.name;
        lastPropagatedModel = model;
        lastRouteTemplate = routeTemplate;
        lastNestedSnapshot = snapshotOutletTree(level);
        return;
      }

      // Build the render context's `args`: @model, @controller and @outlet.
      const argsObj: any = getRouteOutletHooks()!.withOutletArg({
        model: model,
        controller: controller,
        outletState: outletState,
      });

      // Check if routeTemplate is a component (e.g., from template('First'))
      // rather than a regular template factory. Components have templates
      // set via setComponentTemplate and retrievable here.
      let componentInstance: any = null;
      if (routeTemplate && typeof routeTemplate?.render !== 'function') {
        const componentTpl =
          getComponentTemplate(routeTemplate) ||
          getComponentTemplate(routeTemplate?.constructor) ||
          (typeof routeTemplate === 'function' && getComponentTemplate(routeTemplate.prototype));
        if (componentTpl) {
          // The route template is a component, so that `this.message` in the
          // template reads from the component, not the controller.
          const ComponentClass =
            typeof routeTemplate === 'function' ? routeTemplate : routeTemplate?.constructor;
          const managerFactory =
            typeof ComponentClass === 'function'
              ? customComponentManagerFactory(ComponentClass)
              : undefined;
          if (managerFactory !== undefined) {
            // A component with a component manager (a Glimmer component) is
            // created by its manager, with @model and @controller as its
            // arguments, as the route manager invokes a component route
            // template (`buildInvokable`); its template renders with the
            // manager's context as `this`.
            const manager = managerFactory(outletOwner);
            const component = manager.createComponent(ComponentClass, {
              named: argsObj,
              positional: [],
            });
            componentInstance =
              typeof manager.getContext === 'function' ? manager.getContext(component) : component;
          } else if (typeof ComponentClass === 'function') {
            componentInstance = new ComponentClass();
          }

          // Instantiate the template factory with the owner
          const resolvedTemplate =
            typeof componentTpl === 'function' ? componentTpl(outletOwner) : componentTpl;
          if (resolvedTemplate) {
            routeTemplate = resolvedTemplate;
          }
        }
      }

      // Build the render context; `args` (above) carries @model and @controller.
      let renderContext: any;
      if (componentInstance) {
        // When a Component class is the route template, use the component
        // instance as the render context so `this.message` reads from the
        // component. Pass @model and @controller through args.
        renderContext = componentInstance;
      } else if (controller) {
        // Build render context via Object.create(controller) so property
        // reads fall through to the controller via prototype chain.
        // GXT cells are installed on this renderContext, and the
        // component-contexts map links the controller (prototype) to
        // this renderContext, so set(controller, key, val) updates propagate.
        renderContext = Object.create(controller);
      } else {
        renderContext = {};
      }
      renderContext.owner = outletOwner;
      renderContext.outletState = outletState;
      renderContext.args = argsObj;
      renderContext[GXT_ARGS_SYMBOL] = argsObj;
      renderContext[_gxtLib().$SLOTS_SYMBOL] = {};
      renderContext.$fw = [[], [], []];

      // Set model as a plain property so cellFor can install a tracked
      // getter/setter. A manual getter (get() { return ctrl.model }) prevents
      // GXT formula tracking: the formula sees no cell reads, marks itself
      // isConst, and never re-evaluates when the model changes on route
      // transitions. With a plain property + cellFor, the formula tracks the
      // cell and re-evaluates when the cell is updated via component-contexts
      // propagation (triggered by set(controller, 'model', newValue)).
      //
      // GXT fix: if the controller defines a read-only computed `model`
      // (e.g. `@computed get model() { return [...] }`), the inherited setter
      // on the controller throws "Cannot override the computed property".
      // Detect that case and define `model` directly on renderContext with a
      // data descriptor that shadows the inherited computed, so the getter
      // still reads the computed value through prototype chain on read, but
      // subsequent writes don't go back through the computed's setter.
      if (!componentInstance) {
        try {
          // Walk prototype chain looking for a `model` descriptor that is a
          // getter-without-setter (readonly computed).
          let proto = Object.getPrototypeOf(renderContext);
          let foundReadOnlyModel = false;
          while (proto && proto !== Object.prototype) {
            const d = Object.getOwnPropertyDescriptor(proto, 'model');
            if (d) {
              if (d.get && !d.set) foundReadOnlyModel = true;
              break;
            }
            proto = Object.getPrototypeOf(proto);
          }
          if (foundReadOnlyModel) {
            // Define own data property so assignment doesn't invoke inherited
            // computed setter. Use the controller's computed value if `model`
            // from the outlet is undefined, so `{{this.model}}` reads the
            // computed result through the render context.
            Object.defineProperty(renderContext, 'model', {
              value: model !== undefined ? model : (controller as any).model,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          } else {
            renderContext.model = model;
          }
        } catch {
          // Fall back to direct assignment if anything goes wrong.
          try {
            renderContext.model = model;
          } catch {
            /* readonly computed */
          }
        }
      }

      // Register the renderContext in the component-contexts map (keyed by
      // the controller, i.e. its prototype) so the GXT re-render trigger for
      // `set(controller, key)` can find and update cells on it.
      if (controller && typeof controller === 'object') {
        const ctxsMap = getGxtRenderer()?.compilePipeline.getComponentContextsMap?.();
        if (ctxsMap) {
          if (!ctxsMap.has(controller)) {
            ctxsMap.set(controller, new Set());
          }
          ctxsMap.get(controller)!.add(renderContext);
        }
        // Register controller → outletRef so set(controller, key, val)
        // can locate the outlet for a full rerender. See the docblock on
        // `_gxtControllerToOutletRefMap` at module top.
        try {
          _gxtControllerToOutletRefMap.set(controller, instance.outletRef);
        } catch {
          /* WeakMap rejects non-object keys; controller is checked above */
        }
      }

      // Install GXT cells on the render context so property reads inside formulas
      // are tracked. Without this, set(model, 'color', 'blue') won't trigger
      // re-renders because the formula never tracked cell(context, 'model').
      const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
      const _registerOwner = getGxtRenderer()?.compilePipeline.registerObjectValueOwner;
      if (_cellFor) {
        try {
          const skipKeys = new Set(GXT_CONTEXT_SKIP_KEYS);
          for (const key of Object.getOwnPropertyNames(renderContext)) {
            if (key.startsWith('_') || key.startsWith('$') || skipKeys.has(key)) continue;
            const desc = Object.getOwnPropertyDescriptor(renderContext, key);
            if (
              desc &&
              !desc.get &&
              !desc.set &&
              desc.configurable &&
              typeof desc.value !== 'function'
            ) {
              try {
                _cellFor(renderContext, key, false);
                // Register reverse mapping so nested object mutations
                // dirty the parent cell (e.g., model.color changes → dirty cell(ctx, 'model'))
                if (desc.value && typeof desc.value === 'object' && _registerOwner) {
                  _registerOwner(desc.value, renderContext, key);
                }
              } catch {
                /* ignore non-configurable properties */
              }
            }
          }
          // Also install cells on argsObj for @model etc.
          for (const key of ['model', 'controller']) {
            const desc = Object.getOwnPropertyDescriptor(argsObj, key);
            if (
              desc &&
              !desc.get &&
              !desc.set &&
              desc.configurable &&
              typeof desc.value !== 'function'
            ) {
              try {
                _cellFor(argsObj, key, false);
                if (desc.value && typeof desc.value === 'object' && _registerOwner) {
                  _registerOwner(desc.value, argsObj, key);
                }
              } catch {
                /* ignore */
              }
            }
          }
        } catch {
          /* ignore cell installation errors */
        }
      }

      // Fix for @tracked properties on controller prototype:
      // Object.create(controller) makes prototype getters run with `this = renderContext`
      // instead of `this = controller`. The @tracked getter's storage is keyed by
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
                // Read the actual value using the controller as `this`, not renderContext,
                // so the controller's own storage is read instead of a fresh entry.
                const actualValue = (controller as any)[key];
                // Install a GXT cell on renderContext for this key
                _cellFor(renderContext, key, /* skipDefine */ false);
                // Update the cell to the actual current value from the controller
                const cell = _cellFor(renderContext, key, /* skipDefine */ true);
                if (cell) cell.update(actualValue);
              } catch {
                /* ignore */
              }
            }
            proto = Object.getPrototypeOf(proto);
          }
        } catch {
          /* ignore */
        }
      }

      // Set the current outlet state for nested <ember-outlet> elements
      setCurrentOutletState(outletState);

      // Begin render pass for backtracking detection (detects mutations
      // to already-consumed values during rendering, e.g., component init
      // setting a property that was already read by the template).
      const _renderPass = getGxtRenderer()?.renderPass;
      _renderPass?.beginRenderPass();
      // Mark the render context and model as rendered so backtracking
      // detection can catch mutations during child component init().
      if (_renderPass) {
        _renderPass.markTemplateRendered(renderContext);
        if (model && typeof model === 'object') _renderPass.markTemplateRendered(model);
      }
      // Render inside `withInOutletRender` so `isInOutletRender()` is true for
      // the duration; the render pass ends regardless.
      const _cp110 = getGxtRenderer()?.compilePipeline;
      const renderFn = (): void => {
        renderTemplateWithContext(
          routeTemplate,
          targetElement || parentElement,
          renderContext,
          outletOwner
        );
      };
      try {
        if (_cp110?.withInOutletRender) {
          _cp110.withInOutletRender(renderFn);
        } else {
          renderFn();
        }
      } finally {
        _renderPass?.endRenderPass();
      }

      // Track render context for cell-based updates on re-render.
      // Use the outletState's render name (which may be the nested route after
      // -outlet skip) rather than mainOutlet.render.name (always 'application').
      lastRenderContext = renderContext;
      lastArgsObj = argsObj;
      lastRouteName = outletState.render?.name || mainOutlet.render.name;
      // Remember the propagated model so subsequent phantom rerenders can
      // detect "outlet model hasn't changed" and avoid clobbering fresher
      // values set by the controller's tracked-property propagation.
      lastPropagatedModel = model;
      // Remember the template that was actually rendered so the re-render
      // fast-path (same route name) can detect template-identity changes.
      // Needed for `@ember/test-helpers` emulation tests that call
      // `setOutletState(...)` with a fresh `compile()` template while
      // keeping the route name stable.
      lastRouteTemplate = routeTemplate;
      // Snapshot the nested outlet tree at render time so the fast-path can
      // detect structural changes when the caller mutates the outletState
      // object in place (e.g. setting `outletState.outlets.main = nested`
      // on the same reference). Without this, comparing the live reference
      // against itself misses the mutation. See `outlet view` test suite.
      lastNestedSnapshot = snapshotOutletTree(outletState);
    }

    // Store the top-level outlet ref for re-rendering on property changes (read
    // by the render-tree outlet branch and the renderer's OutletView re-render
    // fallback).
    getGxtRenderer()?.compilePipeline.setTopOutletRef?.(instance.outletRef);

    // Track the last render context and args for cell-based updates.
    let lastRenderContext: any = null;
    let lastArgsObj: any = null;
    let lastRouteName: string | undefined = undefined;
    // Last model reference propagated into the render-context cells.
    // Used to detect phantom rerenders triggered by the tag-revalidate loop:
    // those fire with the SAME outletState.render.model as a prior rerender,
    // but the controller may have been updated to a NEWER model via
    // `set(controller, 'model', x)` propagation through the component-contexts map.
    // Overwriting the ctx cell back to the stale model in that case clobbers
    // the fresh value and the template renders the old value.
    let lastPropagatedModel: any = undefined;
    // Identity of the template that was last rendered for the current route.
    // Used by the re-render fast-path to detect a template swap (the same
    // route name but a freshly `compile()`d template, as used by
    // `@ember/test-helpers` emulation tests).
    let lastRouteTemplate: any = null;
    // Structural snapshot of the nested outlet tree from the last render.
    // Needed because outletState objects can be mutated in place (notably by
    // the `outlet view` test suite, which reuses a single object across
    // `setOutletState` calls), which makes live-reference comparisons unable
    // to detect that a nested outlet was added or replaced.
    let lastNestedSnapshot: any = null;

    // Snapshot an outlet sub-tree into a lightweight structural record that can
    // be compared later against a freshly mutated object to detect nested
    // outlet changes.
    function snapshotOutletTree(node: any, depth = 0): any {
      if (!node || depth > 10) return null;
      const main = node.outlets?.main;
      return {
        template: node.render?.template ?? null,
        name: node.render?.name ?? null,
        nested: main ? snapshotOutletTree(main, depth + 1) : null,
      };
    }

    function nestedTreeDiffers(snapshot: any, node: any, depth = 0): boolean {
      if (depth > 10) return false;
      const main = node?.outlets?.main;
      const snapNested = snapshot?.nested;
      if (!main && !snapNested) return false;
      if (Boolean(main) !== Boolean(snapNested)) return true;
      if ((snapNested?.template ?? null) !== (main?.render?.template ?? null)) return true;
      if ((snapNested?.name ?? null) !== (main?.render?.name ?? null)) return true;
      return nestedTreeDiffers(snapNested, main, depth + 1);
    }

    // Register a re-render function that setOutletState can call.
    //
    // It is stored in `_gxtRootOutletRerenderMap`, keyed by
    // `instance.outletRef` so that multiple concurrent ApplicationInstances
    // (Ember Islands) each get their own closure + parentElement and don't
    // clobber each other. The root-outlet rerender dispatcher registered
    // below looks up the closure by the outletRef it is passed.
    const rerenderForThisRoot = (outletRef: any, cellOnlyKey?: string) => {
      let mainOutlet = outletRef?.outlets?.main;

      // When the main outlet is a -outlet template, look at the nested route
      // (same skip logic as renderOutletState uses for the initial render).
      let effectiveOutlet = mainOutlet;
      if (
        mainOutlet?.render?.template?.moduleName === 'template:-outlet' &&
        mainOutlet?.outlets?.main?.render?.template
      ) {
        effectiveOutlet = mainOutlet.outlets.main;
      }

      const newModel = effectiveOutlet?.render?.model;
      const newRouteName = effectiveOutlet?.render?.name;
      const newTemplate = effectiveOutlet?.render?.template;

      // Check if nested outlet structure changed at any depth (error/loading
      // substates, engine-internal route transitions, etc.). The comparison
      // is against a structural snapshot captured at render time so callers
      // that mutate the outletState object in place (e.g. the `outlet view`
      // tests that reuse a single object across `setOutletState` calls) are
      // detected correctly.
      const nestedOutletChanged = (() => {
        if (!lastRenderContext?.outletState || !lastNestedSnapshot) return false;
        return nestedTreeDiffers(lastNestedSnapshot, effectiveOutlet);
      })();

      // Detect if the ROUTE TEMPLATE identity changed. This matters for
      // `@ember/test-helpers` emulation tests that keep the route name stable
      // ('index') but hand over a fresh `compile()` template on each render.
      // Staying on the fast-path in that case would only update model cells
      // and miss the new template's DOM content.
      //
      // NOTE: GXT's runtime template factory (precompileTemplate) returns a
      // fresh wrapper object for every `templateFactory(owner)` invocation,
      // and `buildRenderState` calls the factory on every route render. As a
      // result, `lastRouteTemplate !== newTemplate` is `true` even when the
      // route renders the SAME template (the underlying `_templateFn` is the
      // same instance). Treating that as a template swap forces a full
      // re-render that destroys DOM node identity and breaks the "stable DOM
      // when the model changes" invariant. Compare the underlying
      // `_templateFn` (set on every gxt-runtime-template wrapper) so two
      // wrappers around the same compiled function are recognized as equal.
      const routeTemplateChanged = (() => {
        if (lastRouteTemplate === null || !newTemplate) return false;
        if (lastRouteTemplate === newTemplate) return false;
        const lastFn = (lastRouteTemplate as any)?._templateFn;
        const newFn = (newTemplate as any)?._templateFn;
        if (lastFn && newFn && lastFn === newFn) return false;
        return true;
      })();

      // If same route template AND nested outlets haven't changed, update
      // existing cells in place to preserve DOM node identity (model swaps and
      // interior model mutations included, see below).
      //
      // A route-MODEL identity swap on the SAME route+template (e.g.
      // `/page/:name` first→second, or `transitionTo` with a fresh model
      // object) is handled by the cell-only fast path — updating the `@model`
      // cell + re-registering the new model object's leaf owners makes the
      // template's `{{@model.name}}` bindings re-evaluate in place WITHOUT
      // destroying + recreating the route template's components. A full
      // clear+re-render would re-instantiate every component in the route
      // template (firing didInsertElement again). The
      // leaf-owner re-registration that makes nested model reads reactive is
      // what lets cell-only propagate model swaps reliably.
      //
      // The TEXT-ONLY interior model mutation case (`color: {{@model}}` then
      // `set(model,'color','blue')`) is handled the same way: the interior leaf
      // cell (registered in `_objectValueCellMap` for `(model,'color')`) is
      // already dirtied by the `set()` that triggered this rerender, so the
      // cell-only fast path's `syncDomNow()` flushes the subscribed text effect
      // in place.
      if (
        lastRenderContext &&
        lastArgsObj &&
        newRouteName &&
        newRouteName === lastRouteName &&
        newTemplate &&
        !nestedOutletChanged &&
        !routeTemplateChanged
      ) {
        const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
        if (_cellFor) {
          try {
            // Detect phantom rerender: when the outletState's model is the SAME
            // object as the previous render's model, this rerender was likely
            // triggered by the renderer's tag-revalidate loop (e.g., from a
            // `set(controller, 'model', x)` call in setupController) rather
            // than by a new setOutletState with a fresh model. In that case,
            // skip the model cell updates — the cells may have been refreshed
            // by the set() call's propagation through the component-contexts map
            // to a NEWER value (the controller's current model), and writing
            // the stale outlet model back would clobber that fresh value.
            // The model update from set() will be picked up by the next
            // legitimate setOutletState rerender (which carries the new
            // render.model).
            const isPhantomRerender =
              lastPropagatedModel !== undefined && newModel === lastPropagatedModel;
            // Update the model cell on the args object
            const cell = _cellFor(lastArgsObj, 'model', /* skipDefine */ true);
            if (cell && !isPhantomRerender) {
              cell.value = newModel;
            }
            // Re-register the new model object for interior mutation tracking.
            // The previous model was registered via registerObjectValueOwner,
            // but the new model is a different object reference that needs its
            // own entry in _objectValueCellMap.
            const _registerOwner = getGxtRenderer()?.compilePipeline.registerObjectValueOwner;
            if (newModel && typeof newModel === 'object' && _registerOwner && !isPhantomRerender) {
              _registerOwner(newModel, lastArgsObj, 'model');
              _registerOwner(newModel, lastRenderContext, 'model');
            }
            // Always update model on the render context cell.
            // The cell was installed by cellFor during initial render; updating
            // it here ensures GXT formulas tracking this.model re-evaluate.
            const ctxCell = _cellFor(lastRenderContext, 'model', /* skipDefine */ true);
            if (ctxCell && !isPhantomRerender) {
              ctxCell.value = newModel;
            }
            if (!isPhantomRerender) {
              lastPropagatedModel = newModel;
            }
            // For a non-model controller-property write (QP key, etc.) the
            // changed key's renderContext cell was already dirtied by
            // the component-contexts fan-out; touch it
            // here too (idempotent) so a freshly-encountered key whose cell
            // hadn't yet been installed on lastRenderContext picks up the
            // controller's current value before the syncDomNow flush. The
            // value is read back through the renderContext (prototype →
            // controller), so this never overwrites with a stale value.
            if (cellOnlyKey && cellOnlyKey !== 'model') {
              try {
                const keyCell = _cellFor(lastRenderContext, cellOnlyKey, /* skipDefine */ false);
                if (keyCell) {
                  keyCell.value = (lastRenderContext as any)[cellOnlyKey];
                }
              } catch {
                /* non-configurable / accessor key — the fan-out already
                   dirtied any installed cell; syncDomNow below flushes it */
              }
            }
            // Update outletState
            lastRenderContext.outletState = effectiveOutlet;
            // Sync DOM now so GXT formulas re-evaluate and update text nodes.
            const _cpRoot = getGxtRenderer()?.compilePipeline;
            const syncDomNow = _cpRoot?.syncDomNow;
            if (typeof syncDomNow === 'function') {
              _cpRoot?.setPendingSync?.(true);
              _cpRoot?.setPendingSyncFromPropertyChange?.(true);
              syncDomNow();
            }
            return;
          } catch {
            /* fall through to full re-render */
          }
        }
      }

      // Full re-render: clear the parent and re-render from scratch. The
      // <ember-outlet> elements fire connectedCallback when inserted into the
      // live DOM and render their nested content.
      //
      // DOM identity preservation (scoped to anchors with ids): callers may
      // capture LinkTo elements (`document.getElementById('a-1')` etc.) and
      // expect them to stay live across route transitions, which a blanket
      // innerHTML='' would orphan. Preservation is narrowed to `<a id="...">`
      // elements; classic component wrappers, ember-outlet and other elements
      // take the normal full re-render so their pool-managed lifecycle keeps
      // working.
      const oldAnchorMap: Map<string, HTMLAnchorElement> = new Map();
      if (lastRenderContext !== null) {
        const anchors = parentElement.querySelectorAll('a[id]');
        for (const a of Array.from(anchors)) {
          if (a instanceof HTMLAnchorElement && a.id) {
            oldAnchorMap.set(a.id, a);
          }
        }
      }

      // The text-only model-swap / interior-mutation cases take the cell-only
      // fast path above, preserving text-node identity in place. Any full re-render reaching here is a genuine route
      // / template / nested-outlet TRANSITION where node identity is not
      // preserved by design — clear + renderOutletState is correct.
      parentElement.innerHTML = '';
      renderOutletState(outletRef);

      if (oldAnchorMap.size > 0) {
        try {
          const newAnchors = parentElement.querySelectorAll('a[id]');
          for (const newA of Array.from(newAnchors)) {
            if (!(newA instanceof HTMLAnchorElement) || !newA.id) continue;
            const oldA = oldAnchorMap.get(newA.id);
            if (!oldA || oldA === newA) continue;

            // Sync initial state: copy new's attrs & children onto old so the
            // captured `oldA` reference is immediately up-to-date (reflects
            // whatever the re-render computed). Keep NEW in the DOM so the
            // reactive effects that fire later (on classic tag dirty) continue
            // to target the element their closure captured (`el` inside
            // renderLinkToElement), which is NEW.
            const syncAttrs = (src: HTMLAnchorElement, dst: HTMLAnchorElement) => {
              const dstAttrs = Array.from(dst.attributes);
              for (const a of dstAttrs) {
                if (!src.hasAttribute(a.name)) dst.removeAttribute(a.name);
              }
              const srcAttrs = Array.from(src.attributes);
              for (const a of srcAttrs) {
                if (dst.getAttribute(a.name) !== a.value) {
                  dst.setAttribute(a.name, a.value);
                }
              }
            };
            syncAttrs(newA, oldA);

            // Install a MutationObserver on NEW that mirrors attribute /
            // child-list changes onto OLD. This lets the captured `oldA`
            // reference stay in sync when subsequent reactive effects
            // (driven by `dirtyTagFor(routing, 'currentState')`) mutate NEW.
            // The observer is never disconnected explicitly; once a later
            // re-render replaces NEW, nothing mutates it any more.
            try {
              const obs = new MutationObserver((records) => {
                for (const rec of records) {
                  if (rec.type === 'attributes' && rec.attributeName) {
                    const name = rec.attributeName;
                    const val = newA.getAttribute(name);
                    if (val === null) {
                      oldA.removeAttribute(name);
                    } else if (oldA.getAttribute(name) !== val) {
                      oldA.setAttribute(name, val);
                    }
                  } else if (rec.type === 'childList') {
                    // Mirror text content for simple inner text cases
                    // (LinkTo yields block content). Full child mirroring
                    // would require recursive DOM cloning; for most LinkTo
                    // use cases the block is a static text label so
                    // textContent suffices.
                    if (oldA.textContent !== newA.textContent) {
                      oldA.textContent = newA.textContent;
                    }
                  }
                }
              });
              obs.observe(newA, { attributes: true, childList: true, subtree: true });
            } catch {
              /* MutationObserver unavailable in this environment */
            }
          }
        } catch {
          /* best-effort preservation */
        }
      }
    };

    // Register this root's rerender function, keyed by its outletRef. The
    // dispatcher below looks up the correct closure for the incoming ref.
    if (instance.outletRef) {
      _gxtRootOutletRerenderMap.set(instance.outletRef, rerenderForThisRoot);
    }

    // Install a dispatch shim. It forwards the call to the closure
    // registered for the outletRef being re-rendered. If the ref has no
    // registered closure (e.g. setOutletState was called BEFORE the initial
    // render registered this root), do nothing — the initial render will
    // pick up the latest state. Do NOT fall back to another root's closure,
    // because that would cause the second visit's state changes to bleed
    // into the first visit's rootElement. The bridge applies any registered
    // instrumentation wrap (`setRootOutletRerenderWrap`) when it is set.
    const _gxtRootOutletDispatcher = (outletRef: any) => {
      if (outletRef && _gxtRootOutletRerenderMap.has(outletRef)) {
        _gxtRootOutletRerenderMap.get(outletRef)!(outletRef);
      }
      // No fallback: unregistered refs are ignored.
    };
    getGxtRenderer()?.compilePipeline.setRootOutletRerender?.(_gxtRootOutletDispatcher);

    // Perform initial render
    renderOutletState(instance.outletRef);

    return { nodes: [], ctx: context };
  };

  return factory;
}

// The classic root template, consumed by the Glimmer VM (setup-registry.ts
// registers it as `template:-root`). It is skipped in GXT builds so the
// GXT-aliased `@ember/template-compilation` shim is never invoked at
// module-init time; `__GXT_MODE__` is inlined at build time, so exactly one
// branch survives in each dist. The classic VM cannot run
// `createRootTemplate`'s fake compile handle.
const ClassicRootTemplate = __GXT_MODE__
  ? undefined
  : precompileTemplate(`{{component this}}`, {
      moduleName: 'packages/@ember/-internals/glimmer/lib/templates/root.hbs',
      strictMode: true,
    });

export default (__GXT_MODE__ ? createRootTemplate : ClassicRootTemplate) as any;
