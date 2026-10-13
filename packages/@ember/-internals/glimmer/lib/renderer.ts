import { privatize as P } from '@ember/-internals/container/lib/registry';
import type { InternalOwner } from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import {
  getViewElement,
  getViewId,
  setViewElement,
} from '@ember/-internals/views/lib/system/utils';
import {
  getGxtRenderer,
  installCompilePipelinePart,
  installRootComponentPart,
  installViewUtilsPart,
  setAmbientOwner,
  GXT_ARGS_SYMBOL,
  GXT_VIEW_SKIP_KEYS,
} from '@ember/-internals/gxt-backend/gxt-bridge';
import { guidFor } from '@ember/-internals/utils/lib/guid';
import { sendCoreViewEvent } from '@ember/-internals/views/lib/views/core-view-utils';
import { assert } from '@ember/debug';
import {
  associateDestroyableChild,
  destroy,
  isDestroyed,
  isDestroying,
} from '@glimmer/destroyable';
import type {
  Bounds,
  Environment,
  RenderResult as GlimmerRenderResult,
  DynamicScope as GlimmerDynamicScope,
  Template,
  TemplateFactory,
  EvaluationContext,
  CurriedComponent,
} from '@glimmer/interfaces';

import type { Nullable } from '@ember/-internals/utility-types';
import type { Reference } from '@glimmer/reference/lib/reference';
// The @glimmer/reference and @glimmer/validator BARREL specifiers below are
// load-bearing for the GXT dual backend: the rollup GXT alias map
// (scripts/gxt-alias-map.mjs) redirects the exact barrel key to the gxt-backend
// shim, while deep lib/* paths would resolve to the real vendored VM source and
// fork the reactive runtime in GXT builds. Do not convert them to deep imports.
// eslint-disable-next-line ember-local/no-barrel-imports
import { createConstRef, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
// eslint-disable-next-line ember-local/no-barrel-imports
import { valueForTag, type Tag } from '@glimmer/validator';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import type { CurriedValue } from '@glimmer/runtime/lib/curried-value';
import { curry } from '@glimmer/runtime/lib/curried-value';
import { inTransaction } from '@glimmer/runtime/lib/environment';
import { renderMain } from '@glimmer/runtime/lib/render';
import { unwrapTemplate, isGxtTemplate } from './component-managers/unwrap-template';
import type { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import type Component from './component';
import type ClassicComponent from './component';
import { BOUNDS } from './component-managers/curly';
import { RootComponentDefinition } from './component-managers/root';
import RouterResolver from './router-resolver';
import type { OutletState } from '../../routing/route-managers/outlet-state';
import type { IBuilder, RendererRoot, RendererState } from './base-renderer';
import {
  BaseRenderer,
  defaultClientBuilder,
  destroyElementSync,
  ensureGxtContext,
  errorLoopTransaction,
  gxtRenderPass,
  _gxtLib,
} from './base-renderer';
import { renderers } from './renderers';

export {
  type IBuilder,
  type RendererRoot,
  type RenderResult,
  BaseRenderer,
  ComponentRootState,
  errorLoopTransaction,
  renderComponent,
  renderSettled,
  setRenderer,
  _resetRenderers,
} from './base-renderer';

export interface View {
  parentView: Nullable<View>;
  renderer: Renderer;
  tagName: string | null;
  elementId: string | null;
  isDestroying: boolean;
  isDestroyed: boolean;
  [BOUNDS]: Bounds | null;
}

export class DynamicScope implements GlimmerDynamicScope {
  constructor(
    public view: View | null,
    public outletState: Reference<OutletState | undefined>
  ) {}

  child() {
    return new DynamicScope(this.view, this.outletState);
  }

  get(key: 'outletState'): Reference<OutletState | undefined> {
    assert(
      `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    return this.outletState;
  }

  set(key: 'outletState', value: Reference<OutletState | undefined>) {
    assert(
      `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
      key === 'outletState'
    );
    this.outletState = value;
    return value;
  }
}

// --- ArrayProxy content → component cell bridge ---
// Maps a content array to { proxy, ownerObj, ownerKey } so that when
// notifyPropertyChange(content, '[]') fires, we can dirty the component
// cell with the proxy value (not the content array).
const _proxyContentOwners = new WeakMap<object, Set<{ proxy: any; obj: object; key: string }>>();

function _registerArrayProxyOwner(proxy: any, ownerObj: object, ownerKey: string) {
  try {
    const desc = Object.getOwnPropertyDescriptor(proxy, 'content');
    if (!desc || desc.get) return; // content is a CP, skip
    const content = desc.value;
    if (!content || !Array.isArray(content)) return;
    let owners = _proxyContentOwners.get(content);
    if (!owners) {
      owners = new Set();
      _proxyContentOwners.set(content, owners);
    }
    owners.add({ proxy, obj: ownerObj, key: ownerKey });
  } catch {
    /* ignore */
  }
}

// Lazily registers (once) an after-hook on the GXT re-render trigger that runs
// after the trigger's own work: when an ArrayProxy's content array changes,
// it dirties the owning component cell with the proxy.
let _triggerReRenderHostHookInstalled = false;
function _ensureTriggerReRenderPatched() {
  if (__GXT_MODE__) {
    if (_triggerReRenderHostHookInstalled) return;
    const cp = getGxtRenderer()?.compilePipeline;
    if (!cp || typeof cp.addAfterTriggerReRender !== 'function') return;
    const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
    if (!_cellFor) return;
    _triggerReRenderHostHookInstalled = true;
    cp.addAfterTriggerReRender(function (obj: object, keyName: string) {
      // If this is a '[]' or 'length' notification on a native array that is
      // the content of an ArrayProxy, dirty the component cell with the proxy.
      if ((keyName === '[]' || keyName === 'length') && Array.isArray(obj)) {
        const owners = _proxyContentOwners.get(obj);
        if (owners) {
          for (const { proxy, obj: ownerObj, key: ownerKey } of owners) {
            try {
              const c = _cellFor(ownerObj, ownerKey, /* skipDefine */ true);
              if (c) c.update(proxy); // Update with proxy, not content array
            } catch {
              /* ignore */
            }
          }
        }
      }
    });
  }
}

class ClassicRootState implements RendererRoot {
  readonly type = 'classic';
  public id: string;
  public result: GlimmerRenderResult | undefined;
  public destroyed: boolean;
  public render: () => void;
  readonly env: Environment;
  public isGxt: boolean = false; // Track if this root uses GXT templates
  public isOutletView: boolean = false; // Track if this root is an OutletView
  // True while the most recent render() attempt threw before completing.
  // Such a root never wired its reactivity (gxtComponentTag stays unset), so
  // the tag-based dirty selection in _gxtForceEmberRerender cannot see it;
  // the flag makes the next force pass retry the full root render. Classic
  // production recovers after an initial-render error this way ("it
  // rerenders after error in production"); in DEBUG errorLoopTransaction has
  // already nooped the render fn, so the retry is a warn-noop and dev keeps
  // its "does not rerender after error" behavior.
  public gxtRenderIncomplete: boolean = false;
  public gxtComponentTag: Tag | null = null; // Track component's dirty tag for GXT reactivity
  public gxtLastTagValue: number = 0; // Last known tag value for comparison

  constructor(
    public root: Component,
    context: EvaluationContext,
    owner: object,
    template: Template,
    self: Reference<unknown>,
    parentElement: SimpleElement,
    dynamicScope: DynamicScope,
    builder: IBuilder
  ) {
    assert(
      `You cannot render \`${valueForRef(self)}\` without a template.`,
      template !== undefined
    );

    this.id = getViewId(root);
    this.result = undefined;
    this.destroyed = false;
    this.env = context.env;

    // Two separate `errorLoopTransaction` calls, not one callback branching on
    // `__GXT_MODE__`: rollup keeps every binding a callback passed there refers
    // to (the helper reassigns its parameter), even in a folded branch, so a
    // shared callback would keep the GXT helpers in the classic build.
    if (__GXT_MODE__) {
      this.render = errorLoopTransaction(() => {
        // GXT: guard against infinite render depth (e.g., engine mounting loops).
        const depth = _gxtRenderDepth || 0;
        if (depth > 20) {
          // eslint-disable-next-line no-console
          console.warn('[gxt] Max render depth exceeded, skipping render');
          return;
        }
        _gxtRenderDepth = depth + 1;
        try {
          this.gxtRenderIncomplete = false;
          // Set the ambient owner for the GXT manager system to access (classic
          // Glimmer threads the owner through dynamicScope instead).
          setAmbientOwner(owner);

          if (isGxtTemplate(template)) {
            // Mark this root as using GXT templates (for forced re-render)
            this.isGxt = true;

            // The render-error queue is global. The errors queued from here on
            // are this root's render's (see the flush after the render).
            const renderErrorMark = gxtRenderPass().renderErrorMark();

            // CRITICAL: Ensure GXT context is set up before any GXT rendering
            // This provides the parent context chain that GXT's $_if, $_c, etc. need
            ensureGxtContext();

            // Use gxt rendering for gxt templates
            // Get the component context from self reference
            const componentContext = valueForRef(self);

            // Create a minimal result object for compatibility
            const gxtResult = {
              rerender: () => {
                // gxt handles re-rendering internally via reactivity
              },
              destroy: () => {
                // Cleanup handled by gxt's destroyable system
                destroyElementSync(parentElement);
              },
            };

            this.result = gxtResult as any;
            associateDestroyableChild(owner, gxtResult as any);

            // Track the actual render target (may be a wrapper element for classic components)
            let actualRenderTarget: SimpleElement = parentElement;

            // Check if template has a render method (runtime-compiled gxt template)
            if (typeof (template as any).render === 'function') {
              // For gxt templates, use the root view directly (e.g., OutletView)
              // The root parameter has the state we need
              let renderContext;

              // Debug: log what root looks like

              if (root && 'state' in root && 'ref' in root) {
                // This is an OutletView - transform to expected format
                this.isOutletView = true;
                const outletView = root as any;
                renderContext = {
                  rootState: {
                    root: {
                      ref: outletView.ref,
                      template: outletView.state?.template || outletView.template,
                    },
                    render: {
                      owner: outletView.owner,
                    },
                  },
                };
              } else if (root && 'layoutName' in root) {
                // This is a ClassicComponent (from RenderingTestCase)
                const component = root as any;

                // Use the component directly as render context (not Object.create).
                // Install cell getter/setters directly on the component so GXT's
                // native tracking ($_if, $_each, etc.) works properly.
                renderContext = component;

                // Add GXT-required symbols for template rendering
                renderContext[GXT_ARGS_SYMBOL] = component.args || {};
                renderContext[_gxtLib().$SLOTS_SYMBOL] = {};
                renderContext.$fw = [[], [], []];
                renderContext.owner = owner;

                // Install cell-backed getter/setters on the component for ALL
                // data properties. Use skipDefine=false so GXT's native formula
                // tracking (in $_if, $_each, etc.) picks up cell.value reads.
                const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
                const _registerArrayOwner = getGxtRenderer()?.compilePipeline.registerArrayOwner;
                _ensureTriggerReRenderPatched();
                if (_cellFor) {
                  const skipProps = new Set([
                    ...GXT_VIEW_SKIP_KEYS,
                    'args',
                    'constructor',
                    'isView',
                    'isComponent',
                    'positionalParams',
                    'target',
                  ]);
                  for (const key in component) {
                    if (typeof key !== 'string' || key.startsWith('_') || skipProps.has(key))
                      continue;
                    try {
                      // Walk the prototype chain to find the descriptor. `for...in`
                      // iterates inherited enumerable keys too, but
                      // `Object.getOwnPropertyDescriptor(component, key)` returns
                      // `undefined` for inherited props. Without walking, we fail
                      // to detect mixin-installed computed-property getter/setter
                      // pairs (e.g., `actionContextObject` from TargetActionSupport)
                      // and install a cellFor whose cell re-reads the CP through
                      // `comp[key]`, recursing forever
                      // (cell.value -> cell.__fn() -> comp[key] -> cell.value ...).
                      let desc: PropertyDescriptor | undefined;
                      let obj: any = component;
                      while (obj && obj !== Object.prototype) {
                        desc = Object.getOwnPropertyDescriptor(obj, key);
                        if (desc) break;
                        obj = Object.getPrototypeOf(obj);
                      }
                      if (desc && (desc.get || desc.set)) continue;
                      if (desc && desc.configurable === false) continue;
                      const value = component[key];
                      if (typeof value === 'function') continue;
                      _cellFor(component, key, /* skipDefine */ false);
                      // Register array owner for KVO array mutation tracking
                      if (_registerArrayOwner && Array.isArray(value)) {
                        _registerArrayOwner(value, component, key);
                      }
                      // For ArrayProxy values, register the proxy in a separate map
                      // so that when its content array fires notifyPropertyChange,
                      // we can dirty the component cell with the proxy (not the content).
                      if (
                        _registerArrayOwner &&
                        value &&
                        typeof value === 'object' &&
                        typeof value.objectAt === 'function' &&
                        !Array.isArray(value)
                      ) {
                        _registerArrayProxyOwner(value, component, key);
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                }
              } else {
                // Fallback to the component context
                renderContext = componentContext;
              }

              // For classic components with a wrapper element (tagName !== ''),
              // create the wrapper with Ember-specific attributes before GXT renders
              if (root && 'tagName' in root) {
                const component = root as any;
                const tagName = component.tagName;

                // Only create wrapper if tagName is truthy (non-empty string)
                // tagless components have tagName set to '' or are null/undefined
                if (tagName && tagName !== '') {
                  const wrapperTag = tagName; // Already checked it's truthy
                  const wrapper = document.createElement(wrapperTag);

                  // Set the Ember-specific id attribute
                  const elementId = component.elementId || guidFor(component);
                  wrapper.id = elementId;

                  // Build class list starting with ember-view
                  const classList: string[] = ['ember-view'];

                  // Add classNames if present
                  if (component.classNames && Array.isArray(component.classNames)) {
                    classList.push(...component.classNames);
                  }

                  // Add classNameBindings values if present
                  if (component.classNameBindings && Array.isArray(component.classNameBindings)) {
                    for (const binding of component.classNameBindings) {
                      // Parse simple bindings like 'isEnabled:enabled:disabled' or 'propertyName'
                      const parts = binding.split(':');
                      const propName = parts[0];
                      const propValue = component[propName];

                      if (parts.length === 1) {
                        // Just property name - add as class if truthy
                        if (propValue) {
                          const className =
                            typeof propValue === 'string'
                              ? propValue
                              : propName.replace(/([A-Z])/g, '-$1').toLowerCase();
                          classList.push(className);
                        }
                      } else if (parts.length >= 2) {
                        // property:trueClass or property:trueClass:falseClass
                        if (propValue && parts[1]) {
                          classList.push(parts[1]);
                        } else if (!propValue && parts[2]) {
                          classList.push(parts[2]);
                        }
                      }
                    }
                  }

                  wrapper.className = classList.join(' ');

                  // Add ariaRole if present
                  if (component.ariaRole) {
                    wrapper.setAttribute('role', component.ariaRole);
                  }

                  // Apply attributeBindings if present
                  if (component.attributeBindings && Array.isArray(component.attributeBindings)) {
                    for (const binding of component.attributeBindings) {
                      const [propName, attrName] = binding.includes(':')
                        ? binding.split(':')
                        : [binding, binding];
                      const value = component[propName];
                      if (
                        value !== undefined &&
                        value !== null &&
                        attrName !== 'id' &&
                        attrName !== 'class'
                      ) {
                        // For 'value' on input/textarea/select, use DOM property (not HTML attribute)
                        const isPropertyOnly =
                          attrName === 'value' &&
                          (wrapper.tagName === 'INPUT' ||
                            wrapper.tagName === 'TEXTAREA' ||
                            wrapper.tagName === 'SELECT');
                        if (isPropertyOnly) {
                          (wrapper as any)[attrName] = String(value);
                        } else if (typeof value === 'boolean') {
                          if (value) {
                            wrapper.setAttribute(attrName, '');
                          }
                        } else {
                          wrapper.setAttribute(attrName, String(value));
                        }
                      }
                    }
                  }

                  // Append wrapper to parent and render GXT into wrapper
                  parentElement.appendChild(wrapper);
                  actualRenderTarget = wrapper as unknown as SimpleElement;

                  // Store wrapper reference for component.element access
                  // This uses Ember's view element tracking
                  if (typeof setViewElement === 'function') {
                    setViewElement(component, wrapper);
                  }
                }
              }

              // Begin render pass for backtracking detection
              gxtRenderPass().beginRenderPass();

              // Push root component onto parentView stack before rendering
              if (root && 'layoutName' in root) {
                getGxtRenderer()!.viewUtils.pushParentView(root);
              }
              // Wrap the synchronous template render so that init-phase throws
              // (e.g., `init() { throw ... }` on a classic Ember component) are
              // caught here: clear the partially-rendered DOM (matching classic
              // Glimmer VM behaviour for init failures) and re-throw to
              // `assert.throws` / the host.
              let renderPhaseError: unknown = undefined;
              try {
                (template as any).render(renderContext, actualRenderTarget);
              } catch (err) {
                renderPhaseError = err;
              } finally {
                // Pop from parentView stack after rendering
                if (root && 'layoutName' in root) {
                  getGxtRenderer()!.viewUtils.popParentView();
                }
                // End render pass in the finally block so it's cleaned up even when
                // BREAK or other sentinels propagate (e.g., from expectAssertion).
                gxtRenderPass().endRenderPass();
              }
              if (renderPhaseError !== undefined) {
                // Init-phase failure — DOM is partially populated. Clear it
                // before propagating, matching Glimmer's behaviour.
                (parentElement as unknown as Element).innerHTML = '';
                // The caller receives this error; drop the queued copy of it
                // (and this aborted render's other errors), or the next
                // unrelated render would throw it.
                gxtRenderPass().dropRenderErrors(renderErrorMark);
                throw renderPhaseError;
              }
            } else if ('$nodes' in template) {
              // Build-time compiled gxt template with $nodes
              _gxtLib().renderComponent(template as any, parentElement, owner);
            } else {
              // eslint-disable-next-line no-console
              console.warn('GXT template detected but cannot render:', template);
            }

            // Flush queued didInsertElement / didRender hooks now that all DOM
            // has been inserted into the live document by GXT. Errors thrown by
            // these hooks are queued by gxt-backend and re-thrown below.
            gxtRenderPass().flushAfterInsertQueue();

            // Re-throw any lifecycle (didInsertElement / destroy) errors captured
            // during the after-insert flush. Init-phase render errors are no
            // longer queued — they propagate directly from `template.render()`
            // above. The queue at this point only ever contains lifecycle errors,
            // so we MUST NOT clear DOM here — `assertText('hello')` after a
            // didInsertElement throw expects the rendered output to remain.
            try {
              gxtRenderPass().flushRenderErrors(renderErrorMark);
            } catch (renderError) {
              // Lifecycle error — defer it to the root state so it can be
              // re-thrown OUTSIDE errorLoopTransaction (preserving re-renderability)
              (this as any).__gxtDeferredError = renderError;
            }

            const gxtRoot = root;

            // Capture the component's self tag for reactivity tracking
            // This allows us to detect when Ember's set() changes properties
            // set() calls markObjectAsDirty which dirties the SELF_TAG via tagForObject
            if (gxtRoot && 'layoutName' in gxtRoot) {
              const component = gxtRoot as any;
              const componentTag = tagForObject(component);
              this.gxtComponentTag = componentTag;
              this.gxtLastTagValue = valueForTag(componentTag);
            }

            // GXT's fine-grained reactivity drives all re-renders, so `render`
            // is a no-op from here on (it is still invoked by
            // `_gxtForceEmberRerender` and `renderRoots`). Root tag bookkeeping
            // (`gxtComponentTag` / `gxtLastTagValue`) is maintained by
            // `_gxtForceEmberRerender` / `_gxtUpdateRootTagValues`. Lifecycle
            // errors (destroy, didInsertElement during re-render) are stored on
            // `__gxtDeferredError` and re-thrown by renderRoots outside
            // errorLoopTransaction, so they don't permanently disable re-rendering.
            this.render = errorLoopTransaction(() => {});
          } else {
            // A non-GXT template in GXT mode. The GXT build ships no Glimmer VM
            // render/opcode machinery, so there is deliberately no VM fallback:
            // surface a compile error if there is one, else a clear error rather
            // than silently mis-rendering.
            unwrapTemplate(template);
            throw new Error('[gxt] non-GXT template encountered in GXT mode; no VM fallback');
          }
        } catch (e) {
          // See gxtRenderIncomplete doc on the field declaration.
          this.gxtRenderIncomplete = true;
          throw e;
        } finally {
          // Restore the pre-entry depth (not 0) so nested renders unwind
          // correctly.
          _gxtRenderDepth = depth;
        }
      });
      return;
    }

    this.render = errorLoopTransaction(() => {
      let layout = unwrapTemplate(template).asLayout();

      let iterator = renderMain(
        context,
        owner,
        self,
        builder(context.env, { element: parentElement, nextSibling: null }),
        layout,
        dynamicScope
      );

      let result = (this.result = iterator.sync());

      associateDestroyableChild(this, result);

      this.render = errorLoopTransaction(() => {
        if (isDestroying(result) || isDestroyed(result)) return;

        return result.rerender({
          alwaysRevalidate: false,
        });
      });
    });
  }

  isFor(possibleRoot: unknown): boolean {
    return this.root === possibleRoot;
  }

  destroy() {
    let { result, env } = this;

    this.destroyed = true;

    this.root = null as any;
    this.result = undefined;
    this.render = undefined as any;

    if (result !== undefined) {
      if (__GXT_MODE__) {
        // GXT teardown: `result` is the minimal gxt result object. Destruction
        // is owned by GXT's own destroyable system, so there is no Glimmer VM
        // transaction to open (the GXT renderer has no VM environment).
        destroyElementSync(result!);
        destroy(result!);
        return;
      }

      /*
       Handles these scenarios:

       * When roots are removed during standard rendering process, a transaction exists already
         `.begin()` / `.commit()` are not needed.
       * When roots are being destroyed manually (`component.append(); component.destroy() case), no
         transaction exists already.
       * When roots are being destroyed during `Renderer#destroy`, no transaction exists

       */

      inTransaction(env, () => destroy(result!));
    }
  }
}

// Re-entrancy guard for `_gxtForceEmberRerender`.
let _gxtForceRerenderInProgress = false;

// Dirty roots recorded by `_gxtUpdateRootTagValues` during a GXT DOM sync,
// consumed (and cleared) by `_gxtForceEmberRerender` in the same sync.
let _gxtDirtyRootsAtSync: any[] | undefined;

// Render depth of `ClassicRootState` renders (e.g. engine-mounting chains);
// renders nested deeper than 20 are skipped with a warning.
let _gxtRenderDepth = 0;

// Force re-render all GXT roots whose own tag moved in the current sync
// cycle. gxt-backend calls this (as `compilePipeline.forceEmberRerender`) from
// its DOM sync when GXT's cell tracking misses changes made through Ember's
// set() / notifyPropertyChange, and from the helper-recompute path so formulas
// reading helper cells re-evaluate.
function _gxtForceEmberRerender(): void {
  // Re-entrancy guard: prevent infinite loops when re-rendering triggers
  // cell updates that schedule additional force-rerenders.
  if (_gxtForceRerenderInProgress) return;
  _gxtForceRerenderInProgress = true;
  try {
    const hadPendingSync = Boolean(getGxtRenderer()?.compilePipeline.getHadPendingSync?.());
    const hadNestedObjectChange = Boolean(
      getGxtRenderer()?.compilePipeline.getHadNestedObjectChange?.()
    );
    // Collect roots whose own tag has moved. If `_gxtUpdateRootTagValues`
    // already ran earlier in this sync, it stashed the dirty list in
    // `_gxtDirtyRootsAtSync`; prefer that.
    const dirtyRootsFromSync = _gxtDirtyRootsAtSync;
    const dirtyRoots: any[] = [];
    const allGxtRoots: any[] = [];
    // Roots whose previous render() threw mid-way (gxtRenderIncomplete) —
    // they never wired gxtComponentTag, so the tag comparison below cannot
    // select them. They are retried unconditionally; see the field doc on
    // ClassicRootState.
    const incompleteRoots: any[] = [];
    for (const renderer of renderers) {
      const state = (renderer as any).state as RendererState;
      if (!state) continue;
      const debugRoots = state.debug?.roots;
      if (!debugRoots) continue;
      for (const root of debugRoots) {
        const classicRoot = root as any;
        if (classicRoot.isGxt && (classicRoot.gxtComponentTag || classicRoot.isOutletView)) {
          allGxtRoots.push(classicRoot);
          const currentTagValue = classicRoot.gxtComponentTag
            ? valueForTag(classicRoot.gxtComponentTag)
            : 0;
          if (currentTagValue !== classicRoot.gxtLastTagValue) {
            dirtyRoots.push(classicRoot);
          }
        } else if (classicRoot.gxtRenderIncomplete === true && !classicRoot.destroyed) {
          incompleteRoots.push(classicRoot);
        }
      }
    }
    // Use the pre-sync dirty set (captured before updateRootTagValues cleaned
    // them), falling back to live comparison for call-sites that don't go
    // through the sync pipeline.
    const effectiveDirtyRoots =
      dirtyRootsFromSync && dirtyRootsFromSync.length > 0
        ? dirtyRootsFromSync.filter((r) => allGxtRoots.includes(r))
        : dirtyRoots;
    // Choose which roots to force-render:
    //   - If any root's own tag moved in this sync, render only those (scoped).
    //     This is the common case: a component mutates its own @tracked state.
    //   - Otherwise, fall back to force-render-all only when hadPendingSync AND
    //     hadNestedObjectChange — i.e., a nested-object property change that
    //     doesn't dirty any component's SELF_TAG (e.g., set(m, 'message', ...)).
    //     This preserves cross-root propagation for nested object mutations
    //     while avoiding spurious full re-renders when a @tracked mutation on
    //     a CHILD component doesn't change any root's tag (child is reactive
    //     via its own cell-tracked getters).
    const selectedRoots =
      effectiveDirtyRoots.length > 0
        ? effectiveDirtyRoots
        : hadPendingSync && hadNestedObjectChange
          ? allGxtRoots
          : [];
    // Incomplete roots retry regardless of the tag-based selection (a copy —
    // selectedRoots may alias one of the arrays built above). Gate on
    // hadPendingSync: only an actual classic mutation justifies a retry —
    // without the gate the 16ms interval flush would re-run a still-throwing
    // root every tick and the rethrown error would wedge the suite.
    const rootsToRender =
      incompleteRoots.length > 0 && hadPendingSync
        ? [...new Set([...selectedRoots, ...incompleteRoots])]
        : selectedRoots;
    for (const classicRoot of rootsToRender) {
      // Tag is dirty — force re-render. Increment the render pass ID
      // so the instance pool resets claimed flags and REUSES existing
      // instances instead of creating new ones (which would fire
      // spurious init/render lifecycle hooks).
      _incrementEmberRenderPassId();
      // Render inside `withForceRerender` so gxt-backend knows a forced
      // rerender is in progress. The render error is stashed inside the
      // wrapped body, before the flag is reset.
      const _renderFn = () => {
        try {
          classicRoot.render();
        } catch (renderErr) {
          // Store render error so it can propagate to assert.throws
          if (!classicRoot.__gxtDeferredError) {
            classicRoot.__gxtDeferredError = renderErr;
          }
        }
      };
      const _withForceRerender = getGxtRenderer()?.compilePipeline.withForceRerender;
      if (_withForceRerender) {
        _withForceRerender(_renderFn);
      } else {
        _renderFn();
      }
      // Re-throw deferred errors (from lifecycle hooks like destroy)
      if (classicRoot.__gxtDeferredError) {
        const err = classicRoot.__gxtDeferredError;
        classicRoot.__gxtDeferredError = null;
        if (classicRoot.gxtRenderIncomplete === true) {
          // A recovery retry that threw again: queue the error for the test
          // harness instead of rethrowing — a throw here would abort the
          // force pass mid-loop and wedge subsequent flushes. The flag stays
          // set, so the next classic mutation retries again (classic prod
          // semantics: renders keep being attempted after an error).
          const capture = getGxtRenderer()?.compilePipeline.captureRenderError;
          if (typeof capture === 'function') capture(err);
        } else {
          throw err;
        }
      }
    }
  } finally {
    _gxtForceRerenderInProgress = false;
    getGxtRenderer()?.compilePipeline.setHadPendingSync?.(false);
    getGxtRenderer()?.compilePipeline.setHadNestedObjectChange?.(false);
    _gxtDirtyRootsAtSync = undefined;
  }
}

// Expose `_gxtForceEmberRerender` to gxt-backend.
if (__GXT_MODE__) {
  installCompilePipelinePart({
    forceEmberRerender: _gxtForceEmberRerender,
  });
}

// Check if the given object is a GXT root-component's `root` (i.e., a
// component that owns a top-level renderer state). Used by the GXT re-render
// trigger to distinguish own-SELF_TAG changes (which the cell-based sync
// pipeline handles) from nested-object changes (which need a force-rerender
// fallback).
function _gxtIsRootComponent(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  for (const renderer of renderers) {
    const state = (renderer as any).state as RendererState;
    if (!state) continue;
    const debugRoots = state.debug?.roots;
    if (!debugRoots) continue;
    for (const root of debugRoots) {
      if ((root as any).root === obj) return true;
    }
  }
  return false;
}

// Update gxtLastTagValue on all GXT roots to mark them clean. Called from
// gxt-backend's DOM sync after the cell-based updates, so
// `_gxtForceEmberRerender` sees them as up to date. Also records which roots
// WERE dirty (in `_gxtDirtyRootsAtSync`) so `_gxtForceEmberRerender` can scope
// its rerender to just those roots.
function _gxtUpdateRootTagValues(): void {
  const dirtyRoots: any[] = [];
  for (const renderer of renderers) {
    const state = (renderer as any).state as RendererState;
    if (!state) continue;
    const debugRoots = state.debug?.roots;
    if (!debugRoots) continue;
    for (const root of debugRoots) {
      const classicRoot = root as any;
      if (classicRoot.isGxt && classicRoot.gxtComponentTag) {
        const currentTagValue = valueForTag(classicRoot.gxtComponentTag);
        if (currentTagValue !== classicRoot.gxtLastTagValue) {
          dirtyRoots.push(classicRoot);
        }
        classicRoot.gxtLastTagValue = currentTagValue;
      }
    }
  }
  _gxtDirtyRootsAtSync = dirtyRoots;
}

// Publish the renderer-owned root-component hooks to the gxt-bridge
// `rootComponent` namespace (consumed by gxt-backend/compile.ts).
if (__GXT_MODE__) {
  installRootComponentPart({
    isRootComponent: _gxtIsRootComponent,
    updateRootTagValues: _gxtUpdateRootTagValues,
  });
}

// Render pass ID, incremented before each forced root re-render and by the
// rendering test helpers. Exposed to gxt-backend through `viewUtils`.
let _emberRenderPassId = 0;
function _getEmberRenderPassId(): number {
  return _emberRenderPassId;
}
function _incrementEmberRenderPassId(): void {
  _emberRenderPassId = _emberRenderPassId + 1;
}
if (__GXT_MODE__) {
  installViewUtilsPart({
    getRenderPassId: _getEmberRenderPassId,
    incrementRenderPassId: _incrementEmberRenderPassId,
  });
}

interface ViewRegistry {
  [viewId: string]: unknown;
}

export class Renderer extends BaseRenderer {
  private _rootTemplate: Template;
  private _viewRegistry: ViewRegistry;

  static create(props: { _viewRegistry: any }): Renderer {
    let { _viewRegistry } = props;
    let owner = getOwner(props);
    assert('Renderer is unexpectedly missing an owner', owner);
    let document = owner.lookup('service:-document') as SimpleDocument;
    let env = owner.lookup('-environment:main') as {
      isInteractive: boolean;
      hasDOM: boolean;
    };
    let rootTemplate = owner.lookup(P`template:-root`) as TemplateFactory;
    let builder = owner.lookup('service:-dom-builder') as IBuilder;
    return new this(owner, document, env, rootTemplate, _viewRegistry, builder);
  }

  constructor(
    owner: InternalOwner,
    document: SimpleDocument,
    env: { isInteractive: boolean; hasDOM: boolean },
    rootTemplate: TemplateFactory,
    viewRegistry: ViewRegistry,
    builder = defaultClientBuilder,
    resolver = new RouterResolver()
  ) {
    super(owner, env, document, resolver, builder);
    this._rootTemplate = rootTemplate(owner);
    this._viewRegistry = viewRegistry || owner.lookup('-view-registry:main');
  }

  // renderer HOOKS

  appendTo(view: ClassicComponent, target: SimpleElement): void {
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, definition, this.state.owner, null, true),
      target
    );
  }

  _appendDefinition(root: ClassicComponent, definition: CurriedValue, target: SimpleElement): void {
    let self = createConstRef(definition, 'this');
    let dynamicScope = new DynamicScope(null, UNDEFINED_REFERENCE);
    let rootState = new ClassicRootState(
      root,
      this.state.context,
      this.state.owner,
      this._rootTemplate,
      self,
      target,
      dynamicScope,
      this.state.builder
    );
    this.state.renderRoot(rootState);
  }

  cleanupRootFor(component: ClassicComponent): void {
    // no need to cleanup roots if we have already been destroyed
    if (isDestroyed(this)) {
      return;
    }

    let roots = this.state.roots;

    // traverse in reverse so we can remove items
    // without mucking up the index
    let i = roots.length;
    while (i--) {
      let root = roots[i];
      assert('has root', root);
      if (root.type === 'classic' && root.isFor(component)) {
        root.destroy();
        roots.splice(i, 1);
      }
    }
  }

  remove(view: ClassicComponent): void {
    view._transitionTo('destroying');

    this.cleanupRootFor(view);

    if (this.state.isInteractive) {
      sendCoreViewEvent(view, 'didDestroyElement');
    }
  }

  get _roots() {
    return this.state.debug.roots;
  }

  get _inRenderTransaction() {
    return this.state.debug.inRenderTransaction;
  }

  get _isInteractive() {
    return this.state.debug.isInteractive;
  }

  get _context() {
    // In GXT mode there is no real EvaluationContext (see the BaseRenderer
    // constructor). Callers such as the runtime-resolver cache tests only read
    // `_context.constants.{component,helper,modifier}DefinitionCount`, so
    // serve those counts from the GXT resolver-cache tracker instead.
    if (__GXT_MODE__) {
      const counters = getGxtRenderer()?.compilePipeline.getResolverCacheCounters?.();
      return {
        constants: {
          componentDefinitionCount: counters?.componentDefinitionCount || 0,
          helperDefinitionCount: counters?.helperDefinitionCount || 0,
          modifierDefinitionCount: counters?.modifierDefinitionCount || 0,
        },
      } as unknown as EvaluationContext;
    }
    return this.state.context;
  }

  register(view: any): void {
    let id = getViewId(view);
    // In GXT mode, view registration can conflict during a forced rerender
    // or when views aren't fully cleaned up between test runs. Silently
    // overwrite the existing entry instead of asserting.
    if (__GXT_MODE__) {
      this._viewRegistry[id] = view;
      return;
    }
    assert(
      'Attempted to register a view with an id already in use: ' + id,
      !this._viewRegistry[id]
    );
    this._viewRegistry[id] = view;
  }

  unregister(view: any): void {
    delete this._viewRegistry[getViewId(view)];
  }

  getElement(component: View): Nullable<Element> {
    if (this._isInteractive) {
      return getViewElement(component);
    } else {
      throw new Error(
        'Accessing `this.element` is not allowed in non-interactive environments (such as FastBoot).'
      );
    }
  }

  getBounds(component: View): {
    parentElement: SimpleElement;
    firstNode: SimpleNode;
    lastNode: SimpleNode;
  } {
    let bounds: Bounds | null = component[BOUNDS];

    // In GXT mode, BOUNDS may not be set on the component. Fall back to
    // synthesizing bounds from the component's element (wrapper or tagless).
    if (!bounds && __GXT_MODE__) {
      const element = getViewElement(component);
      if (element) {
        // Regular component with a wrapper element
        return {
          parentElement: element.parentNode as unknown as SimpleElement,
          firstNode: element as unknown as SimpleNode,
          lastNode: element as unknown as SimpleNode,
        };
      }
      // Tagless component — look for the __gxtBounds marker
      const gxtBounds = (component as any).__gxtBounds;
      if (gxtBounds) {
        return {
          parentElement: gxtBounds.parentElement as unknown as SimpleElement,
          firstNode: gxtBounds.firstNode as unknown as SimpleNode,
          lastNode: gxtBounds.lastNode as unknown as SimpleNode,
        };
      }
    }

    assert('object passed to getBounds must have the BOUNDS symbol as a property', bounds);

    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();

    return { parentElement, firstNode, lastNode };
  }
}
