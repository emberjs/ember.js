// The GXT side of glimmer's classic roots (`ClassicRootState` in
// glimmer/lib/renderer.ts), moved here from renderer.ts:
//
// - the render of a root, its destruction and the bounds of a component
//   rendered without Glimmer's `BOUNDS`, which the glimmer host
//   (glimmer-host.ts) gives renderer.ts;
// - the force re-render of the roots: gxt-backend's DOM sync re-renders the
//   roots whose tag moved, asks whether an object is a root's component, and
//   advances the render-pass id through the members this module installs on the
//   gxt-bridge renderer when it loads.
//
// The roots render with render-component.ts's GXT root context and DOM API.
import type { RenderResult as GlimmerRenderResult, Tag, Template } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import type { SimpleElement, SimpleNode } from '@simple-dom/interface';
import type Component from '@ember/-internals/glimmer/lib/component';
import type { View } from '@ember/-internals/glimmer/lib/renderer';
import type { RendererState } from '@ember/-internals/glimmer/lib/base-renderer';
import { renderers } from '@ember/-internals/glimmer/lib/renderers';
import { unwrapTemplate } from '@ember/-internals/glimmer/lib/component-managers/unwrap-template';
import { getViewElement, setViewElement } from '@ember/-internals/views/lib/system/utils';
import { guidFor } from '@ember/-internals/utils/lib/guid';
import { tagForObject } from '@ember/-internals/metal/lib/tags';
import { associateDestroyableChild, destroy } from '@glimmer/destroyable';
// The @glimmer/reference and @glimmer/validator BARREL specifiers are
// load-bearing: the GXT alias map (scripts/gxt-alias-map.mjs) redirects the
// exact barrel key to the gxt-backend shim, while a deep lib/* path would
// resolve to the real vendored VM source and fork the reactive runtime.
import { valueForRef } from '@glimmer/reference';
import { valueForTag } from '@glimmer/validator';
import {
  requiresSanitization,
  sanitizeAttributeValue,
} from '@glimmer/runtime/lib/dom/sanitized-values';
import {
  getGxtRenderer,
  installCompilePipelinePart,
  installRootComponentPart,
  installViewUtilsPart,
  setAmbientOwner,
  GXT_ARGS_SYMBOL,
  GXT_VIEW_SKIP_KEYS,
} from './gxt-bridge';
import { _gxtLib, destroyElementSync, ensureGxtContext, gxtRenderPass } from './render-component';
import { isGxtTemplate } from './template-adapter';

// Re-entrancy guard for `_gxtForceEmberRerender`.
let _gxtForceRerenderInProgress = false;

// Dirty roots recorded by `_gxtUpdateRootTagValues` during a GXT DOM sync,
// consumed (and cleared) by `_gxtForceEmberRerender` in the same sync.
let _gxtDirtyRootsAtSync: any[] | undefined;

// The GXT render state of a classic root (a `ClassicRootState` of
// glimmer/lib/renderer.ts), which `renderClassicRoot` writes and the force
// re-render reads. A root that has no entry has not started a GXT render; it
// reads as one whose fields have their initial values.
interface GxtClassicRootFields {
  // Whether the root renders a GXT template.
  isGxt: boolean;
  // Whether the root is an OutletView.
  isOutletView: boolean;
  // True while the most recent render() attempt threw before completing.
  // Such a root never wired its reactivity (gxtComponentTag stays unset), so
  // the tag-based dirty selection in _gxtForceEmberRerender cannot see it;
  // the flag makes the next force pass retry the full root render. Classic
  // production recovers after an initial-render error this way ("it
  // rerenders after error in production"); in DEBUG errorLoopTransaction has
  // already nooped the render fn, so the retry is a warn-noop and dev keeps
  // its "does not rerender after error" behavior.
  gxtRenderIncomplete: boolean;
  // The root component's dirty tag, for GXT reactivity.
  gxtComponentTag: Tag | null;
  // The last known value of `gxtComponentTag`, for comparison.
  gxtLastTagValue: number;
}

const GXT_CLASSIC_ROOT_FIELDS = new WeakMap<object, GxtClassicRootFields>();

// The fields of a root, created with their initial values.
function classicRootFields(root: object): GxtClassicRootFields {
  let fields = GXT_CLASSIC_ROOT_FIELDS.get(root);
  if (fields === undefined) {
    fields = {
      isGxt: false,
      isOutletView: false,
      gxtRenderIncomplete: false,
      gxtComponentTag: null,
      gxtLastTagValue: 0,
    };
    GXT_CLASSIC_ROOT_FIELDS.set(root, fields);
  }
  return fields;
}

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
    // GxtClassicRootFields.
    const incompleteRoots: any[] = [];
    for (const renderer of renderers) {
      const state = (renderer as any).state as RendererState;
      if (!state) continue;
      const debugRoots = state.debug?.roots;
      if (!debugRoots) continue;
      for (const root of debugRoots) {
        const classicRoot = root as any;
        // A root that has not started a GXT render is neither a GXT root nor
        // incomplete.
        const fields = GXT_CLASSIC_ROOT_FIELDS.get(classicRoot);
        if (fields === undefined) continue;
        if (fields.isGxt && (fields.gxtComponentTag || fields.isOutletView)) {
          allGxtRoots.push(classicRoot);
          const currentTagValue = fields.gxtComponentTag ? valueForTag(fields.gxtComponentTag) : 0;
          if (currentTagValue !== fields.gxtLastTagValue) {
            dirtyRoots.push(classicRoot);
          }
        } else if (fields.gxtRenderIncomplete === true && !classicRoot.destroyed) {
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
        if (GXT_CLASSIC_ROOT_FIELDS.get(classicRoot)?.gxtRenderIncomplete === true) {
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
      const fields = GXT_CLASSIC_ROOT_FIELDS.get(classicRoot);
      if (fields !== undefined && fields.isGxt && fields.gxtComponentTag) {
        const currentTagValue = valueForTag(fields.gxtComponentTag);
        if (currentTagValue !== fields.gxtLastTagValue) {
          dirtyRoots.push(classicRoot);
        }
        fields.gxtLastTagValue = currentTagValue;
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

// --- ArrayProxy content → component cell bridge ---
// Maps a content array to { proxy, ownerObj, ownerKey } so that when
// notifyPropertyChange(content, '[]') fires, we can dirty the component
// cell with the proxy value (not the content array).
const _proxyContentOwners = new WeakMap<object, Set<{ proxy: any; obj: object; key: string }>>();

function _registerArrayProxyOwner(proxy: any, ownerObj: object, ownerKey: string) {
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
          // The owner's cell was installed with the proxy's data property
          // (below), so finding it reads nothing that can throw.
          for (const { proxy, obj: ownerObj, key: ownerKey } of owners) {
            const c = _cellFor(ownerObj, ownerKey, /* skipDefine */ true);
            if (c) c.update(proxy); // Update with proxy, not content array
          }
        }
      }
    });
  }
}

// Render depth of `ClassicRootState` renders (e.g. engine-mounting chains);
// renders nested deeper than 20 are skipped with a warning.
let _gxtRenderDepth = 0;

// The fields of glimmer's `ClassicRootState` (renderer.ts) that its GXT render
// reads and writes. Its GXT render state is in `GXT_CLASSIC_ROOT_FIELDS`.
interface GxtClassicRootState {
  result: GlimmerRenderResult | undefined;
  render: () => void;
}

// What a `ClassicRootState` renders: its root (a classic component or an
// OutletView), owner, root template and target.
interface GxtClassicRootInput {
  root: Component;
  owner: object;
  template: Template;
  self: Reference<unknown>;
  parentElement: SimpleElement;
}

// The render of a classic root: what renderer.ts's `ClassicRootState` runs as
// its `render` in GXT builds, with the root state as `this`, inside the root's
// `errorLoopTransaction`. Once the root rendered, GXT's reactivity renders its
// updates, so it replaces the root's `render` with a no-op wrapped the same way.
export function renderClassicRoot(
  this: GxtClassicRootState,
  { root, owner, template, self, parentElement }: GxtClassicRootInput,
  errorLoopTransaction: (fn: () => void) => () => void
): void {
  // GXT: guard against infinite render depth (e.g., engine mounting loops).
  const depth = _gxtRenderDepth || 0;
  if (depth > 20) {
    // eslint-disable-next-line no-console
    console.warn('[gxt] Max render depth exceeded, skipping render');
    return;
  }
  _gxtRenderDepth = depth + 1;
  const fields = classicRootFields(this);
  try {
    fields.gxtRenderIncomplete = false;
    // Set the ambient owner for the GXT manager system to access (classic
    // Glimmer threads the owner through dynamicScope instead).
    setAmbientOwner(owner);

    if (isGxtTemplate(template)) {
      // Mark this root as using GXT templates (for forced re-render)
      fields.isGxt = true;

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
          fields.isOutletView = true;
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
              if (typeof key !== 'string' || key.startsWith('_') || skipProps.has(key)) continue;
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
                // A URL attribute is sanitized first, as Glimmer's
                // SafeDynamicAttribute does for an attribute binding.
                const value = requiresSanitization(wrapper.tagName, attrName)
                  ? sanitizeAttributeValue(
                      wrapper as unknown as SimpleElement,
                      attrName,
                      component[propName]
                    )
                  : component[propName];
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
        fields.gxtComponentTag = componentTag;
        fields.gxtLastTagValue = valueForTag(componentTag);
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
    // See the gxtRenderIncomplete doc on GxtClassicRootFields.
    fields.gxtRenderIncomplete = true;
    throw e;
  } finally {
    // Restore the pre-entry depth (not 0) so nested renders unwind
    // correctly.
    _gxtRenderDepth = depth;
  }
}

// Destroy the render result of a classic root (`ClassicRootState#destroy`).
export function destroyClassicRoot(result: object): void {
  // GXT teardown: `result` is the minimal gxt result object. Destruction
  // is owned by GXT's own destroyable system, so there is no Glimmer VM
  // transaction to open (the GXT renderer has no VM environment).
  destroyElementSync(result);
  destroy(result);
}

// The bounds of a component rendered without Glimmer's `BOUNDS`
// (`Renderer#getBounds`): its element, or a tagless component's recorded
// bounds; `null` when it has neither.
export function componentBounds(
  component: View
): { parentElement: SimpleElement; firstNode: SimpleNode; lastNode: SimpleNode } | null {
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
  return null;
}
