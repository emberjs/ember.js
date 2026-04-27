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
    // Skip rendering if this element is being temporarily reattached to the DOM
    // for willDestroyElement/willClearRender lifecycle hooks. The reattachment
    // is performed by __gxtDestroyUnclaimedPoolEntries so that tests using
    // document.body.contains(this.element) pass during the destroy phase.
    // Without this guard, the inner <ember-outlet> inside a just-removed component
    // wrapper (e.g., root-9) would fire connectedCallback, read the NEW route's
    // outlet state, and render the new route's template with the old wrapper's
    // view on the parentView stack — corrupting the parentView of new components.
    if ((globalThis as any).__gxtDestroyReattachInProgress) {
      return;
    }

    // Get outlet state from the global context
    this._outletState = (globalThis as any).__currentOutletState;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log(
        '[ember-outlet] connectedCallback, outletState:',
        this._outletState ? 'exists' : 'null'
      );
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

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log(
        '[ember-outlet] updateOutletState: newTemplate=',
        newTemplate?.moduleName || typeof newTemplate,
        'lastRendered=',
        this._lastRenderedTemplate?.moduleName || typeof this._lastRenderedTemplate,
        'changed=',
        newTemplate !== this._lastRenderedTemplate
      );
    }

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

    // Fix for @tracked properties on controller prototype:
    // Object.create(controller) makes prototype getters run with `this = nestedContext`
    // instead of `this = controller`. The @tracked getter's trackedData is keyed by `this`,
    // so it creates a fresh storage entry for nestedContext with the initial value
    // (e.g., `false` for `@tracked isExpanded = false`), ignoring the actual current
    // value on the controller (e.g., `true` after a toggle click).
    //
    // Fix: install GXT cells on nestedContext with the ACTUAL current values from controller.
    if (controller) {
      const _cellFor = (globalThis as any).__gxtCellFor;
      if (_cellFor) {
        try {
          const skipKeys = new Set([
            'args',
            'owner',
            'outletState',
            'model',
            'constructor',
            'init',
            'willDestroy',
            'toString',
            'isDestroying',
            'isDestroyed',
          ]);
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

    // Update the global outlet state for nested outlets
    const previousOutletState = (globalThis as any).__currentOutletState;
    (globalThis as any).__currentOutletState = nestedOutlet;

    // If this outlet element is an immediate child of a classic-component
    // wrapper (`{{#x-toggle id="root-9"}}{{outlet}}{{/x-toggle}}`), push
    // that wrapper's view on the parent-view stack so nested components
    // end up with the correct parentView.
    //
    // IMPORTANT: we only push when this outlet element's enclosing wrapper
    // view matches the CURRENTLY-ACTIVE outlet template chain. Specifically,
    // if the direct-parent view belongs to a route that is no longer the
    // one this outlet is rendering (stale leftover DOM from a previous
    // route), we skip the push. Otherwise root views from a sibling route
    // (e.g. index.hbs's `root-5`) get a dangling parentView pointer when
    // the old route's component is destroyed.
    let _parentViewPushed = false;
    try {
      const viewUtils = (globalThis as any).__gxtViewUtilsRef;
      const pushParentFn = (globalThis as any).__gxtPushParentView;
      if (pushParentFn && viewUtils?.getElementView) {
        const directParent = this.parentElement;
        if (directParent) {
          const v = viewUtils.getElementView(directParent);
          if (v && !v.isDestroyed && !v.isDestroying) {
            // Only push if the owner of this view matches the owner of the
            // render we are about to do. If owners match, the wrapper is in
            // the same route chain as our nested template; otherwise it's
            // leftover from a prior route and pushing it would leave stale
            // parentView pointers on nested instances.
            const renderOwner = nestedOutlet?.render?.owner;
            const viewOwner = (v as any)[Symbol.for('OWNER')] || (v as any).__owner;
            if (!renderOwner || !viewOwner || renderOwner === viewOwner) {
              pushParentFn(v);
              _parentViewPushed = true;
            }
          }
        }
      }
    } catch {
      /* ignore */
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
      (globalThis as any).__currentOutletState = previousOutletState;
      if (_parentViewPushed) {
        try {
          const popParentFn = (globalThis as any).__gxtPopParentView;
          if (popParentFn) popParentFn();
        } catch {
          /* ignore */
        }
      }
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
      console.log(
        '[outlet.ts] context keys:',
        context ? Object.keys(context).slice(0, 8).join(',') : 'null'
      );
      console.log('[outlet.ts] outletState:', outletState ? 'exists' : 'null');
    }

    // The outlet state has the CURRENT route's info in .render
    // and NESTED route's info in .outlets.main
    // For the {{outlet}} helper, we want to render the nested route
    const nestedOutlet = outletState?.outlets?.main;
    const nestedTemplate = nestedOutlet?.render?.template;

    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[outlet.ts] nestedOutlet:', nestedOutlet ? 'exists' : 'null');
      console.log(
        '[outlet.ts] nestedTemplate:',
        nestedTemplate ? 'exists' : 'null',
        'type:',
        typeof nestedTemplate
      );
    }

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
      const viewUtils = (globalThis as any).__gxtViewUtilsRef;
      const pushParentFn = (globalThis as any).__gxtPushParentView;
      if (pushParentFn && viewUtils?.getElementView && parentElement) {
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
          const v = viewUtils.getElementView(node);
          if (v && !v.isDestroyed && !v.isDestroying) {
            // Verify the view's element is in the live DOM
            const viewEl = viewUtils.getViewElement ? viewUtils.getViewElement(v) : null;
            const isLive = viewEl ? viewEl.isConnected : node.isConnected;
            if (isLive) {
              pushParentFn(v);
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
          const popParentFn = (globalThis as any).__gxtPopParentView;
          if (popParentFn) popParentFn();
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
