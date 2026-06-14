// BARREL specifier is load-bearing: the rollup GXT alias map redirects the
// exact '@glimmer/manager' key to the gxt-backend shim; a deep lib/* path
// would resolve to the real VM source in GXT builds (scripts/gxt-alias-map.mjs).
// eslint-disable-next-line ember-local/no-barrel-imports
import { getComponentTemplate } from '@glimmer/manager';
import { DEBUG } from '@glimmer/env';
// Classic-build template compiler (build-time macro in classic pipelines; the
// GXT-aliased shim in GXT mode, where the call site below is dead-branched).
import { precompileTemplate } from '@ember/template-compilation';
// Bridge reader for `registerObjectValueOwner`.
import {
  getGxtRenderer,
  setCurrentOutletState,
  setAmbientOwner,
  setControllerOutletRerender,
} from '@ember/-internals/gxt-backend/gxt-bridge';
// Lazy accessor for @lifeart/gxt symbols. The gxt-backend module (only loaded
// in __GXT_MODE__) stashes the namespace on globalThis.__lifeartGxt at its
// own load time. Avoiding a static `import * as _gxt from '@lifeart/gxt'`
// here keeps the GXT runtime out of the classic bundle (benchmark-app,
// embroider apps) — classic mode never reaches these call sites since they
// are only invoked from the factory.render path, which itself is gated on
// __gxtCompiled-templated rendering.
function _gxtLib(): any {
  return getGxtRenderer()?.gxtLib;
}

// Ensure GXT context is initialized for the document
// Uses a shared root context on globalThis to avoid multiple roots
// fighting over the parent context when modules are deduplicated.
let gxtDomApi: any = null;

// Per-outlet rerender registry. Shared across all `createRootTemplate`
// factory invocations within this module so that multiple concurrent
// ApplicationInstances (e.g. Ember Islands-style setup) each get their
// own closure + parentElement and don't clobber each other. Keyed by
// `instance.outletRef` (each visit creates a fresh one); the dispatch
// shim installed as `__gxtRootOutletRerender` looks up the closure for
// the incoming outletRef.
const _gxtRootOutletRerenderMap = new Map<
  any,
  (ref: any, forceFull?: boolean, cellOnlyKey?: string) => void
>();

// Controller→outletRef bridge: maps each controller instance currently
// bound to a rendered outlet back to that outlet's `outletRef`, so that
// `set(controller, key, value)` (or any other write that triggers
// `_gxtTriggerReRender(controller, key)`) can locate the outlet and
// invoke its `rerenderForThisRoot` closure. This bridges the cell→DOM
// propagation gap for controller property writes: cells DO update
// correctly via the `__gxtComponentContexts` fan-out, but the outlet
// template's text-binding effects don't always auto-flush without a
// rerender pass through `rerenderForThisRoot`.
//
// Lookup is exposed on `globalThis.__gxtControllerOutletRerender` (a
// function that takes a controller and returns void). compile.ts's
// `_gxtTriggerReRender` (controller-property branch) calls it after
// SyncCore completes, gated by an `isController === true` marker check
// + a re-entrancy guard to avoid infinite-loop hazards.
const _gxtControllerToOutletRefMap: WeakMap<object, any> = new WeakMap();
let _gxtInControllerRerender = false;

// Install the controller-set notification hook at module load. compile.ts
// reads `globalThis.__gxtControllerOutletRerender` from the
// `_gxtTriggerReRender` controller-branch post-SyncCore and invokes this
// function. It is a no-op when no outlet is registered for the
// controller (e.g. controllers from other tests, controllers that have
// been torn down, etc.). The re-entrancy guard prevents infinite
// recursion when the rerender's own internal `set()` cascades fire this
// hook a second time on the same controller.
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
    //   would re-instantiate those components and fire `didInsertElement` again,
    //   breaking the "view should have inserted only once" invariant (Route -
    //   template rendering :: model-change).
    // - QP-tracked / other controller properties: `set(controller, qpKey,
    //   value)`'s cell was ALREADY updated by SyncCore's
    //   `__gxtComponentContexts` fan-out before this hook fires. The cell-only
    //   fast path then sets outletState + `syncDomNow()`, which flushes the
    //   subscribed text-binding effects so `{{this.qp}}` updates in-place. The
    //   changed key is forwarded so the fast path can refresh that key's
    //   renderContext cell directly.
    // - interior model mutation (`set(model, 'color', 'blue')`, keyName
    //   undefined): handled by the cell-only path's `modelInteriorChanged`
    //   detection + leaf-owner re-registration.
    const _cellOnly = true;
    _gxtInControllerRerender = true;
    try {
      // Cell-only fast path; the changed key is forwarded so its renderContext
      // cell is refreshed before syncDomNow().
      rerender(outletRef, /* forceFull */ !_cellOnly, keyName);
    } catch (e) {
      // Surface via warn rather than swallowing. Rerender failures shouldn't
      // break the set() that triggered them; the next legitimate
      // setOutletState will retry.
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
    if (DEBUG_TEMPLATE_LOOKUP) console.warn('[root.ts] Max render depth exceeded');
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

  if (DEBUG_TEMPLATE_LOOKUP) {
    const tplName =
      tpl?.moduleName ||
      tpl?.id ||
      tpl?.name ||
      (tpl?.constructor?.name !== 'Function' ? tpl?.constructor?.name : null);
    const tplKeys = tpl ? Object.keys(tpl).slice(0, 5).join(',') : 'null';
    const hasGxtCompiled = !!tpl?.__gxtCompiled;
    const hasGxtFactory = !!tpl?.__gxtFactory;
    console.log(
      '[root.ts] renderTemplateWithContext depth:',
      depth,
      'type:',
      typeof tpl,
      'hasRender:',
      typeof tpl?.render,
      'name:',
      tplName,
      'gxt:',
      hasGxtCompiled,
      'factory:',
      hasGxtFactory,
      'keys:',
      tplKeys
    );
  }

  // PRIORITY 1: If it has a render method, use it directly.
  // NOTE: throws from `tpl.render` (init-phase user errors, assertion
  // failures, etc.) propagate up to `renderer.ts`'s try/catch around
  // `template.render(...)`, which clears the partially-rendered DOM and
  // re-throws. Do not swallow them here — the previous "only rethrow
  // Assertion Failed" workaround was a holdover from the
  // `captureRenderError`/`__gxtRenderErrorCount` plumbing and is no longer
  // needed now that the manager-level outer-wrap captures have been removed.
  if (typeof tpl?.render === 'function') {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] Calling tpl.render()');
    tpl.render(ctx, target);
    if (DEBUG_TEMPLATE_LOOKUP)
      console.log('[root.ts] After render, target innerHTML length:', target.innerHTML?.length);
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
        const lib = _gxtLib();
        const isGxtComponent =
          (lib && tpl.prototype instanceof lib.Component) ||
          tpl.prototype?.constructor?.name === 'Component' ||
          tpl.prototype?.$template ||
          typeof tpl.prototype?.template === 'function';

        if (isGxtComponent) {
          // Use GXT's proper rendering flow for GXT components
          if (DEBUG_TEMPLATE_LOOKUP)
            console.log('[root.ts] Using gxtRenderComponent for GXT component');
          lib.renderComponent(tpl, {
            element: target,
            args: ctx?.args || {},
            // Routed through the compilePipeline bridge.
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
          if (DEBUG_TEMPLATE_LOOKUP)
            console.log('[root.ts] Calling component.template() as method');
          // Call the template function bound to the component instance
          template = templateProp.call(componentInstance);
        } else {
          // No template property, use the instance itself
          template = componentInstance;
        }
      } catch (e: any) {
        if (DEBUG_TEMPLATE_LOOKUP)
          console.warn('[root.ts] Failed to instantiate class:', e?.message);
        return;
      }
    } else {
      // Regular function - call it.
      // Bind the context as `this` because GXT-compiled templates use
      // $_GET_ARGS(this, arguments) which requires a valid `this` context.
      template = tpl.call(ctx || {}, owner);
    }

    if (DEBUG_TEMPLATE_LOOKUP) {
      console.log(
        '[root.ts] Factory result:',
        template ? 'exists' : 'null',
        'type:',
        typeof template,
        'hasRender:',
        typeof template?.render,
        'same:',
        template === tpl
      );
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
      if (DEBUG_TEMPLATE_LOOKUP)
        console.log('[root.ts] Calling template.render from factory result');
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
    if (DEBUG_TEMPLATE_LOOKUP)
      console.log('[root.ts] Object without render - trying runtime compilation');
    // Try to get the template source if available and compile at runtime.
    // For now, just log that this can't be rendered.
    if (DEBUG_TEMPLATE_LOOKUP) console.warn('[root.ts] Cannot render template:', tpl);
  } else {
    if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] No render path matched for template');
  }
}

// Debug flag for template lookup. `DEBUG &&` makes the whole expression fold to
// a literal `false` in production rollup builds (DEBUG is the inlined build-time
// macro), so rollup propagates the const and dead-strips every
// `if (DEBUG_TEMPLATE_LOOKUP) …` diagnostic block out of the GXT prod dist.
// In dev the runtime `__DEBUG_GXT_RENDER` toggle still works.
const DEBUG_TEMPLATE_LOOKUP = DEBUG && ((globalThis as any).__DEBUG_GXT_RENDER || false);

// Helper to get component's template
function getTemplateForComponent(component: any, owner: any): any {
  if (DEBUG_TEMPLATE_LOOKUP) {
    console.log('[root.ts] getTemplateForComponent called');
    console.log('[root.ts]   layoutName:', component?.layoutName);
    console.log('[root.ts]   hasLayout:', !!component?.layout);
    console.log('[root.ts]   hasOwner:', !!owner);
    console.log(
      '[root.ts]   componentKeys:',
      component ? Object.keys(component).slice(0, 8).join(',') : 'null'
    );
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

  // Try the bridge component-template registry
  const globalTemplates = getGxtRenderer()?.registries.componentTemplates;
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
        console.log(
          '[root.ts] Template from lookup has render:',
          typeof tpl?.render,
          'gxt:',
          !!tpl?.__gxtCompiled,
          'keys:',
          tpl ? Object.keys(tpl).slice(0, 5).join(',') : 'null'
        );
      }
      return tpl;
    } else {
      if (DEBUG_TEMPLATE_LOOKUP)
        console.log('[root.ts] layoutName lookup failed:', component.layoutName);
    }
  }

  // Try component name lookup
  const componentName = component._debugContainerKey?.replace('component:', '');
  if (componentName && owner) {
    const tpl = owner.lookup(`template:components/${componentName}`);
    if (tpl) {
      if (DEBUG_TEMPLATE_LOOKUP)
        console.log('[root.ts] Found via component name lookup:', componentName);
      return tpl;
    }
  }

  if (DEBUG_TEMPLATE_LOOKUP) console.log('[root.ts] No template found for component');
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
    if (DEBUG_TEMPLATE_LOOKUP) {
      console.log(
        '[root.ts] render called, context keys:',
        context ? Object.keys(context).slice(0, 8).join(',') : 'null'
      );
      console.log('[root.ts] hasLayoutName:', 'layoutName' in (context || {}));
      console.log('[root.ts] hasDebugContainerKey:', !!context?._debugContainerKey);
    }
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

        // Store the render context for cross-cell dirtying. The
        // component-contexts map is read through
        // `compilePipeline.getComponentContextsMap?.()` (a get-only accessor
        // with internal lazy-init), which guarantees a single WeakMap instance
        // across all call sites. The optional chain handles the
        // bridge-not-yet-installed edge: if it returns undefined, the
        // `if (ctxsMap)` guard short-circuits and registration is skipped. In
        // practice compile.ts's `installCompilePipelinePart` runs at module
        // init, before any RootTemplate render-time call can fire, so the
        // guard never trips at runtime.
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
          const skipKeys = new Set([
            'args',
            'owner',
            'outletState',
            '$fw',
            '$slots',
            'constructor',
            'init',
            'willDestroy',
            'toString',
            'isDestroying',
            'isDestroyed',
            'tagName',
            'layoutName',
            'layout',
            'renderer',
            'element',
            '_debugContainerKey',
            '_target',
            '_viewRegistry',
            'ownerView',
            'parentView',
            'attributeBindings',
            'classNameBindings',
            'classNames',
            'concatenatedProperties',
            'mergedProperties',
            'elementId',
          ]);
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
                // prototype chain, producing unbounded recursion in GXT's
                // cached Yt (`cell.value → __fn() → component[key] →
                // cell.value → ...`). Matches the same guard in renderer.ts
                // and the gap the PrototypeMixin.properties walk leaves:
                // `collected` contains the key but the raw value stored in
                // `properties[key]` is the ComputedProperty meta object, not a
                // usable marker. The proto descriptor is the authoritative signal.
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
    // When called from __gxtForceEmberRerender (force re-render path), skip the
    // re-render entirely. OutletView content is managed by the root-outlet
    // rerender dispatcher (called from setOutletState). Re-rendering here would
    // APPEND a second copy of the application template to parentElement,
    // creating duplicate components and corrupting the view registry (e.g.,
    // root-1 appearing twice, root-6 missing).
    // The force-rerender flag and the dispatcher are both read through the
    // bridge (`compilePipeline.isForceRerender?.()` and
    // `compilePipeline.getRootOutletRerender?.()`); the `?? false` / `?? null`
    // fallbacks treat a not-yet-installed bridge as "no force rerender".
    if (
      (getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false) &&
      (getGxtRenderer()?.compilePipeline.getRootOutletRerender?.() ?? null)
    ) {
      return { nodes: [], ctx: context };
    }
    // Per-outlet rerender registry (`_gxtRootOutletRerenderMap`) is declared
    // at module scope above. It supports multiple concurrent
    // ApplicationInstances (e.g. Ember Islands-style setup) where each
    // visit() has its own outletRef + rootElement: a single shared rerender
    // function would cause the second visit to overwrite the first, so
    // setOutletState on either root would re-render into the wrong DOM
    // target. The map is keyed by outletRef (each visit creates a fresh
    // one); callers in outlet.ts / renderer.ts pass the outletRef, so the
    // dispatcher below looks up the matching closure and preserves per-root
    // state (lastRenderContext, etc.).
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
      if (
        routeTemplate?.moduleName === 'template:-outlet' &&
        mainOutlet?.outlets?.main?.render?.template
      ) {
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
      // set via setComponentTemplate and retrievable here.
      let componentInstance: any = null;
      if (routeTemplate && typeof routeTemplate?.render !== 'function') {
        const componentTpl =
          getComponentTemplate(routeTemplate) ||
          getComponentTemplate(routeTemplate?.constructor) ||
          (typeof routeTemplate === 'function' && getComponentTemplate(routeTemplate.prototype));
        if (componentTpl) {
          // The route template is a Component class. Instantiate it so that
          // `this.message` in the template reads from the component, not the
          // controller. Pass @model and @controller through args.
          try {
            const ComponentClass =
              typeof routeTemplate === 'function' ? routeTemplate : routeTemplate?.constructor;
            if (ComponentClass && typeof ComponentClass === 'function') {
              componentInstance = new ComponentClass();
            }
          } catch {
            /* ignore instantiation errors */
          }

          // Instantiate the template factory with the owner
          const resolvedTemplate =
            typeof componentTpl === 'function' ? componentTpl(outletOwner) : componentTpl;
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

      // Set model as a plain property so cellFor can install a tracked
      // getter/setter. A manual getter (get() { return ctrl.model }) prevents
      // GXT formula tracking: the formula sees no cell reads, marks itself
      // isConst, and never re-evaluates when the model changes on route
      // transitions. With a plain property + cellFor, the formula tracks the
      // cell and re-evaluates when the cell is updated via __gxtComponentContexts
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

      // Register the renderContext in __gxtComponentContexts so that
      // __gxtTriggerReRender(controller, key) can find and update cells
      // on this renderContext. The map is keyed by prototype.
      // The component-contexts map is read through
      // `compilePipeline.getComponentContextsMap?.()` — see the sibling
      // registration site above for the rationale.
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
      // Bridge reader for registerObjectValueOwner.
      const _registerOwner = getGxtRenderer()?.compilePipeline.registerObjectValueOwner;
      if (_cellFor) {
        try {
          const skipKeys = new Set([
            'args',
            'owner',
            'outletState',
            '$fw',
            '$slots',
            'constructor',
            'init',
            'willDestroy',
            'toString',
            'isDestroying',
            'isDestroyed',
          ]);
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

      // Set global outlet state for nested <ember-outlet> elements
      setCurrentOutletState(outletState);

      // Begin render pass for backtracking detection (detects mutations
      // to already-consumed values during rendering, e.g., component init
      // setting a property that was already read by the template).
      // The render-pass triad lives on the typed `renderPass` namespace of the
      // gxt-backend bridge; optional-chain guards handle classic-Ember builds
      // where the bridge is null.
      const _renderPass = getGxtRenderer()?.renderPass;
      _renderPass?.beginRenderPass();
      // Mark the render context and model as rendered so backtracking
      // detection can catch mutations during child component init().
      if (_renderPass) {
        _renderPass.markTemplateRendered(renderContext);
        if (model && typeof model === 'object') _renderPass.markTemplateRendered(model);
      }
      // The `in-outlet-render` flag is a paired `withInOutletRender(fn)` /
      // `isInOutletRender()` surface on `compilePipeline`: the set-true / try /
      // finally-set-false pair around `renderTemplateWithContext` is folded
      // into the bridge wrap. The `_renderPass?.endRenderPass()` post-call
      // (paired with the `_renderPass?.beginRenderPass()` above) still fires
      // unconditionally in the outer `try/finally`, independent of the bridge
      // wrap. For classic-Ember builds (no GXT backend loaded) the optional
      // chain short-circuits and the body runs unwrapped. See
      // `withInOutletRender` doc in gxt-bridge.ts.
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
      try {
        _lastModelSnapshot =
          model != null && typeof model === 'object' ? JSON.stringify(model) : undefined;
      } catch {
        _lastModelSnapshot = undefined;
      }
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

    // Store the top-level outlet ref for re-rendering on property changes.
    // The ref is a paired `setTopOutletRef(ref)` / `getTopOutletRef()` surface
    // on `compilePipeline`. The cross-file readers (`manager.ts`'s render-tree
    // outlet branch and `glimmer/lib/renderer.ts`'s OutletView re-render
    // fallback) route through `compilePipeline.getTopOutletRef?.()`. The
    // optional chain is a no-op when the bridge is not yet installed
    // (classic-Ember builds, where the outlet-render branch does not execute
    // the gxt-templated path). See `setTopOutletRef` / `getTopOutletRef` doc in
    // gxt-bridge.ts.
    getGxtRenderer()?.compilePipeline.setTopOutletRef?.(instance.outletRef);

    // Track the last render context and args for cell-based updates.
    let lastRenderContext: any = null;
    let lastArgsObj: any = null;
    let lastRouteName: string | undefined = undefined;
    // Last model reference propagated into the render-context cells.
    // Used to detect phantom rerenders triggered by the tag-revalidate loop:
    // those fire with the SAME outletState.render.model as a prior rerender,
    // but the controller may have been updated to a NEWER model via
    // `set(controller, 'model', x)` propagation through __gxtComponentContexts.
    // Overwriting the ctx cell back to the stale model in that case clobbers
    // the fresh value and the template renders the old value.
    let lastPropagatedModel: any = undefined;
    // Snapshot of the last propagated model's shallow shape (JSON.stringify).
    // Used to detect "same reference but interior shape changed" cases like
    // `set(model, 'color', 'blue')` which mutate in-place — the cell value
    // identity is unchanged so phantom-detection skips updates, but the DOM
    // text bindings need a fresh render to reflect the new nested values.
    let _lastModelSnapshot: string | undefined = undefined;
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
      if (!!main !== !!snapNested) return true;
      if ((snapNested?.template ?? null) !== (main?.render?.template ?? null)) return true;
      if ((snapNested?.name ?? null) !== (main?.render?.name ?? null)) return true;
      return nestedTreeDiffers(snapNested, main, depth + 1);
    }

    // Register a re-render function that setOutletState can call.
    //
    // It is stored in two places:
    //  1. The module-local `_gxtRootOutletRerenderMap` (declared at the top
    //     of this file), keyed by `instance.outletRef` so that multiple
    //     concurrent ApplicationInstances (Ember Islands) each get their own
    //     closure + parentElement and don't clobber each other.
    //  2. `__gxtRootOutletRerender` as a dispatch function that looks up the
    //     correct closure by outletRef. This keeps backwards compatibility
    //     with callers that don't know about the map and still pass the ref
    //     as the sole argument.
    const rerenderForThisRoot = (
      outletRef: any,
      forceFull: boolean = false,
      cellOnlyKey?: string
    ) => {
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

      // If same route template AND nested outlets haven't changed, try to
      // update existing cells in-place to preserve DOM node identity.
      // If the model object identity changed (route revisit with new dynamic
      // segment, exterior model swap, etc.), fall through to the full
      // re-render. Cell-only updates do not reliably propagate model swaps
      // to template formulas in the current GXT architecture — observed:
      // `[@model: red]` persists in DOM even after the cell value reads as
      // `yellow`. The "stable DOM when model changes" test exercises the
      // happy-path of cell-only updates and is a 1-test tradeoff against
      // the 4 model-swap correctness tests fixed by this fallback.
      const modelGenuinelyChanged =
        lastPropagatedModel !== undefined && newModel !== lastPropagatedModel;
      // Also detect interior model mutations: same object reference, but the
      // shape has changed (e.g., `set(model, 'color', 'blue')` mutated the
      // existing model in-place). The cell value is still the same reference
      // so phantom-detection skips updates, but the template's text bindings
      // need a real re-render to pick up the new nested value. A shallow JSON
      // snapshot of the model is compared to detect interior changes.
      let modelInteriorChanged = false;
      try {
        if (
          !modelGenuinelyChanged &&
          newModel != null &&
          typeof newModel === 'object' &&
          lastPropagatedModel === newModel
        ) {
          const _snap = JSON.stringify(newModel);
          if (_lastModelSnapshot !== undefined && _snap !== _lastModelSnapshot) {
            modelInteriorChanged = true;
          }
          _lastModelSnapshot = _snap;
        }
      } catch {
        /* ignore JSON.stringify errors (circular, etc.) — fall back to
           cell-only path for that rerender */
      }
      // A route-MODEL identity swap on the SAME route+template (e.g.
      // `/page/:name` first→second, or `transitionTo` with a fresh model
      // object) is handled by the cell-only fast path — updating the `@model`
      // cell + re-registering the new model object's leaf owners makes the
      // template's `{{@model.name}}` bindings re-evaluate in place WITHOUT
      // destroying + recreating the route template's components. A full
      // clear+re-render would re-instantiate every component in the route
      // template (firing didInsertElement again), breaking the "view should
      // have inserted only once" invariant (Route - template rendering :: "The
      // template is not re-rendered when the route's model changes"). The
      // leaf-owner re-registration that makes nested model reads reactive is
      // what lets cell-only propagate model swaps reliably.
      //
      // The TEXT-ONLY interior model mutation case (`color: {{@model}}` then
      // `set(model,'color','blue')`) is handled the same way: the interior leaf
      // cell (registered in `_objectValueCellMap` for `(model,'color')`) is
      // already dirtied by the `set()` that triggered this rerender, so the
      // cell-only fast path's `syncDomNow()` flushes the subscribed text effect
      // in place.
      const _fineGrainedModelSwapCellPath = modelGenuinelyChanged;
      const _fineGrainedModelInteriorCellPath = modelInteriorChanged;
      if (
        !forceFull &&
        (!modelGenuinelyChanged || _fineGrainedModelSwapCellPath) &&
        (!modelInteriorChanged || _fineGrainedModelInteriorCellPath) &&
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
            // by the set() call's propagation through __gxtComponentContexts
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
            // Bridge reader for registerObjectValueOwner.
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
              try {
                _lastModelSnapshot =
                  newModel != null && typeof newModel === 'object'
                    ? JSON.stringify(newModel)
                    : undefined;
              } catch {
                _lastModelSnapshot = undefined;
              }
            }
            // For a non-model controller-property write (QP key, etc.) the
            // changed key's renderContext cell was already dirtied by
            // SyncCore's `__gxtComponentContexts` fan-out; touch it
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
            // The pending-sync flag's canonical state is the module-local
            // `_gxtPendingSyncFlag` in `compile.ts`; this cross-package writer
            // routes through the bridge setter (the optional chain is
            // load-order-safe — by the time this outlet-model-update path
            // fires, compile.ts's `installCompilePipelinePart` has run and the
            // setter is installed). See `setPendingSync` doc in gxt-bridge.ts.
            //
            // `syncDomNow`'s canonical function is the module-local
            // `_gxtSyncDomNow` in `compile.ts`, read here through the bridge
            // method on the same compilePipeline namespace dereferenced for
            // setPendingSync / setPendingSyncFromPropertyChange below. See
            // `syncDomNow` doc in gxt-bridge.ts.
            const _cpRoot = getGxtRenderer()?.compilePipeline;
            const syncDomNow = _cpRoot?.syncDomNow;
            if (typeof syncDomNow === 'function') {
              _cpRoot?.setPendingSync?.(true);
              // `setPendingSyncFromPropertyChange`'s canonical state is the
              // module-local `_gxtPendingSyncFromPropertyChangeFlag` in
              // `compile.ts`; this cross-package writer routes through the
              // bridge setter. See `setPendingSyncFromPropertyChange` doc in
              // gxt-bridge.ts.
              _cpRoot?.setPendingSyncFromPropertyChange?.(true);
              syncDomNow();
            }
            return;
          } catch {
            /* fall through to full re-render */
          }
        }
      }

      // Full re-render: clear and re-render from scratch.
      // Don't use morphing for outlet re-renders — morphChildren can't handle
      // <ember-outlet> custom elements properly (they render via connectedCallback
      // which doesn't fire when morph updates in-place). Instead, clear the
      // parent and re-render. The <ember-outlet> elements will fire connectedCallback
      // when inserted into the live DOM and render their nested content.
      //
      // DOM IDENTITY PRESERVATION (scoped to anchors with ids): Tests
      // capture LinkTo DOM element references at visit-time via
      // `document.getElementById('a-1')` etc. and expect them to stay live
      // across subsequent route transitions (the Query Params
      // model-dependent state tests rely on this). A blanket innerHTML=''
      // orphans those captured references. Preservation is narrowed to
      // `<a id="...">` elements (LinkTos), which are the cases where
      // references are captured. Classic component wrappers, ember-outlet,
      // and other elements fall through to normal full re-render so the
      // pool-managed lifecycle continues to work (view-tree tests rely on
      // the full re-render path).
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
      // fast path above (model swap → `_fineGrainedModelSwapCellPath`; interior
      // mutation → `_fineGrainedModelInteriorCellPath`), preserving text-node
      // identity in place. Any full re-render reaching here is a genuine route
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
            // Disconnect when NEW is detached (it no longer receives updates
            // OR a subsequent re-render replaces it).
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
    // into the first visit's rootElement (the Ember Islands regression).
    // The dispatcher is registered via
    // `compilePipeline.setRootOutletRerender(fn)` (typed bridge). The
    // instrumentation wrap registered by `gxt-backend/manager.ts`'s
    // `setRootOutletRerenderWrap` is applied at set-time inside the bridge.
    // See `setRootOutletRerender` doc in gxt-bridge.ts.
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

// The classic root template — upstream's precompiled `{{component this}}`,
// consumed by the Glimmer VM (setup-registry.ts registers it as
// `template:-root`). The initializer is short-circuited in GXT builds so the
// GXT-aliased `@ember/template-compilation` shim is never invoked at
// module-init time; the rollup/vite pipelines inline `__GXT_MODE__` to a
// literal, so exactly one branch survives DCE in each dist. Shipping
// `createRootTemplate` unconditionally broke every CLASSIC runtime consumer
// of the dist (the VM received a fake GXT compile handle and crashed on its
// first opcode — caught by the tracerbench perf job, the only CI job that
// runs the built classic dist).
const ClassicRootTemplate = __GXT_MODE__
  ? undefined
  : precompileTemplate(`{{component this}}`, {
      moduleName: 'packages/@ember/-internals/glimmer/lib/templates/root.hbs',
      strictMode: true,
    });

export default (__GXT_MODE__ ? createRootTemplate : ClassicRootTemplate) as any;
