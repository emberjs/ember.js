// The route outlets of the GXT compat backend.
//
// Upstream renders routes through route managers: `EmberRouter#_setOutlets`
// builds an `OutletState` chain (routing/route-managers/outlet-state.ts) and
// renders a `RootOutlet` component. The compat backend keeps its own outlet
// machinery instead, driven by the `{ render, outlets }` outlet-state chain
// that Ember used before route managers:
//
//   - `Route#setup` records each classic route's render state (`renderRoute`,
//     what `Route#[RENDER]()` / `buildRenderState` did) and
//     `Route#teardownViews` drops it (`teardownRoute`);
//   - `EmberRouter#_setOutlets` hands the active route infos to `setOutlets`,
//     which links the recorded render states into a chain and drives the
//     top-level `GxtOutletView`;
//   - the root template (root-template.ts) renders the
//     application route, and the `<ember-outlet>` element below renders each
//     nested level (GXT compiles `{{outlet}}` to `<ember-outlet />`).
//
// A route whose manager provides its own wrapper (`getRouteWrapper()`, RFC
// 1169) renders as upstream's outlet renders every level: the wrapper is
// invoked with the level's `@Component` (its invokable), `@bucket`, `@context`
// and `@outlet` (the next level). Only the classic route manager's wrapper is
// replaced by the machinery above.
//
// route.ts and router.ts reach this module through the gxt-bridge route-outlet
// hooks (`setRouteOutletHooks`), installed when compile.ts loads it.
import { getOwner, type InternalOwner } from '@ember/-internals/owner';
import { get, set } from '@ember/-internals/metal';
import { meta as metaFor } from '@ember/-internals/meta/lib/meta';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import { schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { templateOnlyComponent } from '@glimmer/runtime/lib/component/template-only';
import { invokableFor } from 'router_js';
import type Route from '@ember/routing/route';
import {
  componentCapabilities,
  hasInternalComponentManager,
  setComponentManager,
  setComponentTemplate,
} from './manager';
import {
  getClassicRouteWrapper,
  getGxtRenderer,
  getCurrentOutletState,
  setCurrentOutletState,
  getActiveOutletElements,
  getAmbientOwner,
  setAmbientOwner,
  setRouteOutletHooks,
  defineControllerGetters,
  GXT_CONTEXT_SKIP_KEYS,
} from './gxt-bridge';

// SSR/Node-safety: a module-scope `class ... extends HTMLElement` evaluates
// HTMLElement at IMPORT time and crashes DOM-less environments. Define the
// element as a guarded class expression instead; in non-DOM environments the
// element is never constructed.
const EmberOutletElement: any =
  typeof HTMLElement === 'undefined'
    ? null
    : class EmberOutletElement extends HTMLElement {
        private _rendered = false;
        private _outletState: any = null;
        private _lastRenderedTemplate: any = null;

        connectedCallback() {
          // Skip rendering if this element is being temporarily reattached to the DOM
          // for willDestroyElement/willClearRender lifecycle hooks (the destroy phase
          // reattaches removed component elements so `document.body.contains(this.element)`
          // holds in those hooks). Without this guard, the inner <ember-outlet> inside a
          // just-removed component wrapper would fire connectedCallback, read the NEW
          // route's outlet state, and render the new route's template with the old
          // wrapper's view on the parentView stack — corrupting the parentView of new
          // components.
          if (getGxtRenderer()?.compilePipeline.getDestroyReattachInProgress?.()) {
            return;
          }

          // Get the current outlet state from the bridge
          this._outletState = getCurrentOutletState();

          this.renderOutlet();

          // Register this outlet element for re-rendering when state changes
          getActiveOutletElements().add(this);
        }

        disconnectedCallback() {
          this._rendered = false;
          this._lastRenderedTemplate = null;

          // Unregister from active outlets
          getActiveOutletElements().delete(this);
        }

        // Called when outlet state changes to re-render with new content
        updateOutletState(newState: any) {
          this._outletState = newState;

          // If this element is no longer in the document it is stale — ignore the
          // update entirely. This prevents a disconnected <ember-outlet> (leftover
          // from a previous route, e.g. one nested inside a classic component
          // wrapper like x-toggle) from scheduling a setTimeout-deferred re-render
          // that would fire after the new route has already rendered. If that stale
          // re-render were to proceed, it would push the old wrapper view onto the
          // parentView stack and cause new-route components to inherit it as their
          // parentView, making them invisible to getRootViews.
          if (!this.isConnected) {
            return;
          }

          // Detect a route change by comparing the deeply nested template.
          // The top-level nested outlet (newState.outlets.main) always has
          // render.template = applicationTemplate (same reference for every route),
          // so comparing it is insufficient. Instead compare the ACTUAL rendered
          // template — which is the outlets.main.outlets.main template (the leaf
          // route template: index, zomg, etc.). This reference changes on every
          // route transition, correctly triggering a re-render.
          const nestedOutlet = newState?.outlets?.main;
          // The leaf template is in nestedOutlet.outlets.main (index/zomg template).
          // Fall back to nestedOutlet.render.template for routes without sub-outlets.
          const leafOutlet = nestedOutlet?.outlets?.main;
          const newTemplate = leafOutlet?.render?.template ?? nestedOutlet?.render?.template;

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

          // Guard: if this element is no longer connected to the live document,
          // it is a stale <ember-outlet> left over from a previous route render
          // (e.g. the outlet inside an x-toggle wrapper from the old route).
          // Rendering from a disconnected element would push the old wrapper view
          // onto the parentView stack, causing the new route's components to inherit
          // it as their parentView (and wrongly disappear from getRootViews).
          if (!this.isConnected) {
            return;
          }

          const outletState = this._outletState;
          if (!outletState) {
            return;
          }

          // Get the nested outlet (outlets.main)
          const nestedOutlet = outletState?.outlets?.main;
          if (!nestedOutlet?.render?.template) {
            return;
          }

          // Use 'tpl' instead of 'template' to avoid GXT's CallExpression transform
          // GXT's Babel plugin treats any function named 'template' as an Ember template function
          const { template: tpl, owner, wrapped } = nestedOutlet.render;

          // Track which template we rendered so we can detect changes
          this._lastRenderedTemplate = tpl;

          // A level whose route manager provides its own wrapper renders through
          // it (`renderWrappedLevel`); a classic level renders its template with
          // a context built from its controller.
          const nestedContext = wrapped === undefined ? classicLevelContext(nestedOutlet) : null;

          // Update the current outlet state for nested outlets
          const previousOutletState = getCurrentOutletState();
          setCurrentOutletState(nestedOutlet);

          // If this outlet element is an immediate child of a classic-component
          // wrapper (`{{#x-toggle id="root-9"}}{{outlet}}{{/x-toggle}}`), push
          // that wrapper's view on the parent-view stack so nested components
          // end up with the correct parentView. Classic Ember does the same for
          // every owner: the outlet manager leaves `dynamicScope.view` alone,
          // so an engine route's components also get the enclosing app
          // component as their parentView.
          let _parentViewPushed = false;
          const viewUtils = getGxtRenderer()?.viewUtils;
          if (viewUtils) {
            const directParent = this.parentElement;
            if (directParent) {
              const v = viewUtils.getElementView(directParent) as any;
              if (v && !v.isDestroyed && !v.isDestroying) {
                viewUtils.pushParentView(v);
                _parentViewPushed = true;
              }
            }
          }

          // Engine support: when the nested outlet's render owner is an engine
          // instance (different from the application owner), swap the ambient owner
          // for the duration of tpl.render so that $_maybeHelper / $_tag / component
          // resolution find the engine's registry (e.g. engine-scoped helpers,
          // components registered only on the engine). Without this swap a shared
          // template registered in BOTH application and engine would resolve curly
          // bare identifiers (`{{ambiguous-curlies}}`) against the application owner
          // even while rendering inside the engine's outlet, leaking application
          // refinements into the engine's render output.
          const previousGlobalOwner = getAmbientOwner();
          const ownerSwapped = owner && owner !== previousGlobalOwner;
          if (ownerSwapped) {
            setAmbientOwner(owner);
          }
          // Classic `render.outlet` instrumentation: every route level an
          // outlet renders (a node without a view), from its render to its
          // rendered layout.
          const finalizeInstrumentation = _instrumentStart(
            'render.outlet',
            outletInstrumentationPayload,
            nestedOutlet
          );
          try {
            if (wrapped !== undefined) {
              renderWrappedLevel(nestedOutlet, this);
              this._rendered = true;
            } else if (typeof tpl?.render === 'function') {
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
            if (ownerSwapped) {
              setAmbientOwner(previousGlobalOwner);
            }
            setCurrentOutletState(previousOutletState);
            if (_parentViewPushed) {
              getGxtRenderer()?.viewUtils.popParentView();
            }
            finalizeInstrumentation();
          }
        }
      };

// The payload of an outlet level's `render.outlet` instrumentation, as the
// classic outlet manager's.
function outletInstrumentationPayload(level: GxtOutletState): { object: string } {
  return { object: `${level.render?.name}:main` };
}

// The `this` of a classic level's route template, rendered by an
// `<ember-outlet>`: its controller's properties through the prototype chain,
// with `@model`, `@controller` and `@outlet`.
function classicLevelContext(nestedOutlet: GxtOutletState): any {
  const { controller, model, owner } = nestedOutlet.render!;

  // Build context from controller via prototype chain.
  const nestedContext: any = controller ? Object.create(controller) : {};
  nestedContext.model = model;
  nestedContext.owner = owner || getAmbientOwner();
  nestedContext.outletState = nestedOutlet;
  nestedContext.args = withOutletArg({ model, controller, outletState: nestedOutlet });

  // The controller's getters, read with the controller as `this` when the
  // template reads them.
  const cellFor = getGxtRenderer()?.compilePipeline.cellFor;
  if (controller && cellFor) {
    defineControllerGetters(
      nestedContext,
      controller,
      cellFor,
      new Set([...GXT_CONTEXT_SKIP_KEYS, 'model'])
    );
  }

  return nestedContext;
}

export function defineEmberOutletElement(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('ember-outlet')) {
    customElements.define('ember-outlet', EmberOutletElement);
  }
}

// The `-outlet` template: a route template that renders only `{{outlet}}` —
// the top-level view's template and the template of a route that has none.
// This is a simplified outlet that just renders nested templates - no GXT
// primitives needed. root-template.ts recognizes it by its `template:-outlet`
// moduleName and renders the nested level directly.
export function createOutletTemplate(_owner: any) {
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
    // The outlet state comes from the context - root-template.ts passes outletState directly
    const outletState = context?.outletState || context?.state || context;

    // The outlet state has the CURRENT route's info in .render
    // and NESTED route's info in .outlets.main
    // For the {{outlet}} helper, we want to render the nested route
    const nestedOutlet = outletState?.outlets?.main;
    const nestedTemplate = nestedOutlet?.render?.template;

    // The factory render path is used for `{{outlet}}` invocations that
    // appear inside another component's yield block (e.g. `{{#x-toggle
    // id="root-9"}}{{outlet}}{{/x-toggle}}`). In that case the enclosing
    // classic component's wrapper element is the direct parent of the
    // rendering target, so we push it on the parent-view stack. This
    // ensures nested components inside the outlet's template get the
    // enclosing classic component as their parentView (and therefore
    // don't show up as root views).
    let _factoryParentPushed = false;
    const viewUtils = getGxtRenderer()?.viewUtils;
    if (viewUtils && parentElement) {
      // parentElement here is the rendering target (typically the
      // ember-outlet custom element or its direct parent div).
      // Walk up a couple of levels looking for the enclosing wrapper.
      // Only push a view if its element is still connected to the live
      // document — stale wrappers from a previous route (whose elements
      // were removed by parentElement.innerHTML = '') must not be pushed,
      // or else the new route's components inherit the wrong parentView.
      let node: Element | null = parentElement as Element;
      let steps = 0;
      while (node && steps++ < 3) {
        const v = viewUtils.getElementView(node) as any;
        if (v && !v.isDestroyed && !v.isDestroying) {
          // Verify the view's element is in the live DOM
          const viewEl = viewUtils.getViewElement(v);
          const isLive = viewEl ? viewEl.isConnected : node.isConnected;
          if (isLive) {
            viewUtils.pushParentView(v);
            _factoryParentPushed = true;
          }
          break;
        }
        node = node.parentElement;
      }
    }

    try {
      if (nestedOutlet?.render?.wrapped !== undefined) {
        // A level whose route manager provides its own wrapper renders through
        // it, with the level as the current outlet state of its `{{outlet}}`s.
        const previousOutletState = getCurrentOutletState();
        setCurrentOutletState(nestedOutlet);
        try {
          renderWrappedLevel(nestedOutlet, parentElement);
        } finally {
          setCurrentOutletState(previousOutletState);
        }
      } else if (nestedTemplate && typeof nestedTemplate.render === 'function') {
        // Build context using controller DIRECTLY to preserve identity
        const nestedCtrl = nestedOutlet?.render?.controller;
        const nestedCtx: any = nestedCtrl ? Object.create(nestedCtrl) : {};
        nestedCtx.model = nestedOutlet?.render?.model;
        nestedCtx.owner = nestedOutlet?.render?.owner || context?.owner;
        nestedCtx.outletState = nestedOutlet;
        nestedCtx.args = withOutletArg({
          model: nestedOutlet?.render?.model,
          controller: nestedOutlet?.render?.controller,
          outletState: nestedOutlet,
        });
        nestedTemplate.render(nestedCtx, parentElement);
      } else if (nestedTemplate && typeof nestedTemplate === 'function') {
        const tpl = nestedTemplate(context?.owner);
        if (tpl && typeof tpl.render === 'function') {
          const nestedCtrl = nestedOutlet?.render?.controller;
          const nestedCtx: any = nestedCtrl ? Object.create(nestedCtrl) : {};
          nestedCtx.model = nestedOutlet?.render?.model;
          nestedCtx.owner = nestedOutlet?.render?.owner || context?.owner;
          nestedCtx.outletState = nestedOutlet;
          nestedCtx.args = withOutletArg({
            model: nestedOutlet?.render?.model,
            controller: nestedOutlet?.render?.controller,
            outletState: nestedOutlet,
          });
          tpl.render(nestedCtx, parentElement);
        }
      }
    } finally {
      if (_factoryParentPushed) {
        getGxtRenderer()?.viewUtils.popParentView();
      }
    }
    // If no nested template, just return empty - outlet has nothing to show
    return { nodes: [], ctx: context };
  };

  OUTLET_TEMPLATES.add(factory);
  return factory;
}

/** The `-outlet` templates: the template of a route that has none. */
const OUTLET_TEMPLATES = new WeakSet<object>();

// ---------------------------------------------------------------------------
// The `{ render, outlets }` outlet-state chain
// ---------------------------------------------------------------------------

/** One rendered route (the pre-route-manager `RenderState`). */
export interface GxtRenderState {
  /** The route's owner; an engine instance below a mount point. */
  owner: InternalOwner;
  /** The route name. */
  name: string;
  /** The route's controller: the `this` of a route template. */
  controller: unknown;
  /** The route's model, as of its last `setup`. */
  model: unknown;
  /** A GXT template, a component, or the `-outlet` template. */
  template: object | undefined;
  /** Set when the route's manager provides its own wrapper: what renders the level. */
  wrapped?: GxtWrappedLevel;
}

/**
 * A level whose route manager provides its own wrapper (`getRouteWrapper()`).
 * Upstream's outlet invokes the wrapper with the level's state curried on
 * (routing/route-managers/root-outlet.ts `OutletArgProvider`); `state` is the
 * `this` of that invocation here.
 */
export interface GxtWrappedLevel {
  /** The manager's module-stable wrapper component. */
  wrapper: object;
  state: {
    /** The route's invokable. */
    Component: object;
    /** The route manager's bucket. */
    bucket: object;
    /** The route's context (its model); updated with `set`. */
    context: unknown;
    /** The next level (`outletComponent`). */
    outlet: object;
    owner: InternalOwner;
  };
}

/** One outlet level (the pre-route-manager `OutletState`). */
export interface GxtOutletState {
  render: GxtRenderState | undefined;
  outlets: { main: GxtOutletState | undefined };
}

const TOP_LEVEL_NAME = '-top-level';

/**
 * The router's top-level view (the pre-route-manager `OutletView`, GXT half).
 * Its `ref` is the raw top-level outlet state; the root template reads it, and
 * `setOutletState` re-renders through the root template and the connected
 * `<ember-outlet>` elements.
 */
export class GxtOutletView {
  readonly ref: GxtOutletState;
  readonly state: { ref: GxtOutletState; name: string; template: object; controller: undefined };

  constructor(
    readonly owner: InternalOwner,
    readonly template: object
  ) {
    let outletState: GxtOutletState = {
      outlets: { main: undefined },
      render: {
        owner,
        name: TOP_LEVEL_NAME,
        controller: undefined,
        model: undefined,
        template,
      },
    };

    // A cellFor-backed reactive slot on outletState.outlets.main; the raw
    // outletState is the `ref` the root template dereferences.
    getGxtRenderer()?.gxtLib.cellFor(outletState.outlets, 'main');
    this.ref = outletState;

    this.state = {
      ref: this.ref,
      name: TOP_LEVEL_NAME,
      template,
      controller: undefined,
    };
  }

  appendTo(target: Element): void {
    let renderer = this.owner.lookup('renderer:-dom') as {
      _appendDefinition(root: object, definition: unknown, target: Element): void;
    };

    // The renderer renders this view as a root (glimmer/lib/renderer.ts
    // ClassicRootState, classic-roots.ts): it renders the root template with this
    // view's `ref` and `template`, so no root component definition is needed.
    schedule('render', renderer, '_appendDefinition', this, null, target);
  }

  rerender(): void {
    /**/
  }

  setOutletState(state: GxtOutletState): void {
    // Directly mutate the raw OutletState (`this.ref` IS that state) and drive
    // re-render through GXT's outlet chain.
    this.ref.outlets['main'] = state;

    // Update the bridge outlet state so <ember-outlet> elements can access it
    setCurrentOutletState(this.ref);

    // Trigger re-render of the root outlet content first. The root render
    // function handles the top-level route (the one that root-template.ts renders
    // directly, skipping the -outlet template).
    const rootRenderFn = getGxtRenderer()?.compilePipeline.getRootOutletRerender?.() ?? null;
    if (typeof rootRenderFn === 'function') {
      // Snapshot active outlets BEFORE the root re-render. The root re-render
      // may create new <ember-outlet> elements (via innerHTML='' + renderOutletState).
      // We only want to notify PRE-EXISTING outlets about the state change —
      // newly created outlets already render via connectedCallback.
      const preExistingOutlets = new Set(getActiveOutletElements());

      rootRenderFn(this.ref);

      // After the root re-render, notify pre-existing outlet elements about
      // nested state changes (e.g., engine-internal route transitions where
      // the outlet element stays in the DOM but nested content changes).
      const currentOutlets = getActiveOutletElements();
      for (const outlet of preExistingOutlets as Iterable<any>) {
        // Only notify outlets that survived the root re-render (still in DOM)
        if (currentOutlets.has(outlet) && typeof outlet.updateOutletState === 'function') {
          outlet.updateOutletState(this.ref);
        }
      }
      return;
    }

    // Fallback: Notify active outlet elements about the state change
    for (const outlet of getActiveOutletElements()) {
      if (typeof outlet.updateOutletState === 'function') {
        outlet.updateOutletState(this.ref);
      }
    }
  }

  destroy(): void {
    /**/
  }
}

// ---------------------------------------------------------------------------
// Route render states and the router hook
// ---------------------------------------------------------------------------

interface ClassicRouteLike {
  routeName: string;
  templateName?: string | null;
  controller?: unknown;
  currentModel?: unknown;
}

/** classic route → its render state, recorded by `Route#setup`. */
const ROUTE_RENDER_STATES = new WeakMap<object, GxtRenderState>();

/** route-manager bucket → render state, for routes of a non-classic manager. */
const BUCKET_RENDER_STATES = new WeakMap<object, GxtRenderState>();

/** router → its top-level view. */
const TOPLEVEL_VIEWS = new WeakMap<object, GxtOutletView>();

function buildRenderState(route: ClassicRouteLike): GxtRenderState {
  let owner = getOwner(route as object) as InternalOwner | undefined;
  assert('Route is unexpectedly missing an owner', owner);

  let name = route.routeName;
  let templateName = route.templateName || name;

  let templateFactoryOrComponent = owner.lookup(`template:${templateName}`) as
    | ((owner: InternalOwner) => object)
    | object
    | undefined;

  let template: object;

  if (templateFactoryOrComponent) {
    if (hasInternalComponentManager(templateFactoryOrComponent)) {
      template = templateFactoryOrComponent;
    } else {
      if (DEBUG && typeof templateFactoryOrComponent !== 'function') {
        // A module namespace object (an invalid module export) has a null
        // prototype and no string form.
        const label =
          typeof (templateFactoryOrComponent as any).toString === 'function'
            ? `\`${String(templateFactoryOrComponent)}\``
            : 'an unknown object';

        assert(
          `Failed to render the ${name} route, expected ` +
            `\`template:${templateName}\` to resolve into ` +
            `a component or a \`TemplateFactory\`, got: ${label}. ` +
            `Most likely an improperly defined class or an invalid module export.`
        );
      }

      // A route template compiled at build time from a bare top-level
      // `<template>` in a `.gjs`/`.gts` file resolves to a raw GXT template
      // function. It is not an Ember `TemplateFactory` (no `asLayout`) and
      // carries none of the gxt wrapper brands (`__gxtCompiled` /
      // `__gxtFactory`). Calling it as `factory(owner)` here would crash
      // because no GXT root context or args exist yet, so store it uninvoked:
      // the outlet root template (`root-template.ts`) sets up the owner, root
      // context and args before calling it. Ember `TemplateFactory`s and
      // wrapped gxt factories still go through `factory(owner)`.
      let candidate = templateFactoryOrComponent as unknown as Record<string, unknown>;
      let isRawGxtFn =
        typeof templateFactoryOrComponent === 'function' &&
        !('asLayout' in templateFactoryOrComponent) &&
        !candidate['__gxtCompiled'] &&
        !candidate['__gxtFactory'];

      template = isRawGxtFn
        ? templateFactoryOrComponent
        : (templateFactoryOrComponent as (owner: InternalOwner) => object)(owner);
    }
  } else {
    // default `{{outlet}}`
    template = createOutletTemplate(owner) as object;
  }

  return {
    owner,
    name,
    controller: route.controller,
    model: route.currentModel,
    template,
  };
}

/**
 * The render state of a route of a non-classic route manager (RFC 1169): its
 * invokable (a component) renders with the route's context as `@model`.
 */
function managedRenderState(
  router: object,
  routeInfo: { name: string; context?: unknown; manager?: object; bucket?: object }
): GxtRenderState | undefined {
  let { manager, bucket } = routeInfo;
  if (manager === undefined || bucket === undefined) return undefined;

  let cached = BUCKET_RENDER_STATES.get(bucket);
  if (cached !== undefined) {
    if (cached.model === routeInfo.context) return cached;
    // A new context is a new render state (the outlet re-renders the level).
    cached = { ...cached, model: routeInfo.context };
    BUCKET_RENDER_STATES.set(bucket, cached);
    return cached;
  }

  let invokable = resolvedInvokable(router, manager, bucket);
  if (invokable === undefined) return undefined;

  let owner = getOwner(router) as InternalOwner;
  let state: GxtRenderState = {
    owner,
    name: routeInfo.name,
    controller: undefined,
    model: routeInfo.context,
    template: invokable,
  };
  BUCKET_RENDER_STATES.set(bucket, state);
  return state;
}

/**
 * The route manager's invokable for `bucket` (`getInvokable`, read once per
 * bucket), or `undefined` while it is not resolved: the outlets render again
 * once it is.
 */
function resolvedInvokable(router: object, manager: object, bucket: object): object | undefined {
  let invokable = invokableFor(
    manager as { getInvokable(bucket: object): Promise<object> },
    bucket
  ) as object;
  if (typeof (invokable as { then?: unknown }).then === 'function') {
    // Not resolved yet: render this level once it is.
    (invokable as Promise<object>).then(
      () => (router as { _setOutlets(): void })._setOutlets(),
      () => {
        // getInvokable rejected; this level renders nothing.
      }
    );
    return undefined;
  }
  return invokable;
}

// ---------------------------------------------------------------------------
// Levels whose route manager provides its own wrapper
// ---------------------------------------------------------------------------

/** route-manager bucket → the render state of its wrapped level. */
const WRAPPED_RENDER_STATES = new WeakMap<object, GxtRenderState>();

/**
 * The render state of a route whose manager provides its own wrapper. It is
 * the same object while the bucket is active, so a new context re-renders only
 * what reads `@context`.
 */
function wrappedRenderState(
  router: object,
  routeInfo: { name: string; context?: unknown; manager: object; bucket: { route?: object } },
  wrapper: object
): GxtRenderState | undefined {
  let { name, context, manager, bucket } = routeInfo;
  let route = bucket.route;

  // A classic route renders once `Route#setup` has recorded it.
  if (route !== undefined && !ROUTE_RENDER_STATES.has(route)) return undefined;

  let render = WRAPPED_RENDER_STATES.get(bucket);
  if (render !== undefined && render.wrapped!.wrapper === wrapper) {
    let state = render.wrapped!.state;
    if (state.context !== context) {
      render.model = context;
      set(state, 'context', context);
    }
    return render;
  }

  let Component =
    route !== undefined
      ? classicRouteInvokable(route as ClassicRouteLike)
      : resolvedInvokable(router, manager, bucket);
  if (Component === undefined) return undefined;

  let owner = getOwner(route ?? router) as InternalOwner;
  render = {
    owner,
    name,
    controller: undefined,
    model: context,
    template: Component,
    wrapped: {
      wrapper,
      state: { Component, bucket, context, outlet: outletComponent(), owner },
    },
  };
  WRAPPED_RENDER_STATES.set(bucket, render);
  return render;
}

/** classic route → the invokable a route manager's wrapper receives for it. */
const CLASSIC_ROUTE_INVOKABLES = new WeakMap<object, object>();

/** invokable class → its classic route. */
const INVOKABLE_ROUTES = new WeakMap<object, ClassicRouteLike>();

/**
 * Upstream's `RouteTemplate`: the route's template rendered with its
 * controller as `this` and the arguments the wrapper passes. A route whose
 * template is a component is invoked as that component.
 */
class ClassicRouteTemplate {}

let classicRouteTemplateManager: object | undefined;

function classicRouteInvokable(route: ClassicRouteLike): object {
  let template = ROUTE_RENDER_STATES.get(route)?.template;
  if (template !== undefined && hasInternalComponentManager(template)) return template;

  let invokable = CLASSIC_ROUTE_INVOKABLES.get(route);
  if (invokable !== undefined) return invokable;

  if (classicRouteTemplateManager === undefined) {
    let manager = {
      capabilities: componentCapabilities('3.13', {}),
      createComponent(definition: object): unknown {
        return INVOKABLE_ROUTES.get(definition)?.controller;
      },
      getContext(controller: unknown): unknown {
        return controller;
      },
    };
    classicRouteTemplateManager = manager;
    setComponentManager(() => manager, ClassicRouteTemplate);
  }

  invokable = class extends ClassicRouteTemplate {};
  INVOKABLE_ROUTES.set(invokable, route);
  // The template `Route#setup` recorded last; a route without one renders the
  // next level, as `{{outlet}}`.
  setComponentTemplate((owner: InternalOwner) => {
    let current = ROUTE_RENDER_STATES.get(route)?.template;
    if (current === undefined) return undefined;
    return resolveTemplate(OUTLET_TEMPLATES.has(current) ? outletTemplate() : current, owner);
  }, invokable);
  CLASSIC_ROUTE_INVOKABLES.set(route, invokable);
  return invokable;
}

/** A template factory's template for `owner`; a template is its own. */
function resolveTemplate(template: object, owner: InternalOwner): unknown {
  return typeof (template as { render?: unknown }).render !== 'function' &&
    typeof template === 'function'
    ? (template as (owner: InternalOwner) => unknown)(owner)
    : template;
}

function compileTemplate(source: string, options: object): object {
  let compile = getGxtRenderer()?.compilePipeline.compileTemplate;
  assert('[gxt] the GXT template compiler is not installed', typeof compile === 'function');
  return compile(source, options) as object;
}

let outletTemplateFactory: object | undefined;

/** `{{outlet}}`: GXT compiles it to `<ember-outlet />`, which renders the next level. */
function outletTemplate(): object {
  outletTemplateFactory ??= compileTemplate('<ember-outlet />', {
    strictMode: true,
    moduleName: 'gxt-route-outlet',
  });
  return outletTemplateFactory;
}

let outletComponentDefinition: object | undefined;

/**
 * A classic level's arguments with `@outlet`, which its template invokes as
 * `<@outlet />`. The component is made when `@outlet` is first read.
 */
function withOutletArg<T extends object>(args: T): T {
  return Object.defineProperty(args, 'outlet', {
    get: outletComponent,
    enumerable: true,
    configurable: true,
  });
}

/**
 * What `<@outlet />` invokes. It renders the next level of the current outlet
 * state and ignores the arguments of the call site: a parent cannot
 * parameterize the outlet it places.
 */
function outletComponent(): object {
  outletComponentDefinition ??= setComponentTemplate(outletTemplate(), templateOnlyComponent());
  return outletComponentDefinition!;
}

/** wrapper → the template that invokes it with a level's state. */
const WRAPPER_TEMPLATES = new WeakMap<object, object>();

let wrapperTemplateCount = 0;

function wrapperTemplate(wrapper: object): object {
  let template = WRAPPER_TEMPLATES.get(wrapper);
  if (template === undefined) {
    let tag = `GxtRouteWrapper${++wrapperTemplateCount}`;
    template = compileTemplate(
      `<${tag} @Component={{this.Component}} @bucket={{this.bucket}} @context={{this.context}} @outlet={{this.outlet}} />`,
      { strictMode: true, scopeValues: { [tag]: wrapper }, moduleName: 'gxt-route-wrapper' }
    );
    WRAPPER_TEMPLATES.set(wrapper, template);
  }
  return template;
}

/**
 * Render a wrapped level into `target`: its manager's wrapper with the level's
 * `@Component`, `@bucket`, `@context` and `@outlet`. The `{{outlet}}`s it
 * renders read the current outlet state, which the caller sets to `level`.
 */
function renderWrappedLevel(level: GxtOutletState, target: Element): void {
  let { owner, wrapped } = level.render!;
  assert('[gxt] expected a level whose route manager provides a wrapper', wrapped !== undefined);
  let template = resolveTemplate(wrapperTemplate(wrapped.wrapper), owner) as {
    render(context: object, target: Element): void;
  };
  template.render(wrapped.state, target);
}

function sameChain(a: GxtOutletState | undefined, b: GxtOutletState | undefined): boolean {
  while (a !== undefined && b !== undefined) {
    if (a.render !== b.render) return false;
    a = a.outlets.main;
    b = b.outlets.main;
  }
  return a === b;
}

function setOutlets(router: object, routeInfos: readonly object[]): void {
  let root: GxtOutletState | null = null;
  let parent: GxtOutletState | null = null;
  let classicWrapper = getClassicRouteWrapper();
  assert('[gxt] the classic route wrapper is not registered', classicWrapper !== null);

  for (let info of routeInfos) {
    let routeInfo = info as {
      name: string;
      context?: unknown;
      manager?: { getRouteWrapper?(): object };
      bucket?: { route?: object };
    };
    let route = routeInfo.bucket?.route;
    let wrapper = routeInfo.manager?.getRouteWrapper?.();
    let render =
      wrapper !== undefined && wrapper !== classicWrapper && routeInfo.bucket !== undefined
        ? wrappedRenderState(router, routeInfo as never, wrapper)
        : route !== undefined
          ? ROUTE_RENDER_STATES.get(route)
          : managedRenderState(router, routeInfo as never);

    if (render === undefined) {
      // A parent route that did not render leaves its child routes nowhere to
      // render into.
      break;
    }

    let state: GxtOutletState = { render, outlets: { main: undefined } };

    if (parent) {
      parent.outlets.main = state;
    } else {
      root = state;
    }

    parent = state;
  }

  // when a transitionTo happens after the validation phase during the initial
  // transition _setOutlets is called when no routes are active. However, it
  // will get called again with the correct values during the next turn of the
  // runloop
  if (root === null) {
    return;
  }

  let view = TOPLEVEL_VIEWS.get(router);

  if (view !== undefined) {
    // The same routes with the same render states: nothing to re-render.
    if (!sameChain(view.ref.outlets.main, root)) {
      view.setOutletState(root);
    }
    return;
  }

  let owner = getOwner(router) as InternalOwner | undefined;
  assert('Router is unexpectedly missing an owner', owner);

  view = new GxtOutletView(owner, createOutletTemplate(owner) as object);
  TOPLEVEL_VIEWS.set(router, view);
  view.setOutletState(root);

  let instance = owner.lookup('-application-instance:main') as
    | { rootElement?: Element | null }
    | undefined;
  assert('[BUG] unexpectedly missing `-application-instance:main`', instance !== undefined);

  if (instance.rootElement) {
    view.appendTo(instance.rootElement);
  }
}

// The GXT parts of `Route#refresh`, `Route#setup` and the router's
// `didTransition` (route.ts, router.ts), through the route-outlet hooks.

// `Route#refresh`.
// GXT fix (Issue #13263): When a route template is rendered, GXT creates
// a `renderContext = Object.create(controller)` and binds `{{on "click"
// this.action}}` handlers to that renderContext. If the action mutates a
// QP via `set(this, 'foo', v)` or `incrementProperty('foo')`, the write
// hits the renderContext's *own* property and shadows the controller —
// leaving `controller.foo` stale, so the QP observer never fires and the
// URL never updates on subsequent refreshes. Before refreshing, walk any
// live renderContexts for this route's controller and mirror their own QP
// values back to the controller so subsequent QP observers see the new
// value (so `_qpChanged` → `_activeQPChanged` → URL update fires).
function refreshRoute(route: Route): void {
  try {
    let controller = route.controller;
    // controller -> live render contexts, populated by the outlet root
    // template (root-template.ts) at render time.
    let ctxsMap = getGxtRenderer()?.compilePipeline.getComponentContextsMap?.();
    if (controller && ctxsMap && ctxsMap.has(controller)) {
      // SAFETY: Since `_qp` is protected we can't infer the type
      let queryParams = get(route, '_qp') as Route['_qp'];
      let qpNames = queryParams.propertyNames;
      if (qpNames.length > 0) {
        // `ctxsMap.has(controller)` is checked above, so `.get` is defined.
        let contexts: Set<object> = ctxsMap.get(controller)!;
        contexts.forEach((renderContext: any) => {
          for (let prop of qpNames) {
            if (Object.prototype.hasOwnProperty.call(renderContext, prop)) {
              let rcValue = renderContext[prop];
              let ctrlValue = (controller as any)[prop];
              if (rcValue !== ctrlValue) {
                set(controller, prop, rcValue);
              }
            }
          }
        });
      }
    }
  } catch (e) {
    // Best-effort: a throw here must not break `refresh()`, but it would
    // leave the controller's QP values out of sync, so surface it in DEBUG
    // (a console.warn does not trip QUnit's warn/deprecation assertions).
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('[gxt] query-param controller sync failed during refresh', e);
    }
  }
}

// `Route#setup`.
// GXT fix: Ensure the controller has a writable instance meta, not just an
// inherited prototype meta. Without this, notifyPropertyChange on QP values
// skips markObjectAsDirty because isPrototypeMeta(controller) returns true —
// causing async QP observers to never detect the dirty tag, so URL/LinkTo
// hrefs never update when QPs change.
//
// Additionally: in some GXT paths the instance meta is created with
// meta.proto === controller (instead of controller.constructor.prototype),
// which makes `isPrototypeMeta(controller)` return true for the *instance*.
// That short-circuits `ComputedProperty.get` to return `undefined`,
// breaking every `@computed` getter on controllers. Repair it here.
function pinControllerMeta(controller: object): void {
  let m = metaFor(controller);
  const correctProto = Object.getPrototypeOf(controller);
  if (correctProto && correctProto !== controller) {
    // Pin meta.proto to the real class prototype. Without this, the GXT
    // outlet render builds `renderContext = Object.create(controller)` and the
    // first `peekMeta(renderContext)` walks up to `controller`, sees
    // `meta.proto !== controller`, and mutates `meta.proto = controller`.
    // That makes `isPrototypeMeta(controller)` return true,
    // which short-circuits `ComputedProperty.get` to return `undefined` for
    // every `@computed` getter on the controller — breaking templates that
    // read things like `this.allSitesAllArticles`.
    m.proto = correctProto;
    // `proto` is a configurable property of the meta (a data property, or
    // this accessor from an earlier setup), so it can be redefined.
    Object.defineProperty(m, 'proto', {
      get() {
        return correctProto;
      },
      set(_v) {
        /* ignore — see comment above */
      },
      configurable: true,
      enumerable: false,
    });
  }
}

// The router's `didTransition`.
// GXT: LinkTo.href consumes `tagFor(routing, 'currentState')`, where
// `routing` is the `-routing` service that aliases `router.currentState`
// via `readOnly('router.currentState')`. In GXT mode the alias chain tag
// doesn't always propagate dirty to the routing service's tag on
// `set(router, 'currentState', ...)`, so LinkTo.href getters don't re-
// evaluate after a QP-only transition (triggered by `set(controller,
// 'q', 'lol')` → _activeQPChanged → fireQueryParamTransition). We
// explicitly notify the routing service so its `currentState` tag
// dirties, forcing LinkTo.href getters to re-evaluate with the latest
// sticky QP values. This matches the semantics upstream Glimmer VM
// already achieves via its chain-tag machinery.
function didTransition(router: object): void {
  try {
    const owner = getOwner(router);
    if (owner) {
      const routing = owner.lookup('service:-routing') as any;
      if (routing) {
        // Dirty the routing service's `currentState` tag directly (see
        // above). Without the bridge, fall back to `notifyPropertyChange`.
        const dirtyTagFor = getGxtRenderer()?.compilePipeline.classicDirtyTagFor;
        if (typeof dirtyTagFor === 'function') {
          dirtyTagFor(routing, 'currentState');
        } else if (typeof routing.notifyPropertyChange === 'function') {
          routing.notifyPropertyChange('currentState');
        }
        // Trigger a sync so enqueued effects (e.g. LinkTo.applyHref via
        // registerClassicReactor) flush synchronously before the test's
        // next assertion runs. Marking it as property-driven makes the sync
        // re-evaluate the routing-service formulas.
        const _cpRouter = getGxtRenderer()?.compilePipeline;
        const syncDomNow = _cpRouter?.syncDomNow;
        if (typeof syncDomNow === 'function') {
          _cpRouter?.setPendingSync?.(true);
          _cpRouter?.setPendingSyncFromPropertyChange?.(true);
          syncDomNow();
        }
      }
    }
  } catch (e) {
    // Best-effort: a throw here must never block the transition, but it
    // would leave LinkTo href/isActive stale, so surface it in DEBUG (a
    // console.warn does not trip QUnit's warn/deprecation assertions).
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('[gxt] post-transition tag-dirty/sync failed', e);
    }
  }
}

setRouteOutletHooks({
  renderRoute(route: object): void {
    ROUTE_RENDER_STATES.set(route, buildRenderState(route as ClassicRouteLike));
  },
  teardownRoute(route: object): void {
    ROUTE_RENDER_STATES.delete(route);
  },
  setOutlets,
  renderWrappedLevel(level: object, target: Element): void {
    renderWrappedLevel(level as GxtOutletState, target);
  },
  withOutletArg,
  refreshRoute(route: object): void {
    refreshRoute(route as Route);
  },
  pinControllerMeta,
  didTransition,
});
