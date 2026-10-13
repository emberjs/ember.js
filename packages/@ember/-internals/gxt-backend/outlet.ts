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
//   - the root template (glimmer/lib/templates/root.ts) renders the
//     application route, and the `<ember-outlet>` element below renders each
//     nested level (GXT compiles `{{outlet}}` to `<ember-outlet />`).
//
// route.ts and router.ts reach this module through the gxt-bridge route-outlet
// hooks (`setRouteOutletHooks`), installed when compile.ts loads it.
import { getOwner, type InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import { invokableFor } from 'router_js';
import { hasInternalComponentManager } from './manager';
import {
  getGxtRenderer,
  getCurrentOutletState,
  setCurrentOutletState,
  getActiveOutletElements,
  getAmbientOwner,
  setAmbientOwner,
  setRouteOutletHooks,
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
          const { template: tpl, controller, model, owner } = nestedOutlet.render;

          // Track which template we rendered so we can detect changes
          this._lastRenderedTemplate = tpl;

          // Build context from controller via prototype chain.
          const nestedContext: any = controller ? Object.create(controller) : {};
          nestedContext.model = model;
          nestedContext.owner = owner || getAmbientOwner();
          nestedContext.outletState = nestedOutlet;
          nestedContext.args = { model, controller, outletState: nestedOutlet };

          // Fix for @tracked properties on controller prototype:
          // Object.create(controller) makes prototype getters run with `this = nestedContext`
          // instead of `this = controller`. The @tracked getter's storage is keyed by `this`,
          // so it creates a fresh storage entry for nestedContext with the initial value
          // (e.g., `false` for `@tracked isExpanded = false`), ignoring the actual current
          // value on the controller (e.g., `true` after a toggle click).
          //
          // Fix: install GXT cells on nestedContext with the ACTUAL current values from controller.
          if (controller) {
            const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
            if (_cellFor) {
              try {
                const skipKeys = new Set([...GXT_CONTEXT_SKIP_KEYS, 'model']);
                const visited = new Set<string>();
                let proto = Object.getPrototypeOf(controller);
                while (proto && proto !== Object.prototype) {
                  for (const key of Object.getOwnPropertyNames(proto)) {
                    if (visited.has(key)) continue;
                    visited.add(key);
                    if (key.startsWith('_') || key.startsWith('$') || skipKeys.has(key)) continue;
                    const protoDesc = Object.getOwnPropertyDescriptor(proto, key);
                    if (!protoDesc?.get) continue;
                    if (Object.getOwnPropertyDescriptor(nestedContext, key)) continue;
                    try {
                      // Read the actual value from controller (not through nestedContext prototype)
                      const actualValue = (controller as any)[key];
                      // Install GXT cell on nestedContext and set it to the actual value
                      _cellFor(nestedContext, key, /* skipDefine */ false);
                      const cell = _cellFor(nestedContext, key, /* skipDefine */ true);
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
          }

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
          try {
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
          } catch {
            /* ignore */
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
            if (ownerSwapped) {
              setAmbientOwner(previousGlobalOwner);
            }
            setCurrentOutletState(previousOutletState);
            if (_parentViewPushed) {
              try {
                getGxtRenderer()?.viewUtils.popParentView();
              } catch {
                /* ignore */
              }
            }
          }
        }
      };

export function defineEmberOutletElement(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('ember-outlet')) {
    customElements.define('ember-outlet', EmberOutletElement);
  }
}

// The `-outlet` template: a route template that renders only `{{outlet}}` —
// the top-level view's template and the template of a route that has none.
// This is a simplified outlet that just renders nested templates - no GXT
// primitives needed. root.ts recognizes it by its `template:-outlet`
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
    // The outlet state comes from the context - root.ts passes outletState directly
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
    try {
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
    } catch {
      /* ignore */
    }

    try {
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
    } finally {
      if (_factoryParentPushed) {
        try {
          getGxtRenderer()?.viewUtils.popParentView();
        } catch {
          /* ignore */
        }
      }
    }
    // If no nested template, just return empty - outlet has nothing to show
    return { nodes: [], ctx: context };
  };

  return factory;
}

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
    // ClassicRootState): its GXT branch renders the root template with this
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
    // function handles the top-level route (the one that root.ts renders
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
        let label: string;

        try {
          label = `\`${String(templateFactoryOrComponent)}\``;
        } catch {
          label = 'an unknown object';
        }

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
      // the outlet root template (`templates/root.ts`) sets up the owner, root
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

  for (let info of routeInfos) {
    let routeInfo = info as {
      name: string;
      context?: unknown;
      manager?: object;
      bucket?: { route?: object };
    };
    let route = routeInfo.bucket?.route;
    let render =
      route !== undefined
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

setRouteOutletHooks({
  renderRoute(route: object): void {
    ROUTE_RENDER_STATES.set(route, buildRenderState(route as ClassicRouteLike));
  },
  teardownRoute(route: object): void {
    ROUTE_RENDER_STATES.delete(route);
  },
  setOutlets,
});
