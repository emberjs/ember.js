import { privatize as P } from '@ember/-internals/container';
import { ENV } from '@ember/-internals/environment';
import type { InternalOwner } from '@ember/-internals/owner';
import { getOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { getViewElement, getViewId, setViewElement } from '@ember/-internals/views';
// (Cluster B slice 6) Bridge reader for `registerArrayOwner`.
// (Cluster B slice 9) Bridge writer for `rootComponent.{isRootComponent,
// updateRootTagValues}` — renderer.ts is the first non-gxt-backend file to
// install a capabilities part. See gxt-bridge.ts `GxtRootComponentCapabilities`
// for the namespace docs.
// (Cluster B slice 96) Bridge writer for `compilePipeline.forceEmberRerender`
// — renderer.ts contributes the morph-fallback function to the compilePipeline
// namespace via `installCompilePipelinePart` (slice-9 reverse-flow install
// precedent). See gxt-bridge.ts `forceEmberRerender` doc for the namespace /
// shape decision narrative.
import {
  getGxtRenderer,
  installCompilePipelinePart,
  installRootComponentPart,
} from '@ember/-internals/gxt-backend/gxt-bridge';

// Expose setViewElement on globalThis for GXT manager to use (avoids circular dep)
(globalThis as any).__emberInternalsViews = { setViewElement, getViewElement };

import {
  pushParentView,
  popParentView,
  flushAfterInsertQueue,
  flushRenderErrors,
  beginRenderPass,
  endRenderPass,
} from '@glimmer/manager';
// Lazy accessor for @lifeart/gxt symbols. The gxt-backend module (only loaded
// in __GXT_MODE__) stashes the namespace on globalThis.__lifeartGxt at its
// own load time. In classic mode (e.g., benchmark-app, embroider builds) the
// stash is undefined and these symbols are never accessed because every
// callsite below is reached only through GXT-mode-gated code paths. Avoiding
// a static `import * as _gxt from '@lifeart/gxt'` here keeps ~50KB of GXT
// runtime out of the classic bundle and prevents any @lifeart/gxt module-load
// side effects from running in classic-mode contexts.
function _gxtLib(): any {
  return (globalThis as any).__lifeartGxt;
}

// Cached GXT DOM API for destroyElementSync
let gxtDomApi: any = null;

function getGxtDomApi() {
  if (!gxtDomApi) {
    gxtDomApi = new (_gxtLib().HTMLBrowserDOMApi)(document);
  }
  return gxtDomApi;
}

// Wrapper that provides the GXT DOM API
function destroyElementSync(component: any, skipDom = false) {
  _gxtLib().destroyElementSync(component, skipDom, getGxtDomApi());
}

// Cached GXT root context for the document
let gxtRootContext: any = null;

// Ensure GXT context is initialized before any GXT rendering
function ensureGxtContext() {
  const lib = _gxtLib();
  if (!gxtRootContext) {
    gxtRootContext = lib.createRoot(document);
    // CRITICAL: Provide the rendering context with DOM API
    // This sets fastRenderingContext which is checked first by initDOM
    const domApi = getGxtDomApi();
    lib.provideContext(gxtRootContext, lib.RENDERING_CONTEXT, domApi);
    // Expose on globalThis so compile.ts can reuse the same root context
    // instead of creating new roots that pollute the shared context chain
    (globalThis as any).__gxtRootContext = gxtRootContext;
  }
  // Always ensure context is set before rendering
  const currentContext = lib.getParentContext();
  if (!currentContext) {
    lib.setParentContext(gxtRootContext);
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
import { unwrapTemplate, isGxtTemplate } from './component-managers/unwrap-template';
import * as _glimmerValidator from '@glimmer/validator';
import { CURRENT_TAG, validateTag, valueForTag, type Tag } from '@glimmer/validator';
// touchClassicBridge / registerClassicReactor exist only in the GXT-aliased
// validator; fall back to no-ops in classic builds so these imports never
// break the classic bundle.
const touchClassicBridge: () => void =
  typeof (_glimmerValidator as any).touchClassicBridge === 'function'
    ? (_glimmerValidator as any).touchClassicBridge
    : () => {};
const registerClassicReactor: (cb: () => void, source?: string) => () => void =
  typeof (_glimmerValidator as any).registerClassicReactor === 'function'
    ? (_glimmerValidator as any).registerClassicReactor
    : (_: () => void, _src?: string) => () => {};
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
  const oldNodes = Array.from(target.childNodes as ArrayLike<ChildNode>);
  const newNodes = Array.from(source.childNodes);

  let i = 0;
  for (; i < newNodes.length; i++) {
    const newNode = newNodes[i]!;
    const oldNode = oldNodes[i];

    if (!oldNode) {
      // More new nodes than old — append
      (target as Element).appendChild(newNode);
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
    (target as Element).replaceChild(newNode, oldNode);
  }

  // Remove extra old nodes
  for (let j = oldNodes.length - 1; j >= i; j--) {
    (target as Element).removeChild(oldNodes[j]!);
  }
}

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

// Note: `ensureLifecycleErrorCapture` previously patched
// `Component.prototype._trigger` and per-instance `destroy` to capture
// user-thrown lifecycle errors into the GXT render-error queue before
// manager.ts's silent try/catch blocks discarded them. As of Phase 3 step 6
// of the GXT workaround-removal plan, those swallows in manager.ts are
// replaced with captureRenderError() at the source:
//   - triggerLifecycleHook (around `instance.trigger(hookName)`) captures all
//     Error instances (was: only allowlisted "Assertion Failed" / "Error in")
//   - __gxtDestroyUnclaimedPoolEntries Phase 3 captures destroy/willDestroy
//     throws (was: silent /* ignore */ catch)
// Both honor the `_suppressDestroyCapture` flag in `manager.ts` (slice-52,
// previously `globalThis.__gxtSuppressDestroyCapture`) for spurious-sweep
// gating.
// The renderer-side prototype patch is therefore no longer needed.

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
  } catch {
    /* ignore */
  }
}

// Slice-15 (Cluster B): the pre-slice-15 `_ensureTriggerReRenderPatched`
// wrap-by-reassignment is replaced by a registered AFTER-chain host hook on
// `compilePipeline.addAfterTriggerReRender` (see slice-15 doc in
// `gxt-bridge.ts`). The hook closes over `_proxyContentOwners` (renderer.ts
// module-local WeakMap) so relocation would have fragmented the map's only
// reader site — host-hook applies, not relocation.
//
// Why AFTER-hook: pre-slice-15 the wrap called `origTrigger(obj, keyName)`
// FIRST and then did the ArrayProxy content-owner cell dirtying. The
// AFTER-chain in compile.ts's canonical body runs the same sequence:
// canonical body executes, then registered AFTER hooks run.
//
// Lazy install retained: pre-slice-15 the wrap was installed lazily on first
// proxy registration (`_registerArrayProxyOwner`) so that classic-Ember
// builds without GXT mode don't take the wrap overhead. The bridge form
// keeps the lazy pattern — the first proxy registration installs the host
// hook through the bridge if it's available.
let _triggerReRenderHostHookInstalled = false;
function _ensureTriggerReRenderPatched() {
  if (_triggerReRenderHostHookInstalled) return;
  const cp = getGxtRenderer()?.compilePipeline;
  if (!cp || typeof cp.addAfterTriggerReRender !== 'function') return;
  const _cellFor = (globalThis as any).__gxtCellFor;
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

    this.render = errorLoopTransaction(() => {
      // Guard against infinite render depth (e.g., engine mounting loops).
      // Slice 47 (Cluster B): reads/writes the module-local
      // `_gxtRenderDepth` (graduated from `globalThis.__gxtRenderDepth`).
      const depth = _gxtRenderDepth || 0;
      if (depth > 20) {
        console.warn('[gxt] Max render depth exceeded, skipping render');
        return;
      }
      _gxtRenderDepth = depth + 1;
      try {
        // Set globalThis.owner for GXT manager system to access
        (globalThis as any).owner = owner;

        // Check if this is a gxt template BEFORE unwrapping.
        // Gate on __GXT_MODE__: the root outlet template is always tagged
        // __gxtCompiled=true (templates/root.ts) so isGxtTemplate(template)
        // would return true even for classic-Ember apps that don't load the
        // gxt runtime. Without GXT_MODE the GXT branch's outlet re-render
        // (root.ts:1110 `parentElement.innerHTML = ''`) wipes the DOM and
        // never restores it — observed as an infinite hang in benchmark-app
        // at the clearItems4 phase. Force classic mode through standard
        // Glimmer rendering by short-circuiting here.
        const templateIsGxt = __GXT_MODE__ ? isGxtTemplate(template) : false;

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
              console.log(
                '[ClassicRootState] root instanceof OutletView:',
                root instanceof OutletView
              );
              console.log('[ClassicRootState] has state:', 'state' in (root || {}));
              console.log('[ClassicRootState] has ref:', 'ref' in (root || {}));
              console.log('[ClassicRootState] has layoutName:', 'layoutName' in (root || {}));
              console.log('[ClassicRootState] layoutName value:', (root as any)?.layoutName);
              console.log(
                '[ClassicRootState] root keys:',
                root ? Object.keys(root).slice(0, 10).join(',') : 'null'
              );
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
              // (Cluster B slice 6) Bridge reader for registerArrayOwner.
              const _registerArrayOwner = getGxtRenderer()?.compilePipeline.registerArrayOwner;
              _ensureTriggerReRenderPatched();
              if (_cellFor) {
                const skipProps = new Set([
                  'args',
                  'constructor',
                  'element',
                  'tagName',
                  'layoutName',
                  'layout',
                  'elementId',
                  'isView',
                  'isComponent',
                  'concatenatedProperties',
                  'mergedProperties',
                  'classNames',
                  'classNameBindings',
                  'attributeBindings',
                  'positionalParams',
                  '_states',
                  'renderer',
                  '__dispatcher',
                  'parentView',
                  '_state',
                  '_currentState',
                  'target',
                  '_debugContainerKey',
                ]);
                let cellCount = 0;
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
                    // and install a cellFor that captures the CP's getter into a
                    // GXT cached `Yt` via gxt's `jt` WeakMap. Subsequent reads
                    // cycle: `Object.defineProperty(comp, key, { get: () => yt.value })`
                    // -> yt.value -> yt.__fn() -> comp[key] -> yt.value ...
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
                    cellCount++;
                  } catch {
                    /* ignore */
                  }
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
            beginRenderPass();

            // Push root component onto parentView stack before rendering
            if (root && 'layoutName' in root) {
              pushParentView(root);
            }
            // Wrap the synchronous template render so that init-phase throws
            // (e.g., `init() { throw ... }` on a classic Ember component) can
            // be caught directly. Previously this was handled by the
            // `captureRenderError` queue + `__gxtRenderErrorCount` global at
            // manager.ts:9144/10840 (gxt-backend's classic-component closure
            // outer wraps), but those captures both swallowed information and
            // required the `root.ts:142` swallow + `flushRenderErrors` dance to
            // surface the throw. With manager.ts now letting init throws
            // propagate naturally and `root.ts` no longer swallowing, the
            // throw reaches us here and we can react locally: clear the
            // partially-rendered DOM (matching classic Glimmer VM behaviour
            // for init failures) and re-throw to `assert.throws` / the host.
            let renderPhaseError: unknown = undefined;
            try {
              (template as any).render(renderContext, actualRenderTarget);
            } catch (err) {
              renderPhaseError = err;
            } finally {
              // Pop from parentView stack after rendering
              if (root && 'layoutName' in root) {
                popParentView();
              }
              // End render pass in the finally block so it's cleaned up even when
              // BREAK or other sentinels propagate (e.g., from expectAssertion).
              endRenderPass();
            }
            if (renderPhaseError !== undefined) {
              // Init-phase failure — DOM is partially populated. Clear it
              // before propagating, matching Glimmer's behaviour and the
              // expectations of the `Errors thrown during render: it can
              // recover resets the transaction when an error is thrown during
              // initial render` canary.
              (parentElement as unknown as Element).innerHTML = '';
              throw renderPhaseError;
            }
          } else if ('$nodes' in template) {
            // Build-time compiled gxt template with $nodes
            _gxtLib().renderComponent(template as any, parentElement, owner);
          } else {
            console.warn('GXT template detected but cannot render:', template);
          }

          // Flush queued didInsertElement / didRender hooks now that all DOM
          // has been inserted into the live document by GXT. Lifecycle errors
          // thrown here are queued by `ensureLifecycleErrorCapture`'s
          // `_trigger`/`destroy` wrappers (renderer.ts:319) into `_renderErrors`.
          flushAfterInsertQueue();

          // Re-throw any lifecycle (didInsertElement / destroy) errors captured
          // during the after-insert flush. Init-phase render errors are no
          // longer queued — they propagate directly from `template.render()`
          // above. The queue at this point only ever contains lifecycle errors,
          // so we MUST NOT clear DOM here — `assertText('hello')` after a
          // didInsertElement throw expects the rendered output to remain.
          try {
            flushRenderErrors();
          } catch (renderError) {
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
                    get() {
                      return comp[propKey];
                    },
                    set(v: any) {
                      comp[propKey] = v;
                    },
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
                //
                // Slice-108 (Cluster B): paired migration of
                // `__gxtMorphModifierInvocations` + `__gxtMorphRenderInProgress`
                // from the pre-slice-108 globalThis writer pair to the typed
                // bridge save-restore wrapper `withMorphRender(invocations, fn)`.
                // The caller retains ownership of the `morphModInvocations`
                // array and continues to iterate it post-`withMorphRender`
                // (the modifier-replay loop below at L1020). The bridge
                // wrapper folds the inline save-set-flag+set-array / try-fn /
                // finally-clear-flag+clear-array pair into one documented
                // surface (slice-22 `withCurrentlyRendering` save-restore
                // precedent extended with the companion array slot). Bridge-
                // not-yet-installed edge: `?? fn()` fallback runs the body
                // without exposing state (matches pre-slice-108 semantics
                // where the manager.ts gate's `!truthy` short-circuited to
                // "not a morph render"; harmless — the modifier-manager just
                // installs normally on the temp container instead of queuing
                // for replay, which only happens in classic-Ember builds
                // before gxt-backend is loaded).
                const morphModInvocations: any[] = [];
                const _withMorphRender =
                  getGxtRenderer()?.compilePipeline.withMorphRender;
                try {
                  if (_withMorphRender) {
                    _withMorphRender(morphModInvocations, () => {
                      (gxtTemplate as any).render(freshContext, tempContainer);
                    });
                  } else {
                    (gxtTemplate as any).render(freshContext, tempContainer);
                  }
                } finally {
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
                // Slice-35 (Cluster B): canonical state migrated from
                // `globalThis.__gxtHadPendingSync` to module-local
                // `_gxtHadPendingSyncFlag` in `compile.ts`. Cross-package
                // reader routes through the bridge getter (load-order-safe
                // optional chain — by the time this morph callback fires,
                // compile.ts's `installCompilePipelinePart` has run and the
                // getter is installed). See `getHadPendingSync` doc in
                // gxt-bridge.ts.
                const hadPropertyChange = !!getGxtRenderer()?.compilePipeline.getHadPendingSync?.();
                if (hadPropertyChange && morphModInvocations.length > 0) {
                  const realEls: Element[] = [];
                  const walk = (n: Node) => {
                    if (n.nodeType === 1) realEls.push(n as Element);
                    let c = n.firstChild;
                    while (c) {
                      walk(c);
                      c = c.nextSibling;
                    }
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
                        const baseName =
                          typeof inv.modifier === 'string'
                            ? inv.modifier
                            : inv.modifier?.name || String(inv.modifier);
                        // Only include firstArg for the "on" modifier
                        // to match the modKey logic in handle()
                        let firstArg = '';
                        if (inv.modifier === 'on') {
                          firstArg =
                            inv.props && inv.props.length > 0
                              ? String(
                                  typeof inv.props[0] === 'function' && !inv.props[0].prototype
                                    ? inv.props[0]()
                                    : inv.props[0]
                                )
                              : '';
                        }
                        const modKey = firstArg ? `${baseName}:${firstArg}` : baseName;
                        const cached = cache.get(modKey);
                        if (cached && !cached.pendingDestroy) {
                          // Check if already updated by Phase 1 (gxtSyncDom).
                          // Slice-30 (Cluster B): cross-package read of the
                          // sync-cycle counter migrated from the pre-slice-30
                          // `globalThis.__gxtSyncCycleId` slot to the
                          // `compilePipeline.getSyncCycleId()` bridge. Bridge-
                          // not-yet-installed edge defaults to `0` (`?? 0`),
                          // preserving the pre-slice-30
                          // `(g.__gxtSyncCycleId || 0)` truthy-coerce
                          // semantics exactly.
                          const syncCycle =
                            getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
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
                (gxtRootState as any).__gxtDeferredError =
                  (gxtRootState as any).__gxtDeferredError || lifecycleErr;
              }
              try {
                flushRenderErrors();
              } catch (renderErr) {
                (gxtRootState as any).__gxtDeferredError =
                  (gxtRootState as any).__gxtDeferredError || renderErr;
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
      } finally {
        // Slice 47 (Cluster B): restore the captured pre-entry depth so
        // the counter unwinds cleanly across nested renders. NOT a
        // reset-to-0 — writes back the local `depth` snapshot taken at
        // the top of the render body, so the depth tracks each nested
        // render-entry/exit independently.
        _gxtRenderDepth = depth;
      }
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
        // GXT's destroyElementSync walks GXT-specific bookkeeping; no-op for a
        // Glimmer VM RenderResult that was produced by the classic renderMain
        // path, but still incurs traversal cost and may interact poorly with
        // foreign objects. Gate on __GXT_MODE__ to keep classic-Ember teardown
        // identical to upstream.
        if (__GXT_MODE__) {
          destroyElementSync(result!);
        }
        destroy(result!);
      });
    }
  }
}

const renderers: BaseRenderer[] = [];

// Slice 45 (Cluster B): module-local re-entrancy guard for
// `__gxtForceEmberRerender`. Graduates the pre-slice-45
// `globalThis.__gxtForceRerenderInProgress` slot to a module-local
// boolean (slice-31/43/44 zero-bridge intra-file precedent). The flag is
// set to `true` on entry to `__gxtForceEmberRerender` and reset to
// `false` in the `finally` block; any re-entrant call returns early
// while the outer call is in-flight. All 3 sites (1 reader-with-early-
// return, 1 writer-true on entry, 1 writer-false in the finally block)
// live in this file — confirmed by exhaustive grep across `packages/`.
// The pre-slice-45 globalThis slot is dropped (the only remaining
// non-source references are defensive resets in packages/demo/tests.html,
// which now write to an unused slot — no consumer reads it).
let _gxtForceRerenderInProgress = false;

// Slice 46 (Cluster B): module-local stash for the dirty-roots list
// recorded by `_gxtUpdateRootTagValues` (Phase 1b of `__gxtSyncDomNow`)
// for consumption by `__gxtForceEmberRerender` (Phase 1c). Graduates the
// pre-slice-46 `globalThis.__gxtDirtyRootsAtSync` slot to a module-local
// `any[] | undefined` (slice-31/43/44/45 zero-bridge intra-file precedent).
// Lifetime spans one `__gxtSyncDomNow` cycle: written by
// `_gxtUpdateRootTagValues` (populate), read by `__gxtForceEmberRerender`
// (consume), cleared to `undefined` in `__gxtForceEmberRerender`'s
// `finally` block. All 3 sites (1 reader in `__gxtForceEmberRerender`,
// 1 writer-undefined in the same function's `finally`, 1 writer-populate
// in `_gxtUpdateRootTagValues`) live in this file — confirmed by
// exhaustive grep across `packages/`. Paired with slice-45's
// `_gxtForceRerenderInProgress` (both are part of the
// `__gxtForceEmberRerender` cycle state). The pre-slice-46 globalThis
// slot is dropped.
let _gxtDirtyRootsAtSync: any[] | undefined;

// Slice 47 (Cluster B): module-local render-depth re-entrancy counter
// for `ClassicRootState.render` (the `errorLoopTransaction`-wrapped
// initial render in this file). Graduates the pre-slice-47
// `globalThis.__gxtRenderDepth` slot to a module-local `number`
// (slice-31/43/44/45/46 zero-bridge intra-file precedent). All 3 sites
// (1 reader-init capturing the pre-entry depth, 1 writer-increment on
// entry-arm, 1 writer-restore in the `finally` block restoring the
// pre-entry value) live in this file in the `ClassicRootState`
// constructor's render body — confirmed by exhaustive grep across
// `packages/`. The L1137 writer-restore is NOT a reset-to-0; it
// restores the captured pre-entry depth so the counter unwinds cleanly
// across nested renders (e.g., engine-mounting chains). If the depth
// exceeds 20 on entry, the render is skipped with a `console.warn`.
// Third consecutive Cluster B slice with state-home in `renderer.ts`
// (after slice 45's `_gxtForceRerenderInProgress` and slice 46's
// `_gxtDirtyRootsAtSync`), forming a 3-slot module-local cluster of
// renderer-cycle state. The pre-slice-47 globalThis slot is dropped.
let _gxtRenderDepth = 0;

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
if (!__GXT_MODE__) {
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
    // Slice-37 (Cluster B): `__gxtPendingSync` canonical state migrated to
    // module-local `_gxtPendingSyncFlag` in `compile.ts`. Cross-package
    // reader routes through the bridge getter (load-order-safe optional
    // chain — by the time this `_backburner.on('end', ...)` listener
    // fires, compile.ts's `installCompilePipelinePart` has run and the
    // getter is installed). See `getPendingSync` doc in gxt-bridge.ts.
    // Slice-38 (Cluster B): `__gxtRunTaskActive` canonical state migrated
    // to module-local `_gxtRunTaskActiveFlag` in `compile.ts`. Cross-
    // package reader routes through the bridge getter (paired
    // topologically with the slice-37 `getPendingSync` reader above —
    // both flags read together in this `pending && !runTaskActive`
    // gate). See `getRunTaskActive` doc in gxt-bridge.ts.
    const _cpBB = getGxtRenderer()?.compilePipeline;
    if (
      nextInstance == null &&
      _cpBB?.getPendingSync?.() &&
      !_cpBB?.getRunTaskActive?.()
    ) {
      const syncNow = (globalThis as any).__gxtSyncDomNow;
      if (typeof syncNow === 'function') {
        try {
          syncNow();
        } catch {
          /* errors handled inside sync */
        }
      }
    }
    resolveRenderPromise();
  });
}

// Force re-render all GXT roots whose own tag moved in the current sync
// cycle. Called from __gxtSyncDomNow when GXT's cell tracking misses changes
// made through Ember's set() / notifyPropertyChange, and from manager.ts's
// patched-recompute helper-recompute path to force a full-tree morph that
// lets formulas reading helper cells re-evaluate.
//
// Slice-96 (Cluster B): graduated from the pre-slice-96 globalThis writer
// `(globalThis as any).__gxtForceEmberRerender = function () { ... };` to
// a plain module-local `function _gxtForceEmberRerender()` declaration
// exposed through the `compilePipeline.forceEmberRerender` typed-bridge
// method. Pattern mirrors slice-91's `newRenderPass` and slice-92's
// `postRenderHooks` (same shape: void-returning bridge method invoked from
// sibling cross-package readers). The two readers at `compile.ts:6716`
// (PHASE 2b morph fallback inside `_gxtSyncDomNow`) and `manager.ts:602`
// (patched-recompute helper-recompute path) route through
// `getGxtRenderer()?.compilePipeline.forceEmberRerender?.()` — the
// optional-chain provides the same null-tolerant guard as the pre-slice-96
// `typeof === 'function'` check. State home: renderer.ts owns the
// `renderers[]` registry plus the slice-45/46 module-local cycle state
// (`_gxtForceRerenderInProgress` re-entrancy guard, `_gxtDirtyRootsAtSync`
// pre-sync dirty list), so the function stays here and is registered via
// `installCompilePipelinePart` (slice-9 reverse-flow install precedent).
// See `forceEmberRerender` doc in gxt-bridge.ts. Net -1 globalThis slot,
// +1 new bridge method on `compilePipeline`.
function _gxtForceEmberRerender(): void {
  // Re-entrancy guard: prevent infinite loops when morphing triggers
  // cell updates that schedule additional force-rerenders.
  // Slice 45 (Cluster B): canonical state migrated from
  // `globalThis.__gxtForceRerenderInProgress` to module-local
  // `_gxtForceRerenderInProgress` (zero-bridge intra-file — all 3 sites
  // live in this file). See module-local declaration near `renderers`.
  if (_gxtForceRerenderInProgress) return;
  _gxtForceRerenderInProgress = true;
  try {
    // Slice-35 (Cluster B): canonical state migrated from
    // `globalThis.__gxtHadPendingSync` to module-local
    // `_gxtHadPendingSyncFlag` in `compile.ts`. Cross-package reader
    // routes through the bridge getter (load-order-safe optional chain
    // — by the time `__gxtForceEmberRerender` fires, compile.ts's
    // `installCompilePipelinePart` has run and the getter is installed).
    // See `getHadPendingSync` doc in gxt-bridge.ts.
    const hadPendingSync = !!getGxtRenderer()?.compilePipeline.getHadPendingSync?.();
    // Slice-97 (Cluster B): canonical state migrated from
    // `globalThis.__gxtHadNestedObjectChange` to module-local
    // `_gxtHadNestedObjectChangeFlag` in `compile.ts`. Cross-package
    // reader routes through the bridge getter (load-order-safe optional
    // chain — by the time `_gxtForceEmberRerender` fires, compile.ts's
    // `installCompilePipelinePart` has run and the getter is installed).
    // See `getHadNestedObjectChange` doc in gxt-bridge.ts.
    const hadNestedObjectChange = !!getGxtRenderer()?.compilePipeline.getHadNestedObjectChange?.();
    // Collect roots whose own tag moved RIGHT NOW (after Phase 1a of
    // __gxtSyncDomNow, before Phase 1b updateRootTagValues was called).
    // If __gxtUpdateRootTagValues was already called earlier in this sync,
    // it stashed the dirty list on module-local `_gxtDirtyRootsAtSync` — use that.
    // (Slice 46 — graduated from `globalThis.__gxtDirtyRootsAtSync`.)
    const dirtyRootsFromSync = _gxtDirtyRootsAtSync;
    const dirtyRoots: any[] = [];
    const allGxtRoots: any[] = [];
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
    const rootsToRender =
      effectiveDirtyRoots.length > 0
        ? effectiveDirtyRoots
        : hadPendingSync && hadNestedObjectChange
          ? allGxtRoots
          : [];
    for (const classicRoot of rootsToRender) {
      // Tag is dirty — force re-render. Increment the render pass ID
      // so the instance pool resets claimed flags and REUSES existing
      // instances instead of creating new ones (which would fire
      // spurious init/render lifecycle hooks).
      (globalThis as any).__emberRenderPassId = ((globalThis as any).__emberRenderPassId || 0) + 1;
      (globalThis as any).__gxtIsForceRerender = true;
      try {
        classicRoot.render();
      } catch (renderErr) {
        // Store render error so it can propagate to assert.throws
        if (!classicRoot.__gxtDeferredError) {
          classicRoot.__gxtDeferredError = renderErr;
        }
      } finally {
        (globalThis as any).__gxtIsForceRerender = false;
      }
      // Re-throw deferred errors (from lifecycle hooks like destroy)
      if (classicRoot.__gxtDeferredError) {
        const err = classicRoot.__gxtDeferredError;
        classicRoot.__gxtDeferredError = null;
        throw err;
      }
    }
  } finally {
    // Slice 45 (Cluster B): canonical state migrated from
    // `globalThis.__gxtForceRerenderInProgress` to module-local
    // `_gxtForceRerenderInProgress`. See module-local declaration near
    // `renderers`.
    _gxtForceRerenderInProgress = false;
    // Slice-35 (Cluster B): canonical state migrated from
    // `globalThis.__gxtHadPendingSync` to module-local
    // `_gxtHadPendingSyncFlag` in `compile.ts`. Cross-package writer
    // routes through the bridge setter. See `setHadPendingSync` doc in
    // gxt-bridge.ts.
    getGxtRenderer()?.compilePipeline.setHadPendingSync?.(false);
    // Slice-97 (Cluster B): canonical state migrated from
    // `globalThis.__gxtHadNestedObjectChange` to module-local
    // `_gxtHadNestedObjectChangeFlag` in `compile.ts`. Cross-package
    // writer routes through the bridge setter. See
    // `setHadNestedObjectChange` doc in gxt-bridge.ts.
    getGxtRenderer()?.compilePipeline.setHadNestedObjectChange?.(false);
    // Slice 46 (Cluster B): module-local dirty-roots stash. See declaration
    // near `renderers`.
    _gxtDirtyRootsAtSync = undefined;
  }
}

// Slice-96 (Cluster B): publish the renderer-owned force-rerender morph
// fallback to the gxt-bridge `compilePipeline` namespace. Mirrors slice-9's
// `installRootComponentPart` reverse-flow install (renderer.ts contributes
// to a bridge namespace consumed inside `@ember/-internals/gxt-backend`).
// Replaces the pre-slice-96 globalThis writer at L1363
// (`(globalThis as any).__gxtForceEmberRerender = function () { ... };`,
// now retired). The two cross-package readers at `compile.ts:6716` and
// `manager.ts:602` route through
// `getGxtRenderer()?.compilePipeline.forceEmberRerender?.()`. See
// `forceEmberRerender` doc in gxt-bridge.ts. Net -1 globalThis slot.
installCompilePipelinePart({
  forceEmberRerender: _gxtForceEmberRerender,
});

// Check if the given object is a GXT root-component's `root` (i.e., a
// component that owns a top-level renderer state). Used by compile.ts's
// __gxtTriggerReRender to distinguish own-SELF_TAG changes (which the
// cell-based sync pipeline handles) from nested-object changes (which need
// a force-rerender fallback).
//
// (Cluster B slice 9) Was `(globalThis as any).__gxtIsRootComponent`. Now
// installed on the gxt-bridge `rootComponent` namespace via
// `installRootComponentPart` below.
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

// Update gxtLastTagValue on all GXT roots to mark them clean.
// Called from __gxtTriggerReRender after cell-based sync succeeds,
// so __gxtForceEmberRerender sees them as up-to-date and skips
// the destructive innerHTML='' + full rebuild.
// ALSO records which roots WERE dirty (on module-local `_gxtDirtyRootsAtSync`)
// so __gxtForceEmberRerender can scope its rerender to just those roots,
// avoiding a full-tree force-render when only some components mutated.
// (Slice 46 — graduated from `globalThis.__gxtDirtyRootsAtSync`.)
//
// (Cluster B slice 9) Was `(globalThis as any).__gxtUpdateRootTagValues`. Now
// installed on the gxt-bridge `rootComponent` namespace via
// `installRootComponentPart` below.
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

// Slice-9 (Cluster B): publish the renderer-owned root-component hooks to the
// gxt-bridge `rootComponent` namespace. Mirrors slice 6's
// `installCompilePipelinePart` from ember-template-compiler.ts and slice 7's
// `installRuntimePart` from gxt-with-runtime-hbs.ts; this is the first cross-
// package writer for an install-API namespace (renderer.ts lives in
// `@ember/-internals/glimmer`, the bridge namespace is consumed inside
// `@ember/-internals/gxt-backend/compile.ts`). The install is direction-
// agnostic — see gxt-bridge.ts `GxtRootComponentCapabilities` for the design
// note on "reverse-flow".
installRootComponentPart({
  isRootComponent: _gxtIsRootComponent,
  updateRootTagValues: _gxtUpdateRootTagValues,
});

// (Cluster B slice 9 orphan cleanup) The pre-slice `(globalThis as any)
// .__gxtCheckAllTagsCurrent` writer had ZERO live readers in source — the
// sole reference at `compile.ts:5522` is a historical comment explaining
// why the function is no longer used (the morph must always run when
// hadPendingSync is true). Writer removed without bridge migration.

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
    if (__GXT_MODE__) {
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

    return (
      this.#destroyed || this.#roots.length === 0 || validateTag(CURRENT_TAG, this.#lastRevision)
    );
  }

  revalidate(renderer: BaseRenderer): void {
    // In GXT mode, isValid() returns true to prevent infinite revalidation.
    // But explicit .rerender() calls set __gxtForceRerender on the component
    // and need a sync pass to flush the hooks.
    if (__GXT_MODE__) {
      // Slice-37 (Cluster B): `__gxtPendingSync` canonical state migrated
      // to module-local `_gxtPendingSyncFlag` in `compile.ts`. Cross-
      // package writer routes through the bridge setter (load-order-safe
      // optional chain — by the time `revalidate` fires, compile.ts's
      // `installCompilePipelinePart` has run and the setter is
      // installed). See `setPendingSync` doc in gxt-bridge.ts.
      getGxtRenderer()?.compilePipeline.setPendingSync?.(true);
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

/**
 * GXT-mode multi-render bookkeeping. Each `renderComponent` call into a
 * given target produces an independent render entry that tracks its own
 * (firstNode, lastNode) DOM range. Multiple entries can coexist within
 * the same target as siblings; each entry's destroy/re-render operates
 * only on the nodes inside its own range, leaving other entries
 * untouched.
 */
interface GxtRenderEntry {
  /**
   * First and last DOM node belonging to this render. The range is
   * inclusive: every node from firstNode to lastNode (walking nextSibling)
   * is owned by this entry. References update on re-render so the entry's
   * range tracks the live DOM range it occupies.
   */
  firstNode: Node | null;
  lastNode: Node | null;
  destroy: () => void;
  result: RenderResult;
  /**
   * The component definition this entry rendered. Used to dedupe
   * "spurious double-fire" cases where GXT's compiled template invokes
   * the same helper twice for a single source-level mustache (the
   * loose-mode helper-lookup path can do this). When a second
   * renderComponent call into the same target arrives in the SAME
   * runloop with the SAME (component, owner) pair as a prior entry,
   * we treat it as a duplicate of the prior call and reuse the prior
   * result instead of creating a sibling. Genuine sibling renders
   * (e.g. `{{render A 'a' owner}}\n{{render A 'a'}}`) differ in their
   * `owner` arg, so they keep distinct identities.
   */
  component: object;
  ownerObj: object;
  /**
   * The runloop instance that was active when this entry was created.
   * Used to distinguish "sibling renders within the same render pass"
   * (same runloop -> coexist) from "re-render of the same target across
   * runloop boundaries" (different runloop -> destroy prior). This is
   * the heuristic that lets the renderComponent siblings tests pass while
   * keeping the eager-tracks-with-parent test passing: synchronous
   * back-to-back renders in one run() are siblings; an outer template
   * re-render that calls renderComponent again replaces.
   */
  runloop: object | null;
}
interface GxtRenderTargetState {
  entries: GxtRenderEntry[];
  /**
   * True once we've performed the initial innerHTML='' clear of the target.
   * Subsequent renders into the same target must NOT clear, so they appear
   * as siblings of prior render entries.
   */
  cleared: boolean;
}
const GXT_RENDER_STATE = new WeakMap<Element, GxtRenderTargetState>();

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

  // Get the target element
  const targetElement =
    into instanceof Element ? into : 'element' in into ? (into as any).element : into;

  // Multi-render scoping: each renderComponent call into a target gets its
  // own (firstNode, lastNode) DOM range. Multiple renders coexist as
  // siblings (per the renderComponent RFC's "subsequent renders to the
  // same element are prepended" semantics); each entry's destroy /
  // re-render only affects its own range, not the other entries' content.
  // Capture the current runloop instance so the new entry can decide
  // whether prior entries in the same target are "siblings" (same runloop,
  // i.e. same render pass) or "stale" (different runloop, i.e. an outer
  // re-render replacing the prior content).
  const currentRunloop = _getCurrentRunLoop();

  // The render entry is created up-front so the destroy/region helpers can
  // close over a single mutable reference. firstNode/lastNode are filled in
  // after the initial render captures the actual rendered DOM range.
  const entry: GxtRenderEntry = {
    firstNode: null,
    lastNode: null,
    destroy: () => {
      /* set below */
    },
    result: undefined as unknown as RenderResult,
    component,
    ownerObj: owner,
    runloop: currentRunloop,
  };

  let targetState: GxtRenderTargetState | undefined;
  if (targetElement instanceof Element) {
    targetState = GXT_RENDER_STATE.get(targetElement);
    if (!targetState) {
      targetState = { entries: [], cleared: false };
      GXT_RENDER_STATE.set(targetElement, targetState);
    }
    // Spurious-duplicate guard: GXT's compiled template can invoke the
    // same helper-mustache twice in a single render pass when the helper
    // resolves through a loose-mode owner.lookup chain (the `{{a-helper}}`
    // path in `<Loose />` style components). Without this guard, each
    // mustache produces TWO render entries on the target — the first
    // from the helper's first invocation, the second from its spurious
    // second invocation. Dedupe by checking whether a prior entry with
    // the SAME (component, owner) tuple already exists in the same
    // runloop: if so, return the prior entry's result instead of
    // creating a sibling. Distinct siblings (different component or
    // different owner — e.g. the documented `{{render A 'a' owner}}\n
    // {{render A 'a'}}` pattern where the second omits owner) get
    // distinct identities and proceed normally.
    if (currentRunloop !== null && targetState.entries.length > 0) {
      for (const e of targetState.entries) {
        if (e.component === component && e.ownerObj === owner && e.runloop === currentRunloop) {
          // Skip the rest of the render path; we haven't mutated any
          // global state yet at this point in the function.
          return e.result;
        }
      }
    }
    // Replacement vs. sibling decision for prior entries already in this
    // target. A prior entry must be torn down (REPLACED) only when it
    // was created in a DIFFERENT runloop instance — the canonical
    // "renderComponent is eager, tracks with parent" case where an
    // outer @cached getter re-runs after a tag dirty and calls
    // renderComponent again. Plain back-to-back renderComponent calls
    // in the same runloop are kept as concurrent renders (the
    // documented "siblings" pattern of two `{{render A 'a'}}`
    // invocations in one template). Spurious-duplicate calls from the
    // same runloop with the same identity are caught earlier by the
    // dedupe check above.
    if (currentRunloop !== null && targetState.entries.length > 0) {
      const stale: GxtRenderEntry[] = [];
      for (const e of targetState.entries) {
        if (e.runloop !== currentRunloop) stale.push(e);
      }
      for (const e of stale) {
        try {
          e.destroy();
        } catch {
          /* ignore */
        }
      }
    }
    // Initial render into a target that has not yet been claimed by
    // renderComponent: clear any pre-existing contents (per the
    // "replaces existing contents within the target element" test).
    if (!targetState.cleared) {
      targetElement.innerHTML = '';
      targetState.cleared = true;
    }
  }

  // Set globalThis.owner so the manager system can resolve services
  const prevOwner = (globalThis as any).owner;
  (globalThis as any).owner = owner;

  // Ensure GXT context is initialized
  ensureGxtContext();

  let destroyed = false;
  let domCleanupDone = false;
  let classicReactorUnsub: (() => void) | null = null;

  // Remove all DOM nodes belonging to this entry's range (firstNode through
  // lastNode, inclusive). Used for both destroy and the re-render
  // "clear my region" step. After clearing, firstNode/lastNode are reset
  // so the next render can populate them.
  const clearRegion = () => {
    let first = entry.firstNode;
    const last = entry.lastNode;
    if (!first || !last) return;
    while (first) {
      const next: Node | null = first.nextSibling;
      try {
        first.parentNode?.removeChild(first);
      } catch {
        /* ignore */
      }
      if (first === last) break;
      first = next;
    }
    entry.firstNode = null;
    entry.lastNode = null;
  };

  // DOM teardown: removes this render's content range from the target.
  const doDomCleanup = () => {
    if (domCleanupDone) return;
    domCleanupDone = true;
    if (entry.firstNode || entry.lastNode) {
      clearRegion();
    } else if (
      targetElement instanceof Element &&
      (!targetState || targetState.entries.length <= 1)
    ) {
      // Fallback for non-Element targets (Cursor) or empty entries on a
      // last-entry teardown: ensure the target is fully cleaned. We avoid
      // clobbering sibling entries by gating on entries.length.
      if (!(targetElement instanceof Element)) {
        // unreachable here, kept for type safety
      }
    }
    if (targetState) {
      const idx = targetState.entries.indexOf(entry);
      if (idx >= 0) targetState.entries.splice(idx, 1);
      // Once all entries are destroyed, drop the target's bookkeeping so a
      // future renderComponent call on the same element behaves like a
      // fresh first-render (clears any new pre-existing contents).
      if (targetState.entries.length === 0 && targetElement instanceof Element) {
        GXT_RENDER_STATE.delete(targetElement);
      }
    }
  };

  // Synchronous teardown: stop the classic-tag reactor immediately and
  // remove this render's DOM range. Cross-runloop replacement (the eager
  // case) needs sync DOM cleanup so the new render appears alone; the
  // sibling case never reaches doDestroy until the user explicitly calls
  // result.destroy() (e.g. via owner destruction), at which point sync
  // cleanup is also correct.
  const doDestroy = () => {
    if (destroyed) return;
    destroyed = true;
    if (classicReactorUnsub) {
      try {
        classicReactorUnsub();
      } catch {
        /* ignore */
      }
      classicReactorUnsub = null;
    }
    doDomCleanup();
  };
  entry.destroy = doDestroy;

  // Render the template into the target. The "direct" path renders into
  // the target (zero DOM movement, letting GXT's processNodes wire
  // effects against the actual ancestor chain) and is used whenever the
  // parent has no foreign live content from OTHER entries. The
  // "sibling/prepend" path renders into a temporary host of the same
  // tag-name, then moves the resulting children to the FRONT of the
  // actual parent — this gives the documented "subsequent renders are
  // prepended" behavior while preserving live sibling content from prior
  // render entries on the same target.
  const renderIntoRegion = (template: any, ctx: any) => {
    if (!(targetElement instanceof Element)) {
      template.render(ctx, targetElement);
      return;
    }
    const parent: Element = targetElement;
    let hasForeignLiveContent = false;
    if (targetState) {
      for (const e of targetState.entries) {
        if (e === entry) continue;
        if (e.firstNode && e.firstNode.parentNode === parent) {
          hasForeignLiveContent = true;
          break;
        }
      }
    }
    if (!hasForeignLiveContent) {
      template.render(ctx, parent);
      entry.firstNode = parent.firstChild;
      entry.lastNode = parent.lastChild;
      return;
    }
    // Sibling render: render into a temporary host of the same tag-name
    // (so any tag-sensitive child construction inside <table>, <select>,
    // etc. keeps the same parent context), then move the children to the
    // FRONT of the actual parent.
    const host = document.createElement(parent.tagName);
    template.render(ctx, host);
    if (host.firstChild === null) return; // nothing rendered
    const firstCollected: Node | null = host.firstChild;
    const lastCollected: Node | null = host.lastChild;
    const frag = document.createDocumentFragment();
    while (host.firstChild) {
      frag.appendChild(host.firstChild);
    }
    parent.insertBefore(frag, parent.firstChild);
    entry.firstNode = firstCollected;
    entry.lastNode = lastCollected;
  };

  try {
    // Resolve template from COMPONENT_TEMPLATES
    let template = globalTemplates?.get(component);

    // Walk prototype chain if not found directly (for class-based components)
    if (!template && component) {
      let proto =
        typeof component === 'function'
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
                get: function () {
                  touchClassicBridge();
                  return innerGet.call(this);
                },
                enumerable: true,
                configurable: true,
              });
            } else {
              Object.defineProperty(gxtArgs, key, {
                get: () => {
                  touchClassicBridge();
                  return (args as any)[key];
                },
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
          if (targetElement instanceof Element) {
            // Prepend (matches the documented "subsequent renders are
            // prepended" semantic) and capture the inserted node as both
            // firstNode and lastNode of this entry so destroy can scope.
            targetElement.insertBefore(nodes, targetElement.firstChild);
            entry.firstNode = nodes;
            entry.lastNode = nodes;
          } else {
            (targetElement as Element).appendChild(nodes);
          }
        }
      } else {
        console.warn('[renderComponent GXT] No GXT template found for component:', component);
      }

      const result: RenderResult = { destroy: doDestroy };
      entry.result = result;
      if (targetState) {
        targetState.entries.unshift(entry);
      }
      RENDER_CACHE.set(into, { result, glimmerResult: undefined });
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
    const isTemplateOnly =
      !isClass ||
      (component as any).__templateOnly === true ||
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
          instance = ComponentClass.create(Object.assign({}, args || {}, { owner }));
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
              get: function () {
                touchClassicBridge();
                return innerGet.call(this);
              },
              enumerable: true,
              configurable: true,
            });
          } else {
            Object.defineProperty(instance.args, key, {
              get: () => {
                touchClassicBridge();
                return (args as any)[key];
              },
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
            get: () => {
              touchClassicBridge();
              return (args as any)[key];
            },
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
          get: () => {
            touchClassicBridge();
            return (args as any)[key];
          },
          enumerable: true,
          configurable: true,
        });
      }
      renderContext.args = argsObj;
    }
    renderContext.owner = owner;

    // Enable isRendering so GXT formulas created during template.render()
    // properly track cell dependencies (e.g., trackedObject cells).
    //
    // Slice-19 (Cluster B): read the render-pass depth through the typed
    // `compilePipeline.isRendering()` bridge predicate.
    // Slice-21 (Cluster B): wrap the render bodies with the typed
    // `compilePipeline.withRendering(fn)` bridge helper (increment +
    // try/finally + decrement). The bridge helper invokes
    // `_gxtSetIsRendering` directly (intra-module to compile.ts), so
    // semantics are identical to the pre-slice-21 `globalThis.
    // __gxtSetIsRendering` lookup. The conditional-decrement workaround
    // (`if (!wasRendering) _setRendering(false)`) is folded into the
    // helper's unconditional decrement — depth counter handles nested
    // calls correctly (outer N → inner N+1 → outer N). The
    // `__gxtIsRendering` / `__gxtSetIsRendering` globalThis fallback
    // branches are also dropped in this slice — the bridge install runs
    // at compile.ts module init (top-level), strictly before any
    // renderComponent invocation in a QUnit test (the bridge is loaded
    // transitively through `@ember/-internals/glimmer` import). See
    // `isRendering` / `withRendering` docs in gxt-bridge.ts.
    const _pipeline = getGxtRenderer()?.compilePipeline;
    const _isRendering = _pipeline?.isRendering;
    const _withRendering = _pipeline?.withRendering;
    const wasRendering = typeof _isRendering === 'function' ? _isRendering() : false;
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
      if (
        !(targetElement instanceof Element) ||
        (!targetElement.isConnected && classicReactorUnsub)
      ) {
        // Target detached — leave DOM alone until reattached. We still keep
        // the reactor so the first reattachment triggers a fresh render.
      }
      _rendering = true;
      const prevOwnerLocal = (globalThis as any).owner;
      (globalThis as any).owner = owner;
      const prevSkip = (globalThis as any).__gxtSkipTextEffects;
      const wasRenderingLocal = typeof _isRendering === 'function' ? _isRendering() : false;
      if (wasRenderingLocal) (globalThis as any).__gxtSkipTextEffects = true;
      try {
        // Scoped re-render: clear only the nodes within this entry's
        // range, then render fresh content back into the same range. This
        // preserves sibling renders into the same target.
        if (typeof _withRendering === 'function') {
          _withRendering(() => {
            clearRegion();
            renderIntoRegion(template, renderContext);
          });
        } else {
          clearRegion();
          renderIntoRegion(template, renderContext);
        }
      } finally {
        (globalThis as any).__gxtSkipTextEffects = prevSkip;
        (globalThis as any).owner = prevOwnerLocal;
        _rendering = false;
      }
    };

    // Register the classic-tag reactor BEFORE running template.render,
    // but with an `initialized` guard so the callback is a no-op until
    // initial render completes. The purpose of the early registration
    // is to reserve this reactor's slot at the tail of _classicReactors
    // BEFORE any nested renderComponent calls (made during initial
    // template.render) register their own reactors. Set iteration in
    // _fireClassicReactors preserves insertion order, so the parent's
    // reactor fires first on classic-tag dirty — and when the parent's
    // re-render calls renderComponent again on the same target, it
    // destroys the nested render before the nested reactor would have
    // had a chance to emit spurious arg-reads (see the "renderComponent
    // is eager, so it tracks with its parent" strict-mode test).
    //
    // The reactor is per-call: each renderComponent registers its own
    // callback that closes over its own (renderContext, targetElement,
    // destroyed flag). Cleanup is via doDestroy, chained through the owner
    // destructor so owner.destroy() unhooks all reactors.
    //
    // The reactor also self-unsubscribes once the target element has been
    // attached to the document and then stayed detached for a few ticks.
    // Without this, when the caller passes a synthetic owner ({} — the
    // documented default for renderComponent), registerDestructor below
    // silently fails on the plain object, leaving the reactor live across
    // tests; on the next test's classic-tag dirty (e.g. typing in a
    // textarea) the leaked reactor would fire _doRender on the prior
    // test's detached target and clobber shared GXT sync state via
    // __gxtSyncDomNow. The "can render in to a detached element" test
    // creates an element that is NEVER attached during the reactor's
    // lifetime, then attaches it later — _hasBeenConnected stays false
    // until the attach, so we keep firing pre-connection. This mirrors
    // the LinkTo path in gxt-backend/manager.ts.
    let reactorInitialized = false;
    let _hasBeenConnected = false;
    let _disconnectedTicks = 0;
    {
      const fireReactor = () => {
        if (destroyed) return;
        try {
          _doRender();
        } catch {
          /* ignore individual reactor errors */
        }
        // After re-render, flush GXT DOM so the new text content is visible
        try {
          const syncNow = (globalThis as any).__gxtSyncDomNow;
          if (typeof syncNow === 'function') syncNow();
        } catch {
          /* ignore */
        }
      };
      classicReactorUnsub = registerClassicReactor(() => {
        if (destroyed || !reactorInitialized) return;
        if (targetElement instanceof Element) {
          if (targetElement.isConnected) {
            _hasBeenConnected = true;
            _disconnectedTicks = 0;
          } else if (_hasBeenConnected) {
            // Was connected, now detached: count grace ticks then bail.
            _disconnectedTicks++;
            if (_disconnectedTicks > 4) {
              try {
                classicReactorUnsub?.();
              } catch {
                /* ignore */
              }
              classicReactorUnsub = null;
              destroyed = true;
            }
            // Skip rendering into a detached target either way.
            return;
          }
          // else: never connected — fall through (legitimate
          // detached-element use case).
        }
        fireReactor();
      }, '_renderComponentGxt');
    }

    try {
      // Render the template into the target (initial render)
      if (wasRendering) {
        (globalThis as any).__gxtSkipTextEffects = true;
      }
      if (typeof _withRendering === 'function') {
        _withRendering(() => {
          renderIntoRegion(template, renderContext);
        });
      } else {
        renderIntoRegion(template, renderContext);
      }
    } finally {
      (globalThis as any).__gxtSkipTextEffects = prevSkipTextEffects;
      // Arm the reactor: from now on, classic-tag dirties will trigger
      // _doRender. This is done in `finally` so that any tag dirties
      // that happened DURING initial render (e.g. from component init
      // writing @tracked fields) do not retroactively trigger a
      // spurious re-render after the render completes.
      reactorInitialized = true;
    }

    // Flush queued didInsertElement / didRender hooks
    try {
      flushAfterInsertQueue();
    } catch {
      // Ignore flush errors in renderComponent context
    }
    flushRenderErrors();
  } finally {
    (globalThis as any).owner = prevOwner;
  }

  const result: RenderResult = { destroy: doDestroy };
  entry.result = result;
  if (targetState) {
    targetState.entries.unshift(entry);
  }
  RENDER_CACHE.set(into, { result, glimmerResult: undefined });

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
  if (__GXT_MODE__) {
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
      console.log(
        '[Renderer.appendTo] called with view type:',
        view?.constructor?.name || typeof view
      );
      console.log(
        '[Renderer.appendTo] view has layoutName:',
        'layoutName' in (view || {}),
        'value:',
        (view as any)?.layoutName
      );
    }

    // Direct GXT rendering for ClassicComponents was tried (the disabled
    // `_tryGxtRender` triplet) but couldn't inject $slots/$fw/block params
    // through Ember's component integration. ClassicRootState handles GXT
    // templates in __GXT_MODE__ via templateIsGxt, so this path always falls
    // through to Glimmer VM regardless of mode.
    let definition = new RootComponentDefinition(view);
    this._appendDefinition(
      view,
      curry(0 as CurriedComponent, definition, this.state.owner, null, true),
      target
    );
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
    const ctx = this.state.context;
    // In GXT mode the Glimmer VM is bypassed, so the ProgramConstants'
    // component/helper/template counters never advance. The runtime-resolver
    // cache test (`ember-glimmer runtime resolver cache`) reads these to
    // verify caching behaviour. Mirror the counters onto the live context
    // from the GXT-side tracker so the assertions see the same changes.
    //
    // Slice-78 (Cluster B): routes through the typed-bridge getter
    // `compilePipeline.getResolverCacheCounters?.()` rather than the
    // pre-slice-78 `(globalThis as any).__gxtResolverCacheCounters` slot.
    // The bridge returns the live module-local reference declared in
    // `gxt-backend/ember-gxt-wrappers.ts:249` (see the slice-78 docblock
    // there). Optional-chain short-circuits to `undefined` if the bridge
    // is not yet installed (load-order edge — classic-Ember build) or if
    // the `__GXT_MODE__` gate is true but the gxt-backend hasn't loaded
    // yet; both edges preserve the pre-slice-78 truthy-guard semantics.
    if (__GXT_MODE__) {
      const counters = getGxtRenderer()?.compilePipeline.getResolverCacheCounters?.();
      if (counters && ctx && (ctx as any).constants) {
        const constants = (ctx as any).constants as {
          componentDefinitionCount: number;
          helperDefinitionCount: number;
          modifierDefinitionCount: number;
        };
        constants.componentDefinitionCount = counters.componentDefinitionCount || 0;
        constants.helperDefinitionCount = counters.helperDefinitionCount || 0;
        constants.modifierDefinitionCount = counters.modifierDefinitionCount || 0;
      }
    }
    return ctx;
  }

  register(view: any): void {
    let id = getViewId(view);
    // In GXT mode, view registration can conflict during force-rerender (morph)
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
