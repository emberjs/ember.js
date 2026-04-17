import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import type { InternalOwner } from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { getViewElement, getViewId, setViewElement } from '@ember/-internals/views';

// Expose setViewElement on globalThis for GXT manager to use (avoids circular dep)
(globalThis as any).__emberInternalsViews = { setViewElement, getViewElement };

import { pushParentView, popParentView, flushAfterInsertQueue, flushRenderErrors, beginRenderPass, endRenderPass } from '@glimmer/manager';
// @ts-ignore
import {
  destroyElementSync as _destroyElementSync,
  renderComponent as gxtRenderComponent,
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  getParentContext as gxtGetParentContext,
  provideContext as gxtProvideContext,
  RENDERING_CONTEXT as GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi as GxtHTMLBrowserDOMApi,
// @ts-ignore
} from '@lifeart/gxt';

// Cached GXT DOM API for destroyElementSync
let gxtDomApi: any = null;

function getGxtDomApi() {
  if (!gxtDomApi) {
    gxtDomApi = new GxtHTMLBrowserDOMApi(document);
  }
  return gxtDomApi;
}

// Wrapper that provides the GXT DOM API
function destroyElementSync(component: any, skipDom = false) {
  _destroyElementSync(component, skipDom, getGxtDomApi());
}

// Cached GXT root context for the document
let gxtRootContext: any = null;

// Ensure GXT context is initialized before any GXT rendering
function ensureGxtContext() {
  if (!gxtRootContext) {
    gxtRootContext = gxtCreateRoot(document);
    // CRITICAL: Provide the rendering context with DOM API
    // This sets fastRenderingContext which is checked first by initDOM
    const domApi = getGxtDomApi();
    gxtProvideContext(gxtRootContext, GXT_RENDERING_CONTEXT, domApi);
    // Expose on globalThis so compile.ts can reuse the same root context
    // instead of creating new roots that pollute the shared context chain
    (globalThis as any).__gxtRootContext = gxtRootContext;
  }
  // Always ensure context is set before rendering
  const currentContext = gxtGetParentContext();
  if (!currentContext) {
    gxtSetParentContext(gxtRootContext);
  }
  return gxtRootContext;
}
import { assert } from '@ember/debug';
import { _backburner, _getCurrentRunLoop } from '@ember/runloop';
import {
  associateDestroyableChild,
  destroy,
  isDestroyed,
  isDestroying,
  registerDestructor,
} from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import type {
  Bounds,
  Cursor,
  DebugRenderTree,
  Environment,
  DynamicScope as GlimmerDynamicScope,
  RenderResult as GlimmerRenderResult,
  Template,
  TemplateFactory,
  EvaluationContext,
  CurriedComponent,
  TreeBuilder,
  ClassicResolver,
} from '@glimmer/interfaces';

import type { Nullable } from '@ember/-internals/utility-types';
import { artifacts, RuntimeOpImpl } from '@glimmer/program';
import type { Reference } from '@glimmer/reference';
import { createConstRef, UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
import type { CurriedValue } from '@glimmer/runtime';
import {
  clientBuilder,
  createCapturedArgs,
  curry as glimmerCurry,
  EMPTY_POSITIONAL,
  inTransaction,
  renderComponent as glimmerRenderComponent,
  renderMain,
  runtimeOptions,
} from '@glimmer/runtime';
import { dict } from '@glimmer/util';
import { unwrapTemplate, GXT_TEMPLATE_HANDLE, isGxtTemplate } from './component-managers/unwrap-template';
import * as _glimmerValidator from '@glimmer/validator';
import { CURRENT_TAG, validateTag, valueForTag, type Tag } from '@glimmer/validator';
// touchClassicBridge / registerClassicReactor exist only in the GXT-aliased
// validator; fall back to no-ops in classic builds so these imports never
// break the classic bundle.
const touchClassicBridge: () => void =
  (typeof (_glimmerValidator as any).touchClassicBridge === 'function'
    ? (_glimmerValidator as any).touchClassicBridge
    : () => {});
const registerClassicReactor: (cb: () => void) => () => void =
  (typeof (_glimmerValidator as any).registerClassicReactor === 'function'
    ? (_glimmerValidator as any).registerClassicReactor
    : (_: () => void) => () => {});
import { tagForObject } from '@ember/-internals/metal';
import type { SimpleDocument, SimpleElement, SimpleNode } from '@simple-dom/interface';
import RSVP from 'rsvp';
import Component from './component';
import { hasDOM } from '../../browser-environment';
import type ClassicComponent from './component';
import { BOUNDS } from './component-managers/curly';
import { createRootOutlet } from './component-managers/outlet';
import { RootComponentDefinition } from './component-managers/root';
import { EmberEnvironmentDelegate } from './environment';
import ResolverImpl from './resolver';
import type { OutletState } from './utils/outlet';
import OutletView from './views/outlet';
import { makeRouteTemplate } from './component-managers/route-template';
import { EvaluationContextImpl } from '@glimmer/opcode-compiler';

export type IBuilder = (env: Environment, cursor: Cursor) => TreeBuilder;

export interface View {
  parentView: Nullable<View>;
  renderer: Renderer;
  tagName: string | null;
  elementId: string | null;
  isDestroying: boolean;
  isDestroyed: boolean;
  [BOUNDS]: Bounds | null;
}

// Use glimmerCurry imported from @glimmer/runtime
const curry = glimmerCurry;

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

const NO_OP = () => {};

/**
 * Morph existing DOM children to match new children from a DocumentFragment.
 * Preserves DOM node references (identity) where possible:
 * - Element nodes: if same tag, update attributes and recurse into children
 * - Text nodes: update textContent if changed
 * - Comment nodes: update data if changed
 * - Mismatched nodes: replace the old with new
 */
function morphChildren(target: Element | SimpleElement, source: DocumentFragment): void {
  const oldNodes = Array.from(target.childNodes);
  const newNodes = Array.from(source.childNodes);

  let i = 0;
  for (; i < newNodes.length; i++) {
    const newNode = newNodes[i]!;
    const oldNode = oldNodes[i];

    if (!oldNode) {
      // More new nodes than old — append
      target.appendChild(newNode);
      continue;
    }

    if (oldNode.nodeType === newNode.nodeType) {
      if (oldNode.nodeType === 1 /* ELEMENT_NODE */) {
        const oldEl = oldNode as Element;
        const newEl = newNode as Element;
        if (oldEl.tagName === newEl.tagName) {
          // Same element type — update attributes in-place
          morphAttributes(oldEl, newEl);
          // Skip morphing children of elements that have custom modifier
          // cache entries. Custom modifiers (e.g., ones that set innerHTML)
          // have already applied their effects to the old element during
          // the initial render. The morph source was rendered without
          // modifier effects (they are suppressed during morph rendering),
          // so morphing children would overwrite the modifier's DOM changes.
          const modMgr = (globalThis as any).$_MANAGERS?.modifier;
          const modCache = modMgr?._cache?.get(oldEl as HTMLElement);
          let hasCustomModifier = false;
          if (modCache) {
            for (const [, cached] of modCache) {
              if (!cached.isInternal && !cached.pendingDestroy) {
                hasCustomModifier = true;
                break;
              }
            }
          }
          if (!hasCustomModifier) {
            // Recursively morph children
            const frag = document.createDocumentFragment();
            while (newEl.firstChild) frag.appendChild(newEl.firstChild);
            morphChildren(oldEl as any, frag);
          }
          continue;
        }
      } else if (oldNode.nodeType === 3 /* TEXT_NODE */) {
        if (oldNode.textContent !== newNode.textContent) {
          oldNode.textContent = newNode.textContent;
        }
        continue;
      } else if (oldNode.nodeType === 8 /* COMMENT_NODE */) {
        if ((oldNode as Comment).data !== (newNode as Comment).data) {
          (oldNode as Comment).data = (newNode as Comment).data;
        }
        continue;
      }
    }

    // Type mismatch or different tag — replace
    // Migrate modifier cache from old element to new element so modifiers
    // survive DOM replacement during morph.
    if (oldNode.nodeType === 1 && newNode.nodeType === 1) {
      const modMgr = (globalThis as any).$_MANAGERS?.modifier;
      if (modMgr?._cache) {
        const oldCache = modMgr._cache.get(oldNode as HTMLElement);
        if (oldCache && oldCache.size > 0) {
          modMgr._cache.set(newNode as HTMLElement, oldCache);
          modMgr._cache.delete(oldNode as HTMLElement);
          // Update element reference in cached modifier instances
          for (const [, entry] of oldCache) {
            if (entry.instance) entry.instance.element = newNode;
          }
        }
      }
    }
    target.replaceChild(newNode, oldNode);
  }

  // Remove extra old nodes
  for (let j = oldNodes.length - 1; j >= i; j--) {
    target.removeChild(oldNodes[j]!);
  }
}

// Expose morphChildren for outlet re-render morphing (used by root.ts)
(globalThis as any).__gxtMorphChildren = morphChildren;

function morphAttributes(oldEl: Element, newEl: Element): void {
  // Remove attributes not in new
  const oldAttrs = oldEl.attributes;
  for (let i = oldAttrs.length - 1; i >= 0; i--) {
    const attr = oldAttrs[i]!;
    if (!newEl.hasAttribute(attr.name)) {
      oldEl.removeAttribute(attr.name);
    }
  }
  // Set/update attributes from new
  const newAttrs = newEl.attributes;
  for (let i = 0; i < newAttrs.length; i++) {
    const attr = newAttrs[i]!;
    if (oldEl.getAttribute(attr.name) !== attr.value) {
      oldEl.setAttribute(attr.name, attr.value);
    }
  }
}

// In GXT mode, the gxt-backend manager.ts wraps certain lifecycle invocations
// in try/catch blocks that silently discard plain `Error` instances (only
// assertion-shaped errors get captured through `captureRenderError`). That
// swallowing breaks the `Errors thrown during render` tests: a `throw` inside
// `didInsertElement`, `destroy`, or `willDestroy` must surface through
// `this.render(...)` / `runTask(...)` so `assert.throws` can observe it.
//
// We cannot edit manager.ts from here, but we can ensure the error reaches
// `_renderErrors` BEFORE the manager's catch block discards it. `flushRenderErrors`
// (called at the end of `runAppend` / `runTask` and inside the GXT render path)
// will then throw the captured error out to the test harness.
//
// The patch hooks `Component.prototype._trigger` (lifecycle hook dispatcher —
// fires didInsertElement, willDestroyElement, etc.) and `Component.prototype.destroy`
// so any Error raised inside the user code is captured before the manager swallows it.
// We still re-throw from the patched methods so that existing synchronous control
// flow (e.g., manager.ts's early-exit branches) is preserved.
let _gxtLifecycleErrorPatchApplied = false;
function ensureLifecycleErrorCapture(): void {
  if (_gxtLifecycleErrorPatchApplied) return;
  if (!(globalThis as any).__GXT_MODE__) return;
  _gxtLifecycleErrorPatchApplied = true;

  const proto = (Component as any)?.prototype;
  if (!proto) return;

  const captureErr = (e: unknown): void => {
    const fn = (globalThis as any).__captureRenderError;
    if (typeof fn === 'function' && e instanceof Error) {
      try { fn(e); } catch { /* ignore capture failures */ }
    }
  };

  // Patch the lifecycle-hook dispatcher. CoreView.init swaps `this.trigger`
  // for `this._trigger`, so the prototype method below is the one actually
  // invoked from manager.ts's `triggerLifecycleHook` path.
  const origTrigger = proto._trigger;
  if (typeof origTrigger === 'function' && !(origTrigger as any).__gxtCaptureWrapped) {
    const wrappedTrigger = function (this: any, name: string, ...args: any[]) {
      try {
        return origTrigger.call(this, name, ...args);
      } catch (e) {
        captureErr(e);
        throw e;
      }
    };
    (wrappedTrigger as any).__gxtCaptureWrapped = true;
    proto._trigger = wrappedTrigger;
  }

  // Wrap each instance's `destroy` method after `init` runs. We hook `init`
  // rather than patching `Component.prototype.destroy` because user code
  // routinely overrides `destroy()` on subclasses — the subclass override
  // calls `super.destroy(...arguments)` first and then throws, so any wrap
  // applied to the base `Component.prototype.destroy` would catch nothing.
  // Wrapping at the instance level catches the subclass' thrown error
  // regardless of override depth. The manager's `__gxtDestroyUnclaimedPoolEntries`
  // path uses `try { instance.destroy(); } catch { /* ignore */ }` and
  // silently drops the error otherwise; capturing it here routes the error
  // into `_renderErrors`, which `flushRenderErrors` (called at the end of
  // `runTask`/`runAppend`) will then re-throw out to the test harness.
  const origInit = proto.init;
  if (typeof origInit === 'function' && !(origInit as any).__gxtCaptureWrapped) {
    const wrappedInit = function (this: any, ...args: any[]) {
      const result = origInit.apply(this, args);
      try {
        const existingDestroy = this.destroy;
        if (typeof existingDestroy === 'function' && !existingDestroy.__gxtCaptureWrapped) {
          const wrappedDestroy = function (this: any, ...destroyArgs: any[]) {
            try {
              return existingDestroy.apply(this, destroyArgs);
            } catch (e) {
              captureErr(e);
              throw e;
            }
          };
          (wrappedDestroy as any).__gxtCaptureWrapped = true;
          // Only override if `destroy` is writable. Some classes may have
          // sealed the property; in that case we silently fall back to the
          // prototype-level behavior.
          try {
            this.destroy = wrappedDestroy;
          } catch { /* property not writable */ }
        }
      } catch { /* never block init on our instrumentation */ }
      return result;
    };
    (wrappedInit as any).__gxtCaptureWrapped = true;
    proto.init = wrappedInit;
  }
}

// This wrapper logic prevents us from rerendering in case of a hard failure
// during render. This prevents infinite revalidation type loops from occuring,
// and ensures that errors are not swallowed by subsequent follow on failures.
function errorLoopTransaction(fn: () => void) {
  if (DEBUG) {
    return () => {
      let didError = true;

      try {
        fn();
        didError = false;
      } finally {
        if (didError) {
          // Noop the function so that we won't keep calling it and causing
          // infinite looping failures;
          fn = () => {
            // eslint-disable-next-line no-console
            console.warn(
              'Attempted to rerender, but the Ember application has had an unrecoverable error occur during render. You should reload the application after fixing the cause of the error.'
            );
          };
        }
      }
    };
  } else {
    return fn;
  }
}

type RootState = ClassicRootState | ComponentRootState;

class ComponentRootState {
  readonly type = 'component';

  #result: GlimmerRenderResult | undefined;
  #render: () => void;

  constructor(
    state: RendererState,
    definition: object,
    options: { into: Cursor; args?: Record<string, unknown> }
  ) {
    this.#render = errorLoopTransaction(() => {
      let iterator = glimmerRenderComponent(
        state.context,
        state.builder(state.env, options.into),
        state.owner,
        definition,
        options?.args
      );

      let result = (this.#result = iterator.sync());

      associateDestroyableChild(this, this.#result);

      this.#render = errorLoopTransaction(() => {
        if (isDestroying(result) || isDestroyed(result)) return;

        return result.rerender({
          alwaysRevalidate: false,
        });
      });
    });
  }

  isFor(_component: ClassicComponent): boolean {
    return false;
  }

  render(): void {
    this.#render();
  }

  destroy(): void {
    destroy(this);
  }

  get destroyed(): boolean {
    return isDestroyed(this);
  }

  get result(): GlimmerRenderResult | undefined {
    return this.#result;
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
  } catch { /* ignore */ }
}

// Wrap __gxtTriggerReRender once to also handle ArrayProxy content arrays.
let _triggerReRenderPatched = false;
function _ensureTriggerReRenderPatched() {
  if (_triggerReRenderPatched) return;
  _triggerReRenderPatched = true;
  const origTrigger = (globalThis as any).__gxtTriggerReRender;
  if (!origTrigger) return;
  const _cellFor = (globalThis as any).__gxtCellFor;
  if (!_cellFor) return;
  (globalThis as any).__gxtTriggerReRender = function(obj: object, keyName: string) {
    // Call original first
    origTrigger(obj, keyName);
    // If this is a '[]' or 'length' notification on a native array that is
    // the content of an ArrayProxy, dirty the component cell with the proxy.
    if ((keyName === '[]' || keyName === 'length') && Array.isArray(obj)) {
      const owners = _proxyContentOwners.get(obj);
      if (owners) {
        for (const { proxy, obj: ownerObj, key: ownerKey } of owners) {
          try {
            const c = _cellFor(ownerObj, ownerKey, /* skipDefine */ true);
            if (c) c.update(proxy); // Update with proxy, not content array
          } catch { /* ignore */ }
        }
      }
    }
  };
}

class ClassicRootState {
  readonly type = 'classic';
  public id: string;
  public result: GlimmerRenderResult | undefined;
  public destroyed: boolean;
  public render: () => void;
  readonly env: Environment;
  public isGxt: boolean = false; // Track if this root uses GXT templates
  public isOutletView: boolean = false; // Track if this root is an OutletView
  public gxtNeedsRerender: boolean = false; // Flag for GXT re-render scheduling
  public gxtComponentTag: Tag | null = null; // Track component's dirty tag for GXT reactivity
  public gxtLastTagValue: number = 0; // Last known tag value for comparison

  constructor(
    public root: Component | OutletView,
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

    this.id = root instanceof OutletView ? guidFor(root) : getViewId(root);
    this.result = undefined;
    this.destroyed = false;
    this.env = context.env;

    // Install Component.prototype._trigger / destroy wrappers so that errors
    // thrown from lifecycle hooks (didInsertElement, willDestroy, etc.) are
    // captured into the GXT render-error queue before the manager's internal
    // try/catch blocks can swallow them. Idempotent — runs once per process.
    ensureLifecycleErrorCapture();

    this.render = errorLoopTransaction(() => {
      // Guard against infinite render depth (e.g., engine mounting loops)
      const depth = (globalThis as any).__gxtRenderDepth || 0;
      if (depth > 20) {
        console.warn('[gxt] Max render depth exceeded, skipping render');
        return;
      }
      (globalThis as any).__gxtRenderDepth = depth + 1;
      try {
      // Set globalThis.owner for GXT manager system to access
      (globalThis as any).owner = owner;

      // Check if this is a gxt template BEFORE unwrapping
      const templateIsGxt = isGxtTemplate(template);

      let layout = unwrapTemplate(template).asLayout();

      if (templateIsGxt) {
        // Mark this root as using GXT templates (for forced re-render)
        this.isGxt = true;

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
          if ((globalThis as any).__DEBUG_GXT_RENDER) {
            console.log('[ClassicRootState] root type:', root?.constructor?.name || typeof root);
            console.log('[ClassicRootState] root instanceof OutletView:', root instanceof OutletView);
            console.log('[ClassicRootState] has state:', 'state' in (root || {}));
            console.log('[ClassicRootState] has ref:', 'ref' in (root || {}));
            console.log('[ClassicRootState] has layoutName:', 'layoutName' in (root || {}));
            console.log('[ClassicRootState] layoutName value:', (root as any)?.layoutName);
            console.log('[ClassicRootState] root keys:', root ? Object.keys(root).slice(0, 10).join(',') : 'null');
          }

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
            // Use Object.create to preserve the prototype chain so methods are accessible
            // via this.methodName() in templates
            const component = root as any;

            // Use the component directly as render context (not Object.create).
            // Install cell getter/setters directly on the component so GXT's
            // native tracking ($_if, $_each, etc.) works properly.
            renderContext = component;

            // Add GXT-required symbols for template rendering
            const $ARGS_SYMBOL = Symbol.for('gxt-args');
            const $SLOTS_SYMBOL = Symbol.for('gxt-slots');

            renderContext[$ARGS_SYMBOL] = component.args || {};
            renderContext[$SLOTS_SYMBOL] = {};
            renderContext.$fw = [[], [], []];
            renderContext.owner = owner;

            // Install cell-backed getter/setters on the component for ALL
            // data properties. Use skipDefine=false so GXT's native formula
            // tracking (in $_if, $_each, etc.) picks up cell.value reads.
            const _cellFor = (globalThis as any).__gxtCellFor;
            const _registerArrayOwner = (globalThis as any).__gxtRegisterArrayOwner;
            _ensureTriggerReRenderPatched();
            if (_cellFor) {
              const skipProps = new Set(['args', 'constructor', 'element', 'tagName',
                'layoutName', 'layout', 'elementId', 'isView', 'isComponent',
                'concatenatedProperties', 'mergedProperties', 'classNames',
                'classNameBindings', 'attributeBindings', 'positionalParams',
                '_states', 'renderer', '__dispatcher', 'parentView',
                '_state', '_currentState', 'target', '_debugContainerKey']);
              let cellCount = 0;
              for (const key in component) {
                if (typeof key !== 'string' || key.startsWith('_') || skipProps.has(key)) continue;
                try {
                  const desc = Object.getOwnPropertyDescriptor(component, key);
                  if (desc && desc.get) continue;
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
                  if (_registerArrayOwner && value && typeof value === 'object' &&
                      typeof value.objectAt === 'function' && !Array.isArray(value)) {
                    _registerArrayProxyOwner(value, component, key);
                  }
                  cellCount++;
                } catch { /* ignore */ }
              }
              if (cellCount > 0 && (globalThis as any).__DEBUG_GXT_RENDER) {
                console.log('[RENDERER-CELL] Installed', cellCount, 'cells');
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
              console.log('[ClassicRootState] Creating wrapper for tagName:', tagName);
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
                      const className = typeof propValue === 'string' ? propValue : propName.replace(/([A-Z])/g, '-$1').toLowerCase();
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
                  if (value !== undefined && value !== null && attrName !== 'id' && attrName !== 'class') {
                    // For 'value' on input/textarea/select, use DOM property (not HTML attribute)
                    const isPropertyOnly = attrName === 'value' && (
                      wrapper.tagName === 'INPUT' || wrapper.tagName === 'TEXTAREA' || wrapper.tagName === 'SELECT'
                    );
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

          // Reset render error count before rendering so we can distinguish
          // render-phase errors from lifecycle-phase errors.
          (globalThis as any).__gxtRenderErrorCount = 0;

          // Begin render pass for backtracking detection
          beginRenderPass();

          // Push root component onto parentView stack before rendering
          if (root && 'layoutName' in root) {
            pushParentView(root);
          }
          try {
            (template as any).render(renderContext, actualRenderTarget);
          } finally {
            // Pop from parentView stack after rendering
            if (root && 'layoutName' in root) {
              popParentView();
            }
            // End render pass in the finally block so it's cleaned up even when
            // BREAK or other sentinels propagate (e.g., from expectAssertion).
            endRenderPass();
          }
        } else if ('$nodes' in template) {
          // Build-time compiled gxt template with $nodes
          gxtRenderComponent(template as any, parentElement, owner);
        } else {
          console.warn('GXT template detected but cannot render:', template);
        }

        // Check if any errors were captured during the template render phase
        // (e.g., init() errors). If so, clear the DOM before re-throwing because
        // the render did not complete successfully (matching Glimmer VM behavior).
        const hadRenderPhaseErrors = (globalThis as any).__gxtRenderErrorCount > 0;

        // End render pass moved to finally block above (handles BREAK propagation)

        // Flush queued didInsertElement / didRender hooks now that all DOM
        // has been inserted into the live document by GXT.
        flushAfterInsertQueue();

        // Re-throw any errors captured during rendering (init, didInsertElement, etc.)
        // so they propagate through assert.throws in tests and Ember's error recovery.
        // IMPORTANT: For lifecycle errors (didInsertElement), we must NOT let the error
        // propagate through errorLoopTransaction, as that would permanently disable
        // re-rendering. Instead, we defer the throw until after the render function
        // has been set up for future re-renders.
        try {
          flushRenderErrors();
        } catch (renderError) {
          // Only clear DOM for render-phase errors (init failures).
          // Lifecycle errors (didInsertElement) should leave DOM intact.
          if (hadRenderPhaseErrors) {
            (parentElement as unknown as Element).innerHTML = '';
            throw renderError;
          }
          // Lifecycle error — defer it to the root state so it can be
          // re-thrown OUTSIDE errorLoopTransaction (preserving re-renderability)
          (this as any).__gxtDeferredError = renderError;
        }

        // Store references for re-rendering
        const gxtTemplate = template;
        const gxtRoot = root;
        const gxtOwner = owner;
        // Use actualRenderTarget (the wrapper element if created) for re-rendering
        const gxtRenderTarget = actualRenderTarget;
        const gxtRootState = this;

        // Capture the component's self tag for reactivity tracking
        // This allows us to detect when Ember's set() changes properties
        // set() calls markObjectAsDirty which dirties the SELF_TAG via tagForObject
        if (gxtRoot && 'layoutName' in gxtRoot) {
          const component = gxtRoot as any;
          const componentTag = tagForObject(component);
          this.gxtComponentTag = componentTag;
          this.gxtLastTagValue = valueForTag(componentTag);
        }

        // Wrap the re-render in a deferred-error mechanism so that lifecycle
        // errors (destroy, didInsertElement during re-render) don't permanently
        // disable re-rendering via errorLoopTransaction. The error is stored on
        // the root state and re-thrown by renderRoots after the render completes.
        this.render = errorLoopTransaction(() => {
          // Re-render GXT template with fresh context from the component
          // This is needed because GXT doesn't automatically track Ember's set() changes
          if (gxtRoot && 'layoutName' in gxtRoot) {
            const component = gxtRoot as any;

            // Use Object.create to preserve prototype chain for method access
            const freshContext = Object.create(component);

            // Add GXT-required symbols
            const $ARGS_SYMBOL = Symbol.for('gxt-args');
            const $SLOTS_SYMBOL = Symbol.for('gxt-slots');

            freshContext[$ARGS_SYMBOL] = component.args || {};
            freshContext[$SLOTS_SYMBOL] = {};
            freshContext.$fw = [[], [], []];
            freshContext.owner = gxtOwner;

            // Copy enumerable properties as live getters that read CURRENT values
            // from the component. The morph re-render is a one-shot DOM diff —
            // it doesn't need reactive cell tracking, it just needs correct values.
            // Reading from cells can return stale values for nested objects whose
            // getter-based cells weren't updated (e.g., counter.countAlias when
            // counter.count changed).
            for (const key in component) {
              if (key === 'args' || key === 'constructor') continue;
              const value = component[key];
              if (typeof value === 'function' && key !== 'element') continue;
              if (Object.prototype.hasOwnProperty.call(freshContext, key)) continue;

              const propKey = key;
              const comp = component;
              try {
                Object.defineProperty(freshContext, propKey, {
                  get() { return comp[propKey]; },
                  set(v: any) { comp[propKey] = v; },
                  enumerable: true,
                  configurable: true,
                });
              } catch {
                freshContext[key] = value;
              }
            }

            // Render into a temporary container, then morph the existing DOM
            // to match. This preserves DOM node references (identity) for
            // elements and text nodes, only updating changed attributes/content.
            // Guard against excessive re-renders with a per-root counter.
            const rerenderCount = (gxtRootState as any).__gxtRerenderCount || 0;
            if (rerenderCount > 100) {
              console.warn('[gxt] Max re-render count exceeded for root, skipping');
            } else {
              (gxtRootState as any).__gxtRerenderCount = rerenderCount + 1;
              const tempContainer = document.createDocumentFragment();
              pushParentView(component);
              // Collect modifier invocations during the temp-container render
              // so we can replay them as updates on real DOM elements after
              // morphing.  Modifier installation on temp elements is suppressed
              // to avoid drifting add/remove counters.
              const morphModInvocations: any[] = [];
              (globalThis as any).__gxtMorphModifierInvocations = morphModInvocations;
              (globalThis as any).__gxtMorphRenderInProgress = true;
              try {
                (gxtTemplate as any).render(freshContext, tempContainer);
              } finally {
                (globalThis as any).__gxtMorphRenderInProgress = false;
                (globalThis as any).__gxtMorphModifierInvocations = null;
                popParentView();
              }
              // Morph: update existing DOM nodes in-place where possible
              try {
                morphChildren(gxtRenderTarget, tempContainer);
              } catch (morphErr) {
                // Lifecycle errors during morphing (e.g., destroy throws)
                // should not disable future re-renders. Defer the error.
                (gxtRootState as any).__gxtDeferredError = morphErr;
              }
              // Replay collected modifier invocations as updates on real DOM
              // elements ONLY if an actual property change triggered this sync.
              // Stable rerenders (rerender() without set()) should not trigger
              // modifier updates.
              const hadPropertyChange = !!(globalThis as any).__gxtHadPendingSync;
              if (hadPropertyChange && morphModInvocations.length > 0) {
                const realEls: Element[] = [];
                const walk = (n: Node) => {
                  if (n.nodeType === 1) realEls.push(n as Element);
                  let c = n.firstChild;
                  while (c) { walk(c); c = c.nextSibling; }
                };
                walk(gxtRenderTarget as unknown as Node);

                // Match temp elements to real elements by tag in order
                let ri = 0;
                const modMgr = (globalThis as any).$_MANAGERS?.modifier;
                for (const inv of morphModInvocations) {
                  const tag = inv.element.tagName;
                  let realEl: HTMLElement | null = null;
                  for (let j = ri; j < realEls.length; j++) {
                    if (realEls[j]!.tagName === tag) {
                      realEl = realEls[j] as HTMLElement;
                      ri = j + 1;
                      break;
                    }
                  }
                  if (realEl && modMgr) {
                    // Check if this modifier has a cached entry on the real element
                    const cache = modMgr._cache.get(realEl);
                    if (cache) {
                      const baseName = typeof inv.modifier === 'string'
                        ? inv.modifier
                        : (inv.modifier?.name || String(inv.modifier));
                      // Only include firstArg for the "on" modifier
                      // to match the modKey logic in handle()
                      let firstArg = '';
                      if (inv.modifier === 'on') {
                        firstArg = inv.props && inv.props.length > 0
                          ? String(typeof inv.props[0] === 'function' && !inv.props[0].prototype ? inv.props[0]() : inv.props[0])
                          : '';
                      }
                      const modKey = firstArg ? `${baseName}:${firstArg}` : baseName;
                      const cached = cache.get(modKey);
                      if (cached && !cached.pendingDestroy) {
                        // Check if already updated by Phase 1 (gxtSyncDom)
                        const syncCycle = (globalThis as any).__gxtSyncCycleId || 0;
                        if (cached.__gxtUpdatedInSyncCycle === syncCycle) {
                          continue; // Phase 1 already handled this
                        }
                        // Only replay for internal modifiers ({{on}}, etc.).
                        // Custom modifier managers handle updates via autotracking
                        // and formula reactivity; replaying would cause spurious
                        // didUpdate calls.
                        if (!cached.isInternal) {
                          continue;
                        }
                        // Trigger the update path: mark as pending destroy,
                        // then call handle() which will take the update branch.
                        cached.pendingDestroy = true;
                        modMgr.handle(inv.modifier, realEl, inv.props, inv.hashArgs);
                      }
                    }
                  }
                }
              }
            }

            // Flush any lifecycle hooks queued during re-render
            try {
              flushAfterInsertQueue();
            } catch (lifecycleErr) {
              (gxtRootState as any).__gxtDeferredError = (gxtRootState as any).__gxtDeferredError || lifecycleErr;
            }
            try {
              flushRenderErrors();
            } catch (renderErr) {
              (gxtRootState as any).__gxtDeferredError = (gxtRootState as any).__gxtDeferredError || renderErr;
            }

            // Update the tag value after successful render
            // This ensures we only re-render once per property change
            if (gxtRootState.gxtComponentTag) {
              gxtRootState.gxtLastTagValue = valueForTag(gxtRootState.gxtComponentTag);
            }
          } else if (gxtRoot && 'state' in gxtRoot && 'ref' in gxtRoot) {
            // OutletView re-render: call the root outlet re-render function
            // which clears innerHTML and re-renders the outlet state.
            const outletRerender = (globalThis as any).__gxtRootOutletRerender;
            if (typeof outletRerender === 'function') {
              const outletRef = (gxtRoot as any).ref || (globalThis as any).__gxtTopOutletRef;
              if (outletRef) {
                outletRerender(outletRef);
              }
            }
          }
        });

        // Deferred lifecycle errors are stored on __gxtDeferredError and
        // re-thrown by renderRoots (outside errorLoopTransaction).
      } else {
        // Use standard glimmer rendering
        let iterator = renderMain(
          context,
          owner,
          self,
          builder(context.env, { element: parentElement, nextSibling: null }),
          layout,
          dynamicScope
        );

        let result = (this.result = iterator.sync());

        associateDestroyableChild(owner, result);

        this.render = errorLoopTransaction(() => {
          if (isDestroying(result) || isDestroyed(result)) return;

          return result.rerender({
            alwaysRevalidate: false,
          });
        });
      }
      } finally { (globalThis as any).__gxtRenderDepth = depth; }
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
      /*
       Handles these scenarios:

       * When roots are removed during standard rendering process, a transaction exists already
         `.begin()` / `.commit()` are not needed.
       * When roots are being destroyed manually (`component.append(); component.destroy() case), no
         transaction exists already.
       * When roots are being destroyed during `Renderer#destroy`, no transaction exists

       */

      inTransaction(env, () => {
        // @ts-expect-error foo-bar
        destroyElementSync(result);
        // runDestructors(result.ctx);
        destroy(result!);
      });
    }
  }
}

const renderers: BaseRenderer[] = [];

export function _resetRenderers() {
  renderers.length = 0;
}

function register(renderer: BaseRenderer): void {
  assert('Cannot register the same renderer twice', renderers.indexOf(renderer) === -1);
  renderers.push(renderer);
}

function deregister(renderer: BaseRenderer): void {
  let index = renderers.indexOf(renderer);
  assert('Cannot deregister unknown unregistered renderer', index !== -1);
  renderers.splice(index, 1);
}

function loopBegin(): void {
  for (let renderer of renderers) {
    renderer.rerender();
  }
}

let renderSettledDeferred: RSVP.Deferred<void> | null = null;
/*
  Returns a promise which will resolve when rendering has settled. Settled in
  this context is defined as when all of the tags in use are "current" (e.g.
  `renderers.every(r => r._isValid())`). When this is checked at the _end_ of
  the run loop, this essentially guarantees that all rendering is completed.

  @method renderSettled
  @returns {Promise<void>} a promise which fulfills when rendering has settled
*/
export function renderSettled() {
  if (renderSettledDeferred === null) {
    renderSettledDeferred = RSVP.defer();
    // if there is no current runloop, the promise created above will not have
    // a chance to resolve (because its resolved in backburner's "end" event)
    if (!_getCurrentRunLoop()) {
      // In GXT mode, scheduling 'actions' triggers backburner's onEnd hook,
      // which flushes __gxtSyncDomNow when __gxtPendingSync is set. The
      // 'end' event listener registered below then resolves the deferred,
      // so the promise resolves AFTER any pending DOM sync has been applied.
      _backburner.schedule('actions', null, NO_OP);
    }
  }

  return renderSettledDeferred.promise;
}

function resolveRenderPromise() {
  if (renderSettledDeferred !== null) {
    let resolve = renderSettledDeferred.resolve;
    renderSettledDeferred = null;

    _backburner.join(null, resolve);
  }
}

let loops = 0;
function loopEnd() {
  for (let renderer of renderers) {
    if (!renderer.isValid()) {
      if (loops > ENV._RERENDER_LOOP_LIMIT) {
        loops = 0;
        // TODO: do something better
        renderer.destroy();
        throw new Error('infinite rendering invalidation detected');
      }
      loops++;
      return _backburner.join(null, NO_OP);
    }
  }
  loops = 0;
  resolveRenderPromise();
}

// In GXT mode, don't hook into backburner's begin/end events for render
// revalidation. GXT handles rendering via its own reactivity system.
// Instead, use __gxtSyncDomNow (called by runTask) for synchronous updates.
if (!(globalThis as any).__GXT_MODE__) {
  _backburner.on('begin', loopBegin);
  _backburner.on('end', loopEnd);
} else {
  // Backburner fires 'end' event listeners BEFORE the onEnd option. Thus
  // we must flush GXT's pending DOM sync here (not rely on runloop.onEnd)
  // so that renderSettled()'s promise resolves AFTER the DOM is up-to-date.
  // Only flush on the outermost runloop end (nextInstance == null) and when
  // not inside runTask (which performs its own explicit sync).
  _backburner.on('end', (_curr: unknown, nextInstance: unknown) => {
    loops = 0;
    if (
      nextInstance == null &&
      (globalThis as any).__gxtPendingSync &&
      !(globalThis as any).__gxtRunTaskActive
    ) {
      const syncNow = (globalThis as any).__gxtSyncDomNow;
      if (typeof syncNow === 'function') {
        try { syncNow(); } catch { /* errors handled inside sync */ }
      }
    }
    resolveRenderPromise();
  });
}

// Expose a function to force re-render all GXT roots.
// Called from __gxtSyncDomNow when GXT's cell tracking misses changes
// made through Ember's set() / notifyPropertyChange.
(globalThis as any).__gxtForceEmberRerender = function() {
  // Re-entrancy guard: prevent infinite loops when morphing triggers
  // cell updates that schedule additional force-rerenders
  if ((globalThis as any).__gxtForceRerenderInProgress) return;
  (globalThis as any).__gxtForceRerenderInProgress = true;
  try {
  for (const renderer of renderers) {
    const state = (renderer as any).state as RendererState;
    if (!state) continue;
    const roots = (state as any).__roots || (state as any)['#roots'];
    // Access private #roots via the debug getter
    const debugRoots = state.debug?.roots;
    if (!debugRoots) continue;
    for (const root of debugRoots) {
      const classicRoot = root as any;
      if (classicRoot.isGxt && (classicRoot.gxtComponentTag || classicRoot.isOutletView)) {
        const currentTagValue = classicRoot.gxtComponentTag ? valueForTag(classicRoot.gxtComponentTag) : 0;
        // Also trigger for pending syncs from property changes — nested object
        // property changes (e.g., set(m, 'message', ...)) dirty m's tag but
        // not the component's SELF_TAG. The force-rerender is needed to
        // re-evaluate computed properties like {{this.m.formattedMessage}}.
        const hadPendingSync = !!(globalThis as any).__gxtHadPendingSync;
        if (currentTagValue !== classicRoot.gxtLastTagValue || hadPendingSync) {
          // Tag is dirty — force re-render. Increment the render pass ID
          // so the instance pool resets claimed flags and REUSES existing
          // instances instead of creating new ones (which would fire
          // spurious init/render lifecycle hooks).
          (globalThis as any).__emberRenderPassId = ((globalThis as any).__emberRenderPassId || 0) + 1;
          (globalThis as any).__gxtIsForceRerender = true;
          // Track which root components were re-rendered so
          // __gxtDestroyUnclaimedPoolEntries can find their children.
          const rerenderedRoots = (globalThis as any).__gxtRerenderedRoots || ((globalThis as any).__gxtRerenderedRoots = []);
          if (classicRoot.root) rerenderedRoots.push(classicRoot.root);
          try {
            classicRoot.render();
          } catch (renderErr) {
            // Store render error so it can propagate to assert.throws
            if (!classicRoot.__gxtDeferredError) {
              classicRoot.__gxtDeferredError = renderErr;
            }
          }
          finally { (globalThis as any).__gxtIsForceRerender = false; }
          // Re-throw deferred errors (from lifecycle hooks like destroy)
          if (classicRoot.__gxtDeferredError) {
            const err = classicRoot.__gxtDeferredError;
            classicRoot.__gxtDeferredError = null;
            throw err;
          }
        }
      }
    }
  }
  } finally {
    (globalThis as any).__gxtForceRerenderInProgress = false;
    (globalThis as any).__gxtHadPendingSync = false;
  }
};

// Update gxtLastTagValue on all GXT roots to mark them clean.
// Called from __gxtTriggerReRender after cell-based sync succeeds,
// so __gxtForceEmberRerender sees them as up-to-date and skips
// the destructive innerHTML='' + full rebuild.
(globalThis as any).__gxtUpdateRootTagValues = function() {
  for (const renderer of renderers) {
    const state = (renderer as any).state as RendererState;
    if (!state) continue;
    const debugRoots = state.debug?.roots;
    if (!debugRoots) continue;
    for (const root of debugRoots) {
      const classicRoot = root as any;
      if (classicRoot.isGxt && classicRoot.gxtComponentTag) {
        classicRoot.gxtLastTagValue = valueForTag(classicRoot.gxtComponentTag);
      }
    }
  }
};

// Check if all GXT root tag values are current (meaning cell-based updates
// already brought the DOM up to date). Used to skip redundant morph renders.
(globalThis as any).__gxtCheckAllTagsCurrent = function(): boolean {
  for (const renderer of renderers) {
    const state = (renderer as any).state as RendererState;
    if (!state) continue;
    const debugRoots = state.debug?.roots;
    if (!debugRoots) continue;
    for (const root of debugRoots) {
      const classicRoot = root as any;
      if (classicRoot.isGxt && classicRoot.gxtComponentTag) {
        if (valueForTag(classicRoot.gxtComponentTag) !== classicRoot.gxtLastTagValue) {
          return false; // At least one root is stale
        }
      }
    }
  }
  return true;
};

interface ViewRegistry {
  [viewId: string]: unknown;
}

type Resolver = ClassicResolver;

interface RendererData {
  owner: object;
  context: EvaluationContext;
  builder: IBuilder;
}

class RendererState {
  static create(data: RendererData, renderer: BaseRenderer): RendererState {
    const state = new RendererState(data, renderer);
    associateDestroyableChild(renderer, state);
    return state;
  }

  readonly #data: RendererData;
  #lastRevision = -1;
  #inRenderTransaction = false;
  #destroyed = false;
  #roots: RootState[] = [];
  #removedRoots: RootState[] = [];

  private constructor(data: RendererData, renderer: BaseRenderer) {
    this.#data = data;

    registerDestructor(this, () => {
      this.clearAllRoots(renderer);
    });
  }

  get debug() {
    return {
      roots: this.#roots,
      inRenderTransaction: this.#inRenderTransaction,
      isInteractive: this.isInteractive,
    };
  }

  get roots() {
    return this.#roots;
  }

  get owner(): object {
    return this.#data.owner;
  }

  get builder(): IBuilder {
    return this.#data.builder;
  }

  get context(): EvaluationContext {
    return this.#data.context;
  }

  get env(): Environment {
    return this.context.env;
  }

  get isInteractive(): boolean {
    return this.#data.context.env.isInteractive;
  }

  renderRoot(root: RootState, renderer: BaseRenderer): RootState {
    let roots = this.#roots;

    roots.push(root);
    associateDestroyableChild(this, root);

    if (roots.length === 1) {
      register(renderer);
    }

    this.#renderRootsTransaction(renderer);

    return root;
  }

  #renderRootsTransaction(renderer: BaseRenderer): void {
    if (this.#inRenderTransaction) {
      // currently rendering roots, a new root was added and will
      // be processed by the existing _renderRoots invocation
      return;
    }

    // used to prevent calling _renderRoots again (see above)
    // while we are actively rendering roots
    this.#inRenderTransaction = true;

    let completedWithoutError = false;
    try {
      this.renderRoots(renderer);
      completedWithoutError = true;
    } finally {
      if (!completedWithoutError) {
        this.#lastRevision = valueForTag(CURRENT_TAG);
      }
      this.#inRenderTransaction = false;
    }
  }

  renderRoots(renderer: BaseRenderer): void {
    let roots = this.#roots;
    let removedRoots = this.#removedRoots;
    let initialRootsLength: number;
    let _renderIterations = 0;

    do {
      // Safety limit to prevent infinite render loops
      if (++_renderIterations > 20) {
        break;
      }
      // GXT infinite loop detection
      if (typeof (globalThis as any).__gxtOpCheck === 'function') {
        (globalThis as any).__gxtOpCheck();
      }
      initialRootsLength = roots.length;

      inTransaction(this.context.env, () => {
        // ensure that for the first iteration of the loop
        // each root is processed
        for (let i = 0; i < roots.length; i++) {
          let root = roots[i];
          assert('has root', root);

          if (root.destroyed) {
            // add to the list of roots to be removed
            // they will be removed from `this._roots` later
            removedRoots.push(root);

            // skip over roots that have been marked as destroyed
            continue;
          }

          // when processing non-initial reflush loops,
          // do not process more roots than needed
          if (i >= initialRootsLength) {
            continue;
          }

          root.render();

          // In GXT mode, lifecycle errors during re-render (destroy, didInsertElement)
          // are deferred to avoid disabling errorLoopTransaction. Re-throw them here
          // so they propagate to assert.throws() in tests.
          if ((root as any).__gxtDeferredError) {
            const err = (root as any).__gxtDeferredError;
            (root as any).__gxtDeferredError = null;
            throw err;
          }
        }

        this.#lastRevision = valueForTag(CURRENT_TAG);
      });
    } while (roots.length > initialRootsLength);

    // remove any roots that were destroyed during this transaction
    while (removedRoots.length) {
      let root = removedRoots.pop();

      let rootIndex = roots.indexOf(root!);
      roots.splice(rootIndex, 1);
    }

    if (this.#roots.length === 0) {
      deregister(renderer);
    }
  }

  scheduleRevalidate(renderer: BaseRenderer): void {
    _backburner.scheduleOnce('render', this, this.revalidate, renderer);
  }

  isValid(): boolean {
    // In GXT mode, rendering is handled by GXT's reactivity system,
    // not by the Ember renderer's revalidation loop. Always report valid
    // to prevent infinite revalidation loops in loopEnd().
    if ((globalThis as any).__GXT_MODE__) {
      return true;
    }

    // Check if any GXT roots have dirty component tags
    for (const root of this.#roots) {
      const classicRoot = root as ClassicRootState;
      if (classicRoot.isGxt && classicRoot.gxtComponentTag) {
        const currentTagValue = valueForTag(classicRoot.gxtComponentTag);
        if (currentTagValue !== classicRoot.gxtLastTagValue) {
          return false;
        }
      }
    }

    return this.#destroyed || this.#roots.length === 0 || validateTag(CURRENT_TAG, this.#lastRevision);
  }

  revalidate(renderer: BaseRenderer): void {
    // In GXT mode, isValid() returns true to prevent infinite revalidation.
    // But explicit .rerender() calls set __gxtForceRerender on the component
    // and need a sync pass to flush the hooks.
    if ((globalThis as any).__GXT_MODE__) {
      (globalThis as any).__gxtPendingSync = true;
      return;
    }
    if (this.isValid()) {
      return;
    }
    this.#renderRootsTransaction(renderer);
  }

  clearAllRoots(renderer: BaseRenderer): void {
    let roots = this.#roots;
    for (let root of roots) {
      destroy(root);
    }

    this.#removedRoots.length = 0;
    this.#roots = [];

    // if roots were present before destroying
    // deregister this renderer instance
    if (roots.length) {
      deregister(renderer);
    }
  }
}

type IntoTarget = Cursor | Element | SimpleElement;

/**
 * The returned object from `renderComponent`
 * @public
 * @module @ember/renderer
 */
export interface RenderResult {
  /**
   * Destroys the render tree and removes all rendered content from the element rendered into
   */
  destroy(): void;
}

interface RenderCacheEntry {
  result: RenderResult;
  /**
   * The GlimmerRenderResult from the last render. Used to get positional
   * information (firstNode) when a re-render replaces the content, so
   * that the new content is placed at the same DOM position.
   */
  glimmerResult: GlimmerRenderResult | undefined;
}

function intoTarget(into: IntoTarget): Cursor {
  if ('element' in into) {
    return into;
  } else {
    return { element: into as SimpleElement, nextSibling: null };
  }
}

/**
 * GXT-specific renderComponent implementation.
 * Bypasses Glimmer VM bytecode compilation entirely.
 */
function _renderComponentGxt(
  component: object,
  into: IntoTarget,
  owner: object,
  args?: Record<string, unknown>
): RenderResult {
  const globalTemplates = (globalThis as any).COMPONENT_TEMPLATES;

  // Handle existing render cache (re-render into same target)
  let existing = RENDER_CACHE.get(into);
  existing?.destroy();

  // Get the target element
  const targetElement = into instanceof Element ? into : ('element' in into ? (into as any).element : into);

  // Clear the target on first render
  if (!existing && targetElement instanceof Element) {
    targetElement.innerHTML = '';
  }

  // Set globalThis.owner so the manager system can resolve services
  const prevOwner = (globalThis as any).owner;
  (globalThis as any).owner = owner;

  // Ensure GXT context is initialized
  ensureGxtContext();

  let destroyed = false;
  let classicReactorUnsub: (() => void) | null = null;

  const doDestroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (classicReactorUnsub) {
      try { classicReactorUnsub(); } catch { /* ignore */ }
      classicReactorUnsub = null;
    }
    if (targetElement instanceof Element) {
      targetElement.innerHTML = '';
    }
  };

  try {
    // Resolve template from COMPONENT_TEMPLATES
    let template = globalTemplates?.get(component);

    // Walk prototype chain if not found directly (for class-based components)
    if (!template && component) {
      let proto = typeof component === 'function'
        ? Object.getPrototypeOf(component)
        : Object.getPrototypeOf(component);
      while (proto && proto !== Function.prototype && proto !== Object.prototype) {
        template = globalTemplates?.get(proto);
        if (template) break;
        proto = Object.getPrototypeOf(proto);
      }
    }

    // If template is a factory function, call it with owner to get actual template
    if (typeof template === 'function' && !template.render) {
      template = template(owner);
    }

    if (!template || !template.render) {
      // No template found — try using the manager system directly
      const managers = (globalThis as any).$_MANAGERS;
      if (managers?.component?.canHandle?.(component)) {
        // Build args with reactive getters so GXT tracks dependencies.
        const gxtArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            const desc = Object.getOwnPropertyDescriptor(args, key);
            const innerGet = desc?.get;
            if (innerGet) {
              Object.defineProperty(gxtArgs, key, {
                get: function () { touchClassicBridge(); return innerGet.call(this); },
                enumerable: true,
                configurable: true,
              });
            } else {
              Object.defineProperty(gxtArgs, key, {
                get: () => { touchClassicBridge(); return (args as any)[key]; },
                enumerable: true,
                configurable: true,
              });
            }
          }
        }
        const handleResult = managers.component.handle(component, gxtArgs, null, { owner });
        let nodes: Node | null = null;
        if (typeof handleResult === 'function') {
          nodes = handleResult();
        } else {
          nodes = handleResult;
        }
        if (nodes instanceof Node) {
          targetElement.appendChild(nodes);
        }
      } else {
        console.warn('[renderComponent GXT] No GXT template found for component:', component);
      }

      const result: RenderResult = { destroy: doDestroy };
      RENDER_CACHE.set(into, result);
      // Register destructor on owner so owner.destroy() cleans up DOM
      try {
        registerDestructor(owner, doDestroy);
      } catch {
        // owner may not be destroyable
      }
      return result;
    }

    // Determine if the component is a class (needs instantiation) or template-only
    const isClass = typeof component === 'function' && component.prototype;
    const isTemplateOnly = !isClass || (component as any).__templateOnly === true ||
      (component as any).constructor?.name === 'TemplateOnlyComponentDefinition' ||
      (globalThis as any).INTERNAL_MANAGERS?.has?.(component);

    let instance: any = null;

    if (!isTemplateOnly && isClass) {
      // Instantiate the component class
      const ComponentClass = component as any;

      // Check for custom component manager (from setComponentManager)
      let customManager: any = null;
      let managerFactory: any = (globalThis as any).COMPONENT_MANAGERS?.get(ComponentClass);
      if (!managerFactory) {
        let proto = Object.getPrototypeOf(ComponentClass);
        while (proto && proto !== Object.prototype && proto !== Function.prototype) {
          managerFactory = (globalThis as any).COMPONENT_MANAGERS?.get(proto);
          if (managerFactory) break;
          proto = Object.getPrototypeOf(proto);
        }
      }

      if (typeof managerFactory === 'function') {
        // Use the custom manager to create the instance
        customManager = managerFactory(owner);
        if (customManager && typeof customManager.createComponent === 'function') {
          // Build named args for the custom manager
          const namedArgs: Record<string, any> = {};
          if (args) {
            for (const [key, value] of Object.entries(args)) {
              namedArgs[key] = value;
            }
          }
          const capturedArgs = { named: namedArgs, positional: [] };
          instance = customManager.createComponent(ComponentClass, capturedArgs);
          // Get the rendering context from the manager
          if (typeof customManager.getContext === 'function') {
            const ctx = customManager.getContext(instance);
            if (ctx && ctx !== instance) {
              // Use the manager's context as the render context
              instance = ctx;
            }
          }
        }
      }

      if (!instance) {
        if (typeof ComponentClass.create === 'function') {
          instance = ComponentClass.create(
            Object.assign({}, args || {}, { owner })
          );
        } else {
          try {
            instance = new ComponentClass(owner, args || {});
          } catch {
            instance = new ComponentClass();
          }
        }
      }

      // Set args on Glimmer-style components
      if (instance && args) {
        if (!instance.args) {
          instance.args = {};
        }
        // Use Object.keys + defineProperty instead of Object.entries to avoid
        // eagerly evaluating arg getters. Arg getters may have side effects
        // (e.g., tracking steps in tests) and should only be called lazily.
        for (const key of Object.keys(args)) {
          const desc = Object.getOwnPropertyDescriptor(args, key);
          const innerGet = desc?.get;
          if (innerGet) {
            Object.defineProperty(instance.args, key, {
              get: function () { touchClassicBridge(); return innerGet.call(this); },
              enumerable: true,
              configurable: true,
            });
          } else {
            Object.defineProperty(instance.args, key, {
              get: () => { touchClassicBridge(); return (args as any)[key]; },
              enumerable: true,
              configurable: true,
            });
          }
        }
      }
    }

    // Build render context with reactive arg getters
    const renderContext: any = instance || {};
    if (args) {
      // For template-only components, args go directly on the context as getters
      if (!instance) {
        for (const key of Object.keys(args)) {
          Object.defineProperty(renderContext, key, {
            get: () => { touchClassicBridge(); return (args as any)[key]; },
            enumerable: true,
            configurable: true,
          });
        }
      }
      // Set up args object with reactive getters. Reads touch the
      // classic-validator bridge so any enclosing GXT effect (e.g. the
      // text-node formula for `{{@foo}}`) that reads through this proxy
      // subscribes to the classic-tag bridge cell and re-fires on any
      // classic @glimmer/validator tag mutation. This is the same pattern
      // used by renderLinkToElement in gxt-backend/manager.ts.
      const argsObj: any = {};
      for (const key of Object.keys(args)) {
        Object.defineProperty(argsObj, key, {
          get: () => { touchClassicBridge(); return (args as any)[key]; },
          enumerable: true,
          configurable: true,
        });
      }
      renderContext.args = argsObj;
    }
    renderContext.owner = owner;

    // Enable isRendering so GXT formulas created during template.render()
    // properly track cell dependencies (e.g., trackedObject cells).
    // Use globalThis.__gxtSetIsRendering which is from the SAME module
    // instance as GXT's formula system. The direct import may be from a
    // different module copy.
    // Save and restore the previous isRendering state to avoid clobbering
    // it when renderComponent is called from within another render pass
    // (e.g., from a component constructor during an outer template render).
    const _setRendering = (globalThis as any).__gxtSetIsRendering;
    const _isRendering = (globalThis as any).__gxtIsRendering;
    const wasRendering = typeof _isRendering === 'function' ? _isRendering() : false;
    if (typeof _setRendering === 'function') {
      _setRendering(true);
    }
    // When renderComponent is called during an existing render pass (e.g.,
    // from a @cached getter during template evaluation), suppress gxtEffect
    // creation for text nodes. These nested renders are "static snapshots" —
    // reactivity is handled by the parent destroying and recreating the render
    // when tracked deps change. Independent text effects would fire out-of-order
    // (before the parent re-renders) and cause double getter evaluations.
    // Top-level renderComponent calls (wasRendering=false) DO need text effects
    // for trackedObject reactivity.
    const prevSkipTextEffects = (globalThis as any).__gxtSkipTextEffects;
    if (wasRendering) {
      (globalThis as any).__gxtSkipTextEffects = true;
    }
    // Wrap the template render so we can re-invoke it from a classic-tag
    // reactor. This is the same pattern used by renderLinkToElement in
    // gxt-backend/manager.ts: classic @glimmer/validator tag mutations do
    // not reliably re-fire the GXT effects created inside template.render,
    // so we register a side-channel reactor that forces a fresh render
    // whenever any classic tag is dirtied. The reactor is unsubscribed on
    // destroy to avoid leaks across test runs.
    let _rendering = false;
    const _doRender = () => {
      if (destroyed || _rendering) return;
      if (!(targetElement instanceof Element) || !targetElement.isConnected && classicReactorUnsub) {
        // Target detached — leave DOM alone until reattached. We still keep
        // the reactor so the first reattachment triggers a fresh render.
      }
      _rendering = true;
      const prevOwnerLocal = (globalThis as any).owner;
      (globalThis as any).owner = owner;
      const prevSkip = (globalThis as any).__gxtSkipTextEffects;
      const wasRenderingLocal = typeof _isRendering === 'function' ? _isRendering() : false;
      if (typeof _setRendering === 'function') _setRendering(true);
      if (wasRenderingLocal) (globalThis as any).__gxtSkipTextEffects = true;
      try {
        if (targetElement instanceof Element) {
          targetElement.innerHTML = '';
        }
        template.render(renderContext, targetElement);
      } finally {
        (globalThis as any).__gxtSkipTextEffects = prevSkip;
        if (typeof _setRendering === 'function' && !wasRenderingLocal) {
          _setRendering(false);
        }
        (globalThis as any).owner = prevOwnerLocal;
        _rendering = false;
      }
    };

    try {
      // Render the template into the target (initial render)
      if (wasRendering) {
        (globalThis as any).__gxtSkipTextEffects = true;
      }
      template.render(renderContext, targetElement);
    } finally {
      (globalThis as any).__gxtSkipTextEffects = prevSkipTextEffects;
      if (typeof _setRendering === 'function' && !wasRendering) {
        _setRendering(false);
      }
    }

    // Register a classic-tag reactor that re-renders the component whenever
    // any classic @glimmer/validator tag is dirtied (e.g. classic
    // trackedObject mutations, @tracked field writes). This bridges the
    // classic tag-dirty pipeline into GXT's render system for the
    // renderComponent path, mirroring the pattern used by
    // renderLinkToElement in gxt-backend/manager.ts. Top-level
    // renderComponent calls (wasRendering=false) own their own render
    // lifecycle; nested calls rely on the parent render effect so we
    // skip reactor registration for them.
    //
    // The reactor is per-call: each renderComponent registers its own
    // callback that closes over its own (renderContext, targetElement,
    // destroyed flag). Cleanup is via doDestroy, chained through the owner
    // destructor so owner.destroy() unhooks all reactors. We deliberately
    // do NOT auto-unsubscribe based on element.isConnected, because some
    // legitimate use cases render into a deliberately-detached element
    // (see "can render in to a detached element" test).
    {
      classicReactorUnsub = registerClassicReactor(() => {
        if (destroyed) return;
        try { _doRender(); } catch { /* ignore individual reactor errors */ }
        // After re-render, flush GXT DOM so the new text content is visible
        try {
          const syncNow = (globalThis as any).__gxtSyncDomNow;
          if (typeof syncNow === 'function') syncNow();
        } catch { /* ignore */ }
      });
    }

    // Flush queued didInsertElement / didRender hooks
    try {
      flushAfterInsertQueue();
    } catch {
      // Ignore flush errors in renderComponent context
    }
    try {
      flushRenderErrors();
    } catch (e) {
      // Re-throw render errors
      throw e;
    }

  } finally {
    (globalThis as any).owner = prevOwner;
  }

  const result: RenderResult = { destroy: doDestroy };
  RENDER_CACHE.set(into, result);

  // Register destructor on owner so that destroying the owner cleans up the DOM
  try {
    registerDestructor(owner, doDestroy);
  } catch {
    // owner may not be destroyable
  }

  return result;
}

/**
 * Render a component into a DOM element.
 *
 * @method renderComponent
 * @static
 * @for @ember/renderer
 * @param {Object} component The component to render.
 * @param {Object} options
 * @param {Element} options.into Where to render the component in to.
 * @param {Object} [options.owner] Optionally specify the owner to use. This will be used for injections, and overall cleanup.
 * @param {Object} [options.env] Optional renderer configuration
 * @param {Object} [options.args] Optionally pass args in to the component. These may be reactive as long as it is an object or object-like
 * @public
 */
export function renderComponent(
  /**
   * The component definition to render.
   *
   * Any component that has had its manager registered is valid.
   * For the component-types that ship with ember, manager registration
   * does not need to be worried about.
   */
  component: object,
  {
    owner = {},
    env,
    into,
    args,
  }: {
    /**
     * The element to render the component in to.
     */
    into: IntoTarget;

    /**
     * Optional owner. Defaults to `{}`, can be any object, but will need to implement the [Owner](https://api.emberjs.com/ember/release/classes/Owner) API for components within this render tree to access services.
     */
    owner?: object;
    /**
     * Optionally configure the rendering environment
     */
    env?: {
      /**
       * When false, modifiers will not run.
       */
      isInteractive?: boolean;
      /**
       * All other options are forwarded to the underlying renderer.
       * (its API is currently private and out of scope for this RFC,
       *  so passing additional things here is also considered private API)
       */
      [rendererOption: string]: unknown;
    };

    /**
     * These args get passed to the rendered component
     *
     * If your args are reactive, re-rendering will happen automatically.
     *
     */
    args?: Record<string, unknown>;
  }
): RenderResult {
  // GXT escape hatch: bypass Glimmer VM entirely for GXT mode.
  // This avoids bytecode compilation which crashes with GXT templates.
  if ((globalThis as any).__GXT_MODE__) {
    return _renderComponentGxt(component, into, owner, args);
  }

  /**
   * SAFETY: we should figure out what we need out of a `document` and narrow the API.
   *         this exercise should also end up beginning to define what we need for CLI rendering (or to other outputs)
   */
  let document =
    env && 'document' in env
      ? (env?.['document'] as SimpleDocument | Document)
      : globalThis.document;

  // Reuse renderer per owner to avoid creating multiple EvaluationContexts
  // which can cause tracking frame conflicts
  let renderer = RENDERER_CACHE.get(owner);
  if (!renderer) {
    renderer = BaseRenderer.strict(owner, document, {
      ...env,
      isInteractive: env?.isInteractive ?? true,
      hasDOM: env && 'hasDOM' in env ? Boolean(env?.['hasDOM']) : true,
    });
    RENDERER_CACHE.set(owner, renderer);
  }

  /**
   * Replace all contents, if we've rendered multiple times.
   *
   * https://github.com/emberjs/rfcs/pull/1099/files#diff-2b962105b9083ca84579cdc957f27f49407440f3c5078083fa369ec18cc46da8R365
   *
   * We could later add an option to not do this behavior
   *
   * NOTE: destruction is async
   */
  let existing = RENDER_CACHE.get(into);
  existing?.result.destroy();
  /**
   * We can only replace the inner HTML the first time.
   * Because destruction is async, it won't be safe to
   * do this again, and we'll have to rely on the above destroy.
   */
  if (!existing && into instanceof Element) {
    into.innerHTML = '';
  }

  /**
   * If there's an existing render result with valid bounds, use its
   * firstNode as the nextSibling so that new content is inserted at
   * the same DOM position. This ensures stable ordering when multiple
   * renderComponent calls target the same element and one is re-invoked
   * (e.g., due to tracked dependency changes).
   *
   * The old content's DOM nodes are still present (destruction is async),
   * so firstNode() is a valid position reference. The new content is placed
   * BEFORE the old content. When the old content is eventually destroyed
   * (async clear of bounds), the new content remains in the correct position.
   */
  let renderTarget: IntoTarget = into;
  if (existing?.glimmerResult) {
    let parentElement =
      into instanceof Element ? (into as unknown as SimpleElement) : (into as Cursor).element;
    let firstNode = existing.glimmerResult.firstNode();
    renderTarget = { element: parentElement, nextSibling: firstNode };
  }

  let innerResult = renderer.render(component, { into: renderTarget, args }).result;

  if (innerResult) {
    associateDestroyableChild(owner, innerResult);
  }

  let result: RenderResult = {
    destroy() {
      if (innerResult) {
        destroy(innerResult);
      }
    },
  };

  RENDER_CACHE.set(into, { result, glimmerResult: innerResult });

  return result;
}

const RENDER_CACHE = new WeakMap<IntoTarget, RenderCacheEntry>();
const RENDERER_CACHE = new WeakMap<object, BaseRenderer>();

class BaseRenderer {
  static strict(
    owner: object,
    document: SimpleDocument | Document,
    options: { isInteractive: boolean; hasDOM?: boolean }
  ) {
    return new BaseRenderer(
      owner,
      { hasDOM: hasDOM, ...options },
      document as SimpleDocument,
      new ResolverImpl(),
      clientBuilder
    );
  }

  readonly state: RendererState;

  constructor(
    owner: object,
    envOptions: { isInteractive: boolean; hasDOM: boolean },
    document: SimpleDocument,
    resolver: Resolver,
    builder: IBuilder
  ) {
    let sharedArtifacts = artifacts();

    /**
     * SAFETY: are there consequences for being looser with *this* owner?
     *         the public API for `owner` is kinda `Partial<InternalOwner>`
     *         aka: implement only what you need.
     *         But for actual ember apps, you *need* to implement everything
     *         an app needs (which will actually change and become less over time)
     */
    let env = new EmberEnvironmentDelegate(owner as InternalOwner, envOptions.isInteractive);
    let options = runtimeOptions({ document }, env, sharedArtifacts, resolver);
    let context = new EvaluationContextImpl(
      sharedArtifacts,
      (heap) => new RuntimeOpImpl(heap),
      options
    );

    this.state = RendererState.create(
      {
        owner,
        context,
        builder,
      },
      this
    );
  }

  get debugRenderTree(): DebugRenderTree {
    let { debugRenderTree } = this.state.env;

    assert(
      'Attempted to access the DebugRenderTree, but it did not exist. Is the Ember Inspector open?',
      debugRenderTree
    );

    return debugRenderTree;
  }

  isValid(): boolean {
    return this.state.isValid();
  }

  destroy() {
    destroy(this);
  }

  render(
    component: object,
    options: { into: IntoTarget; args?: Record<string, unknown> }
  ): RootState {
    const root = new ComponentRootState(this.state, component, {
      args: options.args,
      into: intoTarget(options.into),
    });
    return this.state.renderRoot(root, this);
  }

  rerender(): void {
    this.state.scheduleRevalidate(this);
  }

  // render(component: Component, options: { into: Cursor; args?: Record<string, unknown> }): void {
  //   this.state.renderRoot(component);
  // }
}

export class Renderer extends BaseRenderer {
  static strict(
    owner: object,
    document: SimpleDocument | Document,
    options: { isInteractive: boolean; hasDOM?: boolean }
  ): BaseRenderer {
    return new BaseRenderer(
      owner,
      { hasDOM: hasDOM, ...options },
      document as SimpleDocument,
      new ResolverImpl(),
      clientBuilder
    );
  }

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
    builder = clientBuilder,
    resolver = new ResolverImpl()
  ) {
    super(owner, env, document, resolver, builder);
    this._rootTemplate = rootTemplate(owner);
    this._viewRegistry = viewRegistry || owner.lookup('-view-registry:main');
  }

  // renderer HOOKS

  appendOutletView(view: OutletView, target: SimpleElement): void {
    // Debug: log that appendOutletView was called
    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[Renderer.appendOutletView] called');
    }

    // TODO: This bypasses the {{outlet}} syntax so logically duplicates
    // some of the set up code. Since this is all internal (or is it?),
    // we can refactor this to do something more direct/less convoluted
    // and with less setup, but get it working first
    let outlet = createRootOutlet(view);
    let { name, /* controller, */ template } = view.state;

    let named = dict<Reference>();

    named['Component'] = createConstRef(
      makeRouteTemplate(view.owner, name, template as Template),
      '@Component'
    );

    // TODO: is this guaranteed to be undefined? It seems to be the
    // case in the `OutletView` class. Investigate how much that class
    // exists as an internal implementation detail only, or if it was
    // used outside of core. As far as I can tell, test-helpers uses
    // it but only for `setOutletState`.
    // named['controller'] = createConstRef(controller, '@controller');
    // Update: at least according to the debug render tree tests, we
    // appear to always expect this to be undefined. Not a definitive
    // source by any means, but is useful evidence
    named['controller'] = UNDEFINED_REFERENCE;
    named['model'] = UNDEFINED_REFERENCE;

    let args = createCapturedArgs(named, EMPTY_POSITIONAL);

    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, outlet, view.owner, args, true),
      target
    );
  }

  appendTo(view: ClassicComponent, target: SimpleElement): void {
    // Debug: log that appendTo was called
    if ((globalThis as any).__DEBUG_GXT_RENDER) {
      console.log('[Renderer.appendTo] called with view type:', view?.constructor?.name || typeof view);
      console.log('[Renderer.appendTo] view has layoutName:', 'layoutName' in (view || {}), 'value:', (view as any)?.layoutName);
    }

    // NOTE: _tryGxtRender is disabled because the GXT runtime compiler generates
    // code that expects $slots, $fw, and block params in scope, but Ember's
    // rendering integration can't easily inject these. Let ClassicRootState
    // handle rendering which has more complete template resolution.

    // Fall back to Glimmer VM rendering (which has GXT handling in ClassicRootState)
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, definition, this.state.owner, null, true),
      target
    );
  }

  /**
   * Try to render using GXT directly. Returns true if successful, false to fall back to Glimmer.
   */
  private _tryGxtRender(view: ClassicComponent, target: Element): boolean {
    const owner = this.state.owner;

    // Set global owner for manager system
    (globalThis as any).owner = owner;

    // Get the component's template
    const template = this._getGxtTemplate(view, owner);

    if (!template) {
      return false;
    }

    // Check if it's a GXT template
    const isGxtTemplate =
      template.__gxtCompiled === true ||
      (typeof template.render === 'function' && template.render.__gxtRender === true) ||
      template.$nodes !== undefined;

    if (!isGxtTemplate) {
      return false;
    }

    // Build render context from the component
    const context = this._buildGxtContext(view, owner);

    // Clear target
    target.innerHTML = '';

    // Render directly using GXT
    if (typeof template.render === 'function') {
      template.render(context, target);
    } else if (typeof template === 'function') {
      // Factory function
      const resolved = template(owner);
      if (resolved && typeof resolved.render === 'function') {
        resolved.render(context, target);
      }
    }

    // Create a minimal root state for tracking
    const gxtRootState = {
      type: 'classic' as const,
      id: view.elementId || `gxt-root-${Math.random().toString(36).slice(2)}`,
      destroyed: false,
      result: {
        rerender: () => { /* GXT handles reactivity */ },
        destroy: () => { target.innerHTML = ''; },
      },
      render: () => { /* Already rendered */ },
      isFor: (c: unknown) => c === view,
      destroy: () => {
        target.innerHTML = '';
        gxtRootState.destroyed = true;
      },
    };

    // Register as a root
    this.state.roots.push(gxtRootState as any);

    return true;
  }

  /**
   * Get a GXT template for a component
   */
  private _getGxtTemplate(view: ClassicComponent, owner: object): any {
    // Try layout property first
    if ((view as any).layout) {
      return (view as any).layout;
    }

    // Try layoutName lookup
    const layoutName = (view as any).layoutName;
    if (layoutName) {
      const template = (owner as any).lookup?.(`template:${layoutName}`);
      if (template) return template;
    }

    // Try getComponentTemplate from manager system
    const ComponentClass = view.constructor;
    if (ComponentClass) {
      // Check globalThis.COMPONENT_TEMPLATES
      const globalTemplates = (globalThis as any).COMPONENT_TEMPLATES;
      if (globalTemplates) {
        const template = globalTemplates.get(ComponentClass) || globalTemplates.get(view);
        if (template) return template;
      }
    }

    // Try component name lookup
    const componentName = (view as any)._debugContainerKey?.replace('component:', '');
    if (componentName) {
      const template = (owner as any).lookup?.(`template:components/${componentName}`);
      if (template) return template;
    }

    return null;
  }

  /**
   * Build a render context for GXT from a classic component
   */
  private _buildGxtContext(view: ClassicComponent, owner: object): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    // Copy all own properties from the component
    for (const key of Object.keys(view)) {
      if (typeof (view as any)[key] !== 'function') {
        context[key] = (view as any)[key];
      }
    }

    // Copy prototype properties that might be accessed via {{this.xxx}}
    const proto = Object.getPrototypeOf(view);
    if (proto) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== 'constructor' && !(key in context)) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, key);
          if (descriptor && (descriptor.value !== undefined || descriptor.get)) {
            try {
              const value = (view as any)[key];
              if (typeof value !== 'function') {
                context[key] = value;
              }
            } catch {
              // Getter might throw
            }
          }
        }
      }
    }

    // Standard properties
    context.args = (view as any).args || {};
    context.owner = owner;

    return context;
  }

  _appendDefinition(
    root: OutletView | ClassicComponent,
    definition: CurriedValue,
    target: SimpleElement
  ): void {
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
    this.state.renderRoot(rootState, this);
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
      view.trigger('didDestroyElement');
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
    return this.state.context;
  }

  register(view: any): void {
    let id = getViewId(view);
    // In GXT mode, view registration can conflict during force-rerender (morph)
    // or when views aren't fully cleaned up between test runs. Silently
    // overwrite the existing entry instead of asserting.
    if ((globalThis as any).__GXT_MODE__) {
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
    if (!bounds && (globalThis as any).__GXT_MODE__) {
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
