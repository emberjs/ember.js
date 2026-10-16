/**
 * GXT Component Manager for Ember.js Integration
 *
 * This module provides the bridge between GXT's rendering system and Ember's
 * component model. It handles:
 * - Classic curly component rendering with wrapper elements
 * - Component instance caching for stable identity across re-renders
 * - Lifecycle hooks (didInsertElement, didReceiveAttrs, etc.)
 * - Parent view stack management for childViews
 * - String-based component resolution from the Ember registry
 */

import { DEBUG } from '@glimmer/env';
import { assert, getDebugFunction, warn } from '@ember/debug';
import {
  pascalToKebab,
  isAllDigits,
  hasUpperCase,
  dasherize,
  doubleColonToSlash,
  constructStyleDeprecationMessage,
  isAssertionLike as _isAssertionLike,
  protectGlobal,
  capabilitiesErrorPrefix,
  keepArgValue,
  sanitizedAttrValue,
  nearestTemplateKind,
  argumentValue,
  isReadingArgumentReference,
  setMutArgumentSources,
} from './utils';
// Expose the Ember assert function on globalThis so the validator compat can use it
// for backtracking detection. The assert function is stub-able via setDebugFunction
// which is what expectAssertion() hooks into.
Object.defineProperty(globalThis, '__emberAssertFn', {
  get() {
    return getDebugFunction('assert');
  },
  configurable: true,
});
// Direct assert function — a wrapper that always calls the current (possibly stubbed)
// assert. Unlike __emberAssertFn which returns the function for later call, this
// wrapper is called immediately and uses the ESM live binding of `assert`.
setEmberAssertDirect(function (msg: string, test: unknown) {
  assert(msg, test);
});
// Import directly from utils to avoid pulling in the full @ember/-internals/views
// barrel export (which triggers circular dependency issues with CoreView/Mixin)
import {
  setViewElement,
  setElementView,
  getViewElement,
  getElementView,
  addChildView as _addChildView,
  initChildViews as _initChildViews,
  getViewId,
} from '@ember/-internals/views/lib/system/utils';
import { getOwner as _glimmerGetOwner } from '@glimmer/owner';
import { _getCurrentRunLoop, join, scheduleOnce } from '@ember/runloop';

import { CustomHelperManager, FunctionHelperManager, FROM_CAPABILITIES } from './helper-manager';
import {
  gxtCaptureDebugNodes,
  gxtCreateDebugNode,
  gxtDebugParent,
  gxtIsArgumentCaptureError,
  gxtLexicalName,
  gxtReleaseDebugNode,
  gxtWithDebugParent,
  type GxtDebugArgs,
  type GxtDebugNode,
} from './debug-render-tree';
// Spec-level symbols may come from the `@glimmer/validator` barrel (present in
// BOTH the real validator and the GXT shim — the classic build resolves the
// real package since the GXT alias only exists under GXT_MODE).
import { createUpdatableTag as _gxtCreateUpdatableTag } from '@glimmer/validator';
// Bridge-only symbols exist ONLY on the shim — import them relatively so the
// classic build (which bundles gxt-backend runtime-gated) can still bind.
// Under GXT_MODE `@glimmer/validator` aliases to this same file, so this is
// the identical module instance either way.
import {
  beginBacktrackingFrame,
  endBacktrackingFrame,
  beginRenderPassReads,
  endRenderPassReads,
  outsideRenderPassReads,
  untrackedForRenderPass,
  touchClassicBridge as _gxtTouchClassicBridge,
  registerClassicReactor as _gxtRegisterClassicReactor,
  consumeTag as _classicConsumeTagHook,
  tagFor as _classicTagForHook,
  dirtyTagFor as _validatorDirtyTagFor,
  argumentTag as _classicArgumentTag,
  withArgPropagation,
} from './validator';
import {
  createConstRef as _createConstRef,
  valueForRef as _valueForRefForManager,
  REFERENCE as _REFERENCE_FOR_MANAGER,
} from '@glimmer/reference';
// @ts-ignore - direct path to share the same module instance as compile.ts
import {
  runDestructors as _gxtRunDestructors,
  formula as _gxtFormula,
  effect as _gxtEffect,
  cellFor as _gxtCellFor,
  setTracker as _gxtSetTracker,
  getTracker as _gxtGetTracker,
  // gxt's property tag (a tag that holds no value, so creating it reads
  // nothing; a classic dirtyTagFor invalidates it).
  tagFor as _gxtPropertyTag,
  cached as _gxtCached,
  setOpcodeErrorReporter as _gxtSetOpcodeErrorReporter,
  setComponentRenderErrorReporter as _gxtSetComponentRenderErrorReporter,
  // Synchronously flush a cell's opcodes (used by the fine-grained
  // custom-managed arg effect to update a CP-backed text node from inside the
  // sync drain).
  flushCellOpcodes as _gxtFlushCellOpcodes,
  // Host hooks and host managers: the gxt runtime calls what is registered
  // here instead of reading `globalThis.__gxt*` slots.
  registerHostHooks as _gxtRegisterHostHooks,
  registerHostManagers as _gxtRegisterHostManagers,
  // gxt's render-context keys for the slots and the forwarded-attributes tuple.
  $SLOTS_SYMBOL,
  $PROPS_SYMBOL,
  // gxt's component args object (named args, slots, forwarded attributes).
  $_args as _gxtArgs,
  // gxt's component invocation, its template-function preamble and slot
  // rendering, the instance-field key of a class-body `<template>`, and the
  // destructors gxt runs when it tears a render-tree node down.
  $_c as _gxtC,
  $_tag as _gxtTag,
  $_GET_ARGS as _gxtGetArgs,
  $_GET_SLOTS as _gxtGetSlots,
  $_slot as _gxtSlot,
  $_fin as _gxtFin,
  $template as _gxtTemplateKey,
  registerDestructor as _gxtRegisterDestructor,
  // A render-tree node's identity in gxt's tree.
  COMPONENT_ID_PROPERTY as _gxtComponentIdKey,
  cId as _gxtComponentId,
} from '@lifeart/gxt';
// The members of `@lifeart/gxt` that glimmer-package call sites read through
// the typed bridge as `gxtLib` (see the setGxtRenderer install at file EOF).
// Named imports, not the namespace object: a namespace that escapes into a
// value pins every gxt export (and the rehydration chunk) in the app bundle.
import {
  HTMLBrowserDOMApi as _gxtLibHTMLBrowserDOMApi,
  destroyElementSync as _gxtLibDestroyElementSync,
  createRoot as _gxtLibCreateRoot,
  provideContext as _gxtLibProvideContext,
  RENDERING_CONTEXT as _gxtLibRenderingContext,
  getParentContext as _gxtLibGetParentContext,
  setParentContext as _gxtLibSetParentContext,
  captureRenderTree as _gxtLibCaptureRenderTree,
  renderComponent as _gxtLibRenderComponent,
  Component as _gxtLibComponent,
  RENDERED_NODES_PROPERTY as _gxtLibRenderedNodesProperty,
} from '@lifeart/gxt';
// A property read as Glimmer's getProp reads it, as gxt's `$__tag` does (the
// bridge's `gxtLib.readProperty`): `obj[key]`, read once, and the reading frame
// consumes the property's tag, so it depends on that property (a classic
// `set()` / `notifyPropertyChange()` dirties the tag) and on what the read
// itself consumes (a tracked getter, a `trackedObject` key). The validator
// shim's `tagFor` would create a formula over the property instead, which reads
// it again.
function _gxtReadProperty(obj: object, key: string): unknown {
  const tracker = _gxtGetTracker();
  if (tracker !== null) tracker.add(_gxtPropertyTag(obj, key));
  return (obj as Record<string, unknown>)[key];
}
// Reports, in DEBUG, an error that an eager read dropped: the read covers a
// value Glimmer reads lazily or not at all (for dependency tracking, or to
// name a property in a message), and the template's own read of such a value
// throws to the render.
function _gxtReportDroppedRead(what: string, error: unknown): void {
  if (DEBUG) {
    warn(`${what} threw: ${String(error)}`, false, { id: 'ember-gxt.dropped-read' });
  }
}
// The DOM api of the compat renderers (the bridge's `gxtLib.HTMLBrowserDOMApi`).
// A text-content update of an element whose content is one text node changes
// that node's value, as Glimmer updates a text node in place: gxt's api sets
// `textContent`, which replaces the element's children, so the element's text
// was a new node after every update.
class _EmberGxtDOMApi extends _gxtLibHTMLBrowserDOMApi {
  override textContent(node: Node, text: string): void {
    const only = node.firstChild;
    if (only !== null && only === node.lastChild && only.nodeType === 3) {
      only.nodeValue = text;
    } else {
      node.textContent = text;
    }
  }
}
// Single-instance guard: the GXT reactive graph (cells, trackers, opcode
// queues) is module-instance state, so two copies of @lifeart/gxt in one
// page silently fork reactivity — registrations land in one copy's
// registries while the renderer consults the other. Duplicate copies come
// from dependency-layout mistakes: an app bundling its own @lifeart/gxt at a
// different version than ember-source-gxt's pin, an npm nested install
// resolving the two import sites to different files, or a bundler config
// missing `resolve.dedupe`. Fail loudly at load instead. The sentinel is a
// `Symbol.for` registry key, not mutable program state.
{
  const sentinel = Symbol.for('lifeart.gxt.instance');
  const g = globalThis as Record<symbol, unknown>;
  const existing = g[sentinel];
  // Identity token of this @lifeart/gxt module instance: its `cellFor`
  // (module-singleton state behind it), not the namespace object (see above).
  if (existing !== undefined && existing !== _gxtCellFor) {
    throw new Error(
      'Two copies of @lifeart/gxt loaded in the same page. The GXT reactive ' +
        'graph is a per-module singleton, so duplicate copies fork reactivity ' +
        'silently. Ensure the app resolves a SINGLE @lifeart/gxt: match the ' +
        "exact version pinned by ember-source-gxt and add `resolve.dedupe: ['@lifeart/gxt']` " +
        'to the Vite config (see smoke-tests/v2-app-gxt-template/vite.config.mjs).'
    );
  }
  g[sentinel] = _gxtCellFor;
}
import {
  destroy as _destroyDestroyable,
  destroySyncNow as _destroySyncNow,
  registerDestructor as _registerDestructor,
  isDestroying as _isDestroying,
} from './destroyable';

/**
 * Wrap a `_gxtEffect(cb)` call so that the effect's cleanup runs when `owner`
 * is destroyed (via Ember's destroyable plumbing in ./destroyable). This ties
 * the effect's lifetime to the owning component instance, render-context, or
 * element, so its formula doesn't outlive the owner.
 *
 * `owner` may be undefined / non-destroyable (e.g. a freshly-created HTML
 * element) — in that case the cleanup is unreachable from the destroyable
 * graph. Callers should pick the closest destroyable in scope (component
 * instance / render context).
 */
function _gxtEffectWithOwner(owner: object | null | undefined, cb: () => void): () => void {
  const cleanup = _gxtEffect(cb);
  let cleaned = false;
  // gxt's effect cleanup destroys the effect's formulas and unsubscribes it;
  // the callbacks passed here return no cleanup of their own.
  const wrapped = () => {
    if (cleaned) return;
    cleaned = true;
    cleanup();
  };
  if (owner && typeof owner === 'object') {
    if (!_isDestroying(owner)) {
      _registerDestructor(owner, wrapped);
    } else {
      // Owner is already tearing down — run cleanup immediately so we
      // don't leak the formula.
      wrapped();
    }
  }
  return wrapped;
}

// The most recently created Ember component instance, for $_dc_ember
// lifecycle tracking.
let _lastCreatedEmberInstance: any = null;
function setInstanceCapture(inst: any) {
  _lastCreatedEmberInstance = inst;
}
/**
 * Exported for compile.ts to peek at the most-recent instance captured by
 * `setInstanceCapture` (typically called from `renderClassicComponent` /
 * `renderGlimmerComponent` below). Returns `null` when the last render path
 * was a template-only component (renderGlimmerComponent passes `null`).
 */
export function peekInstanceCapture(): any {
  return _lastCreatedEmberInstance;
}
// Synchronous destroy of a modifier's destroyable, for the pending-modifier
// destroys (`_gxtDestroyPendingModifiers`): classic Ember removes an `{{on}}`
// listener synchronously with its element (see destroySyncNow's doc in
// destroyable.ts).
const _gxtDestroyModifierDestroyable = _destroySyncNow;

// PROPERTY_DID_CHANGE symbol — imported lazily to avoid circular dependency
import { PROPERTY_DID_CHANGE, TrackedDescriptor } from '@ember/-internals/metal';
import { peekMeta } from '@ember/-internals/meta';
import { _instrumentStart as _gxtInstrumentStart } from '@ember/instrumentation';
export { CustomHelperManager, FunctionHelperManager, FROM_CAPABILITIES } from './helper-manager';
// Expose PROPERTY_DID_CHANGE on globalThis so ember-gxt-wrappers.ts can install
// change hooks on helper instances for tracked property reactivity.
// Deferred to avoid "before initialization" error from circular imports.
queueMicrotask(() => {
  (globalThis as any).PROPERTY_DID_CHANGE = PROPERTY_DID_CHANGE;
});

const DEFAULT_HELPER_MANAGER = new CustomHelperManager(() => new FunctionHelperManager());

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ComponentFactory {
  create: (options: any) => any;
  class?: any;
}

interface PoolEntry {
  instance: any;
  claimed: boolean;
  updatedThisPass: boolean; // Track if we've already run update hooks this pass
  // When this entry was created inside an `{{#each}}` iteration, this holds
  // the row's item identity (from the each block param). Allows the pool
  // lookup to match by row rather than by sequential position, so destroying
  // a middle item doesn't cause a position-slide that misreports IDs in
  // `willDestroyElement` hooks.
  eachRowKey?: any;
}

// =============================================================================
// Symbols and Constants
// =============================================================================

// GXT uses the plain string 'args' as the key ($args = 'args' in shared.ts)
const $ARGS_KEY = 'args';

// GXT internal keys that should NOT appear in user-visible args/attrs objects.
// These are set by compile.ts / manager.ts on the args object for internal plumbing.
const GXT_INTERNAL_ARG_KEYS = new Set([
  '$slots',
  '$fw',
  '$_scope',
  '$_eval',
  '$_hasBlock',
  '$_hasBlockParams',
  '__thunkId',
  'named',
  'positional',
  'hash',
]);

/** Returns true if `key` is a GXT internal arg key that should be hidden from user code. */
function _isGxtInternalArgKey(key: string): boolean {
  if (GXT_INTERNAL_ARG_KEYS.has(key)) return true;
  if (key.startsWith('$_')) return true;
  // Filter __xxx__ double-underscore internal keys EXCEPT __hasBlock__ and __hasBlockParams__
  // which are needed for component block detection.
  if (key.startsWith('__') && key !== '__hasBlock__' && key !== '__hasBlockParams__') return true;
  return false;
}

// Auto-incrementing ID for wrapper elements
let emberViewIdCounter = 0;

// WeakMap-backed storage for render-context arg local-override state.
// Keyed by instance, then by property key. Stored fields:
//   localVal: current local value after incrementProperty / this.set(...)
//   useLocal: whether to return localVal vs. the arg getter
// This survives createRenderContext re-invocations even when the descriptor
// is replaced by cellFor(obj, key, false) or other reactive reinstallers.
const _rcArgState = new WeakMap<
  object,
  Map<string, { localVal: any; useLocal: boolean; currentGetter?: (() => any) | null }>
>();
function _getRcArgState(
  instance: object,
  key: string
): { localVal: any; useLocal: boolean; currentGetter?: (() => any) | null } | undefined {
  const m = _rcArgState.get(instance);
  return m ? m.get(key) : undefined;
}
function _setRcArgState(
  instance: object,
  key: string,
  state: { localVal: any; useLocal: boolean; currentGetter?: (() => any) | null }
): void {
  let m = _rcArgState.get(instance);
  if (!m) {
    m = new Map();
    _rcArgState.set(instance, m);
  }
  m.set(key, state);
}

// =============================================================================
// CurriedComponent — represents a component + pre-bound (curried) arguments
// =============================================================================

/**
 * Create a curried component — a callable function that wraps a component
 * with pre-bound arguments. Curried components can be nested (re-curried)
 * and rendered in template positions.
 */
export function createCurriedComponent(
  nameOrComponent: string | Function | any,
  args: Record<string, any>,
  positionals: any[] = []
): any {
  let name: string | Function;
  let curriedArgs: Record<string, any>;
  let curriedPositionals: any[];

  if (nameOrComponent && nameOrComponent.__isCurriedComponent) {
    // Nested currying — merge args and positionals.
    name = nameOrComponent.__name;
    curriedArgs = { ...nameOrComponent.__curriedArgs, ...args };
    curriedPositionals = [...nameOrComponent.__curriedPositionals, ...positionals];
  } else {
    name = nameOrComponent;
    curriedArgs = { ...args };
    curriedPositionals = [...positionals];
  }

  // Create a callable function so GXT can invoke it like a component/helper.
  // When called by GXT (e.g., from let block resolution or {{object.comp args}}),
  // render the component. If called with an args object, merge it with curried args.
  const curried = function curriedComponentFn(...runtimeArgs: any[]) {
    const managers = $_MANAGERS;
    if (managers?.component?.canHandle?.(curried)) {
      // Check if runtime args include named args (from GXT calling curried({key: value}))
      let invocationArgs: any = {};
      if (
        runtimeArgs.length > 0 &&
        runtimeArgs[0] &&
        typeof runtimeArgs[0] === 'object' &&
        !Array.isArray(runtimeArgs[0])
      ) {
        invocationArgs = runtimeArgs[0];
      } else if (runtimeArgs.length > 0) {
        // Positional args (e.g., curried(1, 2, 3) from {{foo 1 2 3}})
        // Map them to __pos0__, __pos1__, etc. for the component manager
        for (let i = 0; i < runtimeArgs.length; i++) {
          const val = runtimeArgs[i];
          invocationArgs[`__pos${i}__`] = val;
        }
        invocationArgs.__posCount__ = runtimeArgs.length;
      }

      const handleResult = managers.component.handle(curried, invocationArgs, null, null);
      // Extract rendered DOM from the component result.
      let rendered = typeof handleResult === 'function' ? handleResult() : handleResult;
      // If the result is already a DOM Node (e.g., wrapper div from classic component),
      // return it directly — GXT's renderElement handles Node insertion.
      if (rendered instanceof Node) {
        return rendered;
      }
      // Extract rendered DOM from ComponentReturnType objects (Symbol('nodes'))
      if (rendered && typeof rendered === 'object') {
        const sym = Object.getOwnPropertySymbols(rendered).find((s) => Array.isArray(rendered[s]));
        if (sym) {
          const nodes = rendered[sym];
          if (nodes.length > 0) {
            const frag = document.createDocumentFragment();
            for (const n of nodes) {
              if (n instanceof Node) frag.appendChild(n);
            }
            return frag;
          }
        }
      }
      return rendered;
    }
    return undefined;
  };

  curried.__isCurriedComponent = true;
  curried.__name = name;
  curried.__curriedArgs = curriedArgs;
  curried.__curriedPositionals = curriedPositionals;
  // Capture the current owner so it can be used as fallback during re-evaluation
  // when the ambient owner may be null (e.g., dash-prefixed contextual components).
  curried.__owner =
    (nameOrComponent && nameOrComponent.__isCurriedComponent && nameOrComponent.__owner) ||
    getAmbientOwner();

  return curried;
}

// Registered on the bridge; ember-gxt-wrappers contributes the resolver-cache
// counting wrapper via setCreateCurriedComponentWrapper, composed lazily at
// first use.
setCreateCurriedComponent(createCurriedComponent);
// `captureRenderError` is exposed via `compilePipeline.captureRenderError`;
// see the setGxtRenderer install at file EOF.

// Wire opcode-layer errors into the existing _renderErrors queue. GXT's
// handleOpcodeError splices a failing opcode out of its op array; wiring the
// reporter lets the host receive the error too, so it can surface through
// assert.throws / runTask / etc. alongside the lifecycle-layer captures.
_gxtSetOpcodeErrorReporter((err) => {
  captureRenderError(err);
});

// Wire GXT's component-construction reporter. Fires for errors thrown inside
// GXT's `_component()` — i.e., when the throw path actually reaches GXT's
// component() machinery. Classic-Ember init-throws bypass it (they propagate
// through manager.ts's classic-component closures directly), so this reporter
// does not replace the captureRenderError wraps in renderClassicComponent /
// handleClassicComponent. It does catch construction errors for GXT-native
// components used directly in templates ($_c-resolved closures that throw
// inside _component). The reporter:
//   1. Calls captureRenderError so the error queues for flushRenderErrors
//      and the renderer's render-error count (which drives its DOM-clear logic).
//   2. Re-throws to bypass GXT's silent dev/prod recovery substitution.
_gxtSetComponentRenderErrorReporter((err) => {
  if (err instanceof Error) {
    captureRenderError(err);
  }
  throw err;
});

// Classic Helper recompute() → GXT reactivity bridge.
//
// Classic Ember Helper instances (subclasses of `@ember/component/helper`) use
// a Glimmer DirtyableTag stored under the RECOMPUTE_TAG symbol. When user code
// calls `helper.recompute()`, Glimmer dirties that tag. However, GXT's effect
// system does not observe Glimmer tags — its reactivity is driven by GXT cells
// (`cellFor` / `cell()`), so a recompute() call would leave the helper text
// node stale.
//
// compile.ts's class-based helper path reads `recomputeTag.value` inside a
// `gxtEffect(...)` closure, expecting that read to act as a reactive dep, but
// a `DirtyableTag` has no `.value` property at all — the read tracks nothing.
//
// To bridge this: whenever a class-based helper instance is pushed onto
// compile.ts's helper-instance list (`pushHelperInstance`), we install a real
// GXT cell on its RECOMPUTE_TAG object under the `value` key, so compile.ts's
// `recomputeTag.value` read tracks the cell. We also patch `recompute()` on
// the instance so that after the original runs (which fires `dirtyTag` for
// Glimmer's sake), we bump the GXT cell and call
// `compilePipeline.triggerReRender(recomputeTag, 'value')`. That re-runs
// compile.ts's `gxtEffect`, the dedup key in `_tagHelperInstanceCache`
// invalidates, and `compute()` runs again.
// =============================================================================

function _installHelperRecomputeBridge(instance: any): void {
  if (!instance || typeof instance !== 'object') return;
  if ((instance as any).__gxtHelperRecomputeBridgeInstalled) return;
  // The bridge marks and patches the instance.
  if (!Object.isExtensible(instance)) return;

  // Glimmer's RECOMPUTE_TAG on the instance (classic Helper only).
  const recomputeTag: any = getGxtRenderer()!.compilePipeline.getHelperRecomputeTag!(instance);

  if (!recomputeTag || typeof recomputeTag !== 'object') return;

  // Mark early so repeated pushes don't re-install.
  (instance as any).__gxtHelperRecomputeBridgeInstalled = true;

  // Install a real, scalar `value` property on the tag object (initial 0) and
  // route it through a GXT cell so reads are tracked by gxtEffect.
  // Use defineProperty first so cellFor(skipDefine=false) sees an enumerable
  // property it can wrap with a cell-backed getter/setter. (A `createTag()`
  // tag is a plain object whose own configurable `value` accessor reads a
  // cell.)
  if (!Object.prototype.hasOwnProperty.call(recomputeTag, 'value')) {
    (recomputeTag as any).value = 0;
  }
  _gxtCellFor(recomputeTag, 'value', /* skipDefine */ false);

  // Bump the tag's scalar so the cell's update() path fires and the tracked
  // revision changes (the setter installed by cellFor updates the underlying
  // GXT cell, which notifies dependents), and re-render what read it. The tag
  // is the shim's own object: no getter, computed property or render context
  // of a user's is behind it.
  const bumpTag = (helper: any) => {
    const rt = helper && helper.__gxtRecomputeTagRef;
    if (rt) {
      rt.value = ((rt.value as number) || 0) + 1;
      // Suppression is handled inside compile.ts's `_gxtTriggerReRender`.
      getGxtRenderer()?.compilePipeline.triggerReRender?.(rt, 'value');
    }
  };

  // Patch recompute() on the instance so it also bumps the GXT cell and
  // triggers a GXT re-render, instead of relying on the classic Glimmer
  // dirtyTag pipeline.
  const origRecompute = (instance as any).recompute;
  if (typeof origRecompute === 'function' && !origRecompute.__gxtPatched) {
    const patched = function (this: any, ...args: any[]) {
      let result: any;
      try {
        result = origRecompute.apply(this, args);
      } catch (e) {
        // Preserve original error after bumping so gxtEffect still re-runs.
        bumpTag(this);
        throw e;
      }
      bumpTag(this);
      // Also invalidate the $_maybeHelper cache in ember-gxt-wrappers.ts
      // (classHelperInstanceCache) so the next render pass re-runs
      // delegate.getValue(bucket), which calls compute() with fresh state.
      // The cache is keyed by helper name and short-circuits when args
      // haven't changed — which is exactly the case after recompute().
      getGxtRenderer()?.compilePipeline.notifyHelperPropertyChange?.(this, '__gxtRecomputeTagRef');
      // Force a full re-render so the formula that reads the helper's
      // cell value picks up the new computed result; invalidating the cache
      // alone doesn't trigger formula re-evaluation. Mark a pending sync and a
      // nested-object change so force-rerender traverses the full tree (it
      // skips that when only a tracked property on a component mutated).
      // What the re-render throws (a helper's compute) reaches the caller of
      // recompute().
      getGxtRenderer()?.compilePipeline.setHadPendingSync?.(true);
      getGxtRenderer()?.compilePipeline.setHadNestedObjectChange?.(true);
      getGxtRenderer()?.compilePipeline.forceEmberRerender?.();
      // recompute() called OUTSIDE a runloop has no runloop-end to flush
      // the GXT DOM sync. The recomputeTag cell was just dirtied
      // (triggerReRender above) and the helper text effect is subscribed
      // to it, so flush the sync synchronously here to update the DOM.
      {
        const _sync = getGxtRenderer()?.compilePipeline.syncDomNow;
        if (typeof _sync === 'function') _sync();
      }
      return result;
    };
    (patched as any).__gxtPatched = true;
    (instance as any).recompute = patched;
    // Stash the tag reference so the patched recompute can reach it without
    // re-scanning symbol keys on every call.
    (instance as any).__gxtRecomputeTagRef = recomputeTag;
  }
}

// Register `_installHelperRecomputeBridge` so it runs for every helper
// instance pushed onto compile.ts's helper-instance list (before the push).
//
// compile.ts loads after manager.ts (it imports `peekInstanceCapture` from
// here), so the bridge is not yet installed at this point in module init. The
// microtask defers registration until compile.ts's `installCompilePipelinePart`
// has run, well before any render fires a push. Registering twice is benign.
//
// Classic-only: the recompute bridge exists solely for classic
// `@ember/component/helper` (Ember.Helper subclasses with `this.recompute()` /
// the Glimmer RECOMPUTE_TAG); native GXT helpers never recompute() this way.
// Gating on __GXT_CLASSIC_COMPONENTS__ lets native builds tree-shake
// `_installHelperRecomputeBridge`.
if (__GXT_CLASSIC_COMPONENTS__) {
  queueMicrotask(() => {
    getGxtRenderer()?.compilePipeline.setHelperInstancePushHook?.(_installHelperRecomputeBridge);
  });
}

// =============================================================================
// Global Registries
// =============================================================================

// The manager/template registries are module-local WeakMaps; cross-package
// readers (glimmer renderer/root, compile.ts) reach them through the typed
// `registries` bridge namespace. A second copy of this module would fork
// every module-local, so it fails loudly at load instead.
{
  const sentinel = Symbol.for('ember.gxt-backend.instance');
  const g = globalThis as Record<symbol, unknown>;
  if (g[sentinel] !== undefined) {
    throw new Error(
      'Two copies of the ember-source GXT backend loaded in the same page. ' +
        'The manager/template registries are module-instance state, so a ' +
        'duplicate copy forks component/helper/modifier resolution silently. ' +
        'Ensure a SINGLE ember-source resolves (check bundler aliases and ' +
        'node_modules layout).'
    );
  }
  g[sentinel] = true;
}
const COMPONENT_TEMPLATES = new WeakMap<object, any>();
const COMPONENT_MANAGERS = new WeakMap<object, any>();
const INTERNAL_MANAGERS = new WeakMap<object, any>();
const INTERNAL_HELPER_MANAGERS = new WeakMap<object, any>();
const INTERNAL_MODIFIER_MANAGERS = new WeakMap<object, any>();

// Per-instance memo cache for GXT `cached()` wrappers around pure Ember
// getters. Survives across createRenderContext() re-invocations so repeated
// reads of the same pure getter across render passes reuse the cached
// wrapper's memoized value when deps haven't bumped.
const __gxtPureGetterCache: WeakMap<object, Map<string, any>> = new WeakMap();
// Expose FROM_CAPABILITIES on globalThis so ember-gxt-wrappers.ts can validate capabilities
(globalThis as any).FROM_CAPABILITIES = FROM_CAPABILITIES;

// =============================================================================
// Custom Managed Component Instance Tracking (for destructor support)
// =============================================================================

interface CustomManagedEntry {
  // A DOM node belonging to the component (for disconnect detection); null
  // when it rendered no nodes.
  node: Node | null;
  // The dynamic content the component's nodes start with, when they start
  // with one: the component is in the document while that content is.
  region: DynamicRegion | null;
  // Runs the manager's `destroyComponent` (and `release`).
  destroyFn: () => void;
  // Takes the component out of its instance pool, so no render reuses it.
  release: () => void;
  destroyed: boolean;
  // The order the components are destroyed in: the order they were created
  // in, the components a block's teardown destroys put in document order
  // among themselves (`_orderInDocument`).
  order: number;
  // The block the component was rendered in (`_gxtBlockOf`).
  block: object | null;
  // Its block was destroyed: it waits in `_componentsOfDestroyedBlocks`.
  blockDestroyed: boolean;
}

// The content of a dynamic component invocation (ember-gxt-wrappers.ts
// `followDefinition`): `first()` is the first node of what it renders now. A
// change of definition replaces its nodes, so a component whose template
// starts with it (its first node was the content's first node) is not gone
// when that node is.
interface DynamicRegion {
  first(): Node;
}

// The dynamic content each first node starts. Read when a component is
// tracked, right after its render, so it maps the first node to the
// outermost content starting there that the component's template rendered.
const _dynamicRegionByFirstNode = new WeakMap<Node, DynamicRegion>();

// Exposed via the gxt-bridge as `destruction.registerDynamicRegion`.
function _gxtRegisterDynamicRegion(first: Node, region: DynamicRegion): void {
  _dynamicRegionByFirstNode.set(first, region);
}

const _customManagedInstances: CustomManagedEntry[] = [];

// Whether `node` is in an `{{#in-element}}` destination whose block is in the
// document (its placeholder is connected), though the destination itself may
// be detached: the block's content is live, as the classic sweep in
// `_gxtDestroyUnclaimedPoolEntries` also takes it. Once the block goes, its
// content leaves the destination (compile.ts `_inElementRemoveRender`).
function _isInLiveInElementDestination(node: Node): boolean {
  for (let current: Node | null = node; current !== null; current = current.parentNode) {
    if ((current as any).__gxtIsInElementHost) {
      const placeholder: Node | undefined = (current as any).__gxtInElementPlaceholder;
      return placeholder !== undefined && placeholder.isConnected;
    }
  }
  return false;
}

/**
 * Destroy any custom-managed component instances whose DOM nodes are no longer connected.
 * Called during the destroy phase (e.g., after a conditional block removes content).
 *
 * The components of a destroyed block are destroyed with the block
 * (`_gxtDestroyComponentsOfDestroyedBlocks`); this covers the ones whose block
 * is not known to have gone (content a block this file does not track, such
 * as an outlet's, replaced). What a destruction throws (a manager's
 * `destroyComponent`, a destructor) is added to `errors`, and the others
 * still run.
 */
function _gxtDestroyCustomManagedInstances(errors: unknown[]): void {
  for (let i = _customManagedInstances.length - 1; i >= 0; i--) {
    const entry = _customManagedInstances[i]!;
    if (entry.destroyed || entry.blockDestroyed || entry.node === null) continue;
    const node = entry.region !== null ? entry.region.first() : entry.node;
    if (node.isConnected || _isInLiveInElementDestination(node)) continue;
    entry.destroyed = true;
    try {
      entry.destroyFn();
    } catch (error) {
      errors.push(error);
    }
    _customManagedInstances.splice(i, 1);
  }
}

// =============================================================================
// The block a component renders in
// =============================================================================
//
// Glimmer makes a component a destroyable child of the block it renders in
// (`@glimmer/runtime` `associateDestroyable`). Tearing the block down (an
// `{{#if}}` branch, an `{{#each}}` row, a dynamic component's content, a
// render) destroys the components rendered in it and in the blocks created in
// it, in the order they were created, and their managers' scheduled
// destructors (a Glimmer component's `willDestroy`) run before the run loop
// that tore it down ends.
//
// compile.ts renders an `{{#if}}` branch with the ctx gxt destroys when the
// branch goes (its `onConditionBranchSwap` ctx) as the current block, and an
// `{{#each}}` row with its row ctx (`gxtRenderInBlock`). A dynamic component's
// content (ember-gxt-wrappers.ts) and an `{{#in-element}}` render are blocks
// of their own, destroyed with `gxtDestroyBlock`. A render's root is the block
// of what renders in no other. A block is linked to the block it was created
// in: gxt does not tear a block created in a component's template, or in a
// yielded block, down with the block around the component (compat renders
// each template with the shared root as gxt's parent context), so linked
// blocks are destroyed together here.

// What a block holds: the custom-managed components rendered in it and the
// blocks created in it. Made when a component rendered in it, or in a block
// created in it, is tracked.
interface BlockContent {
  components: Set<CustomManagedEntry>;
  blocks: Set<object>;
  destroyed: boolean;
}
let _blockContents = new WeakMap<object, BlockContent>();
// The block each block was created in.
const _blockParents = new WeakMap<object, object>();
// The blocks rendered with `gxtRenderInBlock`: a component invoked with one as
// its ctx (an `{{#each}}` row's) is in that block.
const _knownBlocks = new WeakSet<object>();
// The blocks for which gxt runs `gxtDestroyBlock` when it tears them down.
const _blocksWithDestructor = new WeakSet<object>();
// The block whose content is rendering.
let _gxtCurrentBlock: object | null = null;
// The components of destroyed blocks, until
// `_gxtDestroyComponentsOfDestroyedBlocks` destroys them.
const _componentsOfDestroyedBlocks: CustomManagedEntry[] = [];
let _customManagedOrder = 0;

/**
 * The block a component rendered now is in: the block whose content is
 * rendering, else the root of the render.
 */
export function gxtCurrentBlock(): object | null {
  return _gxtCurrentBlock ?? getGxtRenderer()?.compilePipeline.getRootContext?.() ?? null;
}

/**
 * Render `render` as the content of `block`, a block created in `parent` (the
 * `gxtCurrentBlock()` where it was created): the components it renders are
 * destroyed when `block` or `parent` is.
 */
export function gxtRenderInBlock<T>(block: object, parent: object | null, render: () => T): T {
  _knownBlocks.add(block);
  if (parent !== null && parent !== block && !_blockParents.has(block)) {
    _blockParents.set(block, parent);
  }
  const prev = _gxtCurrentBlock;
  _gxtCurrentBlock = block;
  try {
    return render();
  } finally {
    _gxtCurrentBlock = prev;
  }
}

/**
 * Destroy the custom-managed components rendered in `block` and in the blocks
 * created in it. Inside a sync they are destroyed at its end, once it changed
 * the DOM and ran the insert hooks; outside a sync, now.
 */
export function gxtDestroyBlock(block: object): void {
  const queued = _componentsOfDestroyedBlocks.length;
  _markBlockDestroyed(block);
  _orderInDocument(_componentsOfDestroyedBlocks.slice(queued));
  _gxtDestroyComponentsOfDestroyedBlocksOutsideSync();
}

// Glimmer destroys the components of a block in the order it rendered them,
// which is the order of their nodes in the document. The order compat created
// them in is the same, but for a yielded block it renders before the component
// whose template yields it is created. So while the nodes of the components a
// block's teardown destroys are all in the document (gxt runs a block's
// destructors before it removes the block's nodes), they are destroyed in
// document order: they take the creation-order places among themselves in that
// order.
function _orderInDocument(entries: CustomManagedEntry[]): void {
  if (entries.length < 2) return;
  for (const entry of entries) {
    if (entry.node === null || !entry.node.isConnected) return;
  }
  const places = entries.map((entry) => entry.order).sort((a, b) => a - b);
  entries.sort((a, b) => {
    const position = a.node!.compareDocumentPosition(b.node!);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return a.order - b.order;
  });
  entries.forEach((entry, index) => {
    entry.order = places[index]!;
  });
}

// The block of a component invoked with `ctx`: the row an `{{#each}}` row ctx
// stands for (a component in a row's body may render after the body returned),
// else the block rendering now.
function _gxtBlockOf(ctx: unknown): object | null {
  return ctx !== null && typeof ctx === 'object' && _knownBlocks.has(ctx) ? ctx : gxtCurrentBlock();
}

function _blockContent(block: object): BlockContent {
  let content = _blockContents.get(block);
  if (content === undefined) {
    content = { components: new Set(), blocks: new Set(), destroyed: false };
    _blockContents.set(block, content);
    if (!_blocksWithDestructor.has(block)) {
      _blocksWithDestructor.add(block);
      // gxt runs it when it tears the block down: an `{{#if}}` branch's ctx
      // when the branch goes, a row's ctx when the row goes, a render's root
      // when the render is destroyed.
      _gxtRegisterDestructor(block, () => gxtDestroyBlock(block));
    }
  }
  return content;
}

// A new custom-managed component, destroyed with its block.
function _trackBlockComponent(entry: CustomManagedEntry): void {
  const block = entry.block;
  if (block === null) return;
  const content = _blockContent(block);
  // Link the block to the blocks it was created in, up to one already linked.
  let dead = content.destroyed;
  let child = block;
  let parent = _blockParents.get(child);
  while (!dead && parent !== undefined) {
    const parentContent = _blockContent(parent);
    if (parentContent.destroyed) {
      dead = true;
    } else if (parentContent.blocks.has(child)) {
      break;
    } else {
      parentContent.blocks.add(child);
      child = parent;
      parent = _blockParents.get(child);
    }
  }
  if (dead) {
    // Rendered in a block already destroyed.
    _queueComponentOfDestroyedBlock(entry);
  } else {
    content.components.add(entry);
  }
}

function _queueComponentOfDestroyedBlock(entry: CustomManagedEntry): void {
  if (entry.destroyed || entry.blockDestroyed) return;
  entry.blockDestroyed = true;
  entry.release();
  _componentsOfDestroyedBlocks.push(entry);
}

// The debug render tree nodes (debug-render-tree.ts) of the components rendered
// in each block. They leave the tree when the block is destroyed, as Glimmer's
// debug render tree drops the components of a destroyed block.
const _blockDebugNodes = new WeakMap<object, Set<GxtDebugNode>>();

function _trackDebugNode(block: object | null, node: GxtDebugNode): void {
  if (block === null) return;
  let nodes = _blockDebugNodes.get(block);
  if (nodes === undefined) {
    nodes = new Set();
    _blockDebugNodes.set(block, nodes);
    // gxt runs it when it tears the block down (see `_blockContent`); a block
    // destroyed with `gxtDestroyBlock` releases them in `_markBlockDestroyed`.
    _gxtRegisterDestructor(block, () => _releaseDebugNodes(block));
  }
  nodes.add(node);
}

function _releaseDebugNodes(block: object): void {
  const nodes = _blockDebugNodes.get(block);
  if (nodes === undefined) return;
  _blockDebugNodes.delete(block);
  for (const node of nodes) gxtReleaseDebugNode(node);
}

function _markBlockDestroyed(block: object): void {
  _releaseDebugNodes(block);
  const content = _blockContents.get(block);
  if (content === undefined) {
    // Nothing is tracked in it yet: a component rendered in it later is in a
    // destroyed block.
    _blockContents.set(block, { components: new Set(), blocks: new Set(), destroyed: true });
    return;
  }
  if (content.destroyed) return;
  content.destroyed = true;
  for (const entry of content.components) _queueComponentOfDestroyedBlock(entry);
  content.components.clear();
  const blocks = Array.from(content.blocks);
  content.blocks.clear();
  for (const child of blocks) _markBlockDestroyed(child);
  const parent = _blockParents.get(block);
  if (parent !== undefined) _blockContents.get(parent)?.blocks.delete(block);
}

/**
 * Destroy the components of the destroyed blocks, in the order they were
 * created, in one run loop: Glimmer destroys a block's components as it tears
 * the block down, and their managers' scheduled destructors run before that
 * run loop ends. With no run loop open (the sync after a `runTask`) this is
 * that run loop; inside one, they run when it ends. The blocks their
 * destruction tears down are destroyed in turn. Throws the first error once
 * every component was destroyed.
 */
function _gxtDestroyComponentsOfDestroyedBlocks(): void {
  const errors: unknown[] = [];
  while (_componentsOfDestroyedBlocks.length > 0) {
    const entries = _componentsOfDestroyedBlocks.splice(0).sort((a, b) => a.order - b.order);
    try {
      join(() => {
        for (const entry of entries) {
          if (entry.destroyed) continue;
          entry.destroyed = true;
          const index = _customManagedInstances.indexOf(entry);
          if (index !== -1) _customManagedInstances.splice(index, 1);
          try {
            entry.destroyFn();
          } catch (error) {
            errors.push(error);
          }
        }
      });
    } catch (error) {
      // A scheduled destructor (`willDestroy`) threw when the run loop ended.
      errors.push(error);
    }
  }
  if (errors.length > 0) throw errors[0];
}

function _gxtDestroyComponentsOfDestroyedBlocksOutsideSync(): void {
  if (!getGxtRenderer()?.compilePipeline.isSyncing?.()) {
    _gxtDestroyComponentsOfDestroyedBlocks();
  }
}

// At teardown the custom-managed components still alive are destroyed, as
// destroying a render destroys its components. Meanwhile the run loop does
// not sync (as during a `runTask`): what their destructors change is in a
// render that is going away.
function _gxtDestroyRemainingCustomManagedInstances(): void {
  for (const entry of _customManagedInstances) _queueComponentOfDestroyedBlock(entry);
  const pipeline = getGxtRenderer()?.compilePipeline;
  const runTaskActive = pipeline?.getRunTaskActive?.() ?? false;
  pipeline?.setRunTaskActive?.(true);
  try {
    _gxtDestroyComponentsOfDestroyedBlocks();
  } catch (error) {
    // Queued, as the classic components' teardown errors are
    // (`_gxtDestroyTrackedInstances`).
    captureRenderError(error);
  } finally {
    pipeline?.setRunTaskActive?.(runTaskActive);
  }
  _blockContents = new WeakMap();
}

// =============================================================================
// Parent View Stack
// =============================================================================

/**
 * Stack to track parent views during rendering.
 * When a component renders, it pushes itself onto the stack so child
 * components can access their parentView via getCurrentParentView().
 */
const parentViewStack: any[] = [];

export function pushParentView(view: any): void {
  parentViewStack.push(view);
}

export function popParentView(): any {
  return parentViewStack.pop();
}

function getCurrentParentView(): any | null {
  return parentViewStack.length > 0 ? parentViewStack[parentViewStack.length - 1] : null;
}

// Parent-view stack ops + lightweight view-utils are exposed to sibling
// modules (compile.ts, glimmer/lib/templates/outlet.ts) via the typed
// gxt-bridge — see setGxtRenderer call at EOF.
//
// Capability methods are bound to the underlying push/pop/getElementView/
// getViewElement references hoisted above.
const _gxtBridgePushParentView = (view: object) => pushParentView(view);
const _gxtBridgePopParentView = () => {
  popParentView();
};
const _gxtBridgeGetCurrentParentView = () => getCurrentParentView() as object | null;
const _gxtBridgeGetElementView = (el: Element) => getElementView(el) as object | null;
const _gxtBridgeGetViewElement = (view: object) => getViewElement(view as any) as Element | null;

// =============================================================================
// Style warning dedup
// =============================================================================
//
// Tracks per-element style-binding warning emission so the same element isn't
// warned about twice when both prop() and attr() paths set the attribute, or
// when compile.ts and manager.ts both render the same node. Also suppresses
// all warnings during force-rerender — the initial render already warned.
const _styleWarnedElements = new WeakSet<object>();

function _shouldWarnStyle(element: unknown, _value?: string): boolean {
  if (getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false) return false;
  if (element && typeof element === 'object') {
    if (_styleWarnedElements.has(element as object)) return false;
    _styleWarnedElements.add(element as object);
  }
  return true;
}

/**
 * Rebuild the view-tree parent/child relationships from DOM ancestry.
 *
 * Called after a force-rerender (renderer.ts `_gxtForceEmberRerender`) to fix
 * up views whose parentView was never assigned because the parentViewStack
 * was empty during their creation (the force-rerender path bypasses
 * patchedIf's syncState wrap that pushes the parent). Walks each live view's
 * DOM ancestry to find the nearest ancestor element registered as another
 * view, and wires parentView + _addChildView.
 *
 * Re-entrancy guard: during the rebuild, reading/writing view fields may hit
 * render-context setters that call classicDirtyTagForGuarded →
 * scheduleRevalidate → `_gxtSyncDomNow` → flushAfterInsertQueue →
 * rebuildViewTreeFromDom, an infinite scheduling loop. Guard with a boolean
 * flag, and also short-circuit classicDirtyTagForGuarded while a rebuild is
 * in progress so no fresh revalidates get scheduled from within.
 */
let _rebuildInProgress = false;

// Set true at the top of `_gxtRebuildViewTreeFromDom`, cleared in its
// `finally`; read by `classicDirtyTagForGuarded` below.
let _gxtSuppressDirtyTagForDuringRebuild = false;

// The rebuild-guarded variant of validator.ts's dirtyTagFor: no-ops during
// `_gxtRebuildViewTreeFromDom`. Arg write-backs are not suppressed here —
// dirtyTagFor still marks the tag dirty and bumps the global revision
// (needed for within-sync template re-reads); the rescheduling-only
// suppression lives in validator.ts (`isDirtyInRcSetSuppressed`).
//
// Intra-file dirty sites call this directly; cross-package callers
// (helper-manager's recompute bridge, @ember/routing's router-property
// dirty) use `compilePipeline.classicDirtyTagFor`.
function classicDirtyTagForGuarded(obj: any, key: any) {
  if (_gxtSuppressDirtyTagForDuringRebuild) return;
  return _validatorDirtyTagFor(obj, key);
}

// Exposed as the bridge's `viewUtils.rebuildViewTreeFromDom` (DEBUG-only;
// see `_gxtBridgeRebuildViewTreeFromDom` below). compile.ts contributes an
// `afterRebuildViewTreeFromDom` host hook (which resets `_wrapperIfUserFalse`
// and drains the in-element deferred queue) via `installViewUtilsPart`.
function _gxtRebuildViewTreeFromDom(explicitRegistry?: any): void {
  if (_rebuildInProgress) return;
  _rebuildInProgress = true;
  _gxtSuppressDirtyTagForDuringRebuild = true;
  try {
    const owner = getAmbientOwner();
    // Collect registries from all live pool instances (they know their owner),
    // plus the current ambient owner and any explicit registry passed in. A
    // destroyed owner (one that lingers as an instance's or the ambient owner)
    // resolves nothing: its container's `lookup` asserts.
    const registries = new Set<any>();
    if (explicitRegistry) registries.add(explicitRegistry);
    for (const pool of _allPoolArrays) {
      for (const entry of pool) {
        const inst = entry.instance;
        if (!inst || inst.isDestroyed || inst.isDestroying) continue;
        const instOwner = _glimmerGetOwner(inst) || owner;
        if (!instOwner || instOwner.isDestroyed || instOwner.isDestroying) continue;
        const reg = instOwner.lookup?.('-view-registry:main');
        if (reg) registries.add(reg);
      }
    }
    if (owner && !owner.isDestroyed && !owner.isDestroying) {
      const reg = owner.lookup?.('-view-registry:main');
      if (reg) registries.add(reg);
    }
    if (registries.size === 0) return;

    for (const registry of registries) {
      const viewIds = Object.keys(registry);
      // Pass 1: clear CHILD_VIEW_IDS for every live tagged view with a live
      // element — we're about to repopulate from live DOM ancestry.
      const liveElFor = new Map<any, Element>();
      const disconnectedIds: string[] = [];
      for (const id of viewIds) {
        const view = registry[id];
        if (!view || view.isDestroyed || view.isDestroying) continue;
        // Tagless components (tagName === '') have no wrapper element. Leave
        // their CHILD_VIEW_IDS alone — we can't walk DOM ancestry from them.
        if (view.tagName === '') continue;
        // Prefer document.getElementById(elementId) because setViewElement may
        // still reference a discarded node from a prior force-rerender.
        let el: Element | null = null;
        const elementId: string | undefined = view.elementId || id;
        if (elementId && typeof document !== 'undefined') {
          el = document.getElementById(elementId);
        }
        if (!el) {
          // The view's element mapping (what its `element` getter returns in
          // an interactive renderer; the getter throws in a non-interactive one).
          const cached = getViewElement(view);
          if (cached && (cached as any).isConnected) el = cached as Element;
        }
        if (!el) {
          disconnectedIds.push(id);
          continue;
        }
        liveElFor.set(view, el);
        // Refresh element↔view mapping so pass 2's DOM walk finds this view.
        setElementView(el, view);
        setViewElement(view, el);
        _initChildViews(view);
      }
      // Disconnected tagged views stay in the registry (pool reuse can re-show
      // them), but clear their CHILD_VIEW_IDS so getChildViews doesn't return
      // a stale snapshot of a subtree hidden by {{#if}}.
      for (const id of disconnectedIds) {
        const v = registry[id];
        if (v) _initChildViews(v);
      }
      // Pass 2: walk each live tagged view's DOM ancestry and wire parentView
      // + CHILD_VIEW_IDS on the nearest ancestor that maps to another live view.
      for (const id of viewIds) {
        const view = registry[id];
        if (!view || view.isDestroyed || view.isDestroying) continue;
        if (view.tagName === '') continue;
        const el = liveElFor.get(view);
        if (!el) continue;
        let ancestorView: any = null;
        let node: any = (el as any).parentNode;
        while (node) {
          if (node.nodeType === 1) {
            const candidate = getElementView(node as Element);
            if (
              candidate &&
              candidate !== view &&
              !candidate.isDestroyed &&
              !candidate.isDestroying
            ) {
              // Prefer the registry's view entry (may differ from candidate
              // if instance was replaced/pooled). Falls back to candidate.
              const cid = getViewId(candidate);
              const regEntry = registry[cid];
              ancestorView =
                regEntry && !regEntry.isDestroyed && !regEntry.isDestroying ? regEntry : candidate;
              break;
            }
          }
          node = node.parentNode;
        }
        // Reconcile parentView + CHILD_VIEW_IDS.
        const currentPV = view.parentView;
        if (ancestorView) {
          if (currentPV !== ancestorView) {
            view.parentView = ancestorView;
          }
          _addChildView(ancestorView, view);
        } else if (
          currentPV &&
          !currentPV.isDestroyed &&
          !currentPV.isDestroying &&
          currentPV.tagName === '' &&
          (currentPV._debugContainerKey === 'component:-top-level' ||
            currentPV.layoutName === '-top-level')
        ) {
          // Current parentView is the test harness's tagless `-top-level`
          // wrapper, which has no DOM element for ancestry walking. Preserve
          // parentView and record the CHILD_VIEW_IDS entry.
          _addChildView(currentPV, view);
        } else if (currentPV !== null && currentPV !== undefined) {
          // True DOM root: ensure parentView is null so getRootViews sees it.
          view.parentView = null;
        }
      }
    }
  } finally {
    _rebuildInProgress = false;
    _gxtSuppressDirtyTagForDuringRebuild = false;
  }
}

// Bridge adapter. Wraps `_gxtRebuildViewTreeFromDom` so that AFTER the main
// rebuild body finishes (regardless of throw / early return on the re-entry
// guard), the `afterRebuildViewTreeFromDom` host hook contributed by compile.ts
// runs to (a) reset stale `_wrapperIfUserFalse` view-registry CHILD_VIEW_IDS
// for direct-click toggled `{{#if}}` branches and (b) drain the in-element
// deferred-render queue.
//
// Reads the hook via `getGxtRenderer()` rather than capturing a reference at
// adapter-creation time so contributions arriving via the deferred install
// queue (when compile.ts loads after manager.ts) are picked up on first call.
function _gxtBridgeRebuildViewTreeFromDom(explicitRegistry?: unknown): void {
  _gxtRebuildViewTreeFromDom(explicitRegistry);
  const after = getGxtRenderer()?.viewUtils.afterRebuildViewTreeFromDom;
  if (typeof after === 'function') after(explicitRegistry);
}

// Bridge adapter. Wraps the exported `flushAfterInsertQueue` so that AFTER the
// queue is drained, the `afterFlushAfterInsertQueue` host hook contributed by
// compile.ts runs to drain the in-element deferred-render queue.
//
// Reads the hook via `getGxtRenderer()` rather than capturing a reference at
// adapter-creation time so contributions arriving via the deferred install
// queue (when compile.ts loads after manager.ts) are picked up on first call.
// The body queues what an insert callback throws as a render error; what the
// in-element renders throw propagates.
function _gxtBridgeFlushAfterInsertQueue(): void {
  flushAfterInsertQueue();
  const after = getGxtRenderer()?.viewUtils.afterFlushAfterInsertQueue;
  if (typeof after === 'function') after();
}

/**
 * Add a child view to a parent's childViews array.
 * Mimics Ember's CoreView.addChildView behavior.
 */
function addChildView(parent: any, child: any): void {
  if (!parent || !child) return;

  // Use Ember's official addChildView which tracks via CHILD_VIEW_IDS WeakMap.
  // This ensures component.childViews getter returns the correct children.
  _addChildView(parent, child);

  child.parentView = parent;
}

// =============================================================================
// Instance Pool Caching
// =============================================================================

/**
 * Pool-based instance caching for component reuse across re-renders.
 *
 * Structure: parentView -> Map of componentClass -> Array of { instance, claimed }
 *
 * On each render cycle:
 * 1. Reset claimed flags for all instances
 * 2. When a component is needed, find an unclaimed instance from the pool
 * 3. Mark it as claimed and update its args
 * 4. If no unclaimed instance exists, create a new one and add to pool
 */
const instancePools = new WeakMap<any, Map<any, PoolEntry[]>>();

// All pool arrays, for iteration in `_gxtDestroyUnclaimedPoolEntries`.
// compile.ts (inverse-branch teardown of pool instances) reads it through the
// `compilePipeline.getAllPoolArrays` bridge getter.
const _allPoolArrays = new Set<PoolEntry[]>();
function _gxtGetAllPoolArrays(): Set<PoolEntry[]> {
  return _allPoolArrays;
}

// Per-modifier-install "dirty-during-install" watcher Map, keyed by modifier
// instance. Set on entry to `installModifier` and deleted in its `finally`;
// compile.ts's `_gxtTriggerReRenderBody` reads it (via
// `compilePipeline.getModifierInstallWatchers`) to flag an install frame when
// the dirtied object belongs to it.
const _modifierInstallWatchers = new Map<object, () => void>();
function _gxtGetModifierInstallWatchers(): Map<object, () => void> {
  return _modifierInstallWatchers;
}

// Pending-modifier-destroys queue. Each entry references the still-pending
// modifier cache record, its element, the modifier-cache map, the modKey, an
// `isCustom` discriminator, and (for managers exposing `getDestroyable`) the
// destroyable to drain after `destroyModifier`. The queue is drained
// synchronously at the end of a sync cycle (compile.ts `_gxtSyncDomNow`, for
// entries whose element has actually been removed from the DOM), at
// test-teardown, and cleared (without draining) at QUnit between-test reset.
// The custom-modifier-manager install step's "phantom-element migration"
// path also inspects it to find a same-cycle install + destructor pair and
// reuses the prior instance, splicing the entry out so the post-cycle drain
// doesn't double-destroy. compile.ts reads it through
// `compilePipeline.getPendingModifierDestroys` and mutates it in place.
//
// `isCustom` is true for entries from the custom-modifier-manager path and
// absent for internal modifier managers; consumers use it to decide whether
// to call `destroyModifier` on the cached manager.
interface PendingModifierDestroyEntry {
  cached: any;
  destroyable: any;
  element: HTMLElement;
  modKey: string;
  cache: Map<any, any> | undefined;
  isCustom?: boolean;
}
const _pendingModifierDestroys: PendingModifierDestroyEntry[] = [];
function _gxtGetPendingModifierDestroys(): PendingModifierDestroyEntry[] {
  return _pendingModifierDestroys;
}

// Queues the destroy of a modifier whose destructor gxt ran. gxt runs it
// before it evaluates the modifier's invocation again, whose update takes the
// modifier back (it clears `pendingDestroy`), and when the element's block is
// destroyed. A sync destroys what is still queued at its end (compile.ts
// Phase 2d). A destructor that runs in a run loop outside a sync (a render
// result destroyed in `run`) is the block's destruction: the queue is
// destroyed when that run loop flushes its actions, as Glimmer schedules the
// destructors of a destroyed block's modifiers there.
function _queueModifierDestroy(entry: PendingModifierDestroyEntry): void {
  entry.cached.pendingDestroy = true;
  _pendingModifierDestroys.push(entry);
  if (!getGxtRenderer()?.compilePipeline.isSyncing?.() && _getCurrentRunLoop() !== null) {
    scheduleOnce('actions', _gxtDestroyPendingModifiers);
  }
}

// Destroys the queued modifiers that no evaluation of their invocation took
// back since their destructor ran: their element was removed, or their
// invocation renders another modifier definition, or none, which Glimmer
// destroys the old modifier for. Empties the queue. A destroy that throws is
// queued as a render error, and the others still run.
function _gxtDestroyPendingModifiers(): void {
  if (_pendingModifierDestroys.length === 0) return;
  for (const entry of _pendingModifierDestroys.splice(0)) {
    if (!entry.cached.pendingDestroy) continue;
    // A destroyed modifier leaves the debug render tree.
    if (entry.cached.debugNode) gxtReleaseDebugNode(entry.cached.debugNode);
    try {
      const instance = entry.cached.instance;
      if (entry.isCustom && entry.cached.manager?.destroyModifier && !instance?.__gxtModDestroyed) {
        entry.cached.manager.destroyModifier(instance);
        if (instance) instance.__gxtModDestroyed = true;
      }
      // The destroyable of an internal manager's modifier (the listener of an
      // `{{on}}`), destroyed at once.
      if (entry.destroyable) _gxtDestroyModifierDestroyable(entry.destroyable);
    } catch (error) {
      captureRenderError(error);
    }
    const elementCache = entry.cache?.get(entry.element);
    if (elementCache) {
      elementCache.delete(entry.modKey);
      if (elementCache.size === 0) entry.cache!.delete(entry.element);
    }
  }
}

// Sentinel object for root-level components (no parent view)
const ROOT_PARENT_SENTINEL = {};

// ---- Each-iteration row key tracking ----
// When rendering inside `{{#each items as |item|}}`, push the `item` identity
// onto this stack so `getCachedOrCreateInstance` can include it in the pool
// cache-key. This makes pooled component instances STICK TO THEIR ROW when
// the list shrinks (instead of sliding forward, which misreports which items
// were destroyed — see "that thing about destroying" life-cycle test).
// Stack because `{{#each}}` blocks may nest.
const _eachRowKeyStack: any[] = [];
function getCurrentEachRowKey(): any | undefined {
  return _eachRowKeyStack.length > 0 ? _eachRowKeyStack[_eachRowKeyStack.length - 1] : undefined;
}
// Patch `globalThis.$_eachSync` so every iteration of a {{#each}} pushes/pops
// the current row identity onto `_eachRowKeyStack`. Idempotent — runs once and
// layers on top of compile.ts's own patch (order-independent: we wrap whatever
// $_eachSync currently is). Each pool entry created during the iteration
// records the row key (`eachRowKey`), and the pool lookup matches by that key
// instead of sequential position.
function _patchEachSyncForRowKeying(): boolean {
  const g = globalThis as any;
  if (!g.$_eachSync || g.$_eachSync.__emberRowKeyPatched) return false;
  const prevEachSync = g.$_eachSync;
  const wrappedEachSync: any = function patchedEachSyncRowKey(
    items: any,
    fn: any,
    key: any,
    ctx: any,
    inverseFn?: any,
    hasIndex?: boolean
  ) {
    const origFn = fn;
    const wrappedFn = function rowKeyWrappedFn(item: any, index: any, ctx0: any) {
      _eachRowKeyStack.push(item);
      try {
        return origFn(item, index, ctx0);
      } finally {
        // Pop defensively — if `origFn` somehow left extra entries, only pop
        // one (our own). Mismatched pushes would be a bug elsewhere.
        _eachRowKeyStack.pop();
      }
    };
    // Forward the 6th positional `hasIndex` arg (the GXT compiler emits it when
    // the each-body reads the block-param `index`). Truncating the signature at
    // `inverseFn` would silently drop `hasIndex`, so the downstream list would
    // never build a REACTIVE index formula and reused rows would keep a stale
    // captured integer. This layer just preserves the arg so the sibling
    // compile.ts patch's gate can take effect.
    return prevEachSync(items, wrappedFn, key, ctx, inverseFn, hasIndex);
  };
  wrappedEachSync.__emberRowKeyPatched = true;
  wrappedEachSync.__emberPatched = true; // preserve compile.ts's marker
  protectGlobal('$_eachSync', wrappedEachSync);
  return true;
}
_patchEachSyncForRowKeying();
queueMicrotask(_patchEachSyncForRowKeying);
// Retry once compile.ts's own patch has installed (it also uses microtask).
setTimeout(_patchEachSyncForRowKeying, 0);

// `_customManagedPool` and `_customManagedInstances` are declared after this
// point in the file; the forward reference is safe because
// `_gxtClearInstancePools` is never called during module init (it's a
// test-teardown hook), so the body only runs long after both declarations
// have been evaluated (no TDZ hazard). The custom-managed components still
// alive are destroyed first, as destroying the render destroys them.
function _gxtClearInstancePools(): void {
  _gxtDestroyRemainingCustomManagedInstances();
  for (const pool of _allPoolArrays) {
    pool.length = 0;
  }
  _allPoolArrays.clear();
  _customManagedPool.clear();
  _customManagedInstances.length = 0;
}

// Exposed on `compilePipeline.clearInstancePools` (see the `setGxtRenderer`
// install below).

/**
 * Remove a destroyed instance from every pool that holds it.
 *
 * Pool entries normally outlive a single render pass: they hold a stable
 * instance reference so re-renders find the same component object. When an
 * instance is destroyed (e.g. by a {{#if}} false-branch transition), its pool
 * entry must be evicted, otherwise a subsequent re-render in the same parent
 * may reclaim a now-dead instance and re-insert its detached element. The
 * existing `isAlive` filter in `getCachedOrCreateInstance` defends the read
 * side; this is the proactive write-side cleanup. Called from every destroy
 * path that fires `instance.destroy()`.
 */
function removeInstanceFromPools(instance: any): void {
  if (!instance) return;
  for (const poolArr of _allPoolArrays) {
    // Walk in reverse so splice() doesn't shift indices we haven't visited.
    for (let i = poolArr.length - 1; i >= 0; i--) {
      if (poolArr[i]?.instance === instance) {
        poolArr.splice(i, 1);
      }
    }
  }
}

/**
 * Get or create a component instance from the pool.
 * Implements stable instance identity across re-renders.
 */
function getCachedOrCreateInstance(
  factory: ComponentFactory,
  args: any,
  componentClass: any,
  owner: any,
  explicitParentView?: any
): any {
  const cacheKey = componentClass || factory;
  const currentParentView =
    explicitParentView !== undefined ? explicitParentView : getCurrentParentView();
  const parentKey = currentParentView || ROOT_PARENT_SENTINEL;

  let componentPools = instancePools.get(parentKey);
  if (!componentPools) {
    componentPools = new Map();
    instancePools.set(parentKey, componentPools);
  }

  let pool = componentPools.get(cacheKey);
  if (!pool) {
    pool = [];
    componentPools.set(cacheKey, pool);
    _allPoolArrays.add(pool);
  }

  // Track render pass ID - reset claimed flags when a new render pass starts.
  const currentPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
  if ((pool as any).__lastPassId !== currentPassId) {
    // New render pass - reset claimed and updatedThisPass flags
    (pool as any).__lastPassId = currentPassId;
    for (const entry of pool) {
      entry.claimed = false;
      entry.updatedThisPass = false;
    }
  }

  // Extract elementId from args if provided
  // Map 'id' arg to 'elementId' (Ember convention)
  let requestedElementId: string | undefined;
  if (args) {
    // Check for conflicting id and elementId
    const hasId = 'id' in args && args.id !== undefined;
    const hasElementId = 'elementId' in args && args.elementId !== undefined;
    assert(
      "You cannot invoke a component with both 'id' and 'elementId' at the same time.",
      !(hasId && hasElementId)
    );

    const idArg = args.id ?? args.elementId;
    requestedElementId = typeof idArg === 'function' ? idArg() : idArg;
  }

  let poolEntry: PoolEntry | undefined;

  // Helper: skip destroyed/destroying instances in pool lookup
  const isAlive = (e: PoolEntry) =>
    !e.claimed && !e.instance?.isDestroyed && !e.instance?.isDestroying;

  // If we're inside an {{#each}} iteration, the row's item identity is on
  // `_eachRowKeyStack`. Prefer matching a pool entry whose `eachRowKey` equals
  // the current row — this keeps component instances bound to their row even
  // when the list shrinks (the sequential-position fallback would otherwise
  // slide forward and misreport which items were destroyed).
  const currentRowKey = getCurrentEachRowKey();
  const insideEachRow = _eachRowKeyStack.length > 0;

  if (requestedElementId) {
    // Explicit elementId provided - find instance with matching elementId
    // Convert to string for comparison since Ember may store elementId as string
    const reqIdStr = String(requestedElementId);
    poolEntry = pool.find((e) => isAlive(e) && String(e.instance?.elementId) === reqIdStr);

    // If no exact match found AND the pool has exactly ONE entry (not just
    // one alive), reuse it if its elementId was derived from the `id` arg.
    // This targets single-instance `{{foo-bar id=this.dynamicId}}` re-renders
    // where the arg changes but the DOM elementId must stay frozen.
    // Strict `pool.length === 1` keeps this away from View tree tests where
    // multiple siblings share a factory pool.
    if (!poolEntry && pool.length === 1) {
      const only = pool[0];
      if (isAlive(only) && only.instance?.__elementIdFromId) {
        poolEntry = only;
      }
    }

    // If no exact match found, DO NOT fall back to sequential ordering:
    // cross-wiring a pooled instance (whose elementId is frozen) with a new
    // requested id corrupts instance.id and all bound formulas, breaking
    // getRootViews/getChildViews for sibling classic components sharing a
    // pool (e.g. {{x-toggle id="root-2"}} + {{x-toggle id="root-3"}} with
    // {{#if}}-driven lifecycle). A fresh instance is created below instead.
  } else if (insideEachRow) {
    // Each-row path: match strictly by row identity. If no entry exists with
    // this row key, create a NEW instance (do not fall back to positional
    // reuse — that would re-bind a dead row's instance to a surviving row and
    // make `willDestroyElement` report the wrong item id).
    poolEntry = pool.find((e) => isAlive(e) && e.eachRowKey === currentRowKey);
  } else {
    // No explicit elementId and not inside an each iteration - use sequential
    // ordering. First unclaimed, non-each, non-destroyed instance gets claimed.
    // Skip entries that were born inside an each so we don't cross-wire a
    // pooled each-row instance with an unrelated outer component.
    poolEntry = pool.find((e) => isAlive(e) && e.eachRowKey === undefined);
  }

  if (poolEntry) {
    // Claim this instance and update with new args
    poolEntry.claimed = true;
    const hasChanges = updateInstanceWithNewArgs(poolEntry.instance, args);

    // CLASSIC-ONLY (gated): syncing classNameBindings / attributeBindings onto a
    // wrapper DOM element is classic curly machinery. Glimmer components are
    // tagless (no Ember wrapper element), so this no-ops for them; gated for
    // native DCE. `hasChanges` stays ungated — the arg update it drives is shared.
    if (__GXT_CLASSIC_COMPONENTS__ && hasChanges) {
      const wrapper = getViewElement(poolEntry.instance) || poolEntry.instance._element;
      if (wrapper instanceof HTMLElement) {
        syncWrapperElement(poolEntry.instance, wrapper, componentClass, args);
      }
    }

    // Mark as reused so renderClassicComponent can skip lifecycle hooks
    // during force-rerender (innerHTML='' + rebuild)
    poolEntry.instance.__gxtReusedFromPool = true;
    poolEntry.instance.__gxtPoolHasArgChanges = hasChanges;

    // Re-register in view registry (idempotent). Ensures pooled instances
    // remain visible to getRootViews/getChildViews even if an earlier
    // destruction cycle cleaned them out of the registry.
    registerInViewRegistry(poolEntry.instance);

    // Re-establish the child-view relationship with the current parent.
    // CHILD_VIEW_IDS may have been cleared when the parent was re-created or
    // when the pooled instance's previous incarnation was destroyed. Without
    // this, getChildViews returns stale/empty sets after toggle cycles.
    if (currentParentView && currentParentView !== poolEntry.instance) {
      // addChildView also points the instance's parentView at the parent, in
      // case the parent was replaced (e.g., across route transitions).
      addChildView(currentParentView, poolEntry.instance);
    }

    return poolEntry.instance;
  }

  // Before creating a new instance, check if there's already an instance
  // for this template position (identified by __thunkId) in another pool.
  // This handles GXT re-evaluating formulas during the same render pass
  // with a different parentView context (e.g., after the parentView stack has been popped).
  // When inside an each iteration, also require row-key match — otherwise a
  // claimed entry from a SIBLING each row could be returned here (thunkId is
  // per-template-position, not per-row).
  const thunkId = args?.__thunkId;
  if (thunkId) {
    for (const poolArr of _allPoolArrays) {
      const existing = poolArr.find(
        (e) =>
          e.claimed &&
          e.instance?.__gxtThunkId === thunkId &&
          (!insideEachRow || e.eachRowKey === currentRowKey)
      );
      if (existing) {
        // Already created in this render pass — return the same instance
        return existing.instance;
      }
    }
  }

  // No matching instance - create a new one. Glimmer's curly manager creates
  // a classic component untracked (`untrackedForRenderPass`).
  const instance = DEBUG
    ? untrackedForRenderPass(() => createComponentInstance(factory, args, currentParentView, owner))
    : createComponentInstance(factory, args, currentParentView, owner);
  // Tag the instance with the current sync cycle id when created during
  // `_gxtSyncDomNow`. `_gxtDestroyUnclaimedPoolEntries` (phase 3) uses it to
  // decide whether to fire willDestroy synchronously — instances created
  // within the current cycle are part of the new render (or phantoms
  // superseded within the same cycle), so only instances that existed before
  // this sync cycle (the each rows actually being torn down) get a sync
  // willDestroy.
  const _cp1373 = getGxtRenderer()?.compilePipeline;
  if (_cp1373?.isSyncing?.()) {
    instance.__gxtCreatedInSyncCycle = _cp1373.getSyncCycleId?.() ?? 0;
  }

  // Store thunkId on instance for dedup during re-evaluations
  if (thunkId) {
    instance.__gxtThunkId = thunkId;
  }

  // During force-rerender, mark all unclaimed entries in ALL pools for this
  // parent. When the component name changes (e.g., {{component this.name}}),
  // the new instance goes into a different pool (keyed by factory). The old
  // instance in the previous pool is unclaimed and should be destroyed.
  if (getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false) {
    const parentPools = instancePools.get(parentKey);
    if (parentPools) {
      for (const [, poolArr] of parentPools) {
        for (const entry of poolArr) {
          if (
            !entry.claimed &&
            entry.instance &&
            !entry.instance.isDestroyed &&
            !entry.instance.isDestroying
          ) {
            _instancesMarkedForDestruction.add(entry.instance);
          }
        }
      }
    }
  }

  // Add to pool and mark as claimed
  // updatedThisPass is false since this is initial creation, not an update
  // Tag the entry with the current each-row key (if any) so future renders
  // match this instance to the same row rather than to a positional slot.
  const newEntry: PoolEntry = { instance, claimed: true, updatedThisPass: false };
  if (insideEachRow) {
    newEntry.eachRowKey = currentRowKey;
  }
  pool.push(newEntry);

  return instance;
}

/**
 * Register a component instance in the owner's -view-registry:main so that
 * getRootViews/getChildViews/viewFor can find it. Safe to call multiple times
 * for the same instance (idempotent). Called when creating new instances and
 * also when reusing pooled instances (so instances survive across re-renders
 * even if another code path cleaned the registry).
 */
function registerInViewRegistry(instance: any): void {
  if (!instance || instance.isDestroyed || instance.isDestroying) return;
  if (!isInteractiveModeChecked()) return;
  const instanceOwner = _glimmerGetOwner(instance);
  const gOwner: any = instanceOwner || getAmbientOwner();
  // A destroyed owner resolves nothing (its container's `lookup` asserts).
  if (!gOwner || gOwner.isDestroyed || gOwner.isDestroying) return;
  const viewRegistry = gOwner.lookup?.('-view-registry:main');
  if (!viewRegistry) return;
  const viewId = getViewId(instance);
  if (!viewId) return;
  // If a different, still-alive instance is already registered under this
  // viewId, destroy it before overwriting. Otherwise the orphaned instance
  // lingers in its pool (and in the ELEMENT_VIEW WeakMap), still receiving
  // tracked notifications and click events for this elementId, so click
  // handlers could fire on a stale instance whose state diverged from the live
  // one. What its destruction throws propagates.
  const prev = viewRegistry[viewId];
  if (prev && prev !== instance && !prev.isDestroyed && !prev.isDestroying) {
    removeInstanceFromPools(prev);
    if (typeof prev.destroy === 'function') prev.destroy();
  }
  viewRegistry[viewId] = instance;
}

/**
 * Create a new component instance with processed args.
 */
function createComponentInstance(
  factory: ComponentFactory,
  args: any,
  parentView: any,
  owner: any
): any {
  const props: Record<string, any> = {};
  const attrs: Record<string, any> = {};
  const argGetters: Record<string, Function> = {};
  const lastArgValues: Record<string, any> = {};
  const readonlyKeys = new Set<string>();
  const mutCellKeys = new Set<string>();
  const rawArgGetters: Record<string, Function> = {}; // unprocessed getters for mut cell lookup

  // Process args into Ember's expected format
  const keys = extractArgKeys(args);

  for (const key of keys) {
    const argValue = getArgValue(args, key);
    const { raw, isMutCell, isReadonly, mutCell } = argValue;
    const slot = _argValueSlot(argGetters, key);
    const resolved = _readArgValue(slot, argValue.resolved);
    const getter = argValue.getter && _argValueGetter(slot, argValue.getter);

    // Skip classNames - handled separately in wrapper building
    if (key === 'classNames') {
      if (getter) {
        argGetters[key] = getter;
      }
      lastArgValues[key] = resolved;
      continue;
    }

    // Track readonly and mut cell keys
    if (isReadonly) {
      readonlyKeys.add(key);
    }
    if (isMutCell) {
      mutCellKeys.add(key);
    }

    // Store the raw (unprocessed) arg getter for mut cell detection later
    const descriptor = Object.getOwnPropertyDescriptor(args, key);
    if (descriptor?.get) {
      rawArgGetters[key] = descriptor.get;
    } else if (typeof raw === 'function') {
      rawArgGetters[key] = raw;
    }

    // When `key` collides with a plain get-only native getter on the
    // component class prototype (e.g. `get count() { return this.args.count }`
    // where `count` is also `@count`), don't seed `props[key]`. Ember's
    // `factory.create(props)` routes props through `setProperties`, which
    // reads the property to detect computed descriptors — invoking the
    // user getter once during init and firing any side effect an extra
    // time that genuine Ember never incurs. The value reaches the component via
    // `this.args.<key>` regardless, so skipping the assignment is value-neutral.
    // Scoped to plain-native getters only (not @tracked / @computed /
    // getter-with-setter, which need their seeded value). The reactive
    // render-time read is handled by the dep-memoized `cached()` collision
    // descriptor in createRenderContext.
    let _skipPropSeed = false;
    if (getter) {
      _skipPropSeed = _isPlainNativeGetterCollision(
        (factory as any)?.class?.prototype || (factory as any)?.prototype,
        key
      );
    }
    if (!_skipPropSeed) {
      props[key] = resolved;
    }
    lastArgValues[key] = resolved;

    if (getter) {
      argGetters[key] = getter;
    }

    // Build attrs based on the type of binding:
    if (isMutCell && mutCell) {
      // For mut cells: attrs[key] IS the mutCell directly (has .value and .update())
      attrs[key] = mutCell;
    } else if (isReadonly) {
      // For readonly: attrs[key] IS the plain value (no .update())
      attrs[key] = resolved;
    } else {
      // For regular args: automatic mutable binding with .value and .update()
      attrs[key] = {
        get value() {
          return getter ? getter() : resolved;
        },
        update(newValue: any) {
          // This will be replaced with a proper updater in createRenderContext
        },
      };
    }
  }

  // Capture the invocation class getter separately (`class` was excluded from
  // extractArgKeys to avoid overwriting the instance's 'class' property), for
  // reactive wrapper class updates (syncWrapperElement).
  const classKey = _invocationClassKey(args);
  if (classKey) {
    const { getter } = getArgValue(args, classKey);
    if (getter) {
      argGetters['class'] = getter;
    }
  }

  // Capture '__htmlId' getter for reactive HTML id binding.
  // This is set when id=... (HTML prop) is used, distinct from @id (named arg).
  if (args && '__htmlId' in args) {
    const { getter } = getArgValue(args, '__htmlId');
    if (getter) {
      argGetters['__htmlId'] = getter;
    }
  }

  props.attrs = attrs;
  props.parentView = parentView;
  props.__argGetters = argGetters;
  props.__lastArgValues = lastArgValues;

  // Map 'id' arg to 'elementId' for Ember component initialization
  if ('id' in props && props.id !== undefined) {
    props.elementId = props.id;
    props.__elementIdFromId = true; // Flag: elementId was mapped from id, not explicit
  }
  // Create the instance — let init errors propagate naturally so they
  // reach assert.throws in tests (GXT dist has no try-catch wrapper).
  const instance = factory.create(props);
  // Track every created instance for end-of-test teardown sweep. Instances
  // that never reach `_renderBody` (and thus never get added to
  // `_allLiveInstances`) can still register sync observers in their `init`
  // hook (e.g. via `Ember.observer(...)` properties), which leak into the
  // module-local SYNC_OBSERVERS map and trip the
  // `setupObserversCheck` afterEach assertion. By recording them here we
  // guarantee `_gxtDestroyTrackedInstances` can find and destroy them.
  if (instance) {
    _allCreatedInstances.add(instance);
  }

  // Wrap willDestroy so that the user's override is only invoked for
  // instances that actually reached the live DOM. GXT's $_if re-evaluation
  // during a single runTask can create+destroy transient instances that
  // never render — classic Ember would never create these at all, so their
  // willDestroy body (which often increments destroy counters or releases
  // resources) should not run. We still call Ember's super.willDestroy()
  // via the prototype chain to keep internal bookkeeping consistent.
  const proto = Object.getPrototypeOf(instance);
  if (proto && typeof instance.willDestroy === 'function') {
    const ownWillDestroy = instance.willDestroy;
    // Find the prototype's willDestroy (Ember base) to use as fallback.
    // Walk the prototype chain past any instance-local override.
    let p = proto;
    let baseWillDestroy: Function | null = null;
    while (p && p !== Object.prototype) {
      const d = Object.getOwnPropertyDescriptor(p, 'willDestroy');
      if (d && typeof d.value === 'function') {
        // The TOPMOST willDestroy on a class (CoreView) is the Ember base.
        // Keep walking to the deepest (Object.prototype boundary) to get the
        // root implementation.
        baseWillDestroy = d.value;
      }
      p = Object.getPrototypeOf(p);
    }
    Object.defineProperty(instance, 'willDestroy', {
      value: function (this: any) {
        // Idempotency: the sync willDestroy fire in phase 3 of
        // `_gxtDestroyUnclaimedPoolEntries` may beat the backburner-scheduled
        // destructor. The guard makes the second call a no-op so the user's
        // override doesn't run twice.
        if (this.__gxtWillDestroyFired) return;
        this.__gxtWillDestroyFired = true;
        if (this.__gxtEverInserted === false || this.__gxtEverInserted === undefined) {
          // Never actually rendered — skip the user override but invoke
          // the Ember base implementation (if distinct) to keep core teardown
          // bookkeeping consistent. The root Ember willDestroy is a no-op
          // in most cases, so this is usually just a safety call.
          if (baseWillDestroy && baseWillDestroy !== ownWillDestroy) {
            return baseWillDestroy.call(this);
          }
          return;
        }
        return ownWillDestroy.apply(this, arguments as any);
      },
      writable: true,
      configurable: true,
      enumerable: false,
    });
  }

  // In non-interactive (SSR-style) rendering, suppress interactive-only
  // lifecycle hooks at the instance level. Stock Ember's InertRenderer
  // never fires willRender/willInsertElement/didInsertElement/willUpdate/
  // didUpdate/didRender/willDestroyElement/willClearRender/didDestroyElement.
  // Some GXT code paths (compile.ts) call `_inst.trigger(name)` directly,
  // bypassing `triggerLifecycleHook`'s gate. Wrapping both `_trigger` AND
  // `trigger` here centralizes the gate. We wrap both because CoreView#init
  // captures `trigger` from `_trigger` at init time, creating independent
  // instance-local references — wrapping only one leaves the other live.
  //
  // CLASSIC-ONLY (gated): the next three blocks are all classic
  // @ember/component instance setup — (1) suppressing classic interactive-only
  // view lifecycle hooks (willInsertElement/didInsertElement/…) in
  // non-interactive mode, (2) restoring classic x-toggle `isExpanded` view-tree
  // state across force-rerenders, and (3) the tag-less classNameBindings /
  // attributeBindings / elementId misuse asserts. Glimmer components have none
  // of these (no Evented `trigger`, no elementId, no classNameBindings), so the
  // blocks no-op at runtime for them and are DCE-stripped in a native build.
  if (__GXT_CLASSIC_COMPONENTS__) {
    if (!isInteractiveModeChecked()) {
      const buildGate = (orig: Function) => {
        if (!orig || (orig as any).__gxtNonInteractiveFiltered) return orig;
        const wrapped = function (this: any, name: string, ...rest: any[]) {
          if (INTERACTIVE_ONLY_HOOKS.has(name)) return undefined;
          return orig.call(this, name, ...rest);
        };
        (wrapped as any).__gxtNonInteractiveFiltered = true;
        return wrapped;
      };
      const origInst = instance?._trigger;
      const origPub = instance?.trigger;
      if (typeof origInst === 'function') {
        Object.defineProperty(instance, '_trigger', {
          value: buildGate(origInst),
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
      if (typeof origPub === 'function') {
        Object.defineProperty(instance, 'trigger', {
          value: buildGate(origPub),
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
    }

    // Restore user-toggled-false state for components whose wrapper id is in
    // the `viewUtils.getWrapperUserFalseSet()` set. Components rendered in a
    // persistent application template (e.g. an x-toggle with `isExpanded`) are
    // expected to survive visit() cycles with their state intact, but GXT
    // recreates these instances on every force-rerender, resetting the property
    // to its class-field default (true). If this component's elementId was
    // marked user-false and it has an isExpanded property, set it to false so
    // subsequent clicks toggle from the user's last known state. What the
    // property's setter throws propagates.
    const userFalseSet = getGxtRenderer()?.viewUtils.getWrapperUserFalseSet?.();
    const elId = props.elementId;
    if (userFalseSet && elId && userFalseSet.has(elId) && instance && 'isExpanded' in instance) {
      instance.isExpanded = false;
    }

    // Validate tagless component constraints early (before view registry registration)
    // so that the expected assert fires before any other errors.
    const instanceTagName = instance?.tagName;
    if (instanceTagName === '') {
      _assertTaglessComponent(instance, factory?.class?.prototype, args);
    }
  }

  if (!instance.__argGetters) instance.__argGetters = argGetters;
  if (!instance.__lastArgValues) instance.__lastArgValues = lastArgValues;
  // Store mut/readonly tracking for two-way binding and attrs
  instance.__gxtReadonlyKeys = readonlyKeys;
  instance.__gxtMutCellKeys = mutCellKeys;
  instance.__gxtRawArgGetters = rawArgGetters;
  // Store mut arg sources for two-way binding via (mut this.prop) support
  if (args?.__mutArgSources) {
    instance.__mutArgSources = args.__mutArgSources;
  }

  // CLASSIC-ONLY (gated): installing reactive `instance.<arg>` getters/setters
  // is classic curly semantics — `{{this.foo}}` / `this.get('foo')` read an arg
  // as a top-level instance property, wired into the classic @glimmer/validator
  // tag system (createCache / invokeHelper) and the @computed-with-setter
  // pass-through. Glimmer components read `this.args.<arg>` (never `this.<arg>`),
  // and in a native build createComponentInstance only ever builds Glimmer
  // instances, so this whole block — the `_findCpWithSetterFor` call and the
  // reactive-getter loop — is gated and DCE-stripped when
  // __GXT_CLASSIC_COMPONENTS__ === false. NOTE: the shared instance metadata
  // assigned above (__argGetters / __gxtReadonlyKeys / __gxtRawArgGetters …) is
  // deliberately OUTSIDE this gate — createRenderContext consumes it to build
  // the args proxy / arg cells on the Glimmer path.
  if (__GXT_CLASSIC_COMPONENTS__) {
    // Install reactive getters for args that have closures.
    // This ensures instance.foo always returns the current arg value,
    // even when GXT doesn't re-invoke the component function on re-render.
    // What an argument's getter or the instance's property throws propagates,
    // as Glimmer's curly manager reads every argument when it creates the
    // component.
    for (const key of Object.keys(argGetters)) {
      if (key === 'id' || key === 'elementId') continue;
      const getter = argGetters[key]!;
      // When `key` collides with a plain get-only native getter on the
      // prototype (e.g. `get count() { return this.args.count }`), reading
      // `instance[key]` here would invoke that user getter and fire its side
      // effects during instance setup, which genuine Ember never does. The
      // render-time read is routed through a dep-memoized `cached()` wrapper in
      // createRenderContext, so read the arg value directly instead (value-
      // equivalent: a getter that just returns the arg yields argValue, so
      // `useLocal` resolves identically). Scoped to plain-native getters only
      // (not @tracked / @computed / getters with a setter).
      const _plainNativeCollision = _isPlainNativeGetterCollision(
        Object.getPrototypeOf(instance),
        key
      );
      const argValue = getter();
      const localValue = _plainNativeCollision ? argValue : instance[key]; // current value (from factory.create or init)
      // If instance value differs from arg value, the component overrode it in init()
      const useLocal = localValue !== argValue;
      // Detect @computed CP with a setter on the prototype chain so the
      // shadow setter below can still invoke the CP's `_setter` body for
      // its side effects (e.g. {mut, set}-triggered writes into other deps).
      const cpWithSetter = _findCpWithSetterFor(instance, key);
      // Install a gxt effect that dirties the classic validator tag for
      // (instance, key) whenever the upstream arg cell invalidates. This
      // lets createCache / invokeHelper consumers — which captured the
      // classic tag via consumeTag in the getter below — detect that an
      // arg-derived property has changed even when nothing reads it
      // explicitly after the parent mutates.
      _installArgDirtyEffect(instance, instance, key, () => {
        try {
          return getter();
        } catch {
          return undefined;
        }
      });
      _installArgDescriptor(instance, key, getter, localValue, useLocal, cpWithSetter);
    }
  }

  // Install two-way binding via PROPERTY_DID_CHANGE override.
  // In classic Ember, when component.set(key, value) is called for an arg
  // that was passed from the parent (e.g., {{foo-bar bar=this.localBar}}),
  // the change should propagate upstream to the parent.
  //
  // Strategy: For any key that has an argGetter (i.e., was passed as an arg),
  // when set() is called, find the parent and set the same property there.
  // The argGetter itself captures the parent scope, so we can detect the parent
  // by tracking which object the getter reads from.
  //
  // Classic-only (gated): Glimmer components have immutable args — there is no
  // `this.set('arg', …)` upstream propagation and no PROPERTY_DID_CHANGE
  // arg-binding contract — so this block is stripped from native builds
  // (__GXT_CLASSIC_COMPONENTS__ === false).
  if (__GXT_CLASSIC_COMPONENTS__) {
    const argKeySet = new Set(Object.keys(argGetters));
    if (argKeySet.size > 0 && instance) {
      // Detect two-way binding sources by calling each arg getter with tracking enabled
      const twoWayBindings: Record<string, { sourceCtx: any; sourceKey: string }> = {};
      for (const key of argKeySet) {
        if (key === 'id' || key === 'elementId') continue;
        const argGetter = argGetters[key]!;
        // Try proxy-based tracking first (works when parent has a proxy render context)
        // Clear the source slots to `null` before invoking the getter; the
        // probe-detected (prop, target) pair is read back afterward and
        // checked for truthiness below.
        _lastArgSourceKey = null;
        _lastArgSourceCtx = null;
        // Arm the gate before the probe invokes the arg getter; the gate-reader
        // in the proxy `get` trap at the bottom of this file uses this flag.
        // Disarmed even when the getter throws (it read the same value without
        // error when the component was created), so the gate cannot stay armed
        // for subsequent renderContext reads.
        _gxtTrackArgSource = true;
        try {
          argGetter();
        } finally {
          _gxtTrackArgSource = false;
        }
        const detectedKey = _lastArgSourceKey;
        const detectedCtx = _lastArgSourceCtx;
        if (detectedKey && detectedCtx) {
          twoWayBindings[key] = { sourceCtx: detectedCtx, sourceKey: detectedKey };
        }
        // If proxy-based tracking didn't find a source, try cell-interception.
        // The arg getter reads from the parent's cell-backed property. We temporarily
        // wrap the parent's getters to detect which property is accessed.
        if (!twoWayBindings[key] && parentView) {
          const descriptors: Record<string, { obj: any; desc: PropertyDescriptor }> = {};
          let detectedProp: string | null = null;
          try {
            // Install temporary traps on parent's getter properties
            let obj = parentView;
            for (let depth = 0; depth < 3 && obj && obj !== Object.prototype; depth++) {
              for (const propName of Object.getOwnPropertyNames(obj)) {
                if (
                  propName.startsWith('_') ||
                  propName.startsWith('$') ||
                  propName === 'constructor'
                )
                  continue;
                const desc = Object.getOwnPropertyDescriptor(obj, propName);
                if (desc?.get && desc.configurable) {
                  descriptors[propName] = { obj, desc };
                  const origGet = desc.get;
                  Object.defineProperty(obj, propName, {
                    get() {
                      detectedProp = propName;
                      return origGet.call(this);
                    },
                    set: desc.set,
                    configurable: true,
                    enumerable: desc.enumerable,
                  });
                }
              }
              obj = Object.getPrototypeOf(obj);
            }
            // Call the arg getter - it should trigger one of our traps
            argGetter();
          } finally {
            // Restore original descriptors (configurable: each trap replaced a
            // configurable one with a configurable one).
            for (const [propName, { obj: origObj, desc }] of Object.entries(descriptors)) {
              Object.defineProperty(origObj, propName, desc);
            }
          }
          if (detectedProp) {
            twoWayBindings[key] = { sourceCtx: parentView, sourceKey: detectedProp };
          }
        }
      }
      instance.__gxtTwoWayBindings = twoWayBindings;

      // GH#18417: detect arg keys that map to @computed properties and record
      // their dependent keys. When one of those deps changes on the instance,
      // we re-read the CP (with fresh deps) and propagate the new value upstream
      // to the parent's bound property. This makes `child.set('a', x)` flow into
      // `parent.string` when the child's `value` is `@computed('a','b')` and
      // passed in as `value=this.string`.
      const cpDepToArgKey: Record<string, string[]> = {};
      for (const argKey of argKeySet) {
        if (argKey === 'id' || argKey === 'elementId') continue;
        const desc = _findMetaDescriptor(instance, argKey);
        const deps: string[] | undefined = desc?._dependentKeys;
        if (Array.isArray(deps) && deps.length > 0) {
          for (const dep of deps) {
            // Only handle simple local keys (not chained paths)
            if (dep.indexOf('.') !== -1) continue;
            if (!cpDepToArgKey[dep]) cpDepToArgKey[dep] = [];
            cpDepToArgKey[dep].push(argKey);
          }
        }
      }
      // Cache the CP descriptors for each arg key so we can call their raw getter
      // directly (bypassing cell-cached getters installed on the instance).
      const argKeyToCpDesc: Record<string, any> = {};
      for (const argKey of argKeySet) {
        if (argKey === 'id' || argKey === 'elementId') continue;
        const desc = _findMetaDescriptor(instance, argKey);
        if (desc && typeof desc.get === 'function') {
          argKeyToCpDesc[argKey] = desc;
        }
      }

      // Override PROPERTY_DID_CHANGE on the instance. The `triggerReRender`
      // bridge method is optional, so it may be `undefined` (the call sites
      // guard on it). What the original PROPERTY_DID_CHANGE, a computed
      // property's getter, an argument's getter or a two-way write to the
      // parent throws reaches the code that changed the property, as a
      // mutable binding's update does in Glimmer.
      const triggerReRender = getGxtRenderer()?.compilePipeline.triggerReRender;
      const origPDC = instance[PROPERTY_DID_CHANGE]?.bind(instance);
      instance[PROPERTY_DID_CHANGE] = function (key: string, value?: unknown) {
        // Skip if instance is destroyed or destroying (prevents "set on destroyed object")
        if (instance.isDestroyed || instance.isDestroying) return;
        // Skip propagation during attrs dispatch (prevents infinite loops)
        if ((instance as any).__gxtDispatchingArgs) return;

        // Skip two-way propagation for readonly keys (readonly prevents upstream mutation)
        if (readonlyKeys.has(key)) {
          if (origPDC) origPDC(key, value);
          return;
        }

        // Only propagate binding logic for keys that were passed as args
        if (!argKeySet.has(key)) {
          if (origPDC) origPDC(key, value);
          // GH#18417: if this key is a dep of a CP that's bound as an arg, re-read
          // the CP value and propagate upstream to the parent's bound property.
          const affectedArgs = cpDepToArgKey[key];
          if (affectedArgs && affectedArgs.length > 0) {
            // Guard against re-entry while we propagate
            if (!(instance as any).__gxtPropagatingCpDep) {
              (instance as any).__gxtPropagatingCpDep = true;
              try {
                for (const argKey of affectedArgs) {
                  let cpValue: unknown;
                  // Prefer calling the raw computed descriptor getter to bypass
                  // any cell-backed getter that may be caching a stale value.
                  const cpDesc = argKeyToCpDesc[argKey];
                  if (cpDesc && typeof cpDesc.get === 'function') {
                    cpValue = cpDesc.get(instance, argKey);
                  }
                  if (cpValue === undefined) {
                    cpValue = instance[argKey];
                  }

                  // 1) Raw mut cell: update via .update()
                  const rawGetter2 = rawArgGetters[argKey];
                  if (rawGetter2) {
                    const rawVal = rawGetter2();
                    if (rawVal && rawVal.__isMutCell) {
                      rawVal.update(cpValue);
                      if (triggerReRender && instance.parentView) {
                        triggerReRender(instance.parentView, argKey);
                      }
                      continue;
                    }
                  }

                  // 2) Detected two-way binding source
                  const binding2 = twoWayBindings[argKey];
                  if (binding2?.sourceCtx && binding2?.sourceKey) {
                    const srcInst = binding2.sourceCtx.__gxtRawTarget || binding2.sourceCtx;
                    if (typeof srcInst.set === 'function') {
                      srcInst.set(binding2.sourceKey, cpValue);
                    } else {
                      binding2.sourceCtx[binding2.sourceKey] = cpValue;
                    }
                    if (triggerReRender) triggerReRender(srcInst, binding2.sourceKey);
                    continue;
                  }

                  // 3) Fallback: parentView has matching property
                  const pv2 = instance.parentView;
                  if (pv2 && argKey in pv2) {
                    if (typeof pv2.set === 'function') {
                      pv2.set(argKey, cpValue);
                    } else {
                      pv2[argKey] = cpValue;
                      if (triggerReRender) triggerReRender(pv2, argKey);
                    }
                  }
                }
              } finally {
                (instance as any).__gxtPropagatingCpDep = false;
              }
            }
          }
          return;
        }

        const resolvedValue = arguments.length >= 2 ? value : instance[key];

        // Check if the raw arg getter returns a mut cell — use .update() for direct propagation
        const rawGetter = rawArgGetters[key];
        if (rawGetter) {
          const rawVal = rawGetter();
          if (rawVal && rawVal.__isMutCell) {
            rawVal.update(resolvedValue);
            if (triggerReRender && instance.parentView) {
              triggerReRender(instance.parentView, key);
            }
            return;
          }
        }

        // Try detected binding first
        const binding = twoWayBindings[key];
        if (binding) {
          const { sourceCtx, sourceKey } = binding;
          if (sourceCtx && sourceKey) {
            // Guard: skip stale CP re-reads triggered by deferred observer flushes
            // (see pv.set branch below for rationale).
            const dispatched: Record<string, unknown> | undefined = (instance as any)
              .__gxtCpArgDispatched;
            if (dispatched && key in dispatched) {
              const lastDisp = dispatched[key];
              // resolvedValue matches a prior dispatched value AND parent has
              // moved past it — the PDC re-read is stale; skip.
              if (resolvedValue === lastDisp && sourceCtx[sourceKey] !== lastDisp) {
                return;
              }
            }
            // Use set() if available to trigger PROPERTY_DID_CHANGE chain on the source
            const sourceInstance = sourceCtx.__gxtRawTarget || sourceCtx;
            if (typeof sourceInstance.set === 'function') {
              sourceInstance.set(sourceKey, resolvedValue);
            } else {
              sourceCtx[sourceKey] = resolvedValue;
            }
            if (triggerReRender) triggerReRender(sourceInstance, sourceKey);
            return;
          }
        }

        // Fallback: propagate to parentView if it exists and has the same property
        const pv = instance.parentView;
        if (pv && key in pv) {
          // Guard: skip stale CP re-reads triggered by deferred observer flushes
          // after a CP-with-setter arg dispatch. When the resolvedValue matches
          // a prior dispatched value AND the parent has moved past that value
          // (i.e. already newer upstream), this PDC is a stale re-read firing
          // from a deferred observer — skip to avoid clobbering the newer
          // upstream state.
          const dispatched: Record<string, unknown> | undefined = (instance as any)
            .__gxtCpArgDispatched;
          if (dispatched && key in dispatched) {
            const lastDisp = dispatched[key];
            if (resolvedValue === lastDisp && pv[key] !== lastDisp) {
              return;
            }
          }
          if (typeof pv.set === 'function') {
            pv.set(key, resolvedValue);
          } else {
            pv[key] = resolvedValue;
            if (triggerReRender) triggerReRender(pv, key);
          }
        }
      };
    }
  }

  // Register with parent's childViews
  if (parentView) {
    addChildView(parentView, instance);
  }

  // Register in the view registry so collectChildViews() can find this component.
  // This is normally done by the renderer's register() method.
  // Only do this in interactive mode (non-interactive mode expects no registered views).
  registerInViewRegistry(instance);

  // Defensive: ensure instance.attrs reflects the local attrs map before firing
  // the initial didReceiveAttrs hook. `props.attrs = attrs` was applied via
  // factory.create(props), but some paths can leave instance.attrs undefined or
  // empty by the time the hook fires — causing user-land
  // `this.attrs.<argName>.value` reads to crash. The local `attrs` always
  // carries the correct {value, update} shape for this invocation's arg keys,
  // so assigning it here restores the contract classic curly components rely
  // on.
  if (
    instance &&
    (!instance.attrs ||
      typeof instance.attrs !== 'object' ||
      Object.keys(instance.attrs).length === 0)
  ) {
    instance.attrs = attrs;
  }

  // Trigger initial didReceiveAttrs. Rethrow synchronously so user-thrown
  // errors in the init-phase hook surface in the current runTask (attributed
  // to the current test). Capturing into _renderErrors would let the next
  // test's flushRenderErrors() re-throw a stale error when the triggering
  // test has no QUnit-visible assertion. See triggerLifecycleHook.
  triggerLifecycleHook(instance, 'didReceiveAttrs', { rethrow: true });

  return instance;
}

// Track which instances have already had update hooks fired this render pass
// to prevent double-firing from both updateInstanceWithNewArgs and `_gxtSyncAllWrappers`
let _updateHookPassId = 0;
const _instanceUpdatePassMap = new WeakMap<any, number>();
// Separate tracking for willUpdate/willRender: these must fire after the arg
// cells have been refreshed by `_gxtSyncAllWrappers` (so user's willRender body
// reading `this.get('name')` sees the new value). didUpdateAttrs/didReceiveAttrs
// fire earlier in updateInstanceWithNewArgs (the "attrs phase").
const _instanceRenderHookPassMap = new WeakMap<any, number>();

// Snapshot of arg values at the moment attrs-hooks (didUpdateAttrs /
// didReceiveAttrs) last fired for an instance. Used to suppress redundant
// re-fires in subsequent sync cycles triggered by side-effects of the hook
// itself (e.g., `this.set('barCopy', ...)` inside didReceiveAttrs schedules
// an observer that flushes another backburner tick → runloop `onEnd` calls
// `_gxtSyncDomNow` → `_gxtSyncAllWrappers` iterates the same instance).
// Without this snapshot, the passId-based guard resets across sync cycles
// and hooks refire indefinitely as long as the hook keeps dirtying state.
const _instanceLastAttrsFiredArgs = new WeakMap<any, Record<string, unknown>>();

// The getters are the ones the sync just read.
function snapshotArgsForInstance(cells: Record<string, any>): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  for (const key of Object.keys(cells)) {
    const getter = cells[key]?.getter;
    snap[key] = typeof getter === 'function' ? getter() : undefined;
  }
  return snap;
}

function argsEqualToSnapshot(
  cells: Record<string, any>,
  snap: Record<string, unknown> | undefined
): boolean {
  if (!snap) return false;
  const keys = Object.keys(cells);
  if (keys.length !== Object.keys(snap).length) return false;
  for (const key of keys) {
    if (!(key in snap)) return false;
    try {
      const getter = cells[key]?.getter;
      const v = typeof getter === 'function' ? getter() : undefined;
      if (v !== snap[key]) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function markInstanceUpdated(instance: any): void {
  _instanceUpdatePassMap.set(instance, _updateHookPassId);
}

function wasInstanceUpdatedThisPass(instance: any): boolean {
  return _instanceUpdatePassMap.get(instance) === _updateHookPassId;
}

function markInstanceRenderHookFired(instance: any): void {
  _instanceRenderHookPassMap.set(instance, _updateHookPassId);
}

function wasInstanceRenderHookFiredThisPass(instance: any): boolean {
  return _instanceRenderHookPassMap.get(instance) === _updateHookPassId;
}

// Increment the pass ID at the start of each render cycle. Exposed as the
// `compilePipeline.newRenderPass` bridge method, called from compile.ts's
// `_gxtSyncDomNow` just before its phase-0 if-watcher pre-flush.
function _gxtNewRenderPass(): void {
  _updateHookPassId++;
}

/**
 * Update a cached instance when arg values have changed.
 */
function updateInstanceWithNewArgs(instance: any, args: any): boolean {
  if (!instance || !args) return false;

  const argGetters = instance.__argGetters;
  const lastArgValues = instance.__lastArgValues;

  if (!argGetters || !lastArgValues) return false;

  // First pass: detect if there are any changes
  let hasChanges = false;
  const newKeys = extractArgKeys(args);
  const newKeySet = new Set(newKeys);

  for (const key of newKeys) {
    const newValue = _readArgValue(_argValueSlot(argGetters, key), getArgValue(args, key).resolved);
    const oldValue = lastArgValues[key];

    if (newValue !== oldValue) {
      hasChanges = true;
      break; // Only need to know if there's at least one change
    }
  }

  // Also check for removed args: if a previously-present arg is no longer provided,
  // we need to reset it to undefined. This prevents stale values from leaking when
  // instances are reused from the pool for invocations with different arg sets.
  if (!hasChanges) {
    for (const key of Object.keys(lastArgValues)) {
      if (key === 'elementId' || key === 'id') continue;
      if (!newKeySet.has(key) && lastArgValues[key] !== undefined) {
        hasChanges = true;
        break;
      }
    }
  }

  if (hasChanges) {
    // If this instance had state mutated during a nested-arg-mutation didUpdate
    // (see `_gxtSyncAllWrappers`), the arg identity is now changing. Restore
    // the pre-hook snapshot so the instance sees its init-time defaults for
    // the new row — matching Ember's destroy+recreate semantics. What a
    // property's setter throws propagates.
    if (instance.__gxtPreHookStateSnapshot) {
      const snap = instance.__gxtPreHookStateSnapshot;
      for (const k of Object.keys(snap)) {
        instance[k] = snap[k];
      }
      instance.__gxtPreHookStateSnapshot = null;
    }
    // Second pass: apply the changes (set properties first, then fire hooks)
    for (const key of newKeys) {
      const argValue = getArgValue(args, key);
      const slot = _argValueSlot(argGetters, key);
      const newValue = _readArgValue(slot, argValue.resolved);
      const newGetter = argValue.getter && _argValueGetter(slot, argValue.getter);
      const oldValue = lastArgValues[key];

      // Update the arg getter to the new one so that reactive reads
      // (e.g., this.get('name') inside willRender) return fresh values from the
      // new args closure. This is critical for {{#each}} where each iteration
      // captures its own 'item' in the getter closure — without updating, the
      // instance's reactive getter would read from the stale old closure.
      if (newGetter && argGetters && key !== 'elementId' && key !== 'id') {
        argGetters[key] = newGetter;
        // Also update the createRenderContext WeakMap state's currentGetter slot
        // so that descriptor-bound rcGet closures (which read from
        // state.currentGetter) see the new arg getter on the next read. This
        // is critical for force-rerender of {{#each}} block bodies where the
        // child's instance is pool-reused; createRenderContext's fast-path may
        // not re-enter (e.g., when an upstream cellFor removed the marker on
        // its descriptor), but the WeakMap state survives across descriptor
        // replacements and is what rcGet's closure references.
        const _stateForGetter2 = _getRcArgState(instance, key);
        if (_stateForGetter2) {
          _stateForGetter2.currentGetter = newGetter;
        }
        // Check if there's already a render-context-installed descriptor with
        // local-override state (from a previous createRenderContext call). If
        // so, skip reinstalling to preserve the local override (e.g., after
        // incrementProperty, we must not reset useLocal=false and clobber the
        // local value). The render-context's own effect/closure already handles
        // arg-getter propagation — we only need to update argGetters[key] above.
        const existingDesc_u = Object.getOwnPropertyDescriptor(instance, key);
        const hasPreservedDesc = !!(
          existingDesc_u && (existingDesc_u.get as any)?.__gxtRenderCtxArgGetter
        );
        // Reinstall the reactive property descriptor with the new getter,
        // preserving the useLocal/dispatching semantics from createComponentInstance.
        // (A render-context descriptor already holds local-override state;
        // leave it untouched.)
        if (!hasPreservedDesc) {
          _installArgDescriptor(
            instance,
            key,
            newGetter,
            newValue,
            false,
            _findCpWithSetterFor(instance, key)
          );
        }
      }

      if (newValue !== oldValue) {
        // Update the instance property (but not elementId - it's frozen)
        if (key !== 'elementId') {
          _dispatchArgWrite(instance, key, newValue, 'arg-pass cell.update failed');
        }
        lastArgValues[key] = newValue;
        // Notify Ember's computed property system that this property changed.
        // This triggers triggerReRender which recomputes @computed dependent
        // keys (e.g., @computed('location') get componentName()).
        // Without this, computed properties that depend on args never invalidate.
        // The `triggerReRender` bridge method is optional. What a dependent
        // computed property's getter throws propagates.
        const triggerReRender = getGxtRenderer()?.compilePipeline.triggerReRender;
        if (triggerReRender) {
          triggerReRender(instance, key);
        }
      }
    }

    // Reset args that are no longer provided
    for (const key of Object.keys(lastArgValues)) {
      if (key === 'elementId' || key === 'id') continue;
      if (!newKeySet.has(key) && lastArgValues[key] !== undefined) {
        _dispatchArgWrite(instance, key, undefined, 'arg-reset cell.update failed');
        // If the property has a cell-backed getter from createRenderContext,
        // the setter may have set _useLocal=false but the getter still calls
        // the old arg getter (which returns the stale value). Install a new
        // property descriptor that returns undefined, overwriting the stale
        // cell-backed getter.
        if (instance[key] !== undefined) {
          Object.defineProperty(instance, key, {
            value: undefined,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
        // Also remove from argGetters to prevent createRenderContext from
        // re-installing a getter that reads from the old args object.
        if (instance.__argGetters && key in instance.__argGetters) {
          delete instance.__argGetters[key];
        }
        lastArgValues[key] = undefined;
      }
    }

    // Hook order matches Ember's curly component manager:
    // didUpdateAttrs, didReceiveAttrs (always), then willUpdate, willRender (interactive only)
    // Only fire once per render pass to prevent double-firing when the same instance
    // is visited multiple times (e.g., parent visited once per child invocation)
    // Skip during force-rerender (innerHTML='' + rebuild): the element is not in
    // the DOM at this point, so hooks that check this.element would fail.
    // `_gxtSyncAllWrappers` will fire the correct hooks after DOM is rebuilt.
    if (
      !wasInstanceUpdatedThisPass(instance) &&
      !(getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false)
    ) {
      triggerLifecycleHook(instance, 'didUpdateAttrs');
      triggerLifecycleHook(instance, 'didReceiveAttrs');
      markInstanceUpdated(instance);
    }
  }

  return hasChanges;
}

// =============================================================================
// Arg Processing Utilities
// =============================================================================

// Argument value slots.
//
// A component argument's value, as the manager last read it: one slot per
// component and argument name, shared by every getter the manager builds for
// that argument (the instance's arg getter, the args proxy's, the new getter
// of a re-render that reuses the instance). Reading through the slot keeps an
// `(fn …)` value while each new evaluation binds the same callback, and a
// curried `(modifier …)` while each new evaluation curries the same definition
// (utils.ts `keepArgValue`): Glimmer's `fn` is one function per call site, and
// its curry reference keeps one curried value per definition, while the compat
// compiler re-evaluates the call on every read. Without the slot every read of
// `@f={{fn this.greet "x"}}` or `@m={{modifier this.foo "x"}}` was a new
// argument value, so each sync wrote it back to the component and dirtied the
// argument, which scheduled the next sync, and the renderer never settled.
//
// The slot owner is the instance's `__argGetters` record (kept across
// re-renders), or a template-only component's args proxy.
interface ArgValueSlot {
  value: unknown;
  held: boolean;
}
const _argValueSlots = new WeakMap<object, Map<string, ArgValueSlot>>();

function _argValueSlot(owner: object, key: string): ArgValueSlot {
  let slots = _argValueSlots.get(owner);
  if (slots === undefined) {
    slots = new Map();
    _argValueSlots.set(owner, slots);
  }
  let slot = slots.get(key);
  if (slot === undefined) {
    slot = { value: undefined, held: false };
    slots.set(key, slot);
  }
  return slot;
}

// The value an argument holds after reading `value` through `slot`.
function _readArgValue(slot: ArgValueSlot, value: unknown): unknown {
  const held = slot.held ? keepArgValue(slot.value, value) : value;
  slot.value = held;
  slot.held = true;
  return held;
}

// `read`, reading through `slot`.
function _argValueGetter(slot: ArgValueSlot, read: () => any): () => any {
  return () => _readArgValue(slot, read());
}

/**
 * Extract keys from args object, excluding internal symbols.
 */
function extractArgKeys(args: any): string[] {
  if (!args || typeof args !== 'object') return [];

  return Object.keys(args).filter(
    (key) =>
      !_isGxtInternalArgKey(key) &&
      key !== 'class' &&
      key !== 'classNames' && // Don't overwrite component's classNames property
      key !== 'attrs' && // Reserved: Ember classic-component internal — never install as arg-getter
      key !== 'args' && // Reserved: Ember component internal (createRenderContext relies on it)
      !key.startsWith('Symbol')
  );
}

/**
 * Get both raw and resolved value for an arg.
 */
function getArgValue(
  args: any,
  key: string
): {
  raw: any;
  resolved: any;
  getter?: () => any;
  isMutCell?: boolean;
  isReadonly?: boolean;
  mutCell?: any;
} {
  // Check if the arg is defined as a getter (GXT compiles args as getters)
  const descriptor = Object.getOwnPropertyDescriptor(args, key);
  if (descriptor?.get) {
    // Arg is a getter - capture the getter function for reactive updates
    let resolved = descriptor.get();
    // Detect mut cell: the getter returns a mutCell function
    if (resolved && resolved.__isMutCell) {
      const mutCell = resolved;
      // Build an unwrapping getter that returns the plain value (not the mutCell)
      const mutUnwrapGetter = () => {
        const v = descriptor.get!();
        if (v && v.__isMutCell) return v.value;
        return v;
      };
      return {
        raw: descriptor.get,
        resolved: mutCell.value,
        getter: mutUnwrapGetter,
        isMutCell: true,
        mutCell,
      };
    }
    // Detect readonly cell: the getter returns { __isReadonly, __readonlyValue }
    if (resolved && resolved.__isReadonly) {
      const readonlyVal = resolved.__readonlyValue;
      // Build a getter that unwraps readonly each time for reactivity
      const readonlyGetter = () => {
        const v = descriptor.get!();
        if (v && v.__isReadonly) return v.__readonlyValue;
        return typeof v === 'function' ? v() : v;
      };
      return {
        raw: descriptor.get,
        resolved: readonlyVal,
        getter: readonlyGetter,
        isReadonly: true,
      };
    }
    return { raw: descriptor.get, resolved, getter: descriptor.get };
  }
  const raw = args[key];
  // Don't unwrap CurriedComponent functions — they should be stored as-is
  if (raw && raw.__isCurriedComponent) {
    return { raw, resolved: raw };
  }
  // Don't unwrap fn helper results — they are callable functions, not GXT getters
  if (raw && raw.__isFnHelper) {
    return { raw, resolved: raw };
  }
  let resolved = typeof raw === 'function' ? raw() : raw;
  // Detect mut cell from non-getter args
  if (resolved && resolved.__isMutCell) {
    const mutCell = resolved;
    const mutUnwrapGetter =
      typeof raw === 'function'
        ? () => {
            const v = raw();
            if (v && v.__isMutCell) return v.value;
            return v;
          }
        : undefined;
    return { raw, resolved: mutCell.value, getter: mutUnwrapGetter, isMutCell: true, mutCell };
  }
  // Detect readonly cell from non-getter args
  if (resolved && resolved.__isReadonly) {
    const readonlyVal = resolved.__readonlyValue;
    const readonlyGetter =
      typeof raw === 'function'
        ? () => {
            const v = raw();
            if (v && v.__isReadonly) return v.__readonlyValue;
            return typeof v === 'function' ? v() : v;
          }
        : undefined;
    return { raw, resolved: readonlyVal, getter: readonlyGetter, isReadonly: true };
  }
  return { raw, resolved, getter: typeof raw === 'function' ? raw : undefined };
}

// =============================================================================
// After-Insert Hook Queue
// =============================================================================
// In GXT, component wrappers are created inside renderClassicComponent and
// returned to GXT which then appends them to the parent.  This means the
// element is NOT in the live DOM when renderClassicComponent finishes.
// didInsertElement / didRender (and the inDOM transition) must therefore be
// deferred until the outermost render has completed and GXT has inserted
// everything into the document.
//
// We collect callbacks in _afterInsertQueue during rendering and expose
// flushAfterInsertQueue() so the renderer (ClassicRootState.render) can
// drain the queue after template.render() has returned.
// The queue is ordered children-first (natural call-stack order) which
// matches Ember's expected bottom-up firing of these hooks.
const _afterInsertQueue: Array<() => void> = [];

/**
 * Determine whether a DOM element is "live" for lifecycle purposes.
 *
 * An element is live if it is connected to the document OR if it is hosted
 * inside an `{{#in-element}}` destination. The destination element can be a
 * DETACHED node (`document.createElement('div')` never appended anywhere),
 * so `el.isConnected` is `false` even though the in-element content is
 * legitimately rendered and should fire didInsertElement / not be swept as
 * dead. We detect this by walking up to the root node and checking for the
 * `__gxtIsInElementHost` flag set by compile.ts's `$_inElement` shim, and by
 * scanning ancestors for the same flag (the destination element itself).
 */
function isElementLiveOrInElementHosted(el: Node | null | undefined): boolean {
  if (!el) return false;
  if ((el as any).isConnected) return true;
  // Walk up the parent chain looking for a tagged in-element host.
  let node: Node | null = el as Node;
  let depth = 0;
  while (node && depth < 200) {
    if ((node as any).__gxtIsInElementHost) return true;
    node = node.parentNode;
    depth++;
  }
  // The root node (e.g. the detached destination div) may itself be the host.
  const root = (el as any).getRootNode ? (el as any).getRootNode() : null;
  if (root && (root as any).__gxtIsInElementHost) return true;
  return false;
}

/**
 * Queue of errors captured during rendering that should be re-thrown
 * after the render completes. This allows GXT's error-swallowing
 * component() wrapper to not lose user-thrown errors from init(),
 * didInsertElement(), destroy(), etc.
 *
 * Each entry keeps the number of its capture (`_renderErrorCount` at that
 * time). A render takes a mark when it starts (`renderErrorMark`) and later
 * takes only the errors captured after it, so it never re-throws an error that
 * an earlier, unrelated operation left in the queue.
 */
const _renderErrors: { error: Error; capture: number }[] = [];
let _renderErrorCount = 0;

/**
 * Backtracking re-render detection.
 * Tracks instances whose templates have been rendered in the current render pass.
 * If set() is called on a rendered instance during the same pass, it's a
 * "backtracking" modification that Ember's Glimmer VM would assert against.
 */
const _templateRenderedInstances = new Set<any>();
let _isInRenderPass = false;

/**
 * Suppress-destroy-capture flag.
 *
 * Set to `true` during spurious unclaimed-pool sweeps (initial-render syncs
 * not driven by a real property change) so that user-thrown errors from
 * destroy/willDestroy/lifecycle hooks are not captured into the render-error
 * queue and surfaced to assert.throws. Armed on entry to
 * `_gxtDestroyUnclaimedPoolEntries` and disarmed in its `finally`; read by
 * the lifecycle/destroy capture branches.
 */
let _suppressDestroyCapture = false;

export function markTemplateRendered(instance: any): void {
  if (instance) {
    _templateRenderedInstances.add(instance);
    // Also track non-component objects that are properties of the rendered component.
    // This enables backtracking detection for shared dependencies
    // (e.g., this.wrapper.content where wrapper is an EmberObject or tracked class).
    // Use both own keys and prototype keys to catch class fields like `wrapper = new Wrapper()`
    // that may have been moved to the prototype by cellFor or reactive getters.
    const allKeys = new Set<string>();
    const ownKeys = Object.keys(instance);
    for (const k of ownKeys) allKeys.add(k);
    // Also check getOwnPropertyNames to catch non-enumerable getter properties
    for (const k of Object.getOwnPropertyNames(instance)) allKeys.add(k);

    for (const k of allKeys) {
      if (k.charCodeAt(0) === 95 || k.charCodeAt(0) === 36) continue; // skip _ and $
      let val: any;
      try {
        val = instance[k];
      } catch {
        continue;
      }
      if (
        val &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        !(val instanceof Node) &&
        !(val instanceof Date) &&
        !(val instanceof RegExp) &&
        !(val instanceof Error) &&
        !(val instanceof Promise)
      ) {
        _templateRenderedInstances.add(val);
      }
    }
  }
}

export function beginRenderPass(): void {
  // Dispatch the registered `beforeBeginRenderPass` host hook (if any) BEFORE
  // manager.ts's bookkeeping. compile.ts contributes this hook (via
  // `installRenderPassPart`) to clear its module-local template-only state
  // (`_gxtTemplateOnlyRenderedSet` / `_gxtTemplateOnlyStack`).
  //
  // `getGxtRenderer` is imported at file bottom (ES module imports hoist, so
  // the binding is available here).
  const _beforeHook = getGxtRenderer()?.renderPass.beforeBeginRenderPass;
  if (_beforeHook) {
    _beforeHook();
  }
  _isInRenderPass = true;
  _templateRenderedInstances.clear();
  // DEV: the tracked values this render reads, for the per-value backtracking
  // check (`assertTrackedCellBacktrack`), as Glimmer's render transaction.
  if (DEBUG) beginRenderPassReads();
}

export function endRenderPass(): void {
  _isInRenderPass = false;
  _templateRenderedInstances.clear();
  if (DEBUG) endRenderPassReads();
}

/**
 * Check if setting a property on an instance constitutes backtracking.
 * Called from Ember's set() during rendering to detect modifications
 * to already-rendered component state.
 *
 * Installed on the typed bridge via
 * `setGxtRenderer({ backtracking: { checkBacktracking, ... } })` at file EOF
 * and dispatched by cross-package callers through
 * `getGxtRenderer()?.backtracking.checkBacktracking(...)`. compile.ts
 * contributes a `transformBacktrackingMessage` host hook (which injects
 * template-only component names into the assertion message); we apply that
 * hook, if registered, immediately before dispatching to `_assertFn` below.
 */
export function checkBacktracking(targetObj: any, key: string): void {
  if (!_isInRenderPass) return;
  if (!_templateRenderedInstances.has(targetObj)) {
    // The target might be a Proxy created by wrapNestedObjectForTracking.
    // Check if the raw (unwrapped) target is in the set.
    const rawTarget = _proxyToRaw.get(targetObj);
    if (rawTarget && _templateRenderedInstances.has(rawTarget)) {
      // Found via raw→proxy lookup
    } else {
      // The target might be the raw object while the set has the proxy.
      const proxyOfTarget = _nestedTrackingProxies.get(targetObj);
      if (!proxyOfTarget || !_templateRenderedInstances.has(proxyOfTarget)) {
        return;
      }
    }
  }
  // This instance's template was already rendered in this pass.
  // Setting a property on it is backtracking.
  // Glimmer VM uses toString() for EmberObject subclasses (returns `<ClassName:emberN>`)
  // and constructor.name for plain tracked classes (returns `ClassName`).
  const toStr = targetObj?.toString?.();
  let objName: string;
  if (toStr && toStr !== '[object Object]' && toStr.startsWith('<')) {
    // EmberObject subclass — use toString() which gives `<ClassName:emberN>`
    objName = toStr;
  } else if (toStr && toStr !== '[object Object]' && typeof toStr === 'string') {
    // Object with a custom toString() — use it (e.g., Person (Ben))
    objName = toStr;
  } else {
    // Plain tracked class — use constructor name directly (no angle brackets)
    const ctorName = targetObj?.constructor?.name;
    objName = ctorName && ctorName !== 'Object' && ctorName !== 'Array' ? ctorName : '<unknown>';
  }

  // Build a render tree string from the parentView stack for the message.
  // Walk the parentView chain to build component names (skip the root test context).
  const renderTreeParts: string[] = [];
  let propPath = `this.${key}`;

  // Check if targetObj is a component (has parentView/debugContainerKey)
  let startObj: any = targetObj;
  if (!startObj._debugContainerKey && !startObj.parentView) {
    // Target is a non-component object (e.g., EmberObject, tracked class).
    // Find the owning component by checking which rendered component has this
    // object as a property value.
    for (const rendered of _templateRenderedInstances) {
      if (!rendered._debugContainerKey) continue;
      const keys = Object.keys(rendered);
      for (const k of keys) {
        if (k.startsWith('_') || k.startsWith('$')) continue;
        // The read only names the property path in the assertion's message;
        // Glimmer reads no property here.
        let val: unknown;
        try {
          val = rendered[k];
        } catch (error) {
          _gxtReportDroppedRead(`the backtracking message's read of \`${k}\``, error);
          continue;
        }
        // Check both raw and proxy-unwrapped identity
        const rawTarget = _proxyToRaw.get(targetObj) || targetObj;
        if (val === rawTarget || val === targetObj) {
          startObj = rendered;
          propPath = `this.${k}.${key}`;
          break;
        }
      }
      if (startObj !== targetObj) break;
    }
  }

  let pv: any = startObj;
  while (pv) {
    const dbgKey = pv._debugContainerKey;
    if (dbgKey) {
      const name = dbgKey.replace('component:', '');
      if (name !== '-top-level') {
        renderTreeParts.unshift(name);
      }
    }
    pv = pv.parentView;
  }

  // If rendering inside an outlet context, build the outlet hierarchy.
  // This matches Glimmer VM's render tree which includes outlet entries.
  const outletState = getCurrentOutletState();
  const inOutletRender = getGxtRenderer()!.compilePipeline.isInOutletRender!();
  if (outletState && inOutletRender) {
    // Clear parentView-derived entries (e.g., "controller:routeWithError")
    // and rebuild with the proper outlet hierarchy that Glimmer VM produces.
    renderTreeParts.length = 0;
    // Build outlet hierarchy from the top-level outlet ref. The `?? undefined`
    // fallback returns undefined when the slot is unset, so the surrounding
    // `if (topOutletRef)` short-circuits the chain walk.
    const topOutletRef = getGxtRenderer()?.compilePipeline.getTopOutletRef?.() ?? undefined;
    if (topOutletRef) {
      const outletChain: string[] = [];
      const routeName = outletState.render?.name;
      const walkOutlets = (ref: any, target: string | undefined): void => {
        const main = ref?.outlets?.main;
        if (!main?.render?.name) return;
        outletChain.push(main.render.name);
        if (main.render.name === target) return;
        if (main.outlets?.main) {
          walkOutlets(main, target);
        }
      };
      walkOutlets(topOutletRef, routeName);
      // Build render tree: {{outlet}} for X, X, {{outlet}} for Y, Y, ...
      for (const name of outletChain) {
        renderTreeParts.push(`{{outlet}} for ${name}`);
        renderTreeParts.push(name);
      }
    }
    // Use @model.key as the property path for outlet-rendered models
    propPath = `@model.${key}`;
  }

  // Build indented tree
  const isInOutlet =
    !!getCurrentOutletState() && renderTreeParts.some((p) => p.startsWith('{{outlet}}'));
  // In outlet context, base indent is 6 (matching Glimmer VM's outlet nesting).
  // In component context, base indent is 4 (matching Glimmer VM's component nesting).
  const baseIndent = isInOutlet ? 3 : 2; // multiplied by 2 below
  const treeLines = renderTreeParts.map((n, i) => ' '.repeat((i + baseIndent) * 2) + n);
  const propIndent = ' '.repeat((renderTreeParts.length + baseIndent - 1) * 2);
  treeLines.push(propIndent + propPath);
  const renderTree = treeLines.join('\n');
  const topLevelPrefix = isInOutlet
    ? '  {{outlet}} for -top-level\n    -top-level\n'
    : '  -top-level\n';

  // Call the current assert function — use the dynamic getter on globalThis
  // to pick up the stub installed by expectAssertion(). The module-level
  // import `assert` may be a stale reference in bundled/HMR'd code.
  const _assertFn = (globalThis as any).__emberAssertFn;
  let msg = `You attempted to update \`${key}\` on \`${objName}\`, but it had already been used previously in the same computation. \`${key}\` was first used:\n\n- While rendering:\n${topLevelPrefix}${renderTree}\n\nStack trace for the update:`;
  // Apply the registered message-transform host hook (if any). The hook is
  // contributed by compile.ts via `installBacktrackingPart` and injects
  // template-only component names into the render tree.
  const _transformMsg = getGxtRenderer()?.backtracking.transformBacktrackingMessage;
  if (_transformMsg) {
    msg = _transformMsg(msg);
  }
  if (typeof _assertFn === 'function') {
    _assertFn(msg, false);
  } else {
    assert(msg, false);
  }
}

// Thrown for a block invocation (`{{#name}}…{{/name}}`) of a name that resolves
// to a helper; the owner-lookup catch around it rethrows only this class.
class GxtHelperAsBlockError extends Error {}

export function captureRenderError(err: unknown): void {
  _renderErrors.push({
    error: err instanceof Error ? err : new Error(String(err)),
    capture: ++_renderErrorCount,
  });
}

/**
 * The mark a render takes when it starts. The errors captured after it are
 * that render's errors (`flushRenderErrors` / `dropRenderErrors`).
 */
export function renderErrorMark(): number {
  return _renderErrorCount;
}

/** Remove the errors captured after `mark` from the queue and return them, oldest first. */
function takeRenderErrors(mark: number): Error[] {
  // The queue is in capture order, so these errors are its tail.
  let start = _renderErrors.length;
  while (start > 0 && _renderErrors[start - 1]!.capture > mark) {
    start--;
  }
  return _renderErrors.splice(start).map((entry) => entry.error);
}

/**
 * End of a render that completed: throw the first error captured since `mark`
 * (the render's start), if any, and remove the render's errors from the queue.
 */
export function flushRenderErrors(mark: number): void {
  const errors = takeRenderErrors(mark);
  if (errors.length > 0) {
    throw errors[0];
  }
}

/**
 * End of a render that threw to its caller: remove the errors captured since
 * `mark` without throwing them. Several sites queue an error and also throw it,
 * so the queue holds a copy of the error the caller already receives (or an
 * error of the same aborted render). Left in the queue, the copy would be
 * re-thrown by the next, unrelated render.
 */
export function dropRenderErrors(mark: number): void {
  takeRenderErrors(mark);
}

/**
 * Clear any stale render errors without throwing.
 * Called during test teardown to prevent errors from leaking between tests.
 */
export function clearRenderErrors(): void {
  _renderErrors.length = 0;
}
// `clearRenderErrors` is exposed as the `compilePipeline.clearRenderErrors`
// bridge method (see the `setGxtRenderer` call below) for
// internal-test-helpers.

/**
 * Flush all queued didInsertElement / didRender callbacks.
 * Called from the renderer after the GXT template.render() call has
 * synchronously appended all DOM into the live document.
 */
// Exposed as the `viewUtils.flushAfterInsertQueue` bridge method (via the
// `_gxtBridgeFlushAfterInsertQueue` adapter, which also dispatches compile.ts's
// `afterFlushAfterInsertQueue` host hook). Called from compile.ts's
// `_gxtSyncDomNow` (phase 3b) and from ember-gxt-wrappers.ts's `$_dc_ember`
// swap path.

export function flushAfterInsertQueue(): void {
  while (_afterInsertQueue.length > 0) {
    const cb = _afterInsertQueue.shift()!;
    try {
      cb();
    } catch (e) {
      // Capture lifecycle errors so they propagate to assert.throws
      captureRenderError(e);
    }
  }
  // After all insert callbacks have fired, the DOM is fully populated for
  // this render pass. Rebuild view-tree parent/child relationships from live
  // DOM ancestry so getChildViews/getRootViews see the correct tree even
  // when components were created via paths that skipped patchedIf's
  // parentView stack push (e.g. outlet content, force-rerender of route
  // templates).
  //
  // Routes through the `viewUtils.rebuildViewTreeFromDom` bridge adapter, which
  // also dispatches the `afterRebuildViewTreeFromDom` host hook contributed by
  // compile.ts.
  getGxtRenderer()?.viewUtils.rebuildViewTreeFromDom?.();
}

// Lifecycle hooks that only fire in interactive mode. In non-interactive
// (SSR) mode they are suppressed, as in Ember's curly component manager.
const INTERACTIVE_ONLY_HOOKS = new Set([
  'willRender',
  'willInsertElement',
  'didInsertElement',
  'didRender',
  'willUpdate',
  'didUpdate',
  'willDestroyElement',
  'willClearRender',
  'didDestroyElement',
]);

/**
 * Check whether we are in interactive mode.
 * Reads the `-environment:main` boot option from the owner.
 * Result is cached after the first lookup.
 */
let _isInteractiveCached: boolean | undefined;
function isInteractiveMode(): boolean {
  if (_isInteractiveCached !== undefined) return _isInteractiveCached;
  const owner: any = getAmbientOwner();
  // A destroyed owner resolves nothing (its container's `lookup` asserts).
  if (owner && !owner.isDestroyed && !owner.isDestroying) {
    const env = owner.lookup?.('-environment:main');
    if (env && typeof env.isInteractive === 'boolean') {
      _isInteractiveCached = env.isInteractive;
      return _isInteractiveCached;
    }
  }
  // Default to true (interactive) if we can't determine
  return true;
}

// Reset the cache when the owner changes (e.g. between tests).
// The global owner is reassigned per-test, so we reset at each lookup if the owner changed.
let _lastOwnerForInteractive: any = undefined;
function isInteractiveModeChecked(): boolean {
  const owner = getAmbientOwner();
  if (owner !== _lastOwnerForInteractive) {
    _lastOwnerForInteractive = owner;
    _isInteractiveCached = undefined;
  }
  return isInteractiveMode();
}

/**
 * Trigger a lifecycle hook on a component instance through Ember's
 * `trigger()`, which invokes the hook method and any registered listeners.
 * Interactive-only hooks are skipped in non-interactive mode. Errors are
 * captured into the render-error queue, or rethrown when `opts.rethrow` is
 * set.
 */
function triggerLifecycleHook(instance: any, hookName: string, opts?: { rethrow?: boolean }): void {
  if (!instance) return;
  // In non-interactive mode, suppress interactive-only hooks
  if (INTERACTIVE_ONLY_HOOKS.has(hookName) && !isInteractiveModeChecked()) {
    return;
  }

  try {
    // Use Ember's event trigger - this is the canonical way to invoke
    // lifecycle hooks in Ember components
    if (typeof instance.trigger === 'function') {
      // Glimmer's curly manager runs a classic component's hooks untracked:
      // their reads are no reads of the render (`untrackedForRenderPass`).
      if (DEBUG) untrackedForRenderPass(() => instance.trigger(hookName));
      else instance.trigger(hookName);
    }
  } catch (e) {
    // Re-throw non-Error values (e.g., expectAssertion's BREAK sentinel)
    // so they propagate to the test harness.
    if (!(e instanceof Error)) {
      throw e;
    }
    // Init-phase callers (createComponentInstance → didReceiveAttrs) pass
    // {rethrow:true} so errors surface synchronously in the current runTask,
    // i.e. in the current test. Queuing them would let a test without a
    // QUnit-visible failure leave a stale error behind for the next test's
    // first flushRenderErrors(). Update/destroy callers keep queue semantics
    // for legitimate cross-runloop propagation through flushRenderErrors() in
    // the renderer.
    if (opts?.rethrow) {
      throw e;
    }
    // Capture lifecycle-hook errors (didInsertElement, willDestroyElement,
    // didReceiveAttrs, etc.) into the render-error queue so they surface
    // through flushRenderErrors() in the renderer. Honor
    // _suppressDestroyCapture, which is set during spurious unclaimed-
    // pool sweeps where a user destroy/lifecycle throw should not propagate
    // to assert.throws (see `_gxtDestroyUnclaimedPoolEntries` phase 1).
    if (!_suppressDestroyCapture) {
      captureRenderError(e);
    }
  }
}

// =============================================================================
// Wrapper Element Building
// =============================================================================

/**
 * Parse an attribute binding string: 'propName:attrName' or just 'propName'.
 * Handles namespaced attributes like 'xlinkHref:xlink:href'.
 */
function parseAttributeBinding(binding: string): { propName: string; attrName: string } {
  const idx = binding.indexOf(':');
  if (idx === -1) return { propName: binding, attrName: binding };
  return { propName: binding.slice(0, idx), attrName: binding.slice(idx + 1) };
}

// dasherize imported from ./utils

/**
 * Resolve a value from an instance by a potentially nested path like 'foo.bar.baz'.
 */
function getNestedValue(instance: any, path: string): any {
  const parts = path.split('.');
  let current = instance;
  let inAttrs = false;
  for (let i = 0; i < parts.length; i++) {
    if (current == null) return undefined;
    const part = parts[i]!;
    if (part === 'attrs') {
      inAttrs = true;
      // For attrs.X paths, prefer reading from __argGetters which provides
      // fresh reactive values from the parent context, instead of going
      // through MutableCells which may be stale after model replacement.
      const argGetters = instance?.__argGetters;
      const firstArgKey = parts[i + 1];
      if (argGetters && firstArgKey && argGetters[firstArgKey]) {
        let argValue = argGetters[firstArgKey]();
        // If there are more segments after attrs.X (e.g., attrs.batman.robin),
        // traverse the remaining path on the resolved arg value
        for (let j = i + 2; j < parts.length; j++) {
          if (argValue == null) return undefined;
          argValue = argValue[parts[j]!];
        }
        return argValue;
      }
      current = current[part];
      continue;
    }
    current = current[part];
    // attrs.X returns a MutableCell with .value — unwrap it
    if (inAttrs && current != null && typeof current === 'object' && 'value' in current) {
      current = current.value;
      inAttrs = false;
    }
  }
  return current;
}

/**
 * Resolve a single classNameBinding string to a class name (or null).
 *
 * Supported formats:
 *   ':static-class'            → always 'static-class'
 *   'prop'                     → truthy string value, or dasherize(prop) for true, or null
 *   'prop:trueClass'           → trueClass when truthy, else null
 *   'prop:trueClass:falseClass'→ trueClass when truthy, else falseClass
 *   'prop::falseClass'         → null when truthy, else falseClass
 */
function resolveClassNameBinding(instance: any, binding: string): string | null {
  // Static class: ':static-class'
  if (binding.startsWith(':')) {
    return binding.slice(1);
  }

  const parts = binding.split(':');
  const propPath = parts[0]!;
  const trueClass = parts.length > 1 ? parts[1] : undefined;
  const falseClass = parts.length > 2 ? parts[2] : undefined;

  const value = getNestedValue(instance, propPath);

  if (trueClass !== undefined) {
    // 'prop:trueClass' or 'prop:trueClass:falseClass' or 'prop::falseClass'
    if (value) {
      return trueClass || null; // trueClass could be empty string for 'prop::falseClass'
    } else {
      return falseClass || null;
    }
  }

  // Simple 'prop' binding
  if (value === true) {
    // For nested paths like 'nested.fooBarBaz', dasherize only the last segment
    const lastSegment = propPath.includes('.') ? propPath.split('.').pop()! : propPath;
    return dasherize(lastSegment);
  }
  if (value && typeof value === 'string') {
    return value;
  }
  return null;
}

// A tag-less component cannot have `classNameBindings`, `attributeBindings` or
// an explicit `elementId` (`id` is allowed: an `elementId` mapped from `id` is
// marked `__elementIdFromId`). `proto` is the definition's prototype.
function _assertTaglessComponent(instance: any, proto: any, args: any): void {
  const cnBindings = instance?.classNameBindings || proto?.classNameBindings;
  assert(
    'You cannot use `classNameBindings` on a tag-less component',
    !cnBindings || !Array.isArray(cnBindings) || cnBindings.length === 0
  );
  const atBindings = instance?.attributeBindings || proto?.attributeBindings;
  assert(
    'You cannot use `attributeBindings` on a tag-less component',
    !atBindings || !Array.isArray(atBindings) || atBindings.length === 0
  );
  const argElementId = args && 'elementId' in args && args.elementId !== undefined;
  const instanceElementId = instance?.elementId && !instance.__elementIdFromId;
  assert('You cannot use `elementId` on a tag-less component', !argElementId && !instanceElementId);
}

// The class a classic component's element receives from its invocation: the
// `class` argument of a curly invocation, else the angle-bracket `class`
// attribute, which compile.ts keeps under `__htmlClass` (an attribute is not
// an argument).
function _invocationClassKey(args: any): 'class' | '__htmlClass' | null {
  if (!args || typeof args !== 'object') return null;
  if ('class' in args) return 'class';
  return '__htmlClass' in args ? '__htmlClass' : null;
}

function _invocationClass(args: any): unknown {
  const key = _invocationClassKey(args);
  const value = key ? args[key] : undefined;
  return typeof value === 'function' ? value() : value;
}

// A wrapper element's classes: the invocation's `class` and `classNames`, the
// definition's (else the instance's) static `classNames`, the resolved
// `classNameBindings`, and `ember-view` last. `validateBindings` asserts each
// binding's shape (done when the element is first built).
function _wrapperClassList(
  instance: any,
  componentDef: any,
  argsClass: unknown,
  argsClassNames: unknown,
  validateBindings: boolean
): string[] {
  const classList: string[] = [];
  if (argsClass && typeof argsClass === 'string') {
    classList.push(...argsClass.split(' ').filter(Boolean));
  }
  if (argsClassNames && typeof argsClassNames === 'string') {
    classList.push(...argsClassNames.split(' ').filter(Boolean));
  }
  const protoClassNames = componentDef?.prototype?.classNames;
  if (protoClassNames && Array.isArray(protoClassNames) && protoClassNames.length > 0) {
    classList.push(...protoClassNames);
  } else if (instance?.classNames && Array.isArray(instance.classNames)) {
    classList.push(...instance.classNames);
  }
  const classNameBindings =
    instance?.classNameBindings || componentDef?.prototype?.classNameBindings;
  if (classNameBindings && Array.isArray(classNameBindings)) {
    for (const binding of classNameBindings) {
      if (validateBindings) {
        assert(
          'classNameBindings must be non-empty strings',
          typeof binding === 'string' && binding.length > 0
        );
        assert(
          "classNameBindings must not have spaces in them. Multiple class name bindings can be provided as elements of an array, e.g. `classNameBindings: ['foo', ':bar']`",
          typeof binding === 'string' && !binding.includes(' ')
        );
      }
      const className = resolveClassNameBinding(instance, binding);
      if (className) classList.push(className);
    }
  }
  classList.push('ember-view');
  return classList;
}

// The value of an `attributeBindings` property (a dotted path is walked).
function _attributeBindingValue(instance: any, propName: string): any {
  return propName.includes('.') ? getNestedValue(instance, propName) : instance?.[propName];
}

// Ember's style-XSS warning for a `style` binding whose value is not an
// htmlSafe string (once per render pass and value, see `_shouldWarnStyle`).
function _warnUnsafeStyleBinding(wrapper: HTMLElement, attrName: string, value: any): void {
  if (attrName === 'style' && value !== null && value !== undefined && value !== false) {
    const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
    if (!isHTMLSafe && _shouldWarnStyle(wrapper, String(value))) {
      const warnFn = getDebugFunction('warn');
      if (warnFn)
        warnFn(constructStyleDeprecationMessage(String(value)), false, {
          id: 'ember-htmlbars.style-xss-warning',
        });
    }
  }
}

// `value` on an <input>, <textarea> or <select> is bound as the DOM property:
// the HTML attribute only sets the default value, and Glimmer sets the
// property, so the attribute does not appear in `outerHTML`.
function _isValuePropertyAttr(wrapper: HTMLElement, attrName: string): boolean {
  return (
    attrName === 'value' &&
    (wrapper.tagName === 'INPUT' || wrapper.tagName === 'TEXTAREA' || wrapper.tagName === 'SELECT')
  );
}

// The attribute names an invocation forwards onto a classic component's own
// element (`fw[0]` / `fw[1]`, its `...attributes`), per element. As in
// Glimmer, an invocation attribute wins over the component's
// `attributeBindings` for the same name.
const _invocationAttrNames = new WeakMap<Element, Set<string>>();

function _forwardedAttrNames(fw: any): Set<string> {
  const names = new Set<string>();
  if (Array.isArray(fw)) {
    for (const list of [fw[0], fw[1]]) {
      if (!Array.isArray(list)) continue;
      for (const [key] of list) {
        if (typeof key === 'string' && key !== '' && !key.startsWith('@')) names.add(key);
      }
    }
  }
  return names;
}

/**
 * Sync wrapper element attributes and classes after property changes.
 * Called when a pooled instance is reused and args have changed.
 */
function syncWrapperElement(
  instance: any,
  wrapper: HTMLElement,
  componentDef: any,
  args: any
): void {
  if (!wrapper || !(wrapper instanceof HTMLElement)) return;

  // --- Rebuild class list ---
  // Classes from invocation args (try arg getters first, then args object)
  const argGetters = instance?.__argGetters;
  const argsClass = argGetters?.class ? argGetters.class() : _invocationClass(args);
  const argsClassNames = argGetters?.classNames
    ? argGetters.classNames()
    : typeof args?.classNames === 'function'
      ? args.classNames()
      : args?.classNames;
  wrapper.className = _wrapperClassList(
    instance,
    componentDef,
    argsClass,
    argsClassNames,
    false
  ).join(' ');

  // --- Sync id from HTML id prop (not @id named arg) ---
  // When 'id' is passed as an HTML prop (e.g., <FooBar id={{this.customId}} />),
  // the wrapper element's id should track the prop value.
  // @id maps to elementId which is frozen after first render - that's NOT synced here.
  const htmlIdGetter = instance?.__argGetters?.__htmlId;
  if (htmlIdGetter) {
    const newId = htmlIdGetter();
    if (newId !== undefined && newId !== null) {
      wrapper.id = String(newId);
    }
  }

  // --- Sync attributeBindings ---
  const attributeBindings =
    instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  if (attributeBindings && Array.isArray(attributeBindings)) {
    const invocationAttrs = _invocationAttrNames.get(wrapper);
    for (const binding of attributeBindings) {
      const { propName, attrName } = parseAttributeBinding(binding);

      // Never update id — it's frozen after first render
      if (attrName === 'id') continue;
      if (invocationAttrs?.has(attrName)) continue;

      const rawValue = _attributeBindingValue(instance, propName);
      _warnUnsafeStyleBinding(wrapper, attrName, rawValue);
      const value = sanitizedAttrValue(wrapper, attrName, rawValue);
      if (_isValuePropertyAttr(wrapper, attrName)) {
        (wrapper as any)[attrName] = value != null && value !== false ? String(value) : '';
        // Remove the HTML attribute if it was previously set
        if (wrapper.hasAttribute(attrName)) {
          wrapper.removeAttribute(attrName);
        }
      } else if (value === undefined || value === null || value === false) {
        wrapper.removeAttribute(attrName);
      } else if (value === true) {
        wrapper.setAttribute(attrName, '');
      } else {
        wrapper.setAttribute(attrName, String(value));
      }
    }
  }

  // --- Sync ariaRole ---
  const ariaRole = instance?.ariaRole;
  if (ariaRole) {
    wrapper.setAttribute('role', ariaRole);
  } else {
    // Remove if it was previously set via ariaRole binding (proto, class, or arg)
    const ariaRoleInProto = componentDef?.prototype?.hasOwnProperty('ariaRole');
    const ariaRoleInClass = componentDef?.hasOwnProperty?.('ariaRole');
    const ariaRoleInArgs = instance?.__argGetters?.ariaRole;
    if (ariaRoleInProto || ariaRoleInClass || ariaRoleInArgs) {
      wrapper.removeAttribute('role');
    }
  }
}

/**
 * Register a component instance for tracked wrapper element updates.
 * After each gxtSyncDom(), all tracked instances have their wrapper
 * element's attributes and classes re-synced.
 */
function installBindingInterceptors(instance: any, wrapper: HTMLElement, componentDef: any) {
  const attrBindings = instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  const classBindings = instance?.classNameBindings || componentDef?.prototype?.classNameBindings;
  const hasClassArg = instance?.__argGetters?.class || instance?.__argGetters?.classNames;
  const hasAriaRole = instance?.__argGetters?.ariaRole;
  const hasHtmlIdArg = instance?.__argGetters?.__htmlId;

  if (
    (attrBindings && attrBindings.length > 0) ||
    (classBindings && classBindings.length > 0) ||
    hasClassArg ||
    hasAriaRole ||
    hasHtmlIdArg
  ) {
    trackedWrapperInstances.add({ instance, wrapper, componentDef });
  }
}

// Instances with attribute/class bindings, re-synced after each sync pass.
const trackedWrapperInstances = new Set<any>();

// Track arg cells for reactive cross-component updates.
// When parent context changes, these cells are updated so GXT formulas re-evaluate.
interface TrackedArgEntry {
  cells: Record<
    string,
    { cell: any; getter: () => any; initOverridden?: boolean; lastArgValue?: any }
  >;
  instance?: any; // component instance for lifecycle hooks
}
const trackedArgCells = new Set<TrackedArgEntry>();

// Direct sync callbacks for internal components (Input, Textarea).
// These are called from `_gxtSyncAllWrappers` to directly update DOM elements
// when parent args change. GXT's effect system doesn't track Ember property
// changes, so we need this manual sync path.
type InternalSyncCallback = () => void;
const _internalComponentSyncCallbacks = new Set<{
  callback: InternalSyncCallback;
  el: HTMLElement;
}>();

// Set of component instances that had .rerender() explicitly called.
// When non-empty, `_gxtSyncAllWrappers` will fire update hooks for the
// rerendered component(s) and all their ancestors (matching Ember's
// tree-revalidation behavior where parent views also get update hooks).
const _forcedRerenderInstances = new Set<any>();

/**
 * Mark a component as having been explicitly rerendered via .rerender().
 * This triggers update lifecycle hooks for the instance and its ancestor
 * chain on the next sync pass.
 *
 * Registered on the bridge as `compilePipeline.forceRerender`, called from
 * `glimmer/lib/component.ts`'s `Component.prototype._rerender`. Distinct from
 * `forceEmberRerender()`, the no-args full-tree fallback fired from
 * `_gxtSyncDomNow`.
 */
function _gxtForceRerender(instance: any): void {
  _forcedRerenderInstances.add(instance);
}

/**
 * Check if an instance should receive forced-rerender hooks.
 * An instance qualifies if it IS one of the forced instances, or is an
 * ancestor (via parentView) of one.
 */
function _shouldForceRerender(instance: any): boolean {
  if (_forcedRerenderInstances.size === 0) return false;
  // Check if any forced instance has this instance in its ancestor chain
  for (const forced of _forcedRerenderInstances) {
    if (forced === null) return true; // null means force all (from renderer revalidate)
    let current = forced;
    while (current) {
      if (current === instance) return true;
      current = current.parentView;
    }
  }
  return false;
}

// After gxtSyncDom(), refresh arg cells and re-sync wrapper elements.
// Returns instances that had changes (for post-render lifecycle hooks).
const _updatedInstances: any[] = [];

// Set of nested objects mutated during the current sync cycle. Populated by
// the BEFORE-chain host hook registered against compile.ts's `triggerReRender`
// (see the `addBeforeTriggerReRender` registration below). Consulted by
// `_gxtSyncAllWrappers` to detect when an arg value (same object identity) had
// a property mutated — e.g., set(item, 'value', 3) when `item` is passed as an
// arg to a component. Without this, no arg cell changes and the consumer's
// didUpdate never fires.
let _dirtiedNestedObjectsForHooks: Set<object> = new Set();

// Registered as a one-shot BEFORE-chain host hook on
// `compilePipeline.addBeforeTriggerReRender`. The closure captures the
// `_dirtiedNestedObjectsForHooks` module-local Set, read by
// `_gxtSyncAllWrappersBody` below.
function _gxtRecordDirtiedNestedObject(obj: object, _keyName: string): void {
  if (obj && typeof obj === 'object') {
    _dirtiedNestedObjectsForHooks.add(obj);
  }
}

// Dynamic-component change listeners. Writers (in ember-gxt-wrappers.ts),
// counter readers (compile.ts's `_gxtSyncDomNow` + manager.ts's
// notifyPropertyChange dispatch), and the cross-test clear all go through the
// bridge methods `addDynamicComponentListener` /
// `hasStringDynamicComponentListeners` / `clearDynamicComponentListeners`.
// The Set's reader (the after-body dispatch in `_gxtSyncAllWrappers`)
// iterates the Set directly.
type _DcListener = () => boolean;
const _dcChangeListeners = new Set<_DcListener>();
let _dcStringListenerCount = 0;
function _gxtAddDynamicComponentListener(
  fn: _DcListener,
  options?: { stringPath?: boolean }
): () => void {
  _dcChangeListeners.add(fn);
  const isStringPath = options?.stringPath === true;
  if (isStringPath) {
    _dcStringListenerCount++;
  }
  let removed = false;
  return function off(): void {
    if (removed) return;
    removed = true;
    _dcChangeListeners.delete(fn);
    if (isStringPath && _dcStringListenerCount > 0) {
      _dcStringListenerCount--;
    }
  };
}
function _gxtClearDynamicComponentListeners(): void {
  _dcChangeListeners.clear();
  _dcStringListenerCount = 0;
}
function _gxtHasStringDynamicComponentListeners(): boolean {
  return _dcStringListenerCount > 0;
}

// `_gxtSyncAllWrappers` (below) runs in three steps: SET in-flight pass+cycle
// state and pre-wrap pool triggers BEFORE the main body runs, then RUN the
// main sync-all body, then CLEAR in-flight state and DISPATCH dynamic-component
// change listeners AFTER.
const _UPDATE_HOOKS_FOR_MARK = new Set([
  'didUpdateAttrs',
  'didReceiveAttrs',
  'willUpdate',
  'willRender',
]);

// In-flight sync-cycle id for the `_gxtSyncAllWrappers` wrap. Set in the
// BEFORE step from the renderer's sync-cycle id and cleared to `0` in the
// AFTER step's `finally`. Read by `_wrapInstanceTriggerForSyncAllMark` to stamp
// the fired-cycle markers; `0` means "no sync in flight".
let _gxtSyncAllInFlightCycle = 0;

// Detected-source-context slots for the two-way binding "arg source" detection
// pass. The detection runs inside `_installPropertyDidChangeOverride`'s probe
// block: for each component arg, it sets the `_gxtTrackArgSource` flag, clears
// these two slots, invokes the arg getter (which reaches into the parent's
// proxy renderContext and trips the trap in the proxy `get` handler at the
// bottom of this file), then reads the slots back to discover which
// (parent, key) pair the getter resolved to. The slots have no lifetime beyond
// a single getter invocation. Typed `any`: the key is `string | null` and the
// ctx is `unknown | null`, and all consumers null-check before use.
let _lastArgSourceKey: any = null;
let _lastArgSourceCtx: any = null;

// Boolean gate for the arg-source detection pass above. A transient flag armed
// by the probe before invoking each arg getter and read by the proxy `get`
// trap to decide whether to record the (prop, target) pair into the slots
// above. Cleared on both the success and catch paths, so it has no lifetime
// beyond a single probe iteration.
let _gxtTrackArgSource = false;

function _wrapInstanceTriggerForSyncAllMark(inst: any): void {
  if (!inst || typeof inst.trigger !== 'function' || inst.__gxtTriggerWrapped) return;
  const origTrigger = inst.trigger;
  const wrapped = function (this: any, name: string, ...args: any[]) {
    // `0` (no sync in flight) falls through the guard below.
    const __cycle = _gxtSyncAllInFlightCycle;
    if (__cycle && _UPDATE_HOOKS_FOR_MARK.has(name)) {
      this.__gxtSyncAllFiredCycleId = __cycle;
      // "Hooks actually fired" marker — distinguishes "syncAll visited but
      // found no changes" (unconditional stamp from manager.ts trackedArgCells
      // loop) from "syncAll actually fired update hooks". compile.ts's
      // pool-reuse fallback uses this to decide whether to fire willRender.
      this.__gxtHooksFiredCycleId = __cycle;
    }
    return origTrigger.call(this, name, ...args);
  };
  Object.defineProperty(inst, 'trigger', {
    value: wrapped,
    writable: true,
    configurable: true,
    enumerable: false,
  });
  inst.__gxtTriggerWrapped = true;
}

// Install `instance[key]` as the reactive accessor of an arg (create and
// update share it). A read consumes the classic tag, so createCache /
// invokeHelper consumers track it, then returns the arg's current value, or
// the local value while component code has overridden the property (tracked in
// `__gxtLocalOverrides`). A write from the parent's arg dispatch
// (`__gxtDispatchingArgs`) switches back to the arg. Every write runs a
// CP-with-setter's setter for its side effects (else this descriptor would eat
// the write) and dirties the classic tag.
function _installArgDescriptor(
  instance: any,
  key: string,
  getter: () => unknown,
  localValue: unknown,
  useLocal: boolean,
  cpWithSetter: any
): void {
  Object.defineProperty(instance, key, {
    get() {
      _classicConsumeTagHook(_classicTagForHook(instance, key));
      if (useLocal) return localValue;
      try {
        return getter();
      } catch {
        return localValue;
      }
    },
    set(v: any) {
      if (instance.__gxtDispatchingArgs) {
        localValue = v;
        useLocal = false;
        if (instance.__gxtLocalOverrides) instance.__gxtLocalOverrides.delete(key);
      } else {
        localValue = v;
        useLocal = true;
        // `_gxtSyncAllWrappers` skips locally overridden keys.
        if (!instance.__gxtLocalOverrides) instance.__gxtLocalOverrides = new Set();
        instance.__gxtLocalOverrides.add(key);
      }
      if (cpWithSetter && !instance.__gxtInvokingCpSetter) {
        // Record the dispatched value so the PROPERTY_DID_CHANGE override can
        // tell a stale re-read from a deferred observer flush.
        if (instance.__gxtDispatchingArgs) {
          if (!instance.__gxtCpArgDispatched) instance.__gxtCpArgDispatched = {};
          instance.__gxtCpArgDispatched[key] = v;
        }
        // What the computed property's setter throws reaches the write.
        try {
          instance.__gxtInvokingCpSetter = true;
          cpWithSetter.set(instance, key, v);
        } finally {
          instance.__gxtInvokingCpSetter = false;
        }
      }
      // What a classic reactor the dirty runs throws reaches the write.
      classicDirtyTagForGuarded(instance, key);
    },
    configurable: true,
    enumerable: true,
  });
}

// Install an effect, owned by `owner`, that dirties `target`'s classic tag
// for `key` whenever `read()` returns something other than on its previous run
// (the first run only records the value). Classic consumers (createCache,
// invokeHelper) consume that tag when they read an arg-derived property, and
// would otherwise not see a parent's change unless something re-read it. The
// dirty is an arg propagation (`withArgPropagation`): it fires no classic
// reactor.
function _installArgDirtyEffect(
  owner: object,
  target: object,
  key: string,
  read: () => unknown
): void {
  let lastValue: unknown = undefined;
  let primed = false;
  _gxtEffectWithOwner(owner, () => {
    const v = read();
    if (primed && v !== lastValue) {
      // An arg propagation runs no classic reactor: the dirty only marks the
      // tag and schedules the sync.
      withArgPropagation(() => classicDirtyTagForGuarded(target, key));
    }
    lastValue = v;
    primed = true;
  });
}

// The value an arg's render-context cell stands for: the getter's value when
// there is a getter, else the cell's value. Both reads run, so an effect calling
// this depends on the cell as well. The effect reads the getter eagerly, for
// the classic tag only: a getter that throws leaves the cell's value, reported
// in DEBUG, and the template's own read of the argument throws to the render.
function _readArgCell(cell: any, getter: (() => unknown) | undefined): unknown {
  const v: unknown = cell.value;
  if (!getter) return v;
  try {
    return getter();
  } catch (error) {
    _gxtReportDroppedRead('an argument getter read for its classic tag', error);
    return v;
  }
}

// Write an arg value onto a component instance as manager.ts's own write-back:
// an arg propagation (`withArgPropagation`: the dirty fires no classic
// reactor), under `withSuppressDirtyInRcSet` (validator.ts dirties the tag
// without scheduling another sync) and with `__gxtDispatchingArgs` set
// (setters treat the write as a parent arg update). The instance's cell is
// updated first, so a synchronous reader (a child template formula) already
// sees the value; the assignment stays the canonical setter path. `skipDefine`
// keeps the cell from replacing a tracked descriptor. `warning` is the DEBUG
// warning when the cell update throws.
// `afterWrite` runs after the assignment, inside the dispatching frame.
function _dispatchArgWrite(
  instance: any,
  key: string,
  value: unknown,
  warning: string,
  afterWrite?: () => void
): void {
  withArgPropagation(() =>
    getGxtRenderer()!.compilePipeline.withSuppressDirtyInRcSet!(() => {
      try {
        instance.__gxtDispatchingArgs = true;
        try {
          const _cell = _gxtCellFor(instance, key, /* skipDefine */ true);
          _cell?.update?.(value);
        } catch (cellErr) {
          if (DEBUG) {
            // eslint-disable-next-line no-console
            console.warn(`[gxt] ${warning}`, { key, cellErr });
          }
        }
        instance[key] = value;
        afterWrite?.();
      } finally {
        instance.__gxtDispatchingArgs = false;
      }
    })
  );
}

// CP-with-setter side-effect bridge: when the arg is backed by a classic
// `@computed` with its own setter (`set width(w){ this.set('height', w/2) }`),
// the setter's side effect must run on every arg change. The arg write-back
// reaches the CP setter only while the instance's own descriptor is one of the
// shadow setters that forward to it; across re-renders that descriptor can be
// replaced by a plain cell descriptor (set -> cell.update, no forward), and the
// dependent property would go stale. So the setter is run explicitly;
// `__gxtInvokingCpSetter` makes it a no-op when the descriptor did forward.
// What the setter throws propagates.
function _runCpSetterSideEffect(instance: any, key: string, value: unknown): void {
  if (instance.__gxtInvokingCpSetter) return;
  const _cp = _findCpWithSetterFor(instance, key);
  if (_cp) {
    instance.__gxtInvokingCpSetter = true;
    try {
      _cp.set(instance, key, value);
    } finally {
      instance.__gxtInvokingCpSetter = false;
    }
  }
}

// The meta descriptor (computed property, `@tracked`, ...) for `key`:
// `peekDescriptors` on `obj`'s meta, then on each prototype's meta in turn.
// The walk differs from `peekDescriptors` alone in one case: it also finds a
// parent class's descriptor that a subclass removed (meta's `UNDEFINED` marker,
// e.g. a computed property overridden by a plain value in `extend()`).
function _findMetaDescriptor(obj: object, key: string): any {
  let desc = (peekMeta(obj) as any)?.peekDescriptors?.(key);
  let proto = desc ? null : Object.getPrototypeOf(obj);
  while (!desc && proto && proto !== Object.prototype) {
    const pmeta = peekMeta(proto) as any;
    if (pmeta) desc = pmeta.peekDescriptors?.(key);
    proto = Object.getPrototypeOf(proto);
  }
  return desc;
}

// The classic `@computed` descriptor for `k` when it has its own setter (not
// a getter-only CP), else `null`. Arg-dispatch writes must still run such a
// setter for its side effects (e.g. `this.set('height', w/2)` in a
// `set width(w)` body), though the instance's own reactive descriptor shadows
// the CP (GH#19028-style mutable bindings of a CP with a setter).
function _findCpWithSetterFor(inst: any, k: string): any {
  const desc = _findMetaDescriptor(inst, k);
  if (desc && desc._setter && desc._setter !== desc._getter) return desc;
  return null;
}

// Whether `key` on `inst` is a `@tracked` property: metal's `@tracked` (what
// `@glimmer/tracking` re-exports) records a TrackedDescriptor in the meta of
// the object it decorates (the class prototype, or the instance for a stage-3
// field decorator).
function _isTrackedKey(inst: any, k: string): boolean {
  if (inst === null || (typeof inst !== 'object' && typeof inst !== 'function')) return false;
  return _findMetaDescriptor(inst, k) instanceof TrackedDescriptor;
}

// Whether reading `key` on `obj` runs a `@tracked` accessor. gxt's
// `cellFor(obj, key)` without `skipDefine` defines its own cell accessor on
// `obj`; over a `@tracked` key that accessor shadows the tracked one, and later
// writes (`obj.key = value`) update only gxt's cell: the tracked setter's
// notification never runs, the run loop's DOM sync sees no change and the DOM
// stays stale. Callers that would define a cell on `obj` read or update the
// tracked key without defining instead. An inherited accessor (the usual case:
// the decorator defines it on the class prototype) is memoized per prototype.
const _trackedAccessorByProto = new WeakMap<object, Map<string, boolean>>();
export function isTrackedAccessor(obj: object, key: string): boolean {
  const own = Object.getOwnPropertyDescriptor(obj, key);
  if (own !== undefined) {
    // Only an accessor can be `@tracked` (a stage-3 field decorator defines it
    // on the instance).
    return own.set !== undefined && _isTrackedKey(obj, key);
  }
  const proto = Object.getPrototypeOf(obj);
  if (proto === null || proto === Object.prototype) return false;
  let byKey = _trackedAccessorByProto.get(proto);
  if (byKey === undefined) {
    byKey = new Map();
    _trackedAccessorByProto.set(proto, byKey);
  }
  let tracked = byKey.get(key);
  if (tracked === undefined) {
    tracked = _isTrackedKey(obj, key);
    byKey.set(key, tracked);
  }
  return tracked;
}

// Whether the first own descriptor for `key` on the prototype chain from
// `start` is a plain native get-only getter: no setter (so not a `@tracked`
// accessor), and not a classic computed property (no meta descriptor from
// `start`). Writing an arg value through such a key is impossible, and reading
// it runs the user's getter.
function _isPlainNativeGetterCollision(start: any, key: string): boolean {
  let proto = start;
  while (proto && proto !== Object.prototype) {
    const pdesc = Object.getOwnPropertyDescriptor(proto, key);
    if (pdesc) {
      // A `@tracked` accessor has a setter.
      if (!pdesc.get || pdesc.set) return false;
      return !_findMetaDescriptor(start, key);
    }
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

function _gxtSyncAllWrappers(): void {
  // BEFORE: record the in-flight sync-cycle counter (read via the bridge).
  const __curCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
  _gxtSyncAllInFlightCycle = __curCycle;
  // Proactively wrap `trigger` on all known-alive instances in all pool
  // arrays so update-hook triggers fired during the body are recorded.
  for (const poolArr of _allPoolArrays) {
    for (const entry of poolArr) {
      _wrapInstanceTriggerForSyncAllMark(entry && entry.instance);
    }
  }

  // MAIN BODY: the sync-all logic. AFTER: clear in-flight state and dispatch
  // dynamic-component change listeners (they render the new component). Every
  // listener runs; the first error, the body's before the listeners', is
  // thrown after them.
  const errors: unknown[] = [];
  try {
    _gxtSyncAllWrappersBody();
  } catch (error) {
    errors.push(error);
  }
  _gxtSyncAllInFlightCycle = 0;
  for (const listener of _dcChangeListeners) {
    try {
      listener();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) throw errors[0];
}

// Exposed on `compilePipeline.syncAllWrappers` (see the `setGxtRenderer`
// install below); all in-source readers route through the bridge.

function _gxtSyncAllWrappersBody(): void {
  _updatedInstances.length = 0;
  const hasForced = _forcedRerenderInstances.size > 0;

  // Phase 1: Update arg cells and trigger pre-render lifecycle hooks.
  for (const entry of trackedArgCells) {
    // Skip destroyed/destroying instances to avoid "set on destroyed object" errors
    if (entry.instance && (entry.instance.isDestroyed || entry.instance.isDestroying)) continue;
    let hasChanges = false;
    // hasNestedArgMutation: an arg value is the same object reference but a
    // property on that object was mutated this cycle. In Ember semantics,
    // this fires `didUpdate` (but NOT didUpdateAttrs/didReceiveAttrs, since
    // the args themselves didn't change from the parent's perspective).
    let hasNestedArgMutation = false;
    // What an argument's getter, a setter or a dependent computed property
    // throws is the sync's error, as Glimmer's curly manager reads and sets
    // every argument of a classic component when it updates it.
    for (const key of Object.keys(entry.cells)) {
      const cellEntry = entry.cells[key]!;
      const { cell, getter, extraCell, initOverridden } = cellEntry;
      const newValue = getter();
      // Detect same-reference arg whose internals were mutated this cycle.
      if (newValue && typeof newValue === 'object' && _dirtiedNestedObjectsForHooks.has(newValue)) {
        hasNestedArgMutation = true;
      } else if (
        newValue &&
        typeof newValue === 'object' &&
        _dirtiedNestedObjectsForHooks.size > 0
      ) {
        // An #each-body component receives its block-param `item` arg as the
        // each-item tracking proxy (compile.ts `wrapEachItemForTracking`), not
        // the raw source object. The before-trigger hook records the raw object
        // in `_dirtiedNestedObjectsForHooks` when `set(item, 'value', …)` fires
        // in-place, so `.has(proxy)` above is always false → `didUpdate` would
        // never dispatch, and an each-body component whose template gates on
        // hook-derived state (e.g. `didUpdate` → `this.set('isEven', …)` →
        // `{{#if this.isEven}}`) would go stale. Unwrap the proxy to its raw
        // source and re-check membership.
        const rawFromProxy = getGxtRenderer()?.compilePipeline.eachItemRawFor?.(newValue);
        if (rawFromProxy && _dirtiedNestedObjectsForHooks.has(rawFromProxy)) {
          hasNestedArgMutation = true;
        }
      }

      if (initOverridden) {
        // For init-overridden properties, only update when the ARG value
        // actually changed from the parent's perspective (not just
        // when it differs from the cell value, which was set to the
        // init-overridden local value).
        const lastArg = 'lastArgValue' in cellEntry ? cellEntry.lastArgValue : undefined;
        const argChanged = lastArg !== undefined && lastArg !== newValue;
        cellEntry.lastArgValue = newValue;

        if (argChanged) {
          cell.update(newValue);
          if (
            entry.instance &&
            key !== 'class' &&
            key !== 'classNames' &&
            !cellEntry.skipInstanceAssign
          ) {
            _dispatchArgWrite(
              entry.instance,
              key,
              newValue,
              'arg-pass cell.update failed (initOverridden)',
              () => _runCpSetterSideEffect(entry.instance, key, newValue)
            );
          }
          hasChanges = true;
        }
        // Also update extra cell if arg changed
        if (argChanged && extraCell) {
          extraCell.update(newValue);
        }
      } else {
        // Track last known arg value for local override detection
        const lastKnownArg = 'lastArgValue' in cellEntry ? cellEntry.lastArgValue : cell.__value;
        const argActuallyChanged = lastKnownArg !== newValue;
        cellEntry.lastArgValue = newValue;

        // Skip cell update if the key is locally overridden and the arg hasn't actually changed from parent
        const isLocallyOverridden = entry.instance?.__gxtLocalOverrides?.has(key);
        // Also skip when a locally-overridden arg transitions to undefined
        // while the last known arg value was defined. This protects against
        // GXT reactive getters that temporarily return undefined during
        // gxtSyncDom cell processing (the getter's closure may reference a
        // context that is stale during the sync cycle). Without this guard,
        // the sync would clobber the local value (e.g., incrementProperty)
        // with undefined, cascading incorrect values to child components.
        if (
          isLocallyOverridden &&
          (!argActuallyChanged || (newValue === undefined && lastKnownArg !== undefined))
        ) {
          // Local override is in effect and arg hasn't changed (or getter returned stale undefined) — skip
        } else if (argActuallyChanged) {
          // Gate cell updates on whether the ARG value actually changed
          // (tracked via cellEntry.lastArgValue), not on `cell.__value`.
          // LazyCell stores its value in `__lazyValue` (not `__value`), so
          // the latter is perpetually `undefined` for lazy-backed arg cells
          // — causing every sync cycle to flip `hasChanges` to true on
          // every #each row even when the arg is stable, which spuriously
          // fires `didUpdate` on siblings.
          cell.update(newValue);
          if (
            entry.instance &&
            key !== 'class' &&
            key !== 'classNames' &&
            !cellEntry.skipInstanceAssign
          ) {
            _dispatchArgWrite(
              entry.instance,
              key,
              newValue,
              'arg-pass cell.update failed (sync)',
              () => _runCpSetterSideEffect(entry.instance, key, newValue)
            );
            // When there are active $_dc dynamic component listeners,
            // call notifyPropertyChange to dirty Ember tags for @computed
            // properties that depend on this arg. Without this, computed
            // properties on classic components won't recompute after arg
            // updates via syncAll (the Ember tag isn't dirtied by direct
            // property assignment).
            if (
              _gxtHasStringDynamicComponentListeners() &&
              entry.instance &&
              typeof entry.instance.trigger === 'function'
            ) {
              // `notifyPropertyChange` is owned by `metal/lib/property_events.ts`
              // and reached through the bridge.
              getGxtRenderer()?.compilePipeline.notifyPropertyChange?.(entry.instance, key);
            }
          }
          hasChanges = true;
        }
        // Also update the attrsProxy cell (used by GXT effects tracking @arg)
        // Gate on argActuallyChanged for the same LazyCell __value reason.
        if (extraCell && argActuallyChanged) {
          extraCell.update(newValue);
          hasChanges = true;
        }
      }
    }
    // Check if this instance is in the forced-rerender ancestor chain
    const forceThis = hasForced && entry.instance && _shouldForceRerender(entry.instance);
    // If this instance had state snapshotted before a nested-arg-mutation
    // didUpdate ran (e.g., `this.set('isEven', ...)` in didUpdate), and the arg
    // identity is now changing, restore the pre-hook state so the
    // component sees its init-time defaults for the new row — matching
    // Ember's destroy+recreate behavior for replaceList.
    // What a property's setter throws propagates.
    if (hasChanges && entry.instance?.__gxtPreHookStateSnapshot) {
      const snap = entry.instance.__gxtPreHookStateSnapshot;
      for (const k of Object.keys(snap)) {
        entry.instance[k] = snap[k];
      }
      entry.instance.__gxtPreHookStateSnapshot = null;
    }
    // Stamp the instance as "syncAll-reviewed this cycle" even when neither
    // hasChanges nor forceThis fires. compile.ts guards its force-rerender
    // fallback on `__gxtSyncAllFiredCycleId === currentCycle`, and relies on
    // the trigger-wrapper to set it. Without the stamp, compile.ts would fire
    // didUpdateAttrs/didReceiveAttrs/willUpdate/willRender during a
    // force-rerender pass on descendants whose args didn't change.
    if (entry.instance && typeof entry.instance === 'object') {
      // `0` (no sync in flight) falls through the guard below.
      const cycle = _gxtSyncAllInFlightCycle;
      if (cycle) {
        // Define non-enumerable so user code doing JSON.stringify(component)
        // or deep-equality against a plain literal does not see this
        // GXT-internal marker. If already defined as a non-enumerable, skip
        // redefine (value update via property-write may promote it back to
        // enumerable on some property-descriptor paths).
        const prev = Object.getOwnPropertyDescriptor(entry.instance, '__gxtSyncAllFiredCycleId');
        if (!prev || prev.enumerable !== false || prev.configurable !== false) {
          Object.defineProperty(entry.instance, '__gxtSyncAllFiredCycleId', {
            value: cycle,
            writable: true,
            enumerable: false,
            configurable: true,
          });
        } else {
          entry.instance.__gxtSyncAllFiredCycleId = cycle;
        }
      }
    }
    // Pre-render lifecycle hooks (before DOM sync)
    // Order matches Ember's curly component manager: didUpdateAttrs, didReceiveAttrs, then
    // willUpdate, willRender
    // Skip attrs hooks if this instance already had them fired this pass (from
    // updateInstanceWithNewArgs or from a previous trackedArgCells entry for the
    // same instance). willUpdate/willRender use a separate marker so they always
    // get a chance to fire after arg cells have been refreshed in this phase —
    // if updateInstanceWithNewArgs fires first (at handle-time), the cells may
    // still hold stale values; this Phase-1 loop updates them, and willRender
    // must see the new values.
    const attrsAlreadyFiredForEntry = entry.instance
      ? wasInstanceUpdatedThisPass(entry.instance)
      : false;
    const renderAlreadyFiredForEntry = entry.instance
      ? wasInstanceRenderHookFiredThisPass(entry.instance)
      : false;
    // Cross-sync-cycle re-entrancy guard: if a previous sync fired the attrs
    // hooks for this instance and the arg values are identical now and this
    // is not an explicit force-rerender, suppress the re-fire. This breaks
    // the infinite flush loop that occurs when the user's didReceiveAttrs
    // body calls `this.set(localProp, ...)` → observer schedules → backburner
    // flushes → `onEnd` calls `_gxtSyncDomNow` again → this loop iterates
    // the same instance. `forceThis` (from explicit .rerender() calls) still
    // fires hooks.
    const argSnapshotMatches =
      entry.instance && !forceThis
        ? argsEqualToSnapshot(entry.cells, _instanceLastAttrsFiredArgs.get(entry.instance))
        : false;
    if ((hasChanges || forceThis) && entry.instance && !argSnapshotMatches) {
      if (!attrsAlreadyFiredForEntry && !renderAlreadyFiredForEntry) {
        if (hasChanges) {
          triggerLifecycleHook(entry.instance, 'didUpdateAttrs');
          triggerLifecycleHook(entry.instance, 'didReceiveAttrs');
          // Snapshot arg values AFTER the hook fired so a subsequent sync
          // cycle triggered by the hook's side-effects (e.g., this.set)
          // can detect "args unchanged since last fire" and skip re-firing.
          _instanceLastAttrsFiredArgs.set(entry.instance, snapshotArgsForInstance(entry.cells));
        }
        // Begin `render.component` instrumentation (initialRender=false).
        // Classic Ember starts this finalizer at the top of
        // CurlyComponentManager.update(); the finalizer runs from
        // `didUpdateLayout`, which maps to `_gxtPostRenderHooks`.
        _fireRerenderInstrumentStart(entry.instance);
        triggerLifecycleHook(entry.instance, 'willUpdate');
        triggerLifecycleHook(entry.instance, 'willRender');
        markInstanceUpdated(entry.instance);
        markInstanceRenderHookFired(entry.instance);
        _updatedInstances.push(entry.instance);
      } else if (!renderAlreadyFiredForEntry) {
        // Attrs phase already fired (via updateInstanceWithNewArgs at
        // handle-time). Fire willUpdate/willRender now that arg cells have
        // been updated in the Phase-1 loop above, so user hooks read fresh
        // values.
        _fireRerenderInstrumentStart(entry.instance);
        triggerLifecycleHook(entry.instance, 'willUpdate');
        triggerLifecycleHook(entry.instance, 'willRender');
        markInstanceRenderHookFired(entry.instance);
        _updatedInstances.push(entry.instance);
      }
    } else if (entry.instance && attrsAlreadyFiredForEntry && !renderAlreadyFiredForEntry) {
      // updateInstanceWithNewArgs already fired didUpdateAttrs/didReceiveAttrs
      // but syncAll's own Phase-1 detected no changes (because the cells were
      // already updated by the proxy setter during updateInstanceWithNewArgs).
      // willUpdate/willRender still need to fire so user-defined hooks (which
      // may call `this.get('name')`, e.g. to sync internal state from args) see
      // the new arg values. A view has no element in a non-interactive
      // renderer (its `element` getter throws there), unless one was mapped.
      const viewEl =
        getViewElement(entry.instance) ||
        (isInteractiveModeChecked() ? (entry.instance as any)._element : null);
      if (viewEl) {
        _fireRerenderInstrumentStart(entry.instance);
        triggerLifecycleHook(entry.instance, 'willUpdate');
        triggerLifecycleHook(entry.instance, 'willRender');
        markInstanceRenderHookFired(entry.instance);
        _updatedInstances.push(entry.instance);
      }
    } else if (
      hasNestedArgMutation &&
      entry.instance &&
      !wasInstanceUpdatedThisPass(entry.instance)
    ) {
      // Same-identity arg whose internals mutated — queue a post-render
      // didUpdate hook WITHOUT firing didUpdateAttrs/didReceiveAttrs
      // (the arg reference did not change) and WITHOUT marking the
      // instance as "updated this pass" (so the instance can still be
      // destroyed by the #each diff algorithm if its row is removed).
      // Snapshot properties that get mutated during didUpdate so we can
      // restore them if the arg identity later changes (replaceList case).
      if (!entry.instance.__gxtPreHookStateSnapshot) {
        const snap: Record<string, any> = {};
        // Snapshot all own enumerable properties of the instance, excluding
        // arg-backed keys. The snapshot exists to restore local state mutated
        // during didUpdate (e.g. `this.set('isEven', …)`) when the arg
        // identity later changes (replaceList destroy+recreate semantics).
        // Arg properties (those present in `entry.cells`) are owned by the
        // parent's arg-dispatch, not local state. Restoring an arg key would write
        // its stale value through the render-context `rcSet` with
        // __gxtDispatchingArgs=false, which flips the arg getter to
        // `useLocal=true` holding the old value. For an each-over-arg source
        // (`{{#each @items}}` after the parent `set(parent,'items',newArr)`),
        // the each-source would then re-fire reading the stale local value and
        // clobber the freshly-rendered new array back to empty.
        const argKeysForEntry = entry.cells;
        for (const k of Object.keys(entry.instance)) {
          if (k.startsWith('_') || k.startsWith('__')) continue;
          if (argKeysForEntry && k in argKeysForEntry) continue;
          // Glimmer reads none of these: a getter that throws keeps its
          // property out of the snapshot, reported in DEBUG.
          try {
            snap[k] = entry.instance[k];
          } catch (error) {
            _gxtReportDroppedRead(`the state snapshot's read of \`${k}\``, error);
          }
        }
        entry.instance.__gxtPreHookStateSnapshot = snap;
      }
      _updatedInstances.push(entry.instance);
    }
  }
  _forcedRerenderInstances.clear();

  // Phase 1c: Sync internal component DOM elements (Input, Textarea).
  // These don't use GXT's effect system for arg tracking, so we sync manually.
  // What their arguments' getters throw is the sync's error.
  for (const entry of _internalComponentSyncCallbacks) {
    if (!entry.el.isConnected) {
      _internalComponentSyncCallbacks.delete(entry);
      continue;
    }
    entry.callback();
  }

  // Phase 2: Sync wrapper element attributes/classes.
  // CLASSIC-ONLY (gated): wrapper class/attr sync is classic curly only; in a
  // native build trackedWrapperInstances is never populated with Glimmer
  // wrappers and this loop is DCE-stripped.
  if (__GXT_CLASSIC_COMPONENTS__) {
    for (const entry of trackedWrapperInstances) {
      const { instance, wrapper, componentDef } = entry;
      if (!wrapper?.isConnected) {
        trackedWrapperInstances.delete(entry);
        continue;
      }
      syncWrapperElement(instance, wrapper, componentDef, undefined);
    }
  }

  // Clear dirtied-nested-objects snapshot for the next sync cycle.
  // We do this at the end (not the start) so a recursive sync triggered
  // from inside a didUpdate hook still sees freshly dirtied objects from
  // the parent sync cycle if they haven't been processed yet.
  if (_dirtiedNestedObjectsForHooks.size > 0) {
    _dirtiedNestedObjectsForHooks = new Set();
  }
}

// Compute the depth of a component in the view tree.
function _viewDepth(instance: any): number {
  let depth = 0;
  let current = instance?.parentView;
  while (current) {
    depth++;
    current = current.parentView;
  }
  return depth;
}

// Post-render lifecycle hooks — called after DOM sync completes.
// Order: deepest children first; siblings at the same depth fire in insertion
// order (i.e., the order they appear in _updatedInstances). Parents fire last.
//
// Exposed as the `compilePipeline.postRenderHooks` bridge method, called from
// phase 3 of compile.ts's `_gxtSyncDomNow`. Returns whether a hook wrote state
// (`this.set(...)` inside `didUpdate`): the sync then renders again
// (compile.ts `_gxtRenderPostRenderWrites`).
function _gxtPostRenderHooks(): boolean {
  if (_updatedInstances.length === 0) return false;

  // Stable sort: deeper components first, preserve insertion order for same depth
  const indexed = _updatedInstances.map((inst, i) => ({ inst, idx: i, depth: _viewDepth(inst) }));
  indexed.sort((a, b) => {
    if (a.depth !== b.depth) return b.depth - a.depth; // deeper first
    return a.idx - b.idx; // same depth: insertion order
  });
  // Drain the queue BEFORE firing hooks so a follow-up sync triggered from
  // within a hook sees an empty _updatedInstances and doesn't re-fire the
  // same hooks recursively.
  _updatedInstances.length = 0;

  // Clear the pending flag before firing hooks so we can detect if a hook
  // (e.g. `this.set(...)` inside didUpdate) dirtied new state. The
  // pending-sync flags live in compile.ts; we save/read/clear them through the
  // bridge getters/setters.
  const _cpPRH = getGxtRenderer()?.compilePipeline;
  const savedPending = !!_cpPRH?.getPendingSync?.();
  const savedPendingPC = !!_cpPRH?.getPendingSyncFromPropertyChange?.();
  _cpPRH?.setPendingSync?.(false);
  _cpPRH?.setPendingSyncFromPropertyChange?.(false);

  for (const { inst } of indexed) {
    triggerLifecycleHook(inst, 'didUpdate');
    triggerLifecycleHook(inst, 'didRender');
  }

  // Finalize any pending `render.component` instrumentation finalizers
  // queued by update-path calls to `_fireRerenderInstrumentStart`. Classic
  // Ember's `didUpdateLayout` does this after the layout is re-rendered;
  // post-render hooks are the GXT equivalent (DOM sync is complete).
  _drainPendingRerenderInstrumentFinalizers();

  // Whether a lifecycle hook scheduled a property change (via `this.set(...)`).
  const hookProducedChanges = !!_cpPRH?.getPendingSync?.();
  // Restore the outer pending flags if the hooks didn't contribute new changes;
  // otherwise OR the saved values back in so nothing is lost.
  if (!hookProducedChanges) {
    _cpPRH?.setPendingSync?.(savedPending);
    _cpPRH?.setPendingSyncFromPropertyChange?.(savedPendingPC);
  } else {
    // OR the outer pending flags back in so nothing is lost
    const _curPending = !!_cpPRH?.getPendingSync?.();
    _cpPRH?.setPendingSync?.(_curPending || savedPending);
    const _curPC = !!_cpPRH?.getPendingSyncFromPropertyChange?.();
    _cpPRH?.setPendingSyncFromPropertyChange?.(_curPC || savedPendingPC);
  }
  return hookProducedChanges;
}

// Track ALL live component instances for destroy detection.
const _allLiveInstances = new Set<any>();

// Track every component instance ever created via `createComponentInstance`,
// regardless of whether it reached `_renderBody` and was added to
// `_allLiveInstances`. Some instances are created (running `init` and thus
// registering Ember observers / listeners on the global SYNC_OBSERVERS map)
// but never make it to render — for example when a reactive update produces
// a fresh pool entry that supersedes a previous one, or when an effect
// recomputes during init and discards the trial instance. Without this set,
// such orphans leak their observers across tests and the
// `setupObserversCheck` afterEach assertion fails.
//
// `_gxtDestroyTrackedInstances` (the test-teardown sweep) consults this set
// in addition to `_allLiveInstances` so each orphan's `destroy()` runs,
// firing the `registerDestructor(target, () => destroyObservers(target), true)`
// hook installed by `@ember/-internals/metal/lib/observer.ts`. The set is
// cleared together with `_allLiveInstances`.
const _allCreatedInstances = new Set<any>();

// Track instances rendered in the current render pass (reset each pass).
// Used by `_gxtDestroyUnclaimedPoolEntries` to distinguish between
// "reused in current render" vs "stale from previous render".
const _currentPassRenderedInstances = new Set<any>();
let _currentPassRenderedPassId = -1;

// Snapshot of all live instances before force-rerender.
// Used to detect which instances were removed after the rebuild.
let _preRerenderSnapshot: Set<any> = new Set();

// Instances explicitly marked for destruction during a force-rerender
// (e.g. dynamic component switching via `{{component this.name}}` where the
// new instance lands in a different pool keyed by factory and the old
// instance in the previous pool is unclaimed and should be destroyed).
// Cleared at cycle start by `_gxtSnapshotLiveInstances` and read by
// `_gxtDestroyUnclaimedPoolEntries`.
const _instancesMarkedForDestruction = new Set<any>();

// Exposed via the gxt-bridge as `compilePipeline.snapshotLiveInstances`.
function _gxtSnapshotLiveInstances(): void {
  _preRerenderSnapshot.clear();
  // Clear the marked-for-destruction set from the previous cycle.
  _instancesMarkedForDestruction.clear();
  for (const instance of _allLiveInstances) {
    _preRerenderSnapshot.add(instance);
  }
}

// Shared steps of the five classic-component destroy sequences
// (`_gxtDestroyUnclaimedPoolEntries`, `_gxtDestroyTrackedInstances`,
// `_gxtDestroyEmberComponentInstance`, `_gxtFinalizeInverseOldRows`,
// `_gxtDestroyInstancesInNodes`). Each runs, per phase:
//   1. willDestroyElement + willClearRender, with a removed element re-attached
//      so `this.element` is still in the document;
//   2. 'destroying', element cleared, view-registry entry removed, then
//      didDestroyElement;
//   3. `destroy()` (willDestroy);
// and finally drops the instance from the tracking sets. They differ in which
// instances they skip (deferred each→empty rows, rows whose willDestroyElement
// already fired) and in what they do with an error thrown by `destroy()`:
// the unclaimed-pool sweep and the each→empty finalizer rethrow the first one
// after the sweep (the former unless the sync was not property-driven), the
// test-teardown sweep and the removed-nodes sweep queue it for
// `flushRenderErrors` (a throw out of the removed-nodes sweep would abort the
// curried re-render that called it), and the dynamic-component swap throws it
// to the swap, which records it as the dynamic component's error.

// The ambient owner's view registry; none once the owner is destroyed (its
// container's `lookup` asserts then).
function _lookupViewRegistry(): any {
  const owner: any = getAmbientOwner();
  if (!owner || owner.isDestroyed || owner.isDestroying) return undefined;
  return owner.lookup?.('-view-registry:main');
}

// Phase 1 for one instance: move it to 'inDOM' (an instance rendered without
// the insert transition may still be 'hasElement'/'preRender', and
// willDestroyElement hooks assert the state), then fire the hooks.
// triggerLifecycleHook queues an Error the hooks throw; anything else
// (expectAssertion's sentinel) propagates.
function _firePreDestroyHooks(instance: any): void {
  if (instance._transitionTo && instance._state !== 'inDOM') {
    instance._transitionTo('inDOM');
  }
  triggerLifecycleHook(instance, 'willDestroyElement');
  triggerLifecycleHook(instance, 'willClearRender');
}

// Re-attach each instance's detached element to `#qunit-fixture` (or `body`)
// so Phase-1 hooks see it in the document; `_detachElements` undoes it.
function _reattachDetachedElements(instances: Iterable<any>): HTMLElement[] {
  const container = document.getElementById('qunit-fixture') || document.body;
  const reattached: HTMLElement[] = [];
  for (const instance of instances) {
    const el = getViewElement(instance);
    if (el instanceof HTMLElement && !el.isConnected) {
      container.appendChild(el);
      reattached.push(el);
    }
  }
  return reattached;
}

function _detachElements(elements: readonly HTMLElement[]): void {
  for (const element of elements) {
    if (element.parentNode) element.parentNode.removeChild(element);
  }
}

// Phase 2 up to didDestroyElement: 'destroying', `this.element` cleared,
// view-registry entry removed.
function _clearViewForDestroy(instance: any, viewRegistry: any): void {
  if (instance._transitionTo) instance._transitionTo('destroying');
  setViewElement(instance, null);
  if (viewRegistry) {
    const viewId = getViewId(instance);
    if (viewId) delete viewRegistry[viewId];
  }
}

// Phase 3: `destroy()` unless the instance is already destroyed or destroying.
// Errors propagate to the caller, which applies its own policy.
function _destroyIfAlive(instance: any): void {
  if (typeof instance.destroy === 'function' && !instance.isDestroyed && !instance.isDestroying) {
    instance.destroy();
  }
}

// Drop a destroyed instance from the live/created sets and from the first
// arg-cell and wrapper entry that hold it (and, with `fromPools`, from the
// instance pools).
function _untrackDestroyedInstance(instance: any, fromPools: boolean): void {
  _allLiveInstances.delete(instance);
  _allCreatedInstances.delete(instance);
  if (fromPools) removeInstanceFromPools(instance);
  for (const entry of trackedArgCells) {
    if (entry.instance === instance) {
      trackedArgCells.delete(entry);
      break;
    }
  }
  for (const entry of trackedWrapperInstances) {
    if (entry.instance === instance) {
      trackedWrapperInstances.delete(entry);
      break;
    }
  }
}

// Destroy unclaimed pool entries after a force-rerender.
// Components that were in the old render but not in the new one need their
// destroy lifecycle hooks fired: willDestroyElement, willClearRender,
// didDestroyElement, willDestroy.
// Exposed via the gxt-bridge as `destruction.destroyUnclaimedPoolEntries`.
function _gxtDestroyUnclaimedPoolEntries(): void {
  const viewRegistry = _lookupViewRegistry();

  // Find components that were in the pre-rerender snapshot but are no longer
  // present in the re-rendered output. An instance is considered unclaimed if:
  // 1. Its element is disconnected from the DOM, AND
  // 2. It is NOT claimed in any pool (i.e., not reused in the current render)
  // The pool check is essential because a force-rerender creates new wrapper
  // elements in a temp container, so the instance's element (pointing to the
  // new element) won't be connected even though the instance is alive.
  const unclaimed: any[] = [];
  const seen = new Set<any>();

  for (const instance of _preRerenderSnapshot) {
    if (!instance || seen.has(instance)) continue;
    seen.add(instance);

    // After a force-rerender, the instance's element may point to a new
    // wrapper (in a temp container, not connected) even though the old
    // element is preserved and still connected. Use getElementById as the
    // authoritative check: if there's a live element with this instance's
    // elementId, the component is alive.
    const el = getViewElement(instance);
    let isAlive = false;

    // Primary check: is the instance's element still in the DOM?
    //
    // NOTE: we deliberately do NOT treat "hosted inside a detached
    // {{#in-element}} destination" as alive here. On a `{{#if}}` collapse
    // the in-element block is no longer rendered, but its previously-emitted
    // DOM is still sitting inside the (possibly detached) destination
    // element — so a host-membership test would wrongly keep the component
    // alive forever and never tear it down. Liveness for in-element-hosted
    // components is instead established by the pass-gated claimed-in-pool
    // check below (only true when the block was actually re-rendered THIS
    // pass).
    if (el && el.isConnected) {
      isAlive = true;
    }

    // In-element-hosted liveness.
    //
    // A component rendered inside `{{#if cond}}{{#in-element detachedDiv}}
    // {{my-component}}{{/in-element}}{{/if}}` is `el.isConnected === false`
    // (the destination div is never appended to the document), so the
    // primary check above misses it. The pass-gated claimed-in-pool check
    // below ALSO misses it: the in-element block is rendered DURING
    // `gxtSyncDom` (Phase 1, render-pass id N), but the root template's
    // force-rerender (Phase 2b) increments the render-pass id to N+1 — so by
    // the Phase 2c sweep the modal's pool carries `__lastPassId === N` while
    // `sweepPassId === N+1`, the pool is `continue`d, the still-claimed entry
    // is never seen → the modal is wrongly swept (willDestroyElement fires,
    // content is removed from the host, didInsertElement is skipped).
    //
    // We recognize the modal as alive when (a) its element is still a
    // descendant of an `{{#in-element}}` host (tagged `__gxtIsInElementHost`)
    // AND (b) that host's current block placeholder is STILL CONNECTED to the
    // live document. Condition (b) is the precise reuse-vs-collapse
    // discriminator: the placeholder is the comment node `$_inElement`
    // returns into the live template tree at the block's `{{#in-element}}`
    // position. On a reactive update that does NOT toggle the enclosing
    // `{{#if}}` (e.g. `set(text, ...)`), the placeholder stays connected and
    // the modal must survive. On a `{{#if}}` collapse the branch teardown
    // tears the placeholder out of the live DOM (placeholder.isConnected
    // becomes false) BEFORE the modal's own destroy runs — but the modal's
    // detached-host DOM lingers, so host-membership alone would wrongly keep
    // it alive forever. The placeholder-connectivity gate lets the sweep
    // correctly tear the modal down on collapse while preserving it across
    // value-only re-renders.
    if (
      !isAlive &&
      el &&
      !instance.isDestroyed &&
      !instance.isDestroying &&
      isElementLiveOrInElementHosted(el)
    ) {
      // Walk up to the tagged in-element host and check its block
      // placeholder's live-DOM connectivity.
      let host: any = el;
      let depth = 0;
      while (host && depth < 200) {
        if ((host as any).__gxtIsInElementHost) break;
        host = (host as Node).parentNode;
        depth++;
      }
      const ph = host && (host as any).__gxtInElementPlaceholder;
      if (ph && (ph as Node & { isConnected: boolean }).isConnected) {
        isAlive = true;
      }
    }

    // Claimed-in-pool check: an instance that was claimed (reused) in the
    // current render pass is alive regardless of DOM connectivity. This
    // matters for components rendered inside an `{{#in-element}}` whose
    // target is a detached element (e.g. `document.createElement('div')`
    // never appended to the document) — their `el.isConnected` is always
    // `false`, but they are legitimately alive and reused across
    // re-renders. Without this, the sweep destroys+recreates the
    // in-element component on every reactive change, firing
    // willDestroyElement repeatedly and never letting didInsertElement
    // flush.
    //
    // We gate on the pool's `__lastPassId === currentPassId`: the `claimed`
    // flag is only reset to `false` when a new render pass touches the pool
    // (getCachedOrCreateInstance). When the `{{#if}}` collapses and the
    // in-element block is not re-rendered, its pool keeps a stale
    // `claimed=true` from the prior pass — we must not treat that as alive,
    // otherwise the component never gets torn down on collapse. Gating on
    // the current pass id ensures only genuinely-reused-this-pass instances
    // survive the sweep.
    if (!isAlive) {
      const sweepPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
      for (const pool of _allPoolArrays) {
        if ((pool as any).__lastPassId !== sweepPassId) continue;
        let claimedHere = false;
        for (const entry of pool) {
          if (
            entry.instance === instance &&
            entry.claimed &&
            !instance.isDestroyed &&
            !instance.isDestroying
          ) {
            claimedHere = true;
            break;
          }
        }
        if (claimedHere) {
          isAlive = true;
          break;
        }
      }
    }

    // Tagless components (tagName === '') use DocumentFragments which are
    // never "connected" after insertion. Consider them alive if they were
    // rendered in the current pass or if they are claimed in a pool.
    if (!isAlive && instance.tagName === '' && !instance.isDestroyed && !instance.isDestroying) {
      const passId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
      if (instance.__gxtRenderedInPass === passId || _currentPassRenderedInstances.has(instance)) {
        isAlive = true;
      }
    }

    // Secondary check: is there a live DOM element with this elementId?
    // (a force-rerender may have preserved the old element while the instance
    // points to the new one)
    if (!isAlive && instance.elementId) {
      const liveEl = document.getElementById(String(instance.elementId));
      if (liveEl && liveEl.isConnected) {
        // Re-point the instance to the live element
        setViewElement(instance, liveEl);
        setElementView(liveEl, instance);
        isAlive = true;
      }
    }

    // Check for instances explicitly marked for destruction during the
    // force-rerender (e.g., dynamic component switching via {{component}}).
    // These are added to `_instancesMarkedForDestruction` by the rendering
    // code when a new instance replaces an old one at the same position.
    if (isAlive) {
      if (_instancesMarkedForDestruction.has(instance)) {
        isAlive = false;
        _instancesMarkedForDestruction.delete(instance);
      }
    }

    if (!isAlive) {
      unclaimed.push(instance);
      // Clean up tracked sets
      for (const entry of trackedArgCells) {
        if (entry.instance === instance) {
          trackedArgCells.delete(entry);
          break;
        }
      }
      for (const entry of trackedWrapperInstances) {
        if (entry.instance === instance) {
          trackedWrapperInstances.delete(entry);
          break;
        }
      }
    }
  }
  _preRerenderSnapshot.clear();

  // Also destroy custom-managed component instances whose DOM is disconnected
  // (must run before the early return since there may be no classic unclaimed instances).
  // The first error their destruction throws is thrown once the unclaimed
  // classic instances were destroyed too.
  const customDestroyErrors: unknown[] = [];
  _gxtDestroyCustomManagedInstances(customDestroyErrors);

  if (unclaimed.length === 0) {
    if (customDestroyErrors.length > 0) throw customDestroyErrors[0];
    return;
  }

  // When a sync was not driven by a real property change (e.g., it's an
  // initial-render sync that ran `_gxtSnapshotLiveInstances` and now sees a
  // newborn instance whose element is disconnected), the unclaimed sweep is
  // spurious and any user-thrown lifecycle errors must not be captured into
  // _renderErrors (they would otherwise re-throw out of the next
  // runAppend/runTask flushRenderErrors call). All Phase 1-3 local try/catches
  // already swallow synchronous throws; this flag only gates the renderer.ts
  // wrappedDestroy/wrappedTrigger capture path. We read isSyncIsPropertyDriven
  // (set in compile.ts at the start of `_gxtSyncDomNow`) instead of
  // hadPendingSync because the latter is cleared by forceEmberRerender's
  // finally block before this Phase runs. The predicate is false before the
  // first `_gxtSyncDomNow` call, so `_outerSuppressCapture` starts out true.
  const _outerSuppressCapture = !getGxtRenderer()!.compilePipeline.isSyncIsPropertyDriven!();
  // Snapshot the prior value so the matching `finally`-disarm only restores it
  // if WE set it (preserves outer re-entrant arms).
  const _hadPriorSuppress = _suppressDestroyCapture;
  if (_outerSuppressCapture && !_hadPriorSuppress) {
    _suppressDestroyCapture = true;
  }

  let firstPhase3Error: Error | null = null;
  try {
    // Phase 1: willDestroyElement + willClearRender.
    // The elements have been detached from the DOM by innerHTML=''.
    // Temporarily re-attach them so tests that check
    // document.body.contains(this.element) during these hooks see true.

    // Set a flag so that an <ember-outlet> connectedCallback fired by the
    // temporary reattachment does not render content. Otherwise an inner
    // <ember-outlet> element reconnects to the live DOM, reads the current
    // (new) outlet state, and renders the new route's template with the old
    // component still on the parentView stack — so new-route components get
    // the wrong parentView and disappear from getRootViews.
    //
    // The flag lives in compile.ts and is set through the bridge.
    getGxtRenderer()?.compilePipeline.setDestroyReattachInProgress?.(true);
    let reattached: HTMLElement[];
    try {
      reattached = _reattachDetachedElements(unclaimed);
    } finally {
      getGxtRenderer()?.compilePipeline.setDestroyReattachInProgress?.(false);
    }

    for (const instance of unclaimed) {
      _firePreDestroyHooks(instance);
    }

    _detachElements(reattached);

    // Phase 2: transition to destroying, clear element, didDestroyElement
    const _dde2cCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
    for (const instance of unclaimed) {
      _clearViewForDestroy(instance, viewRegistry);
      // Skip didDestroyElement here when the each→empty inverse-branch finalizer
      // (compile.ts `_gxtSyncDomNow` Phase 3c) OWNS this row's async teardown —
      // it must fire AFTER the new inverse content's didInsertElement (Phase 3b)
      // to preserve classic Ember's new-insert-before-async-destroy ordering.
      // The deferred-cycle marker is set in `wrappedInverseFn` (before this
      // sweep); the DDE-fired marker guards against a double-fire should the
      // finalizer have already run for this row.
      const _isDeferred = (instance as any).__gxtDeferAsyncDestroyCycle === _dde2cCycle;
      const _alreadyFired = (instance as any).__gxtDDEFiredCycle === _dde2cCycle;
      if (!_isDeferred && !_alreadyFired) {
        triggerLifecycleHook(instance, 'didDestroyElement');
      }
    }

    // Phase 3: destroy (fires willDestroy)
    //
    // During gxtSyncDomNow an outer Ember run loop is usually active (opened
    // by the force-rerender path via classicRoot.render()). `instance.destroy()`
    // schedules the willDestroy destructor onto backburner's 'actions' queue;
    // that queue only flushes when the outermost run loop ends — which happens
    // after gxtSyncDomNow returns, after runTask's finally clauses, and after
    // the test's next synchronous assertion has inspected the hooks, so each-row
    // willDestroys would be attributed to the wrong assertion.
    //
    // Fire the user's `willDestroy` synchronously here, immediately after
    // `instance.destroy()` has transitioned the instance to DESTROYING state.
    // The wrapper installed in createComponentInstance guards double-fire via
    // __gxtWillDestroyFired, so the backburner-scheduled destructor call later
    // is a safe no-op.
    //
    // Scope the sync-fire to instances that existed before this sync cycle
    // (`__gxtCreatedInSyncCycle !== currentCycle`). In-cycle instances are
    // either phantoms superseded by a force-rerender or newly-rendered
    // inverse-branch components; their willDestroy timing should match the
    // stock deferred flow because the test either (a) doesn't count them in
    // the current assertion (phantoms are filtered by the everInserted gate
    // in the wrapper) or (b) expects them to survive to the afterEach
    // teardown where the deferred destructor fires normally.
    const currentCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
    // First-error-wins for Phase 3 destroy/willDestroy throws. Loop iterates to
    // completion so every unclaimed instance gets a destroy attempt, then we
    // re-throw the first error at the end. The throw escapes `_gxtSyncDomNow`
    // (compile.ts stores it in the module-local `_gxtDeferredSyncError` and
    // re-throws it at the tail of `_gxtSyncDomNow` after the outer try/finally
    // has reset the sync-state flags), which lets runTask propagate the error
    // to assert.throws naturally — without needing a post-task
    // flushRenderErrors() drain of _renderErrors.
    for (const instance of unclaimed) {
      // Skip rows whose async teardown is DEFERRED to the each→empty
      // inverse-branch finalizer (compile.ts `_gxtSyncDomNow` Phase 3c). Firing
      // destroy()/willDestroy here would emit willDestroy BEFORE the new
      // inverse content's didInsertElement (Phase 3b) — inverting the order.
      if ((instance as any).__gxtDeferAsyncDestroyCycle === currentCycle) {
        continue;
      }
      const wasInPriorCycle = instance.__gxtCreatedInSyncCycle !== currentCycle;
      {
        try {
          _destroyIfAlive(instance);
        } catch (e) {
          // Honor _suppressDestroyCapture, which is set during spurious
          // unclaimed-pool sweeps (initial-render syncs not driven by a
          // real property change).
          if (e instanceof Error && !_suppressDestroyCapture) {
            if (!firstPhase3Error) firstPhase3Error = e;
          }
        }
      }
      if (
        wasInPriorCycle &&
        typeof instance.willDestroy === 'function' &&
        !instance.__gxtWillDestroyFired
      ) {
        try {
          instance.willDestroy();
        } catch (e) {
          // Same capture policy as destroy() above: willDestroy errors are
          // captured here (honoring _suppressDestroyCapture).
          if (e instanceof Error && !_suppressDestroyCapture) {
            if (!firstPhase3Error) firstPhase3Error = e;
          }
        }
      }
    }

    // Remove from tracked sets
    for (const instance of unclaimed) {
      _allLiveInstances.delete(instance);
      _allCreatedInstances.delete(instance);
      for (const entry of trackedArgCells) {
        if (entry.instance === instance) {
          trackedArgCells.delete(entry);
        }
      }
      for (const entry of trackedWrapperInstances) {
        if (entry.instance === instance) {
          trackedWrapperInstances.delete(entry);
        }
      }
    }
  } finally {
    // Restore the prior suppress-capture flag (only if we set it ourselves),
    // also when a hook threw. When `_hadPriorSuppress` is false (the
    // entry-arm condition), the flag was `false` before we set it to `true`,
    // so restoring to `false` is equivalent to a snapshot-restore.
    if (_outerSuppressCapture && !_hadPriorSuppress) {
      _suppressDestroyCapture = false;
    }
  }

  // Surface the first Phase 3 destroy/willDestroy error after all cleanup so
  // sibling instances complete their destroy attempts (first-error-wins).
  // Throw rather than capture into _renderErrors so the error escapes
  // `_gxtSyncDomNow`'s deferred-error path and reaches runTask's caller
  // synchronously, eliminating the dependency on a post-task flush.
  if (firstPhase3Error) {
    throw firstPhase3Error;
  }
  if (customDestroyErrors.length > 0) throw customDestroyErrors[0];
}

// Cleanup function: destroy all tracked component instances with proper lifecycle.
// Called during test teardown (beforeEach -> afterEach) to fire the full
// interactive destroy sequence:
//   Phase 1: willDestroyElement + willClearRender (top-down, element present)
//   Phase 2: didDestroyElement (top-down, element cleared, state=destroying)
//   Phase 3: willDestroy (via instance.destroy())
// Exposed via the gxt-bridge as `destruction.destroyTrackedInstances`.
function _gxtDestroyTrackedInstances(): void {
  const seen = new Set<any>();
  const instances: any[] = [];
  // Collect unique instances from all tracking sets
  for (const entry of trackedArgCells) {
    if (entry.instance && !seen.has(entry.instance)) {
      seen.add(entry.instance);
      instances.push(entry.instance);
    }
  }
  for (const entry of trackedWrapperInstances) {
    if (entry.instance && !seen.has(entry.instance)) {
      seen.add(entry.instance);
      instances.push(entry.instance);
    }
  }
  // Also include instances from _allLiveInstances that aren't in the above sets.
  // This ensures components without args or bindings (e.g., {{foo-bar}}) are also
  // destroyed with proper lifecycle hooks during teardown.
  for (const instance of _allLiveInstances) {
    if (instance && !seen.has(instance)) {
      seen.add(instance);
      instances.push(instance);
    }
  }
  // Include EVERY ever-created instance that escaped the live tracking
  // sets. These are usually orphaned trial instances created during
  // reactive updates (see `_allCreatedInstances` docstring). They never
  // rendered, so Phases 1/2 (element lifecycle hooks) are still safe to
  // run as no-ops on them, and Phase 3 below calls `instance.destroy()`,
  // which fires the glimmer-destroyable destructor that clears their
  // SYNC_OBSERVERS / ASYNC_OBSERVERS entries.
  for (const instance of _allCreatedInstances) {
    if (instance && !seen.has(instance)) {
      seen.add(instance);
      instances.push(instance);
    }
  }

  // Phase 1: willDestroyElement + willClearRender (top-down, element still present)
  for (const instance of instances) {
    // Ensure instance is in inDOM state before destroy hooks.
    // Tagless components that never had an element set can still be
    // logically in the DOM (their content nodes are live), but the
    // internal _state may still be 'hasElement' if the after-insert
    // queue didn't flush (e.g., during test teardown). The test's
    // willDestroyElement hook asserts _state === 'inDOM', so we force
    // the transition here to mirror the classic manager's behavior.
    if (
      instance._transitionTo &&
      instance._state !== 'inDOM' &&
      instance._state !== 'destroying' &&
      instance._state !== 'preRender'
    ) {
      instance._transitionTo('inDOM');
    }
    triggerLifecycleHook(instance, 'willDestroyElement');
    triggerLifecycleHook(instance, 'willClearRender');
  }

  // Phase 1b: Custom modifier teardown sweep.
  //
  // Classic Ember's CustomModifierManager registers `destroyModifier` as an
  // associated destructor on the rendered root, so the user's
  // `willDestroyElement` hook fires when the test harness tears down the
  // rendered tree. In GXT the destructor that drains the pending-modifier
  // queue only fires when `entry.element.isConnected === false`, which is
  // only true after the rendering harness has detached the DOM. At
  // test-teardown the rendering harness destroys the wrapper *before*
  // detaching elements, so the pending queue's `isConnected` gate keeps the
  // entries pinned — and any custom modifier whose destructor GXT never
  // invoked stays in `$_MANAGERS.modifier._updatedInstances` forever, never
  // firing `destroyModifier`.
  //
  // Mirror classic Ember by sweeping every tracked custom-modifier instance
  // here, calling the user's `destroyModifier(instance)` exactly once. Guard
  // with the same `__gxtModDestroyed` flag the Phase-2d drain in compile.ts
  // uses, so a subsequent disconnected-element drain is a no-op.
  try {
    const modUpdated = $_MANAGERS.modifier._updatedInstances as Set<any>;
    if (modUpdated && modUpdated.size > 0) {
      const modInstances = Array.from(modUpdated);
      modUpdated.clear();
      for (const modInstance of modInstances) {
        const mgr = modInstance && modInstance.__gxtModManager;
        if (!mgr || typeof mgr.destroyModifier !== 'function') continue;
        if (modInstance.__gxtModDestroyed) continue;
        try {
          mgr.destroyModifier(modInstance);
        } catch (err) {
          // Surface modifier-destroy errors through the render-error channel
          // so they propagate to assert.throws — do not silently swallow.
          captureRenderError(err);
        }
        // Stamped as its `__gxtModManager` was at install.
        modInstance.__gxtModDestroyed = true;
      }
    }
  } catch (err) {
    captureRenderError(err);
  }

  // Phase 2: transition to destroying, clear element, unregister from view registry,
  // then fire didDestroyElement (the owner may already be destroyed)
  const viewRegistry = _lookupViewRegistry();
  for (const instance of instances) {
    _clearViewForDestroy(instance, viewRegistry);
    triggerLifecycleHook(instance, 'didDestroyElement');
  }

  // Phase 3: destroy (fires willDestroy)
  for (const instance of instances) {
    try {
      _destroyIfAlive(instance);
    } catch (e) {
      // Capture destroy errors so they propagate to assert.throws
      captureRenderError(e);
    }
  }

  // Phase 4: destroy tracked helper instances (class-based helpers created in $_tag).
  // The `getHelperInstances` bridge returns compile.ts's helper-instance array.
  const helperInstances = getGxtRenderer()?.compilePipeline.getHelperInstances?.();
  if (Array.isArray(helperInstances)) {
    for (const helperInst of helperInstances) {
      try {
        if (
          typeof helperInst.destroy === 'function' &&
          !helperInst.isDestroyed &&
          !helperInst.isDestroying
        ) {
          helperInst.destroy();
        }
      } catch (e) {
        captureRenderError(e);
      }
    }
    helperInstances.length = 0;
  }

  trackedArgCells.clear();
  trackedWrapperInstances.clear();
  _updatedInstances.length = 0;
  _afterInsertQueue.length = 0;
  _allLiveInstances.clear();
  _allCreatedInstances.clear();
  _preRerenderSnapshot.clear();
}

/**
 * Destroy a single Ember component instance with full lifecycle hooks.
 * Used by $_dc_ember when dynamic component switching occurs.
 * Fires: willDestroyElement -> willClearRender -> didDestroyElement -> willDestroy
 */
// Exposed via the gxt-bridge as `destruction.destroyEmberComponentInstance`.
function _gxtDestroyEmberComponentInstance(instance: any): void {
  if (!instance || instance.isDestroyed || instance.isDestroying) return;

  const viewRegistry = _lookupViewRegistry();

  // Phase 1: willDestroyElement + willClearRender (element re-attached if
  // it is detached, so tests see it in the DOM)
  const reattached = _reattachDetachedElements([instance]);
  _firePreDestroyHooks(instance);
  _detachElements(reattached);

  // Phase 2: transition to destroying, clear element, didDestroyElement
  _clearViewForDestroy(instance, viewRegistry);
  triggerLifecycleHook(instance, 'didDestroyElement');

  // Phase 3: destroy (fires willDestroy). What it throws reaches the swap,
  // which records it as the dynamic component's error.
  try {
    _destroyIfAlive(instance);
  } finally {
    _untrackDestroyedInstance(instance, true);
  }
}

/**
 * Lifecycle teardown ORDERING.
 *
 * Fire the async teardown (didDestroyElement → willDestroy) for the OLD rows of
 * an `{{#each}}` that transitioned non-empty → empty. Called from compile.ts's
 * `_gxtSyncDomNow` Phase 3c (`_gxtDrainPendingInverseOldRowFinalize`), AFTER
 * Phase 3b (`flushAfterInsertQueue`) has fired the NEW inverse content's
 * didInsertElement/didRender — matching classic Ember's
 * new-insert-before-async-destroy.
 *
 * The rows already had their synchronous willDestroyElement/willClearRender
 * fired by `wrappedInverseFn` (compile.ts). Here we:
 *   Phase 2: transition to 'destroying', clear the element (so `this.element`
 *            is null during didDestroyElement), unregister from the view
 *            registry, then fire didDestroyElement (interleaved order);
 *   Phase 3: instance.destroy() (fires willDestroy, idempotent via the
 *            __gxtWillDestroyFired guard) so its willDestroy fires synchronously
 *            in-window rather than leaking to backburner / the test teardown.
 * Marks __gxtDDEFiredCycle so the Phase 2c sweep — should it still observe the
 * tagged rows — does not re-fire didDestroyElement.
 */
function _gxtFinalizeInverseOldRows(rows: ReadonlyArray<any>, cycle: number): void {
  if (!rows || rows.length === 0) return;
  const viewRegistry = _lookupViewRegistry();
  // What the rows' hooks and destroy throw is thrown once every row was
  // finalized (the first error).
  const errors: unknown[] = [];
  // Phase 2: didDestroyElement (element cleared first).
  for (const instance of rows) {
    if (!instance || instance.isDestroyed) continue;
    if ((instance as any).__gxtDDEFiredCycle === cycle) continue;
    (instance as any).__gxtDDEFiredCycle = cycle;
    _clearViewForDestroy(instance, viewRegistry);
    try {
      triggerLifecycleHook(instance, 'didDestroyElement');
    } catch (error) {
      errors.push(error);
    }
  }
  // Phase 3: willDestroy (via destroy(); double-fire-guarded).
  for (const instance of rows) {
    if (!instance) continue;
    try {
      _destroyIfAlive(instance);
      if (typeof instance.willDestroy === 'function' && !(instance as any).__gxtWillDestroyFired) {
        instance.willDestroy();
      }
    } catch (error) {
      errors.push(error);
    }
    // Drop from ALL tracking sets so the test-teardown sweep
    // (`_gxtDestroyTrackedInstances`) does not re-fire didDestroyElement /
    // willDestroy on these already-finalized rows. The tagless variant in
    // particular would otherwise re-emit didDestroyElement at teardown (the
    // DocumentFragment-wrapped rows never get pruned by the element-based
    // Phase 2c path).
    _untrackDestroyedInstance(instance, false);
  }
  if (errors.length > 0) throw errors[0];
}

/**
 * Destroy component instances whose wrapper element is in the given DOM nodes.
 */
// Exposed via the gxt-bridge as `destruction.destroyInstancesInNodes`.
function _gxtDestroyInstancesInNodes(removedNodeList: ReadonlyArray<Node>): void {
  if (!removedNodeList || removedNodeList.length === 0) return;

  const removedEls = new Set<Element>();
  for (let i = 0; i < removedNodeList.length; i++) {
    const rn = removedNodeList[i]!;
    if (rn.nodeType === 1) {
      removedEls.add(rn as Element);
      const desc = (rn as Element).querySelectorAll('*');
      for (let j = 0; j < desc.length; j++) {
        removedEls.add(desc[j]!);
      }
    }
  }
  if (removedEls.size === 0) return;

  const instToDestroy: any[] = [];
  for (const liveInst of _allLiveInstances) {
    if (!liveInst || liveInst.isDestroyed || liveInst.isDestroying) continue;
    const wrapperEl = getViewElement(liveInst);
    if (wrapperEl && removedEls.has(wrapperEl as Element)) {
      instToDestroy.push(liveInst);
    }
  }
  if (instToDestroy.length === 0) return;

  const viewReg = _lookupViewRegistry();

  // Rows whose synchronous willDestroyElement / willClearRender were already
  // fired pre-DOM-removal by the each-row pre-destroy destructor (stamped
  // `__gxtWDEFiredCycle` this cycle) must not be reattached / re-fired here.
  // The per-instance trigger gate already neutralizes the re-fire, but
  // skipping avoids a pointless fixture reattach of an already-cleared row.
  // Components removed by other paths (e.g. route changes) are never stamped.
  const __curCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
  const preDestroy = instToDestroy.filter(
    (inst) => (inst as any).__gxtWDEFiredCycle !== __curCycle
  );

  // Re-attach elements temporarily so willDestroyElement sees them connected
  const reattachedList = _reattachDetachedElements(preDestroy);
  for (const inst of preDestroy) {
    _firePreDestroyHooks(inst);
  }
  _detachElements(reattachedList);

  for (const inst of instToDestroy) {
    _clearViewForDestroy(inst, viewReg);
    triggerLifecycleHook(inst, 'didDestroyElement');
  }

  // What a destroy throws is queued as a render error, thrown when the update
  // that removed the nodes ends: the re-render that called the sweep goes on.
  for (const inst of instToDestroy) {
    try {
      _destroyIfAlive(inst);
    } catch (error) {
      captureRenderError(error);
    }
  }

  for (const inst of instToDestroy) {
    _untrackDestroyedInstance(inst, true);
  }
}

// Exposed via the gxt-bridge as `compilePipeline.syncWrapper`.
function _gxtSyncWrapper(obj: any, keyName: string): void {
  const wrapper = getViewElement(obj);
  if (!(wrapper instanceof HTMLElement)) return;
  const attrBindings = obj?.attributeBindings;
  const classBindings = obj?.classNameBindings;
  if (!attrBindings && !classBindings) return;

  // Check if keyName is relevant to any binding
  let relevant = false;
  if (attrBindings && Array.isArray(attrBindings)) {
    for (const b of attrBindings) {
      const propName = b.split(':')[0];
      if (propName === keyName || keyName.startsWith(propName + '.')) {
        relevant = true;
        break;
      }
    }
  }
  if (!relevant && classBindings && Array.isArray(classBindings)) {
    for (const b of classBindings) {
      if (b.startsWith(':')) continue; // static class, never changes
      const propName = b.split(':')[0];
      if (propName === keyName || keyName.startsWith(propName + '.')) {
        relevant = true;
        break;
      }
    }
  }
  if (relevant) {
    syncWrapperElement(obj, wrapper, obj?.constructor, undefined);
  }
}

/**
 * Build a wrapper element for a classic curly component.
 *
 * Classic components need a wrapper div with:
 * - id: from elementId or auto-generated
 * - class: 'ember-view' + component classNames + invocation classes
 */
function buildWrapperElement(instance: any, args: any, componentDef: any, fw?: any): HTMLElement {
  const instanceTagName = instance?.tagName;
  const tagName = instanceTagName === '' ? null : instanceTagName || 'div';

  if (!tagName) {
    _assertTaglessComponent(instance, componentDef?.prototype, args);
    // Tagless component - return a fragment marker
    return document.createDocumentFragment() as any;
  }

  const wrapper = document.createElement(tagName);

  // Add classes from invocation
  const argsClass = _invocationClass(args);
  const argsClassNames =
    typeof args?.classNames === 'function' ? args.classNames() : args?.classNames;
  wrapper.className = _wrapperClassList(
    instance,
    componentDef,
    argsClass,
    argsClassNames,
    true
  ).join(' ');

  // Set ID - check attributeBindings for id mapping first, then use frozen elementId or auto-generate.
  // Once elementId is frozen after first render, always use the frozen value.
  let customIdFromBinding: string | undefined;
  if (!instance?._elementIdFrozen) {
    const attrBindingsForId =
      instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
    if (attrBindingsForId && Array.isArray(attrBindingsForId)) {
      for (const binding of attrBindingsForId) {
        const { propName, attrName } = parseAttributeBinding(binding);
        if (attrName === 'id') {
          const val = _attributeBindingValue(instance, propName);
          if (val !== undefined && val !== null && val !== false) {
            customIdFromBinding = String(val);
          }
          break;
        }
      }
    }
  }
  wrapper.id = customIdFromBinding || instance?.elementId || `ember${++emberViewIdCounter}`;

  // Freeze elementId on first render
  if (instance && !instance._elementIdFrozen) {
    const frozenElementId = wrapper.id;
    instance.elementId = frozenElementId;
    instance._elementIdFrozen = true;

    // Install a protective setter that throws when elementId is changed after creation.
    // This mirrors the behavior in @ember/-internals/views/lib/views/states.ts IN_DOM.enter()
    // which may not execute in GXT mode due to renderer.register() failures.
    try {
      Object.defineProperty(instance, 'elementId', {
        configurable: true,
        enumerable: true,
        get() {
          return frozenElementId;
        },
        set(value: any) {
          if (value !== frozenElementId) {
            throw new Error("Changing a view's elementId after creation is not allowed");
          }
        },
      });
    } catch {
      /* ignore if defineProperty fails */
    }
  }

  // Set ariaRole -> role attribute
  // ariaRole should only be bound if:
  // 1. It was passed as an arg at invocation time, OR
  // 2. It was part of the component's class definition (prototype)
  // Setting ariaRole via instance.set() after render should NOT cause binding
  const ariaRoleInArgs = args && 'ariaRole' in args;
  const ariaRoleInProto = componentDef?.prototype?.hasOwnProperty('ariaRole');
  const ariaRoleInClass = componentDef?.hasOwnProperty?.('ariaRole');

  if (ariaRoleInArgs || ariaRoleInProto || ariaRoleInClass) {
    const ariaRole = instance?.ariaRole;
    if (ariaRole) {
      wrapper.setAttribute('role', ariaRole);
    }
  }

  // Apply attributeBindings from the component
  // attributeBindings maps component properties to DOM attributes
  const attributeBindings =
    instance?.attributeBindings || componentDef?.prototype?.attributeBindings;
  const invocationAttrs = _forwardedAttrNames(fw);
  if (invocationAttrs.size > 0) _invocationAttrNames.set(wrapper, invocationAttrs);
  if (attributeBindings && Array.isArray(attributeBindings)) {
    for (const binding of attributeBindings) {
      const { propName, attrName } = parseAttributeBinding(binding);

      // Skip id binding after first render — id is frozen
      if (attrName === 'id' && instance?._elementIdFrozen) continue;

      // Validate: 'class' cannot be used as an attributeBinding
      assert(
        'You cannot use class as an attributeBinding, use classNameBindings instead.',
        attrName !== 'class'
      );

      // Validate: non-microsyntax bindings (no colon) cannot have nested paths
      if (!binding.includes(':') && propName.includes('.')) {
        assert(`Illegal attributeBinding: '${propName}' is not a valid attribute name.`, false);
      }

      if (invocationAttrs.has(attrName)) continue;

      const rawValue = _attributeBindingValue(instance, propName);
      _warnUnsafeStyleBinding(wrapper, attrName, rawValue);
      const value = sanitizedAttrValue(wrapper, attrName, rawValue);
      if (_isValuePropertyAttr(wrapper, attrName)) {
        if (value !== undefined && value !== null && value !== false) {
          (wrapper as any)[attrName] = String(value);
        }
      } else if (value !== undefined && value !== null && value !== false) {
        wrapper.setAttribute(attrName, value === true ? '' : String(value));
      }
    }
  }

  return wrapper;
}

// =============================================================================
// Render Context
// =============================================================================

/**
 * Wrap an Ember/plain object in a tracking proxy so that property reads
 * during GXT formula evaluation create and consume cells. This allows
 * paths like `{{this.name.last}}` to be fully reactive — when
 * `service.set('last', v)` triggers a re-render for (service, 'last'),
 * the cell that the formula already consumed will be dirtied and the
 * formula will re-evaluate.
 *
 * The cache ensures each source object gets at most one wrapper so
 * identity comparisons stay stable.
 */
const _nestedTrackingProxies = new WeakMap<object, any>();
const _proxyToRaw = new WeakMap<object, any>();

function wrapNestedObjectForTracking(obj: any): any {
  if (obj == null || typeof obj !== 'object') return obj;
  // Don't wrap DOM nodes, arrays, Dates, RegExps, Errors, promises, proxies we already created, etc.
  if (
    obj instanceof Node ||
    obj instanceof Date ||
    obj instanceof RegExp ||
    obj instanceof Error ||
    obj instanceof Promise ||
    Array.isArray(obj)
  ) {
    return obj;
  }
  // Don't wrap GXT internals or plain Objects without Ember identity
  // We only want to wrap Ember objects (services, models, controllers, etc.)
  // which typically have a constructor name other than "Object" or have _super / isDestroyed
  const ctor = obj.constructor;
  if (ctor === Object || ctor === undefined) return obj;
  // Don't wrap if already a Proxy created by us
  if (_nestedTrackingProxies.has(obj)) return _nestedTrackingProxies.get(obj);

  const proxy = new Proxy(obj, {
    get(target, prop, _receiver) {
      if (typeof prop !== 'string') return Reflect.get(target, prop, target);
      // Skip internal/framework properties
      if (
        prop.startsWith('_') ||
        prop.startsWith('$') ||
        prop === 'constructor' ||
        prop === 'isDestroyed' ||
        prop === 'isDestroying' ||
        prop === 'toString' ||
        prop === 'toJSON' ||
        prop === 'valueOf' ||
        prop === 'init' ||
        prop === 'destroy'
      ) {
        return Reflect.get(target, prop, target);
      }
      const value = Reflect.get(target, prop, target);
      // Don't create cells for methods
      if (typeof value === 'function') return value;
      // Create/read cell so GXT formula tracks this dependency.
      // Use skipDefine=true to avoid overwriting @tracked getter/setters
      // which include backtracking detection. We sync the cell value
      // with the actual property value and read cell.value for GXT
      // formula tracking.
      try {
        const cell = _gxtCellFor(target, prop, /* skipDefine */ true);
        if (cell) {
          // Sync cell value silently (bypass update() to avoid dirty marking)
          if (cell._value !== value) {
            cell._value = value;
          }
          // Read cell.value to register with GXT's currentTracker
          cell.value;
        }
      } catch {
        /* ignore */
      }
      return value;
    },
    // Delegate sets to the original target so @tracked setters run with
    // this = target (not proxy). This ensures backtracking detection and
    // tracked property storage (WeakMap keyed by `this`) work correctly.
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });

  _nestedTrackingProxies.set(obj, proxy);
  _proxyToRaw.set(proxy, obj);
  return proxy;
}

/**
 * Create a render context that properly inherits from the component instance.
 *
 * Uses Object.create(instance) so that:
 * - Methods on the prototype are accessible via 'this'
 * - We can add getters for reactive arg access
 */
function createRenderContext(instance: any, args: any, fw: any, owner: any): any {
  // Use the instance directly — don't use Object.create(instance).
  // Object.create creates a new object with instance as prototype, which breaks
  // getters: @tracked, computed properties, etc. run with `this = renderContext`
  // but their storage is keyed on `instance`. Using the instance directly ensures
  // `this` is consistent across getter calls and storage lookups.
  const renderContext = instance || {};

  // During force-rerender, cellFor may have installed own getters on the
  // instance that shadow PURE prototype getters (e.g., get full() { ... }).
  // These cellFor getters read from cells keyed to the OLD proxy (from the
  // initial render), which hold stale values. Remove them so the new proxy
  // reads from the prototype getter (which computes fresh values).
  // Only remove getters that shadow PURE getters (no setter) — tracked
  // property getters (with both get/set) should be preserved.
  if ((getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false) && instance) {
    try {
      const ownKeys = Object.getOwnPropertyNames(instance);
      for (const key of ownKeys) {
        const ownDesc = Object.getOwnPropertyDescriptor(instance, key);
        if (!ownDesc || !ownDesc.get || !ownDesc.configurable) continue;
        // Walk prototype chain to find a matching getter
        let p = Object.getPrototypeOf(instance);
        while (p && p !== Object.prototype) {
          const protoDesc = Object.getOwnPropertyDescriptor(p, key);
          if (protoDesc) {
            // Only remove if prototype has a PURE getter (no setter).
            // Tracked properties have both get and set — keep their cellFor getters.
            if (protoDesc.get && !protoDesc.set) {
              delete instance[key];
            }
            break;
          }
          p = Object.getPrototypeOf(p);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Get slots from args.$slots (passed from compile.ts's $_tag path) or
  // from args[$SLOTS_SYMBOL] (passed from GXT's $_args in the $_c path).
  // GXT templates use $slots.default() for {{yield}}
  const slots = args?.$slots || args?.[$SLOTS_SYMBOL] || {};
  renderContext[$SLOTS_SYMBOL] = slots;
  Object.defineProperty(renderContext, '$slots', {
    value: slots,
    writable: true,
    enumerable: false,
    configurable: true,
  });

  // GXT FwType is [TagProp[], TagAttr[], TagEvent[]] - all must be arrays
  // fw[0] = props (properties to set on element)
  // fw[1] = attrs (DOM attributes for ...attributes)
  // fw[2] = events (event handlers/modifiers)
  renderContext.$fw = fw || [[], [], []];

  // Add __gxtSelfString__ getter for {{this}} support
  // Ember's {{this}} calls toString() on the component instance
  if (!renderContext.hasOwnProperty('__gxtSelfString__')) {
    Object.defineProperty(renderContext, '__gxtSelfString__', {
      get() {
        return this.toString();
      },
      enumerable: false,
      configurable: true,
    });
  }

  // Add has-block helpers to the render context
  // These check the current slots to see if blocks were provided
  renderContext.$_hasBlock = function (blockName?: string) {
    const name = blockName || 'default';
    return slots && typeof slots[name] === 'function';
  };
  renderContext.$_hasBlockParams = function (blockName?: string) {
    const name = blockName || 'default';
    if (!slots || typeof slots[name] !== 'function') {
      return false;
    }
    // Check if the slot has block params info attached
    const slotFn = slots[name];
    if (slotFn.__hasBlockParams !== undefined) {
      return slotFn.__hasBlockParams;
    }
    // GXT runtime compiler emits a sibling `${name}_` flag to indicate that
    // the slot function declares block params (e.g., `default_: true` next
    // to `default: (ctx0, a) => [...]` for `{{#comp as |a|}}`).
    const markerKey = `${name}_`;
    if (markerKey in slots && typeof slots[markerKey] === 'boolean') {
      return slots[markerKey];
    }
    // Conservative default
    return false;
  };
  // Also stamp the slot function itself with `__hasBlockParams` (derived
  // from the GXT `${name}_` sibling marker) so the render-time installer
  // in compile.ts, which only checks `slotFn.__hasBlockParams`, picks up
  // the correct value when it overwrites `renderContext.$_hasBlockParams`.
  if (slots && typeof slots === 'object') {
    for (const sname of Object.keys(slots)) {
      if (sname.endsWith('_')) continue;
      const sfn = slots[sname];
      if (typeof sfn !== 'function') continue;
      if (sfn.__hasBlockParams !== undefined) continue;
      const markerKey = `${sname}_`;
      if (markerKey in slots && typeof slots[markerKey] === 'boolean') {
        try {
          (sfn as any).__hasBlockParams = slots[markerKey];
        } catch {
          /* ignore */
        }
      }
    }
  }

  // Set up attrs proxy for this.attrs.argName.value / this.args.argName access
  const attrsProxy: Record<string, any> = {};
  // Owner of the argument value slots this context reads through (see
  // `_argValueSlot`): the instance's arg getters, else this args proxy.
  const argSlotOwner: object = instance?.__argGetters ?? attrsProxy;
  // Store arg cells for reactive updates
  const argCells: Record<string, any> = {};
  // Build Ember-style attrs object separately: mut→mutCell, readonly→plain, regular→{value,update()}
  const emberAttrs: Record<string, any> = {};
  const _readonlyKeys = instance?.__gxtReadonlyKeys || new Set<string>();
  const _mutCellKeys = instance?.__gxtMutCellKeys || new Set<string>();
  const _rawArgGetters = instance?.__gxtRawArgGetters || {};
  // Capture the optional `triggerReRender` bridge method once here at
  // attrs-proxy setup; the call sites below guard on it.
  const triggerReRenderForAttrs = getGxtRenderer()?.compilePipeline.triggerReRender;
  if (args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      if (key.startsWith('Symbol') || _isGxtInternalArgKey(key)) continue;

      // Resolve the initial value, unwrapping mut/readonly cells for the args proxy
      const descriptor = Object.getOwnPropertyDescriptor(args, key);
      const getter = descriptor?.get;
      const rawProp = args[key];
      // Don't unwrap fn helper results, mut cells, curried helpers/components —
      // they are real functions, not GXT reactive getters.
      let rawVal = getter
        ? getter()
        : typeof rawProp === 'function' &&
            !rawProp.__isFnHelper &&
            !rawProp.__isMutCell &&
            !rawProp.__isEmberCurriedHelper &&
            !rawProp.__isCurriedComponent &&
            !rawProp.prototype
          ? rawProp()
          : rawProp;
      // Unwrap mut cells for args proxy (template rendering needs plain values)
      const argSlot = _argValueSlot(argSlotOwner, key);
      let initialVal = rawVal;
      if (rawVal && rawVal.__isMutCell) {
        initialVal = rawVal.value;
      } else if (rawVal && rawVal.__isReadonly) {
        initialVal = rawVal.__readonlyValue;
      }
      initialVal = _readArgValue(argSlot, initialVal);

      // Build an unwrapping getter for the args proxy
      const unwrappingGetter = getter
        ? _argValueGetter(argSlot, () => {
            const v = getter();
            if (v && v.__isMutCell) return v.value;
            if (v && v.__isReadonly) return v.__readonlyValue;
            return v;
          })
        : undefined;

      if (getter && instance) {
        // Create a cell for this arg so GXT's formula tracking picks up the dependency.
        // When the parent context changes, we update this cell which triggers re-evaluation.
        // `@key` reads the cell; a read of the argument's reference
        // (`readArgumentReference`, for `(mut @key)`) reads what the
        // invocation passed.
        const cell = _gxtCellFor(attrsProxy, key, /* skipDefine */ true);
        cell.update(initialVal);
        Object.defineProperty(attrsProxy, key, {
          get() {
            return isReadingArgumentReference() ? getter() : cell.value;
          },
          set(value: unknown) {
            cell.update(value);
          },
          enumerable: true,
          configurable: true,
        });
        argCells[key] = { cell, getter: unwrappingGetter || getter };
        // When the arg VALUE is an object, register it as an
        // object-value-owner of this arg cell. A nested property change on that
        // object (e.g. `foo.set('text', …)` for an arg `@foo={{this.foo}}`
        // consumed by `@computed('args.foo.text')`) does not change the arg
        // reference, so the arg cell is never re-dirtied and the component's
        // dependent computed never recomputes. Registering the owner makes
        // `notifyPropertyChange(foo, 'text')` reverse-look-up and dirty
        // `cellFor(attrsProxy, 'foo')`, re-firing the subscribed text effect +
        // the dependent CP.
        {
          try {
            if (initialVal && typeof initialVal === 'object') {
              getGxtRenderer()?.compilePipeline.registerObjectValueOwner?.(
                initialVal,
                attrsProxy,
                key
              );
              // Stash a back-reference from the args proxy to the component
              // instance so the SyncCore reverse-lookup fan-out can recompute
              // the component's `@computed('args.<key>.<nested>')` CPs when a
              // nested property on the arg value changes. (`renderContext` is
              // the component instance; its `.args` is set to `attrsProxy`.)
              if (!(attrsProxy as any).__gxtOwnerComponent) {
                try {
                  Object.defineProperty(attrsProxy, '__gxtOwnerComponent', {
                    value: renderContext,
                    enumerable: false,
                    configurable: true,
                  });
                } catch {
                  /* non-configurable — ignore */
                }
              }
            }
          } catch {
            /* ignore — owner registration is best-effort */
          }
        }
      } else if (getter) {
        // A component without an instance (template-only) reads the argument
        // where its template uses it, as Glimmer reads an argument reference:
        // the reading binding depends on what the argument's expression reads.
        // An argument cell is kept up to date only by the sync's arg-cell pass,
        // which keys its entries by instance: the arg cells of every
        // instance-less component shared one entry, each render replacing the
        // last one's, so only the last template-only component rendered (the
        // last `{{#each}}` row) saw its arguments change.
        Object.defineProperty(attrsProxy, key, {
          get() {
            return isReadingArgumentReference() ? getter() : unwrappingGetter!();
          },
          enumerable: true,
          configurable: true,
        });
      } else {
        Object.defineProperty(attrsProxy, key, {
          get() {
            const val = args[key];
            // Don't unwrap fn helper results, mut cells, curried helpers
            let resolved =
              typeof val === 'function' &&
              !val.__isFnHelper &&
              !val.__isMutCell &&
              !val.__isEmberCurriedHelper &&
              !val.__isCurriedComponent &&
              !val.prototype
                ? val()
                : val;
            if (isReadingArgumentReference()) return resolved;
            if (resolved && resolved.__isMutCell) resolved = resolved.value;
            else if (resolved && resolved.__isReadonly) resolved = resolved.__readonlyValue;
            return _readArgValue(argSlot, resolved);
          },
          enumerable: true,
          configurable: true,
        });
      }

      // Build Ember-style attrs entry.
      // Classic-only (gated): `this.attrs.<arg>` (and its {value, update()}
      // mutable-binding overlay) is a classic @ember/component contract. Glimmer
      // components read `this.args.<arg>` (the attrsProxy built above), never
      // `this.attrs`. In a native build createRenderContext is only ever reached
      // through renderGlimmerComponent (the classic render path is DCE-stripped),
      // so this entire emberAttrs construction is gated out: emberAttrs stays
      // empty and `renderContext.attrs` falls back to attrsProxy (unused by
      // Glimmer).
      if (__GXT_CLASSIC_COMPONENTS__) {
        if (_mutCellKeys.has(key)) {
          // For mut cells: attrs[key] IS the mutCell (has .value and .update())
          // Use a getter so we always get the current mut cell
          const rawGetter = _rawArgGetters[key];
          if (rawGetter) {
            Object.defineProperty(emberAttrs, key, {
              get() {
                const v = rawGetter();
                if (v && v.__isMutCell) return v;
                return v;
              },
              enumerable: true,
              configurable: true,
            });
          } else if (rawVal && rawVal.__isMutCell) {
            emberAttrs[key] = rawVal;
          } else {
            emberAttrs[key] = initialVal;
          }
        } else if (_readonlyKeys.has(key)) {
          // For readonly: attrs[key] IS the plain value (no .update())
          // Use a getter for reactivity
          if (unwrappingGetter) {
            Object.defineProperty(emberAttrs, key, {
              get() {
                return unwrappingGetter();
              },
              enumerable: true,
              configurable: true,
            });
          } else {
            emberAttrs[key] = initialVal;
          }
        } else {
          // For regular args: automatic mutable binding with .value and .update()
          const _getter = unwrappingGetter || getter;
          const _inst = instance;
          const _key = key;
          // Skip instance-field fallback for reserved keys that collide with
          // classic Ember internals on the component instance itself (e.g. `attrs`,
          // `args`). For those keys, `_inst[_key]` would read the emberAttrs hash
          // we just installed — producing `[object Object]` rather than the arg
          // value — so we must read directly from the args getter instead.
          const _skipInstFallback = _key === 'attrs' || _key === 'args';
          const _readValue = () => {
            if (_skipInstFallback) {
              if (_getter) {
                try {
                  return _getter();
                } catch {
                  /* ignore */
                }
              }
              return initialVal;
            }
            if (_inst) {
              try {
                return _inst[_key];
              } catch {
                /* ignore */
              }
            }
            if (_getter) {
              try {
                return _getter();
              } catch {
                /* ignore */
              }
            }
            return initialVal;
          };
          emberAttrs[key] = {
            get value() {
              return _readValue();
            },
            // Make `{{this.attrs.someProp}}` render the raw value, not `[object Object]`.
            // Ember's classic components expose `this.attrs.foo` as the raw value
            // (with a deprecation pointing at `@foo`); the {value, update} API is an
            // additional overlay used by `{{mut}}` consumers. Primitive coercion hooks
            // unify both contracts without changing the data shape.
            toString() {
              const v = _readValue();
              return v == null ? '' : String(v);
            },
            valueOf() {
              return _readValue();
            },
            [Symbol.toPrimitive](_hint: string) {
              return _readValue();
            },
            update(newValue: any) {
              // Use set() which triggers PROPERTY_DID_CHANGE for upstream propagation
              if (_inst) {
                if (typeof _inst.set === 'function') {
                  _inst.set(_key, newValue);
                } else {
                  _inst[_key] = newValue;
                  // Also propagate upstream
                  if (_inst.__gxtTwoWayBindings?.[_key]) {
                    const binding = _inst.__gxtTwoWayBindings[_key];
                    if (binding.sourceCtx && binding.sourceKey) {
                      const srcInst = binding.sourceCtx.__gxtRawTarget || binding.sourceCtx;
                      if (typeof srcInst.set === 'function') {
                        srcInst.set(binding.sourceKey, newValue);
                      } else {
                        binding.sourceCtx[binding.sourceKey] = newValue;
                      }
                      if (triggerReRenderForAttrs)
                        triggerReRenderForAttrs(srcInst, binding.sourceKey);
                    }
                  }
                }
                // Always trigger re-render on the instance itself
                if (triggerReRenderForAttrs) triggerReRenderForAttrs(_inst, _key);
              }
            },
          };
        }
      }
    }
  }
  // Don't register attrsProxy arg cells separately here — they will be merged
  // into the renderCtxArgCells entry below so both cells get updated together.
  // This prevents the renderCtxArgCells registration from deleting the attrsProxy
  // entry, which would leave the attrsProxy cells (tracked by GXT effects for @arg)
  // stale and never updated.
  // GXT's $_GET_SLOTS reads ctx['args'][$SLOTS_SYMBOL] as a fallback,
  // so the attrsProxy (which becomes renderContext.args) must carry slots.
  attrsProxy[$SLOTS_SYMBOL] = slots;

  // GXT's $_GET_FW reads ctx['args'][$PROPS_SYMBOL] as a fallback
  // when the template is called via .call(renderContext) with no args.
  // This enables ...attributes forwarding for both classic and tagless components.
  attrsProxy[$PROPS_SYMBOL] = fw || [[], [], []];

  // Use Ember-style attrs (with .value/.update() for mutable, plain for readonly)
  // for instance.attrs, but attrsProxy (unwrapped values) for args/@arg access.
  renderContext.attrs = Object.keys(emberAttrs).length > 0 ? emberAttrs : attrsProxy;
  // GXT accesses @foo as this.args.foo, so also set args
  renderContext.args = attrsProxy;
  // Back-compat shim: the GXT runtime compiler currently emits
  //   () => $a.this?.attrs?.someProp
  // for `{{this.attrs.someProp}}` because the `this.attrs → @` rewrite loses
  // the original path parts in the path serializer (upstream bug). Until it
  // is fixed, install a `this.attrs` pass-through on the args object that
  // forwards property reads back to attrsProxy. This keeps Ember's
  // deprecated-but-supported `{{this.attrs.foo}}` rendering in classic
  // curly components.
  if (!attrsProxy.this) {
    const attrsShim = new Proxy(
      {},
      {
        get(_t, p: string | symbol) {
          if (typeof p === 'symbol') return undefined;
          return attrsProxy[p];
        },
        has(_t, p: string | symbol) {
          return typeof p === 'string' && p in attrsProxy;
        },
      }
    );
    try {
      Object.defineProperty(attrsProxy, 'this', {
        value: { attrs: attrsShim },
        enumerable: false,
        configurable: true,
      });
    } catch {
      /* non-configurable */
    }
  }
  // gxt reads `@foo` as `this['args'].foo` (its `$args` key).
  renderContext[$ARGS_KEY] = attrsProxy;

  if (instance) {
    // Always set attrs to the Ember-style object (with .value/.update() or plain values)
    instance.attrs = Object.keys(emberAttrs).length > 0 ? emberAttrs : attrsProxy;
  }
  if (instance && !instance.args) {
    instance.args = attrsProxy;
  }
  if (instance && !instance[$ARGS_KEY]) {
    instance[$ARGS_KEY] = attrsProxy;
  }

  // Set up cell-backed getters for args on render context.
  // Using cells ensures GXT's formula tracking picks up the dependency,
  // so text nodes, if-conditions, etc. re-evaluate when args change.
  //
  // IMPORTANT: Skip this for template-only components (instance === null).
  // Template-only components should only expose args via @argName (this.args.foo),
  // NOT as properties on `this` (this.foo). Installing getters on the bare
  // renderContext {} would make {{this.foo}} resolve to the arg value, which
  // violates Ember's template-only component contract.
  const renderCtxArgCells: Record<string, any> = {};
  const argGetters = instance?.__argGetters || {};

  // Collect all arg keys and their getters
  const allArgKeys = new Set<string>(Object.keys(argGetters));
  if (instance && args && typeof args === 'object') {
    for (const key of Object.keys(args)) {
      if (
        key === 'class' ||
        key === 'classNames' ||
        key.startsWith('__') ||
        key.startsWith('Symbol')
      )
        continue;
      allArgKeys.add(key);
    }
  }

  for (const key of allArgKeys) {
    let getter: (() => any) | undefined = argGetters[key];
    if (!getter && args) {
      const descriptor = Object.getOwnPropertyDescriptor(args, key);
      if (descriptor?.get) {
        getter = descriptor.get;
      } else {
        const argRef = args[key];
        // Only treat as getter if it's a GXT reactive getter (arrow fn with no args).
        // Don't unwrap fn helper results, mut cells, curried helpers, or class constructors.
        getter =
          typeof argRef === 'function' &&
          !argRef.prototype &&
          !argRef.__isFnHelper &&
          !argRef.__isMutCell &&
          !argRef.__isEmberCurriedHelper &&
          !argRef.__isCurriedComponent
            ? argRef
            : undefined;
        // Block-components invoked via
        // `$_c('Foo', $_args({ arg: () => this.x }, ...))` receive their args
        // through GXT's non-dev `$_args` Proxy (`ArgProxyHandler`). The proxy's
        // GET trap INVOKES the underlying `() => this.x` thunk, so `args[key]`
        // returns a frozen snapshot value (not the thunk) — `getter` stays
        // undefined and the arg never gets a live cell/effect installed (its
        // value is captured once at create time). The thunk still lives on the
        // proxy TARGET as a plain `value` descriptor, so read it directly and
        // use it as the live getter. This makes the arg reactive: the installed
        // arg-cell effect re-reads the thunk (→ outer source cell) and dirties
        // downstream readers when the parent mutates.
        if (!getter && typeof descriptor?.value === 'function') {
          const thunk = descriptor.value as any;
          if (
            !thunk.prototype &&
            !thunk.__isFnHelper &&
            !thunk.__isMutCell &&
            !thunk.__isEmberCurriedHelper &&
            !thunk.__isCurriedComponent &&
            !thunk.__isComponentThunk &&
            !thunk.__stringComponentName
          ) {
            getter = thunk;
          }
        }
      }
      // A getter taken from the args object reads the argument's value
      // (`argumentValue`: a `(mut x)` cell or a `(readonly x)` marker stands for
      // its value) through the argument's slot, as the instance's arg getters
      // do: the sync writes what it reads to `this.<key>` and to the `@key`
      // cell.
      if (getter) {
        const read = getter;
        getter = _argValueGetter(_argValueSlot(argSlotOwner, key), () => argumentValue(read()));
      }
    }

    // Skip installing the arg cell if the instance already has a @tracked
    // property with the same name. The @tracked manages its own state (via
    // trackedData storage), and installing a cell-backed descriptor on the
    // instance would shadow the tracked getter/setter, breaking `this.key`
    // reads and writes. The arg is still accessible via `this.args.key`.
    // See "Component Tracked Properties w/ Args Proxy" test.
    //
    // `@tracked` stores a TrackedDescriptor in meta (`_isTrackedKey`).
    if (instance && getter) {
      const hasTrackedDescriptor = _isTrackedKey(instance, key);
      if (hasTrackedDescriptor) {
        // @tracked owns this key on the instance. Don't install an arg
        // cell that would shadow it. `this.args.key` remains available.
        continue;
      }
    }

    if (getter) {
      // Fast path: if we already installed our marker-tagged descriptor
      // on renderContext[key] during a previous createRenderContext pass,
      // just refresh the arg cell mapping and continue. Reading the
      // existing getter would invoke the user's prototype getter a second
      // time (cellFor with skipDefine=false reads the current value).
      if (instance) {
        const _crcExistingDesc = Object.getOwnPropertyDescriptor(renderContext, key);
        const _crcAlreadyInstalled = !!(
          _crcExistingDesc && (_crcExistingDesc.get as any)?.__gxtRenderCtxArgGetter
        );
        if (_crcAlreadyInstalled) {
          try {
            const cell = _gxtCellFor(renderContext, key, /* skipDefine */ true);
            const _savedOverride = instance?.__gxtInitOverrides?.[key];
            renderCtxArgCells[key] = {
              cell,
              getter,
              lastArgValue: getter(),
              ...(_savedOverride ? { initOverridden: true } : {}),
            };
            // The descriptor's rcGet reads from `state.currentGetter` on
            // the WeakMap state. Update it to the latest getter so that reads
            // during force-rerender (which builds a fresh outer template and
            // re-invokes each-row child components with new arg closures) see
            // the new value. Otherwise the descriptor's closure holds the
            // original getter from the first createRenderContext call, and
            // `this.item` returns stale row data after the parent re-renders.
            // See also: updateInstanceWithNewArgs, which performs the same
            // refresh up-front so this is robust even when an upstream
            // cellFor reinstall has stripped the __gxtRenderCtxArgGetter
            // marker (in which case this fast path is skipped entirely).
            if (instance) {
              const _stateForGetter = _getRcArgState(instance, key);
              if (_stateForGetter) {
                _stateForGetter.currentGetter = getter;
              }
            }
          } catch {
            /* ignore */
          }
          continue;
        }
      }
      // Detect a plain get-only native getter colliding with this arg key
      // (e.g. `get count() { return this.args.count }`). For such a getter
      // there can be no init-override (a get-only property cannot be assigned
      // in init), and reading `instance[key]` below to probe for an override
      // would invoke the user getter — firing its side effects an extra time
      // that genuine Ember never incurs (the proto getter would otherwise only
      // run when the template reads it). So for the collision case we skip the
      // instance-read probe entirely and treat it as un-overridden.
      // @computed/@tracked/get-with-setter keep the original probe (they may
      // legitimately be overridden).
      const _plainNativeCollisionRc =
        !!instance && _isPlainNativeGetterCollision(Object.getPrototypeOf(instance), key);
      // Check if the instance overrode this property in init()
      // If so, we should use the init-set value, not the arg value.
      // Also check __gxtInitOverrides which persists across re-renders.
      const argVal = getter();
      let instanceVal: any;
      if (_plainNativeCollisionRc) {
        // Skip the override probe — reading instance[key] would fire the
        // user getter's side effect. A get-only getter is never overridden.
        instanceVal = argVal;
      } else {
        try {
          instanceVal = instance?.[key];
        } catch {
          instanceVal = argVal;
        }
      }
      const freshOverride = instance && instanceVal !== argVal && instanceVal !== undefined;
      // Check if this was flagged as init-overridden on a previous render pass
      const savedOverride = instance?.__gxtInitOverrides?.[key];
      const overriddenInInit = freshOverride || !!savedOverride;

      // Save the init override flag on the instance for future re-renders
      if (freshOverride && instance) {
        if (!instance.__gxtInitOverrides) instance.__gxtInitOverrides = {};
        instance.__gxtInitOverrides[key] = true;
      }
      if (overriddenInInit) {
        // Instance overrode this property in init() — use a getter that
        // returns the instance value but can be updated by arg changes.
        // Create a cell FIRST, then install our custom getter that reads
        // cell.value for GXT tracking but returns the correct local/arg value.
        try {
          let localVal = instanceVal;
          let useLocal = true;
          // Create a cell with skipDefine=true to avoid cellFor installing
          // its own getter/setter (we'll install our own below).
          const cell = _gxtCellFor(renderContext, key, /* skipDefine */ true);
          if (cell) cell.update(localVal);
          // For init-overridden properties, track the cell but mark it as init-overridden.
          // `_gxtSyncAllWrappers` will skip the cell update and instead check the getter
          // to see if the arg value actually changed from the parent's perspective.
          renderCtxArgCells[key] = { cell, getter, initOverridden: true };
          const rcInitGet: any = function () {
            if (cell)
              try {
                cell.value;
              } catch {
                /* ignore */
              }
            return useLocal ? localVal : getter();
          };
          rcInitGet.__gxtRenderCtxArgGetter = true;
          Object.defineProperty(renderContext, key, {
            get: rcInitGet,
            set(v: any) {
              // When __gxtDispatchingArgs is true, this is an arg update from parent,
              // not an explicit set from component code. Switch to arg-driven mode.
              if ((instance as any).__gxtDispatchingArgs) {
                localVal = v;
                useLocal = false;
                if (cell) cell.update(v);
              } else {
                localVal = v;
                useLocal = true;
                if (cell) cell.update(v);
              }
            },
            enumerable: true,
            configurable: true,
          });
        } catch {
          /* ignore */
        }
      } else {
        // Install a cell on the render context for this arg.
        // GXT formulas reading renderContext.key will track this cell.
        //
        // Check if the property has a computed/native getter on the prototype chain.
        // If so, we must NOT overwrite it — use cellFor with skipDefine=false (preserves computed).
        // For plain data properties, use skipDefine=true with custom getter/setter for local override tracking.
        let hasComputedGetter = false;
        // When an arg `key` also has a plain get-only native getter on the
        // prototype (e.g. `get count() { return this.args.count }` where
        // `count` is also `@count`), the cell-backed descriptor we install
        // below would return `cell.value` directly → shadow the prototype getter
        // → `this.count` would never invoke `get count()` and its side effects
        // would not fire on arg change. We capture the prototype getter fn + a
        // "plain native get-only" classification so the descriptor can route
        // through a dep-memoized GXT `cached()` wrapper instead of the raw cell
        // value (scoped so the dynamic-component / Glimmerish path is untouched).
        let protoGetterFn: any = undefined;
        let protoGetterIsPlainNative = false;
        if (instance) {
          let proto = Object.getPrototypeOf(instance);
          while (proto && proto !== Object.prototype) {
            const desc = Object.getOwnPropertyDescriptor(proto, key);
            if (desc?.get) {
              hasComputedGetter = true;
              protoGetterFn = desc.get;
              // Plain native get-only: has get, no set (so not a `@tracked`
              // accessor), and not a classic @computed CP (those carry a
              // _setter / dependent-key descriptor in meta — `cell.value` is
              // correct for them).
              if (!desc.set) {
                let _isClassicCp = false;
                try {
                  _isClassicCp = !!_findMetaDescriptor(Object.getPrototypeOf(instance), key);
                } catch {
                  /* ignore — treat as plain native on detection failure */
                }
                protoGetterIsPlainNative = !_isClassicCp;
              }
              break;
            }
            proto = Object.getPrototypeOf(proto);
          }
        }
        // Treat as a plain-native collision so the cached native getter is used.
        const _useCachedNativeGetter = protoGetterIsPlainNative && !!protoGetterFn && !!instance;
        if (hasComputedGetter) {
          // Property has a computed getter — install a cell-backed
          // descriptor manually. cellFor(skipDefine=false) would read
          // `renderContext[key]` to prime the cell, invoking the user's
          // prototype getter an extra time and shadowing the prototype
          // descriptor with a cell-backed one.
          //
          // Install an own data descriptor for `key` before calling
          // cellFor: GXT's cellFor eagerly reads the current value (even
          // with skipDefine=true) when the object has no own descriptor
          // for the key yet, and `renderContext` inherits a prototype
          // getter that would invoke the user's `get count()` a second
          // time just to prime the cell. Pre-installing a data descriptor
          // with the value we already have avoids that extra invocation.
          try {
            const initialVal = argVal;
            try {
              Object.defineProperty(renderContext, key, {
                value: initialVal,
                writable: true,
                enumerable: true,
                configurable: true,
              });
            } catch {
              /* ignore — fall through to cellFor */
            }
            const cell = _gxtCellFor(renderContext, key, /* skipDefine */ true);
            cell.update(initialVal);
            renderCtxArgCells[key] = { cell, getter, lastArgValue: initialVal };
            // Register the array value as an owner of this arg cell via the
            // bridge.
            if (Array.isArray(initialVal)) {
              getGxtRenderer()?.compilePipeline.registerArrayOwner?.(
                initialVal,
                renderContext,
                key
              );
            }
            // Detect classic @computed CP with a setter on the prototype chain.
            // When present, the wrapper setter below must also invoke the CP's
            // `_setter` for its side effects (e.g. `set width(w) { this.set('height', w/2) }`);
            // otherwise the cell-backed descriptor silently eats the write and
            // breaks mutable bindings of CP-with-setter.
            let cpWithSetter_rc: any = null;
            try {
              let proto_rc = Object.getPrototypeOf(instance!);
              while (proto_rc && proto_rc !== Object.prototype) {
                const pmeta_rc: any = peekMeta(proto_rc);
                if (pmeta_rc) {
                  const d = pmeta_rc.peekDescriptors?.(key);
                  if (d && d._setter && d._setter !== d._getter) {
                    cpWithSetter_rc = d;
                    break;
                  }
                }
                proto_rc = Object.getPrototypeOf(proto_rc);
              }
            } catch {
              /* ignore */
            }
            // Install a cell-backed descriptor manually: argVal is already
            // computed and the cell initialized with it, whereas
            // cellFor(skipDefine=false) would invoke the user's prototype
            // getter a second time to prime the cell.
            try {
              // For a plain native get-only collision getter, build a
              // per-instance dep-memoized GXT `cached()` wrapper of the
              // prototype getter so `this.<key>` re-invokes the user getter
              // (firing its side effect) — but only when its deps (e.g.
              // `this.args.count`) dirty, not on every read. Reusing the
              // module-level `__gxtPureGetterCache` keeps the wrapper stable
              // across createRenderContext re-invocations so multi-read
              // priming within one render returns the cached value
              // (exactly-once side effect). The arg cell is still kept
              // current (updated on the setter below + the effect) so
              // `this.args.<key>` reads stay reactive.
              let _nativeGetterWrapper: any = undefined;
              if (_useCachedNativeGetter) {
                let _wmap = __gxtPureGetterCache.get(instance!);
                if (!_wmap) {
                  _wmap = new Map<string, any>();
                  __gxtPureGetterCache.set(instance!, _wmap);
                }
                _nativeGetterWrapper = _wmap.get(key);
                if (!_nativeGetterWrapper) {
                  const _pg = protoGetterFn;
                  const _inst = instance!;
                  _nativeGetterWrapper = _gxtCached(
                    () => _pg.call(_inst),
                    'native-arg-getter:' + key
                  );
                  _wmap.set(key, _nativeGetterWrapper);
                }
              }
              const rcHasCompGet: any = function () {
                try {
                  _classicConsumeTagHook(_classicTagForHook(renderContext, key));
                } catch {
                  /* noop */
                }
                // Plain native collision getter → route through the cached
                // wrapper (dep-memoized; re-invokes the user getter only when
                // its deps dirty). Read cell.value too so the arg-cell
                // dependency is still tracked by the ambient formula.
                if (_nativeGetterWrapper) {
                  try {
                    cell.value;
                  } catch {
                    /* ignore */
                  }
                  return _nativeGetterWrapper.value;
                }
                return cell.value;
              };
              // Mark so re-entrant createRenderContext can detect and skip
              // the redundant cellFor, which would trigger the user's
              // prototype getter a second time just to read the current
              // value. The installed getter already handles reads.
              rcHasCompGet.__gxtRenderCtxArgGetter = true;
              Object.defineProperty(renderContext, key, {
                get: rcHasCompGet,
                set(v: any) {
                  cell.update(v);
                  // Invoke CP setter for its side effects (see createComponentInstance).
                  if (cpWithSetter_rc && !(instance as any).__gxtInvokingCpSetter) {
                    if ((instance as any).__gxtDispatchingArgs) {
                      if (!(instance as any).__gxtCpArgDispatched)
                        (instance as any).__gxtCpArgDispatched = {};
                      (instance as any).__gxtCpArgDispatched[key] = v;
                    }
                    try {
                      (instance as any).__gxtInvokingCpSetter = true;
                      cpWithSetter_rc.set(instance, key, v);
                    } catch {
                      /* ignore CP setter failures */
                    } finally {
                      (instance as any).__gxtInvokingCpSetter = false;
                    }
                  }
                  try {
                    classicDirtyTagForGuarded(renderContext, key);
                  } catch {
                    /* noop */
                  }
                },
                enumerable: true,
                configurable: true,
              });
              // Install a gxt effect that dirties the classic tag whenever
              // the upstream arg cell invalidates — handles parent mutations
              // that don't route through the instance's setter.
              _installArgDirtyEffect(instance || renderContext, renderContext, key, () =>
                _readArgCell(cell, getter)
              );
            } catch {
              /* ignore */
            }
          } catch {
            try {
              const g = getter;
              Object.defineProperty(renderContext, key, {
                get() {
                  return g();
                },
                enumerable: true,
                configurable: true,
              });
            } catch {
              /* ignore */
            }
          }
        } else {
          // Plain data property — use skipDefine=true with custom getter/setter for local override tracking.
          try {
            const cell = _gxtCellFor(renderContext, key, /* skipDefine */ true);
            const initialVal = argVal;
            cell.update(initialVal);
            renderCtxArgCells[key] = { cell, getter, lastArgValue: initialVal };
            // Preserve local-override state across createRenderContext re-invocations
            // by storing it in a WeakMap keyed by instance+key. Closure variables
            // would be lost when the descriptor is replaced (e.g. by
            // cellFor(obj, key, false) called elsewhere during the same render
            // pass); the WeakMap survives.
            const existingState = instance ? _getRcArgState(instance, key) : undefined;
            const state = existingState || {
              localVal: initialVal,
              useLocal: false,
              currentGetter: getter,
            };
            // Always refresh the currentGetter slot so the rcGet closure reads
            // the latest arg getter (the per-row closure for #each iterations).
            // The slow path runs on first install AND when the descriptor was
            // replaced (e.g., by an upstream cellFor reinstall) — both need a
            // fresh getter. The fast-path skip above keeps state.currentGetter
            // in sync for subsequent createRenderContext re-invocations.
            state.currentGetter = getter;
            if (!existingState && instance) _setRcArgState(instance, key, state);
            const rcGet: any = function () {
              try {
                cell.value;
              } catch {
                /* ignore */
              }
              try {
                _classicConsumeTagHook(_classicTagForHook(renderContext, key));
              } catch {
                /* noop */
              }
              if (state.useLocal) return state.localVal;
              const g = state.currentGetter || getter;
              return g ? g() : state.localVal;
            };
            rcGet.__gxtRenderCtxArgGetter = true;
            const rcSet = function (v: any) {
              if ((instance as any).__gxtDispatchingArgs) {
                state.localVal = v;
                state.useLocal = false;
                cell.update(v);
                if (instance?.__gxtLocalOverrides) instance.__gxtLocalOverrides.delete(key);
              } else {
                state.localVal = v;
                state.useLocal = true;
                cell.update(v);
                if (instance) {
                  if (!instance.__gxtLocalOverrides) instance.__gxtLocalOverrides = new Set();
                  instance.__gxtLocalOverrides.add(key);
                }
              }
              try {
                classicDirtyTagForGuarded(renderContext, key);
              } catch {
                /* noop */
              }
            };
            Object.defineProperty(renderContext, key, {
              get: rcGet,
              set: rcSet,
              enumerable: true,
              configurable: true,
            });
            // Install a gxt effect that dirties the classic tag whenever
            // the upstream arg cell invalidates. This handles the common
            // case where nothing reads `instance.key` between a parent
            // mutation and the downstream cache read — the effect re-runs
            // on cell change and proactively dirties the tag.
            try {
              _installArgDirtyEffect(instance || renderContext, renderContext, key, () =>
                _readArgCell(cell, getter)
              );
            } catch {
              /* ignore */
            }
            // Register array owner for KVO array mutation tracking (pushObject, shiftObject, etc.)
            // Register the array value as an owner of this arg cell via the
            // bridge.
            if (Array.isArray(initialVal)) {
              getGxtRenderer()?.compilePipeline.registerArrayOwner?.(
                initialVal,
                renderContext,
                key
              );
            }
          } catch {
            // Fallback to plain getter
            try {
              const g = getter;
              Object.defineProperty(renderContext, key, {
                get() {
                  return g();
                },
                enumerable: true,
                configurable: true,
              });
            } catch {
              /* ignore */
            }
          }
        }
      }
    }
  }

  // Register render context arg cells for updates in `_gxtSyncAllWrappers`.
  // Also include attrsProxy cells so GXT effects tracking @arg (via this[$args].key)
  // get dirtied when args change. Both cells share the same getter.
  const mergedArgCells: Record<string, any> = {};
  for (const key of Object.keys(renderCtxArgCells)) {
    const entry = renderCtxArgCells[key];
    // Initialize lastArgValue for init-overridden entries
    if (entry.initOverridden) {
      entry.lastArgValue = entry.getter();
    }
    mergedArgCells[key] = entry;
  }
  // Detect @tracked properties on the instance so sync doesn't overwrite
  // user state by assigning the arg value back to instance[key]. When a
  // component has `@tracked foo = 0` AND receives an `@foo` arg with the
  // same name, `this.foo` is the tracked state and `this.args.foo` is the
  // arg — two different namespaces. The sync loop must only refresh the
  // attrsProxy cell for such keys, never touch `instance.foo`.
  // Merge attrsProxy cells as secondary cells that also need updating
  for (const key of Object.keys(argCells)) {
    const instanceIsTracked = _isTrackedKey(instance, key);
    if (mergedArgCells[key]) {
      // Store the attrsProxy cell alongside the renderCtx cell.
      // Preserve initOverridden and lastArgValue flags for init-overridden properties.
      const existing = mergedArgCells[key];
      mergedArgCells[key] = {
        cell: existing.cell,
        getter: existing.getter,
        extraCell: argCells[key].cell, // attrsProxy cell for @arg tracking
        initOverridden: existing.initOverridden,
        lastArgValue:
          existing.lastArgValue !== undefined
            ? existing.lastArgValue
            : existing.initOverridden
              ? existing.getter()
              : undefined,
        skipInstanceAssign: instanceIsTracked ? true : undefined,
      };
    } else {
      // No renderCtx arg cell (e.g., skipped because key collides with an
      // @tracked property on the instance). Register the attrsProxy cell
      // with a flag so sync doesn't assign to `instance[key]`.
      mergedArgCells[key] = instanceIsTracked
        ? { ...argCells[key], skipInstanceAssign: true }
        : argCells[key];
    }
  }

  if (Object.keys(mergedArgCells).length > 0) {
    for (const entry of trackedArgCells) {
      if (entry.instance === instance) {
        trackedArgCells.delete(entry);
      }
    }
    trackedArgCells.add({ cells: mergedArgCells, instance });
  }

  // Pre-install cell-backed getter/setters on the instance before creating
  // the Proxy. This is critical for GXT effect tracking: when a GXT effect
  // reads `this.foo`, Reflect.get triggers the getter on the instance, which
  // reads cell.value, and the effect tracks the cell as a dependency.
  // The trigger-re-render path (compile.ts `_gxtTriggerReRender`) also uses
  // cellFor on the instance, so both reads and writes use the same cell.
  const SKIP_CELL_PROPS = new Set([
    'constructor',
    'args',
    'attrs',
    '$slots',
    '$fw',
    'init',
    'destroy',
    '$_hasBlock',
    '$_hasBlockParams',
    $ARGS_KEY,
    'concatenatedProperties',
    'mergedProperties',
    'classNames',
    'classNameBindings',
    'attributeBindings',
    'positionalParams',
    '_states',
    'renderer',
    'element',
    'elementId',
    'tagName',
    'isView',
    'isComponent',
    '__dispatcher',
    'parentView',
    '_state',
    '_currentState',
    'target',
    'action',
    'actionContext',
    'actionContextObject',
    'layoutName',
    'layout',
    '_debugContainerKey',
  ]);

  // Bridge accessors for registerArrayOwner / registerObjectValueOwner (used
  // inside the loop below).
  const _gxtCp = getGxtRenderer()?.compilePipeline;
  if (instance) {
    // Install cells for all enumerable properties on the instance and its prototype
    const seen = new Set<string>();
    let obj = instance;
    for (let depth = 0; depth < 3 && obj; depth++) {
      for (const key of Object.keys(obj)) {
        if (seen.has(key) || SKIP_CELL_PROPS.has(key) || key.startsWith('_')) continue;
        seen.add(key);
        const desc = Object.getOwnPropertyDescriptor(obj, key);
        // Walk the WHOLE prototype chain above `obj` for this key and check
        // if ANY ancestor installed an accessor descriptor (get/set). CPs
        // from Ember mixins (e.g., TargetActionSupport's `actionContextObject`)
        // often live on a prototype ABOVE the current depth but the data
        // descriptor we're holding here might be a subclass shadow. If we
        // install a cellFor backed by `component[key]`, the cell's __fn
        // closes over the instance and the re-read loops through the
        // ancestor accessor — producing unbounded recursion through gxt's
        // vm.  Treat any inherited accessor as a "do not install" signal.
        let hasInheritedAccessor = false;
        let ancestor = Object.getPrototypeOf(obj);
        while (ancestor && ancestor !== Object.prototype) {
          const aDesc = Object.getOwnPropertyDescriptor(ancestor, key);
          if (aDesc) {
            if (aDesc.get || aDesc.set) hasInheritedAccessor = true;
            break;
          }
          ancestor = Object.getPrototypeOf(ancestor);
        }
        if (hasInheritedAccessor) continue;
        // Only install cells for configurable data properties (not getters or frozen props)
        if (
          desc &&
          !desc.get &&
          !desc.set &&
          desc.configurable !== false &&
          typeof desc.value !== 'function'
        ) {
          try {
            // Guard against recursive cell-backed getters (GH#18417):
            // If GXT's template machinery has already registered a lazy formula
            // cell (Yt with __fn) for (instance, key), calling cellFor with
            // skipDefine=false would install a getter `() => cell.value`. The
            // cell's __fn reads `instance[key]` — which now routes through the
            // newly installed getter — producing infinite recursion (StackOverflow).
            // Probe with skipDefine=true first; if the cell already exists and
            // is formula-backed, leave the raw data property in place so the
            // formula's __fn reads the data directly.
            const _existing = _gxtCellFor(instance, key, /* skipDefine */ true);
            if (_existing && typeof (_existing as any).__fn === 'function') {
              continue;
            }
            const _c = _gxtCellFor(instance, key, /* skipDefine */ false);
            // Reconcile: cellFor(skipDefine=false) may install a fresh getter/setter
            // backed by a cell that doesn't know the current data value (it was set
            // via this.set() BEFORE the cell was installed, e.g., in didReceiveAttrs).
            // If the cell's value disagrees with the data value we just saw, update
            // the cell so the getter returns the correct initial value.
            if (_c && desc.value !== undefined && _c._value !== desc.value) {
              try {
                _c.update(desc.value);
              } catch {
                /* ignore */
              }
            }
            // Register array owner for KVO array mutation tracking
            if (Array.isArray(desc.value)) {
              _gxtCp?.registerArrayOwner?.(desc.value, instance, key);
            }
            // Register reverse mapping: when a property on this object value changes,
            // dirty this cell so formulas reading nested paths (e.g., this.m.formattedMessage) re-evaluate.
            if (desc.value && typeof desc.value === 'object') {
              _gxtCp?.registerObjectValueOwner?.(desc.value, instance, key);
            }
          } catch {
            /* ignore */
          }
        }
      }
      obj = Object.getPrototypeOf(obj);
    }
  }

  // Per-instance cache of GXT `cached()` wrappers for pure (non-Ember-tracked)
  // getters. Without this, every proxy read of a pure getter (e.g., a user
  // `get combinedCounts()` that does `return this.args.x + this.y`) re-invokes
  // the getter — GXT's VM primes each text expression 3× per render, so an
  // Ember counter inside the getter runs 3× too. Wrapping in `cached()` lets
  // GXT memoize on dep-revision snapshots while preserving dep tracking.
  // Keyed on the instance via module-level WeakMap so the cache survives
  // createRenderContext re-invocations across render passes.
  let gxtGetterCache = instance ? __gxtPureGetterCache.get(instance) : undefined;
  if (!gxtGetterCache && instance) {
    gxtGetterCache = new Map<string, any>();
    __gxtPureGetterCache.set(instance, gxtGetterCache);
  }
  if (!gxtGetterCache) gxtGetterCache = new Map<string, any>();

  const proxy = new Proxy(renderContext, {
    get(target, prop, _receiver) {
      // Allow raw target access for cellFor
      if (prop === '__gxtRawTarget') return target;

      // Track arg source for two-way binding detection.
      // When _gxtTrackArgSource is true, record this property as the source.
      // This fires on every proxy property read (hot path).
      if (typeof prop === 'string' && _gxtTrackArgSource) {
        if (
          !SKIP_CELL_PROPS.has(prop) &&
          !prop.startsWith('_') &&
          !prop.startsWith('$') &&
          prop !== 'constructor' &&
          prop !== 'toString' &&
          prop !== 'valueOf'
        ) {
          // The detection consumer in `_installPropertyDidChangeOverride`
          // reads these slots immediately after the argGetter call that trips
          // this proxy trap.
          _lastArgSourceKey = prop;
          _lastArgSourceCtx = target;
        }
      }

      if (typeof prop !== 'string' || SKIP_CELL_PROPS.has(prop)) {
        return Reflect.get(target, prop, target);
      }

      // Check if the property already has a cell getter (pre-installed)
      // by checking the property descriptor chain
      let hasGetter = false;
      let foundDesc: PropertyDescriptor | undefined;
      let obj: any = target;
      while (obj) {
        const desc = Object.getOwnPropertyDescriptor(obj, prop);
        if (desc) {
          hasGetter = !!desc.get;
          foundDesc = desc;
          break;
        }
        obj = Object.getPrototypeOf(obj);
      }

      if (hasGetter) {
        // For pure getters (no setter, not a tracked/cellFor-installed getter),
        // memoize through GXT's `cached()` primitive so the body runs at most
        // once per revision-batch, even though GXT's VM may prime the same text
        // expression multiple times per render. `cached()` preserves dep tracking
        // (it re-injects known deps into the ambient tracker) and re-executes fn()
        // on any dep revision bump, so invalidation is unaffected.
        const getterFn = foundDesc?.get as any;
        const setterFn = foundDesc?.set as any;
        // A `@tracked` accessor has a setter, so it never takes this path.
        if (getterFn && !setterFn) {
          let wrapper = gxtGetterCache.get(prop);
          if (!wrapper) {
            wrapper = _gxtCached(() => getterFn.call(target), 'ember-getter:' + prop);
            gxtGetterCache.set(prop, wrapper);
          }
          try {
            const val = wrapper.value;
            if (val !== null && typeof val === 'object' && !(val instanceof Node)) {
              return wrapNestedObjectForTracking(val);
            }
            return val;
          } catch {
            // fall through to the uncached read below on any failure
          }
        }

        const val = Reflect.get(target, prop, target);

        // Wrap nested Ember objects so sub-property reads are tracked
        if (val !== null && typeof val === 'object' && !(val instanceof Node)) {
          return wrapNestedObjectForTracking(val);
        }
        return val;
      }

      // Property has no getter — create a cell lazily for GXT tracking
      // This handles properties set via Ember's extend() which puts them
      // on the prototype as data properties (not caught by pre-installation)
      const value = Reflect.get(target, prop, target);
      // Return ALL function-valued properties directly without installing GXT cells.
      // Functions (both prototype methods and own arrow-function properties) should
      // not go through cell tracking — GXT's deepFnValue would call them immediately
      // instead of treating them as event handler references.
      if (typeof value === 'function') {
        return value;
      }

      try {
        const cell = _gxtCellFor(target, prop, /* skipDefine */ false);
        if (cell) {
          const cellVal = cell.value;
          // Wrap nested Ember objects so sub-property reads are tracked
          if (cellVal !== null && typeof cellVal === 'object' && !(cellVal instanceof Node)) {
            return wrapNestedObjectForTracking(cellVal);
          }
          return cellVal;
        }
      } catch {
        /* ignore */
      }

      // Wrap nested Ember objects for tracking even without cells
      if (value !== null && typeof value === 'object' && !(value instanceof Node)) {
        return wrapNestedObjectForTracking(value);
      }
      return value;
    },

    set(target, prop, value, _receiver) {
      // Pass target as receiver so setters run with this = instance
      return Reflect.set(target, prop, value, target);
    },
  });

  return proxy;
}

// =============================================================================
// Template Rendering
// =============================================================================

// List-marker registry. glimmer-next's SyncList/AsyncList constructor calls
// the `registerListMarker` host hook for its top/bottom and per-item markers,
// and `unregisterListMarker` on teardown. We collect those markers here so
// `removeGxtArtifacts` can SKIP stripping them.
//
// WHY: production glimmer-next builds emit empty-text comments (`api.comment()`)
// for list markers, and `removeGxtArtifacts` strips all empty comments. But the
// syncList opcode mutates DOM relative to the (still-live) top/bottom markers.
// When an each starts EMPTY inside a yielded block (e.g.
// `{{#x-wrapper}}{{#each this.list}}…{{/each}}{{/x-wrapper}}`, GH#13983),
// stripping the bottomMarker orphans it → a later pushObject inserts rows
// relative to a detached marker → nothing appears in the live DOM. Keeping the
// registered markers fixes this.
const _gxtListMarkers = new WeakSet<Comment>();
{
  const _registerMarker = (m: Comment) => {
    try {
      _gxtListMarkers.add(m);
    } catch {
      /* non-comment / frozen — skip */
    }
  };
  const _unregisterMarker = (m: Comment) => {
    try {
      _gxtListMarkers.delete(m);
    } catch {
      /* ignore */
    }
  };
  _gxtRegisterHostHooks({
    registerListMarker: _registerMarker,
    unregisterListMarker: _unregisterMarker,
  });
}

/**
 * Remove GXT internal artifacts from a DOM container:
 * - empty marker comments and `placeholder` comments (except live list markers)
 * - data-node-id attributes (gxt SSR)
 */
function removeGxtArtifacts(container: Element | DocumentFragment): void {
  // Remove placeholder comments
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT, null);

  const commentsToRemove: Comment[] = [];
  let node: Comment | null;
  while ((node = walker.nextNode() as Comment | null)) {
    const text = node.textContent || '';
    // Never strip live list top/bottom/item markers — the syncList opcode
    // mutates DOM relative to them on later updates.
    if (_gxtListMarkers.has(node)) {
      continue;
    }
    if (text.includes('placeholder') || text === '') {
      commentsToRemove.push(node);
    }
  }

  for (const comment of commentsToRemove) {
    comment.parentNode?.removeChild(comment);
  }

  // Remove data-node-id attributes from all elements
  const elements = container.querySelectorAll('[data-node-id]');
  for (const element of elements) {
    element.removeAttribute('data-node-id');
  }

  // Also check the container itself if it's an Element
  if (container instanceof Element && container.hasAttribute('data-node-id')) {
    container.removeAttribute('data-node-id');
  }
}

/**
 * A component render as it appears in the debug render tree
 * (debug-render-tree.ts), made by `_gxtDebugComponent`.
 */
interface GxtDebugComponent {
  /** The block the component renders in: its node leaves the tree with it. */
  block: object | null;
  definition: unknown;
  name: string;
  /** The component (`null` for a template-only one). */
  instance: unknown;
  /** The arguments as the component reads them; else its render context's `args`. */
  args: GxtDebugArgs | undefined;
  /**
   * The component's internal manager: one with `getDebugCustomRenderTree`
   * lists the nodes that returns instead of the component.
   */
  manager: any;
  /** The invocation: when it renders again, its previous node leaves the tree. */
  invocation: unknown;
}

// The outermost node of each invocation's last render (`GxtDebugComponent.invocation`).
const _invocationDebugNodes = new WeakMap<object, GxtDebugNode>();

/**
 * A component render for the debug render tree, `undefined` when nothing is
 * recorded now (there is no current node). `ctx` is the invocation's render
 * context (see `_gxtBlockOf`); `name` the name the component was resolved by,
 * if it was (else see `_gxtDebugName`); `named` / `positional` its arguments,
 * when the component does not read them from its render context's `args`.
 */
function _gxtDebugComponent(
  ctx: unknown,
  definition: unknown,
  instance: unknown,
  manager: any,
  invocation: unknown,
  name?: string,
  named?: object,
  positional?: ArrayLike<unknown>
): GxtDebugComponent | undefined {
  if (gxtDebugParent() === null) return undefined;
  return {
    block: _gxtBlockOf(ctx),
    definition,
    // The name it was registered by (`component:hello-world` for `<HelloWorld>`),
    // as Glimmer's resolver names it.
    name: name !== undefined ? _gxtRegistryName(name) : _gxtDebugName(definition),
    instance,
    args: named === undefined ? undefined : { positional: positional ?? [], named },
    manager,
    invocation,
  };
}

// The registry name of a component invoked by name (see `resolveComponent`):
// `foo::bar` is `foo/bar`, `FooBar` is `foo-bar`.
function _gxtRegistryName(name: string): string {
  const normalized = doubleColonToSlash(name);
  return hasUpperCase(normalized) ? pascalToKebab(normalized) : normalized;
}

/**
 * The name of a component or modifier definition in the debug render tree: the
 * name a strict-mode template's scope gives it, else what its manager calls it
 * (Glimmer's `getDebugName`), else its own name (a class's, a template-only
 * definition's).
 */
function _gxtDebugName(definition: any, managerName?: unknown): string {
  const lexical = gxtLexicalName(definition);
  if (lexical !== undefined) return lexical;
  if (typeof managerName === 'string' && managerName !== '') return managerName;
  const name = definition?.name;
  if (typeof name === 'string' && (name !== '' || typeof definition === 'function')) return name;
  return definition !== null &&
    typeof definition === 'object' &&
    typeof definition.toString === 'function'
    ? String(definition)
    : '(unknown)';
}

/**
 * A modifier as a node of the debug render tree, as Glimmer's `addModifier`
 * records it: a child of the current node (the component whose template renders
 * `element`), with `element` as its bounds. `invoked` is the definition as the
 * template invoked it; `undefined` when nothing is recorded now.
 */
function _gxtDebugModifier(
  invoked: unknown,
  manager: any,
  ModifierClass: any,
  element: Element,
  args: GxtDebugArgs,
  instance: unknown
): GxtDebugNode | undefined {
  const parent = gxtDebugParent();
  if (parent === null) return undefined;
  const managerName =
    typeof manager?.getDebugName === 'function'
      ? manager.getDebugName(ModifierClass)
      : ModifierClass?.name;
  const node = gxtCreateDebugNode(
    parent,
    'modifier',
    _gxtDebugName(invoked, managerName),
    args,
    instance
  );
  node.first = element;
  node.last = element;
  return node;
}

/**
 * The nodes of a component render (see `GxtDebugComponent`), created under the
 * current node: the component's node, or the chain of nodes its manager's
 * `getDebugCustomRenderTree` returns (each under the one before, as Glimmer
 * creates them). `current` is the node the template renders under: the last
 * node, or the current node when the manager returned none. `null` when
 * nothing is recorded now.
 */
function _gxtDebugComponentNodes(
  debug: GxtDebugComponent,
  renderContext: any
): { nodes: GxtDebugNode[]; current: GxtDebugNode } | null {
  const parent = gxtDebugParent();
  if (parent === null) return null;
  const invocation = debug.invocation;
  const isInvocation =
    invocation !== null && (typeof invocation === 'object' || typeof invocation === 'function');
  if (isInvocation) {
    const previous = _invocationDebugNodes.get(invocation as object);
    if (previous !== undefined) gxtReleaseDebugNode(previous);
  }
  const args = debug.args ?? { positional: [], named: renderContext?.args ?? {} };
  const nodes: GxtDebugNode[] = [];
  let current = parent;
  if (typeof debug.manager?.getDebugCustomRenderTree === 'function') {
    for (const custom of debug.manager.getDebugCustomRenderTree(debug.definition, null, args)) {
      current = gxtCreateDebugNode(current, custom.type, custom.name, custom.args, custom.instance);
      nodes.push(current);
    }
  } else {
    current = gxtCreateDebugNode(parent, 'component', debug.name, args, debug.instance);
    nodes.push(current);
  }
  const outermost = nodes[0];
  if (outermost !== undefined) {
    _trackDebugNode(debug.block, outermost);
    if (isInvocation) _invocationDebugNodes.set(invocation as object, outermost);
  }
  return { nodes, current };
}

/**
 * Render a template with parent view tracking and slots context. With `debug`,
 * the component is a node of the debug render tree while it renders
 * (`_gxtDebugComponentNodes`), and the nodes the template rendered into
 * `container` are its bounds.
 */
function renderTemplateWithParentView(
  template: any,
  renderContext: any,
  container: Element | DocumentFragment,
  instance: any,
  debug?: GxtDebugComponent
): any {
  // NOTE: We intentionally do NOT increment the render pass ID here.
  // The pass ID should only be incremented when starting a new top-level render transaction
  // (e.g., when the test harness calls render()). Component template renders within the same
  // transaction should share the same pass ID to maintain proper instance pooling.

  if (instance) {
    pushParentView(instance);
  }

  // Push slots onto the shared stack (compile.ts module-local, reached
  // through the bridge) for has-block checks
  const slotsStack = getGxtRenderer()?.compilePipeline.getSlotsContextStack?.();
  const slots = renderContext.$slots || renderContext[$SLOTS_SYMBOL] || {};
  if (slotsStack) {
    slotsStack.push(slots);
  }

  const debugNodes = debug === undefined ? null : _gxtDebugComponentNodes(debug, renderContext);
  let rendered = false;
  try {
    const result =
      debugNodes === null
        ? template.render(renderContext, container)
        : gxtWithDebugParent(debugNodes.current, () => template.render(renderContext, container));
    // Clean up GXT placeholder comments for cleaner DOM
    removeGxtArtifacts(container);
    if (debugNodes !== null) {
      for (const node of debugNodes.nodes) {
        node.first = container.firstChild;
        node.last = container.lastChild;
      }
    }
    rendered = true;
    return result;
  } finally {
    // A render that threw rendered nothing.
    if (!rendered && debugNodes !== null && debugNodes.nodes[0] !== undefined) {
      gxtReleaseDebugNode(debugNodes.nodes[0]);
    }
    if (slotsStack) {
      slotsStack.pop();
    }
    if (instance) {
      popParentView();
    }
  }
}

// =============================================================================
// Simple Cell/Formula (for internal manager args)
// =============================================================================

const createCell = (initialValue: any) => {
  let value = initialValue;
  return {
    get value() {
      return value;
    },
    set value(v: any) {
      value = v;
    },
  };
};

const formula = <T>(fn: () => T) => {
  const c = createCell(fn());
  return c;
};

// =============================================================================
// Component Resolution
// =============================================================================

// Cache tracking which (owner, name) pairs have already fired
// `render.getComponentDefinition` instrumentation to mirror classic Ember's
// per-owner component-definition cache. Classic Ember only fires this event
// on first resolution — subsequent resolves return a cached definition.
const _componentDefinitionInstrumentedKeys = new WeakMap<object, Set<string>>();

function _componentDefinitionInstrumentationPayload(name: string) {
  return { object: `component:${name}` };
}

function _initialRenderInstrumentationPayload(component: any) {
  return component.instrumentDetails({ initialRender: true });
}

function _rerenderInstrumentationPayload(component: any) {
  return component.instrumentDetails({ initialRender: false });
}

// Register an instrumentation wrap on the root-outlet rerender dispatcher
// that fires `render.outlet` instrumentation around every dispatcher
// invocation. The outlet re-render function is registered by
// `templates/root.ts` via `compilePipeline.setRootOutletRerender(fn)` after
// this module loads; the wrap below is applied at set-time so every
// registered dispatcher is instrumented. Every route transition that calls
// `setOutletState` invokes this function; classic Ember's
// OutletComponentManager fires `render.outlet` for each outlet re-render,
// and tests subscribe to `render` (which matches `render.outlet`) to verify
// routing instrumentation.
//
// The root-outlet-rerender instrumentation is installed at file EOF (after the
// `setGxtRenderer` call) so the bridge is available when the install invokes
// `setRootOutletRerenderWrap`. See the EOF block below for the wrap body.

function _outletRerenderInstrumentationPayload(_outletRef: any) {
  return { object: 'outlet' };
}

// Pending `render.component` finalizers for instances whose update pass has
// fired willRender but whose DOM layout update has not yet been flushed.
// Classic Ember finalizes `_instrumentStart('render.component', ...)` in
// `didUpdateLayout`; the GXT equivalent is `_gxtPostRenderHooks`, which fires
// after the DOM sync completes. We drain this queue there.
const _pendingRerenderInstrumentFinalizers: Array<() => void> = [];

function _fireRerenderInstrumentStart(component: any): void {
  if (!component || typeof component.instrumentDetails !== 'function') return;
  try {
    const finalizer = _gxtInstrumentStart(
      'render.component',
      _rerenderInstrumentationPayload,
      component
    );
    if (finalizer) _pendingRerenderInstrumentFinalizers.push(finalizer);
  } catch {
    /* ignore */
  }
}

function _drainPendingRerenderInstrumentFinalizers(): void {
  if (_pendingRerenderInstrumentFinalizers.length === 0) return;
  // Drain before calling so any nested sync doesn't double-fire.
  const list = _pendingRerenderInstrumentFinalizers.slice();
  _pendingRerenderInstrumentFinalizers.length = 0;
  for (const finalizer of list) {
    try {
      finalizer();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Resolve a component by name from the Ember registry.
 */
function resolveComponent(
  name: string,
  owner: any
): { factory: any; template: any; manager: any } | null {
  if (!owner || owner.isDestroyed || owner.isDestroying) return null;

  // Handle namespaced components: foo::bar::baz-bing -> foo/bar/baz-bing
  const normalizedName = doubleColonToSlash(name);

  // Fire `render.getComponentDefinition` instrumentation once per
  // (owner, component name). Classic Ember's resolver fires this event the
  // first time a component definition is looked up; re-renders hit the cache
  // and do NOT fire again. Tests subscribe to this event and assert count.
  let _definitionInstrumentFinalizer: (() => void) | null = null;
  try {
    let seen = _componentDefinitionInstrumentedKeys.get(owner);
    if (!seen) {
      seen = new Set<string>();
      _componentDefinitionInstrumentedKeys.set(owner, seen);
    }
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      _definitionInstrumentFinalizer = _gxtInstrumentStart(
        'render.getComponentDefinition',
        _componentDefinitionInstrumentationPayload,
        normalizedName
      );
    }
  } catch {
    /* ignore — instrumentation is best-effort */
  }

  let factory = owner.factoryFor(`component:${normalizedName}`);

  // If not found and name is PascalCase, try kebab-case.
  // GXT's runtime compiler transforms {{foo-bar}} to <FooBar /> which becomes
  // $_c("FooBar", ...). The Ember registry uses kebab-case names.
  if (!factory && hasUpperCase(normalizedName)) {
    const kebabName = pascalToKebab(normalizedName);
    factory = owner.factoryFor(`component:${kebabName}`);
  }

  // When both a class-based component and a template-only component are
  // registered (e.g., via registerComponent in tests), the resolver may return the
  // template-only one since it's checked first. If the factory is template-only,
  // also check the registry's direct registrations for a class-based component.
  if (factory?.class) {
    const cls = factory.class;
    const isTO =
      getGxtRenderer()!.compilePipeline.isTemplateOnlyDefinition!(cls) ||
      (cls as any).__templateOnly === true ||
      (cls as any).moduleName === '@glimmer/component/template-only';
    if (isTO) {
      // Check if there's a class-based component in the direct registrations.
      // In test harness's registerComponent(), both owner.register (class-based)
      // and resolver.add (template-only) are called. The resolver takes precedence
      // in Ember's registry.resolve(), hiding the class-based registration.
      // We fix this by overriding the resolve cache with the class-based class.
      const registry = (owner as any).__registry__ || (owner as any).__container__?.registry;
      const regKey = `component:${normalizedName}`;
      const directReg = registry?.registrations?.[regKey];
      if (directReg && directReg !== cls) {
        // Override the resolve cache with the class-based component
        if (registry?._resolveCache) {
          registry._resolveCache[regKey] = directReg;
        }
        // Clear the factory manager cache so factoryFor picks up the new resolve
        const container = (owner as any).__container__;
        if (container?.factoryManagerCache) {
          delete container.factoryManagerCache[regKey];
        }
        // Re-resolve with the class-based component
        factory = owner.factoryFor(regKey);
      }
    }
  }

  // Template can be:
  // 1. Set on the ComponentClass via setComponentTemplate
  // 2. Registered in the container as template:components/name
  let template = null;

  if (factory?.class) {
    template = getComponentTemplate(factory.class);
  }

  if (!template) {
    // Fallback to registry lookup
    template = owner.lookup(`template:components/${normalizedName}`);
    // Also try kebab-case for PascalCase names
    if (!template && hasUpperCase(normalizedName)) {
      const kebabName = pascalToKebab(normalizedName);
      template = owner.lookup(`template:components/${kebabName}`);
    }
  }

  if (factory || template) {
    let manager = null;
    if (factory?.class) {
      // Check internal managers ONLY on the exact class (Input, Textarea)
      manager = INTERNAL_MANAGERS.get(factory.class);

      // If not found, walk prototype chain for COMPONENT_MANAGERS only
      // (handles subclasses of setComponentManager targets like GlimmerishComponent)
      if (!manager) {
        let pointer: any = factory.class;
        while (pointer) {
          manager = COMPONENT_MANAGERS.get(pointer);
          if (manager) break;
          try {
            pointer = Object.getPrototypeOf(pointer);
          } catch {
            break;
          }
          if (pointer === Object.prototype || pointer === Function.prototype) break;
        }
      }
    }

    if (_definitionInstrumentFinalizer) {
      try {
        _definitionInstrumentFinalizer();
      } catch {
        /* ignore */
      }
    }
    return { factory, template, manager };
  }

  if (_definitionInstrumentFinalizer) {
    try {
      _definitionInstrumentFinalizer();
    } catch {
      /* ignore */
    }
  }
  return null;
}

// =============================================================================
// Helper resolution for (helper) keyword
// =============================================================================

// Forwarded props (`...attributes`, `fw[0]`) on an internal component's
// element (LinkTo, Input/Textarea), each kept current by an effect: `class`
// (key `''`) is appended to the component's own `class`; any other prop is
// set as an attribute (a bound URL attribute sanitized, as Glimmer does), or
// removed when it is nullish or `false`.
function _forwardPropsToElement(el: HTMLElement, props: any[], instance: any): void {
  for (const [key, value] of props) {
    const attrKey = key === '' ? 'class' : key;
    if (attrKey === 'class') {
      _gxtEffect(() => {
        const resolved = typeof value === 'function' ? value() : value;
        const baseClass = instance.class || '';
        el.className = resolved ? baseClass + ' ' + resolved : baseClass;
      });
    } else {
      _gxtEffect(() => {
        const resolved = _forwardedAttrValue(el, attrKey, value);
        if (resolved !== undefined && resolved !== null && resolved !== false) {
          el.setAttribute(attrKey, String(resolved));
        } else {
          el.removeAttribute(attrKey);
        }
      });
    }
  }
}

// The current value of a forwarded attribute entry (`fw[0]` / `fw[1]`): a
// bound (function) value is read and, for a URL attribute, sanitized as
// Glimmer sanitizes a dynamic attribute; a static value is written as
// authored, as Glimmer writes a static one.
function _forwardedAttrValue(el: Element, key: string, value: unknown): unknown {
  return typeof value === 'function' ? sanitizedAttrValue(el, key, value()) : value;
}

// Forwarded events (`fw[2]`): an ON_CREATED entry (event name `'0'`) is a
// modifier, run in an effect owned by `owner` so its dependencies are tracked
// and it re-runs reactively; the rest are listeners. As in gxt's own
// ON_CREATED binding, a re-run first calls the destructor the previous run
// returned, so the modifier manager updates the installed modifier
// (`_modifierSlot`) instead of installing another one.
function _forwardEventsToElement(el: HTMLElement, events: any[], owner: object): void {
  for (const [eventName, handler] of events) {
    if (typeof handler === 'function') {
      if (eventName === '0') {
        let destructor: unknown;
        _gxtEffectWithOwner(owner, () => {
          if (typeof destructor === 'function') destructor();
          destructor = (handler as any)(el);
        });
      } else {
        el.addEventListener(eventName, handler);
      }
    }
  }
}

// Append a function slot item to `parent`. A node thunk (the compiler marks
// every component-child DOM producer with `$_isNode`) is called and its node,
// or a fragment's children, appended. Any other function is a reactive text
// getter: a text node kept current by an effect. A node thunk that throws or
// returns no node is treated as a text getter too.
function _appendSlotFunctionItem(parent: Node, item: Function): void {
  if ((item as any).$_isNode === true) {
    let evaluated: any;
    try {
      evaluated = item();
    } catch {
      evaluated = null;
    }
    if (evaluated instanceof Node) {
      // A fragment's children move on append: snapshot them first.
      if (evaluated.nodeType === 11 /* DocumentFragment */) {
        const kids = Array.from(evaluated.childNodes);
        for (const k of kids) parent.appendChild(k);
      } else {
        parent.appendChild(evaluated);
      }
      return;
    }
  }
  const textNode = document.createTextNode('');
  _gxtEffect(() => {
    const val = item();
    textNode.textContent = val == null ? '' : String(val);
  });
  parent.appendChild(textNode);
}

// `fn()` outside any tracking frame, so its reads add no dependency to the
// formula being evaluated.
function _untracked<T>(fn: () => T): T {
  const saved = _gxtGetTracker();
  _gxtSetTracker(null);
  try {
    return fn();
  } finally {
    _gxtSetTracker(saved);
  }
}

// A helper argument as GXT passes it: a getter thunk (no prototype) is read;
// helper and class values (with a prototype) pass through.
function _unwrapHelperArg(v: any): any {
  return typeof v === 'function' && !v.prototype ? v() : v;
}

function _helperPositionalArgs(params: any): any[] {
  return Array.isArray(params) ? params.map(_unwrapHelperArg) : [];
}

// Named helper args without GXT's internal keys (`$_…`, `hash`), unwrapped.
function _helperNamedArgs(hash: any): Record<string, any> {
  return hash && typeof hash === 'object'
    ? Object.fromEntries(
        Object.entries(hash)
          .filter(([k]) => !(k.startsWith('$_') || k === 'hash'))
          .map(([k, v]: [string, any]) => [k, _unwrapHelperArg(v)])
      )
    : {};
}

// A helper-manager delegate's `capabilities` must come from `capabilities()`.
function _assertHelperDelegateCapabilities(delegate: any): void {
  if (delegate && delegate.capabilities && !FROM_CAPABILITIES.has(delegate.capabilities)) {
    throw new Error(
      capabilitiesErrorPrefix('helper') +
        `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
    );
  }
}

// `(helper …)` for a helper whose manager delegate has a value: the bucket is
// created by the first call, and each call of the curried function updates its
// args object in place before `getValue`, so the helper instance stays stable
// (its tracked state re-renders, `getValue` counts are per instance). An
// invocation that owns its helper (a content binding) creates its own instance
// instead (`__gxtHelperInstance`). `createHelper` and `getValue` run in a
// backtracking frame.
function _curryDelegateHelper(delegate: any, definition: any, params: any, hash: any): any {
  const curriedPositionals = _helperPositionalArgs(params);
  const curriedNamed = _helperNamedArgs(hash);
  const reactiveArgs: { positional: any[]; named: Record<string, any> } = {
    positional: [...curriedPositionals],
    named: { ...curriedNamed },
  };
  // The helper instance the calls of the curried value read, created by the
  // first call (Glimmer creates a helper when it is invoked).
  let bucket: any;
  let created = false;
  const curried = function __emberCurriedHelper(additionalParams?: any[], additionalHash?: any) {
    const newPositional = [...curriedPositionals, ..._helperPositionalArgs(additionalParams)];
    const newNamed = { ...curriedNamed, ..._helperNamedArgs(additionalHash) };
    reactiveArgs.positional = newPositional;
    reactiveArgs.named = newNamed;
    beginBacktrackingFrame();
    try {
      if (!created) {
        created = true;
        bucket = delegate.createHelper(definition, reactiveArgs);
      }
      return delegate.getValue(bucket);
    } finally {
      endBacktrackingFrame();
    }
  };
  (curried as any).__isEmberCurriedHelper = true;
  // A helper instance with the curried arguments (and `positional` / `named`
  // after them) for an invocation that owns it.
  (curried as any).__gxtHelperInstance = (positional: any[] = [], named: object = {}) =>
    _gxtCreateHelperInstance(delegate, definition, {
      positional: [...curriedPositionals, ...positional],
      named: { ...curriedNamed, ...named },
    });
  return curried;
}

/**
 * An instance of a helper that an invocation owns, as Glimmer's dynamic
 * helper invocation owns the helper it creates for its value: compile.ts's
 * content binding creates it for a helper value and destroys it when the
 * value changes or the binding's block goes.
 */
export interface GxtHelperInstance {
  value(): unknown;
  destroy(): void;
}

// Creates the helper of `definition` through its delegate, with `args`. Its
// destroyable is also destroyed at test teardown, as the helpers `$_maybeHelper`
// creates, if its invocation did not destroy it before.
function _gxtCreateHelperInstance(
  delegate: any,
  definition: any,
  args: { positional: any[]; named: Record<string, any> }
): GxtHelperInstance {
  let bucket: any;
  beginBacktrackingFrame();
  try {
    bucket = delegate.createHelper(definition, args);
  } finally {
    endBacktrackingFrame();
  }
  const destroyable =
    delegate.capabilities?.hasDestroyable && typeof delegate.getDestroyable === 'function'
      ? delegate.getDestroyable(bucket)
      : null;
  if (destroyable) getGxtRenderer()?.compilePipeline.pushHelperInstance?.(destroyable);
  return {
    value() {
      beginBacktrackingFrame();
      try {
        return delegate.getValue(bucket);
      } finally {
        endBacktrackingFrame();
      }
    },
    destroy() {
      if (destroyable) _destroyDestroyable(destroyable);
    },
  };
}

// `(helper …)` for a helper that is a function of `(positional, named)`. The
// curried function exposes `__resolvedFn` and its curried args, so a further
// `(helper curried …)` can extend them.
function _curryFnHelper(
  resolvedFn: (positional: any[], named: any) => any,
  params: any,
  hash: any
): any {
  const curriedPositionals = _helperPositionalArgs(params);
  const curriedNamed = _helperNamedArgs(hash);
  const curried = function __emberCurriedHelper(additionalParams?: any[], additionalHash?: any) {
    const mergedPositional = [...curriedPositionals, ..._helperPositionalArgs(additionalParams)];
    const mergedNamed = { ...curriedNamed, ..._helperNamedArgs(additionalHash) };
    return resolvedFn(mergedPositional, mergedNamed);
  };
  (curried as any).__isEmberCurriedHelper = true;
  (curried as any).__resolvedFn = resolvedFn;
  (curried as any).__curriedPositionals = curriedPositionals;
  (curried as any).__curriedNamed = curriedNamed;
  return curried;
}

/**
 * Resolve an Ember helper by name to a callable function.
 * Returns (positional, named) => value, or null if not found.
 */
function _resolveEmberHelper(
  name: string,
  owner: any
): ((positional: any[], named: any) => any) | null {
  if (!owner || owner.isDestroyed || owner.isDestroying) return null;

  // First check built-in keyword helpers
  const BUILTIN_HELPERS = getGxtRenderer()?.compilePipeline.getBuiltinHelpers?.();
  if (BUILTIN_HELPERS && BUILTIN_HELPERS[name]) {
    const builtinHelper = BUILTIN_HELPERS[name];
    if (typeof builtinHelper === 'function') {
      return (positional: any[]) => builtinHelper(...positional);
    }
  }

  const factory = owner.factoryFor?.(`helper:${name}`);
  if (factory) {
    const definition = factory.class || factory;
    const internalManager = getInternalHelperManager(definition);
    if (internalManager) {
      if (typeof internalManager.getDelegateFor === 'function') {
        const delegate = internalManager.getDelegateFor(owner);
        if (delegate && typeof delegate.createHelper === 'function') {
          if (delegate.capabilities?.hasValue) {
            return (positional: any[], named: any) => {
              const args = { positional, named: named || {} };
              const bucket = delegate.createHelper(definition, args);
              return delegate.getValue(bucket);
            };
          }
        }
      }
      if (typeof internalManager.getHelper === 'function') {
        return (positional: any[], named: any) => {
          // getHelper() returns a Reference (to match stock Glimmer VM
          // contract). Unwrap to the raw value for GXT's helper-value call
          // sites via `.value` (or direct return for primitives).
          const maybeRef = internalManager.getHelper(definition)(
            { positional, named: named || {} },
            owner
          );
          if (maybeRef != null && typeof maybeRef === 'object' && 'value' in maybeRef) {
            return (maybeRef as any).value;
          }
          return maybeRef;
        };
      }
    }

    // Direct function call
    if (typeof definition === 'function') {
      return (positional: any[], named: any) => {
        try {
          return definition(positional, named || {});
        } catch (e) {
          if (_isAssertionLike(e)) throw e;
          return undefined;
        }
      };
    }

    // Factory create (classic Helper.extend)
    return (positional: any[], named: any) => {
      try {
        const instance = factory.create();
        if (instance && typeof instance.compute === 'function') {
          return instance.compute(positional, named || {});
        }
      } catch (e) {
        if (_isAssertionLike(e)) throw e; /* ignore */
      }
      return undefined;
    };
  }

  // Fallback: direct lookup
  const maybeHelper = owner.lookup?.(`helper:${name}`);
  if (maybeHelper != null) {
    if (typeof maybeHelper.compute === 'function') {
      return (positional: any[], named: any) => maybeHelper.compute(positional, named || {});
    }
    if (typeof maybeHelper === 'function') {
      return (positional: any[], named: any) => maybeHelper(positional, named || {});
    }
  }

  return null;
}

// =============================================================================
// $_MANAGERS Implementation
// =============================================================================

// Cache the last known owner so reactive re-evaluations (when the ambient owner
// may be null) can still resolve components and helpers.
let _cachedManagerOwner: any = null;
export function getOwnerWithFallback(): any {
  const current = getAmbientOwner();
  if (current && !current.isDestroyed && !current.isDestroying) {
    _cachedManagerOwner = current;
    return current;
  }
  if (
    _cachedManagerOwner &&
    (_cachedManagerOwner.isDestroyed || _cachedManagerOwner.isDestroying)
  ) {
    _cachedManagerOwner = null;
  }
  return current || _cachedManagerOwner;
}

// compile.ts imports getOwnerWithFallback directly to use the shared owner
// cache during reactive re-evaluations when the ambient owner is null.

// Run a modifier manager's install or update hook. They are Glimmer's commit:
// a cell they write while the sync re-executes the changed bindings is
// rendered by another pass of that sync (compile.ts `_gxtRevalidate`).
function _modifierCommit<T>(fn: () => T): T {
  const withCommit = getGxtRenderer()?.compilePipeline.withModifierCommit;
  return withCommit ? withCommit(fn) : fn();
}

// The cache slot of one modifier invocation on an element (see
// `$_MANAGERS.modifier._cache`). Every invocation of a modifier owns a slot:
// the first one of `name` on the element is `name`, the next ones are
// `name#1`, `name#2`, ... A slot whose modifier is pending destroy belongs to
// an invocation that is re-running (gxt calls the destructor the previous run
// returned, then the modifier again), so it is returned with its record, for
// the update path. Otherwise the call is a new invocation, and a free slot is
// returned without a record.
function _modifierSlot(
  elCache: Map<string, any> | undefined,
  name: string
): { key: string; cached: any } {
  let freeKey: string | undefined;
  // `size + 1` keys always include a free one.
  const last = elCache === undefined ? 0 : elCache.size;
  for (let i = 0; i <= last; i++) {
    const key = i === 0 ? name : `${name}#${i}`;
    const cached = elCache?.get(key);
    if (cached === undefined) {
      if (freeKey === undefined) freeKey = key;
    } else if (cached.pendingDestroy) {
      return { key, cached };
    }
  }
  return { key: freeKey!, cached: undefined };
}

// The arguments of one evaluation of a modifier invocation, which the args
// object of the installed modifier reads (see `buildLazyArgs`).
interface _ModifierArgSource {
  props: any[];
  hash: Record<string, any>;
}

// The args object a template-only component's template reads as `@name`.
//
// gxt's `$_args` hands a component an argument as a thunk value
// (`{ value: () => this.greet }`). The args proxy of a component rendered by
// name (`createRenderContext`) reads such a thunk, but a template-only
// definition rendered here (invoked through a path, `<this.Apply … />` or
// `{{component this.Apply …}}`, or curried and then invoked) got the object as
// it was, so `@value` was the thunk instead of the argument's value. A content
// mustache calls a function and rendered the value, but a modifier
// (`<div {{@value "x"}}>`), a helper call (`{{@value "x"}}`) or an `{{on}}`
// handler got the thunk, so the modifier was never installed and the helper
// never ran. Glimmer reads `@value` from the argument's reference whatever
// invoked the component.
//
// Here such a thunk becomes a getter that reads it, through the argument's
// value slot (see `_argValueSlot`), as the by-name args proxy reads it. Getters,
// other values (a `(fn …)`, a mut cell, a curried helper or component, a class),
// gxt's internal keys and non-enumerable or symbol keys are kept as they are.
function _templateOnlyArgs(args: any): any {
  const tplArgs: any = {};
  for (const key of Reflect.ownKeys(args)) {
    const desc = Object.getOwnPropertyDescriptor(args, key);
    if (desc === undefined) continue;
    const thunk = desc.value;
    if (
      typeof key === 'string' &&
      desc.enumerable === true &&
      !key.startsWith('$') &&
      !_isGxtInternalArgKey(key) &&
      typeof thunk === 'function' &&
      !thunk.prototype &&
      !thunk.__isFnHelper &&
      !thunk.__isMutCell &&
      !thunk.__isEmberCurriedHelper &&
      !thunk.__isCurriedComponent
    ) {
      Object.defineProperty(tplArgs, key, {
        get: _argValueGetter(_argValueSlot(tplArgs, key), thunk),
        enumerable: true,
        configurable: true,
      });
    } else {
      Object.defineProperty(tplArgs, key, desc);
    }
  }
  return tplArgs;
}

// The render of an `(element "tag")` definition (the `element` helper of
// `@ember/helper`, branded `__isElementHelperDefinition` in GXT builds):
// Glimmer renders the invocation's block in a `<tag>` element that has the
// invocation's attributes (`<tag ...attributes>{{yield}}</tag>`), and the block
// alone for an empty tag name. The element is created as a template's own
// element is (`createElementWithContent` over gxt's `$_tag`), in the
// invocation's render context.
function _renderElementHelperDefinition(
  definition: { tagName: string },
  args: any,
  fw: any,
  ctx: any
): () => unknown {
  const slots = args?.[$SLOTS_SYMBOL] || args?.$slots || args?.args?.[$SLOTS_SYMBOL];
  const block = typeof slots?.default === 'function' ? slots.default : null;
  return () => {
    const rendered = block === null ? [] : block(ctx);
    const content = Array.isArray(rendered) ? rendered : [rendered];
    if (!definition.tagName) return content;
    return getGxtRenderer()!.compilePipeline.createElementWithContent!(
      _gxtTag,
      definition.tagName,
      _gxtFwTuple(args, fw),
      ctx,
      content
    );
  };
}

// Render a template-only component's template (`tpl`, a template or a factory
// of one for `owner`) with the invocation's `args` and forwarded attributes
// (`fw`) into a fragment; `null` when there is no template to render. `debug`
// is the render in the debug render tree (see `GxtDebugComponent`).
function _renderTemplateOnlyComponent(
  tpl: any,
  args: any,
  fw: any,
  owner: any,
  debug?: GxtDebugComponent
): any {
  let resolvedTpl = tpl;
  if (typeof resolvedTpl === 'function' && !resolvedTpl.render) {
    resolvedTpl = resolvedTpl(owner);
  }
  if (!resolvedTpl?.render) return null;
  const tplArgs = args ? _templateOnlyArgs(args) : {};
  const renderCtx: any = {};
  for (const key of Object.keys(tplArgs)) {
    if (key === 'args' || key.startsWith('$')) continue;
    const desc = Object.getOwnPropertyDescriptor(tplArgs, key);
    if (desc) {
      Object.defineProperty(renderCtx, key, desc);
    }
  }
  renderCtx.args = tplArgs;
  renderCtx.owner = owner;
  // Pass through slots for {{yield}} support: gxt's args carry them under the
  // slots symbol, the dynamic-component path (`$_dc_ember`) as `$slots`.
  const slots = args?.[$SLOTS_SYMBOL] || args?.$slots || args?.args?.[$SLOTS_SYMBOL];
  if (slots) {
    renderCtx.$slots = slots;
    renderCtx[$SLOTS_SYMBOL] = slots;
  }
  // Forward the splat-attrs (parent's tagProps `[props, attrs, events]`) into
  // `renderCtx.$fw` so the GXT-emitted template body's free `$fw` references
  // resolve to the invoker's forwarded attrs, e.g. so `<Inner @arg={...}
  // class="x">` → child template's `<Tag id="y" ...attributes>` inherits the
  // parent's `class="x"`. Mirrors the `$fw` assignment in `createRenderContext`.
  const propsFromArgs = args?.[$PROPS_SYMBOL];
  renderCtx.$fw = (Array.isArray(fw) ? fw : null) ||
    (Array.isArray(propsFromArgs) ? propsFromArgs : null) || [[], [], []];
  const container = document.createDocumentFragment();
  renderTemplateWithParentView(resolvedTpl, renderCtx, container, null, debug);
  return container;
}

const $_MANAGERS = {
  component: {
    canHandle(komp: any): boolean {
      // Handle CurriedComponent (duck-type check)
      if (komp && komp.__isCurriedComponent) {
        return true;
      }

      // Handle string component names
      if (typeof komp === 'string') {
        // EmberHtmlRaw is always handled (triple-stache)
        if (komp === 'ember-html-raw') return true;
        const owner = getOwnerWithFallback();
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          // Strip curly-c- prefix added by Vite plugin's transformCurlyComponents
          const strippedKomp = komp.startsWith('curly-c-') ? komp.slice(8) : komp;
          const resolved = resolveComponent(strippedKomp, owner);
          if (resolved !== null) return true;
          // Convert PascalCase to kebab-case for helper lookup
          let kebab = pascalToKebab(strippedKomp);
          // Also check for helpers — inline curlies like {{my-helper "foo"}} get
          // transformed to <MyHelper @__pos0__="foo" /> which GXT compiles as $_c.
          try {
            if (owner.factoryFor(`helper:${kebab}`) || owner.lookup(`helper:${kebab}`)) {
              return true;
            }
          } catch {
            /* ignore destroyed owner errors */
          }
        }
        return false;
      }

      // Handle wrapped component functions from $_componentHelper or $_dc_ember
      if (typeof komp === 'function' && komp.__stringComponentName) {
        return true;
      }

      // Handle component classes/factories
      if (INTERNAL_MANAGERS.has(komp)) {
        return true;
      }
      if (COMPONENT_MANAGERS.has(komp)) {
        return true;
      }
      // Walk prototype chain for INTERNAL_MANAGERS (e.g., TemplateOnlyComponentDefinition
      // instances where the manager is set on the prototype via setInternalComponentManager)
      if (komp !== null && komp !== undefined && typeof komp === 'object') {
        let proto = Object.getPrototypeOf(komp);
        while (proto && proto !== Object.prototype) {
          if (INTERNAL_MANAGERS.has(proto)) return true;
          if (COMPONENT_MANAGERS.has(proto)) return true;
          proto = Object.getPrototypeOf(proto);
        }
      }
      // Also check for component templates set directly on the object.
      // Unwrap Proxy if needed — GXT's cell tracking wraps objects in Proxies,
      // but setComponentTemplate stores templates keyed by the original object.
      if (COMPONENT_TEMPLATES.has(komp) || COMPONENT_TEMPLATES.has(_proxyToRaw.get(komp) || komp)) {
        return true;
      }
      if (komp?.create && typeof komp.create === 'function') {
        return true;
      }
      // A class whose custom component manager comes from a base class (a
      // @glimmer/component subclass, with a class-body `<template>` or a
      // registered template, own or inherited).
      if (typeof komp === 'function' && _customComponentManagerFactory(komp) !== undefined) {
        return true;
      }
      return false;
    },

    handle(komp: any, args: any, fw: any, ctx: any): any {
      // Prefer the curried component's captured owner (set at creation time)
      // over the cached fallback, which may be stale from a different test.
      const curriedOwner = komp && komp.__isCurriedComponent && komp.__owner;
      const validCurriedOwner =
        curriedOwner && !curriedOwner.isDestroyed && !curriedOwner.isDestroying
          ? curriedOwner
          : null;
      const owner = validCurriedOwner || getOwnerWithFallback() || (ctx && ctx.owner);

      // Handle CurriedComponent — merge curried args with invocation args
      if (komp && komp.__isCurriedComponent) {
        // Build merged args: curried args are defaults, invocation args override
        const mergedArgs: any = {};

        // If we have a live componentGetter (from $_dc_ember), use it to create
        // getters that read from the LATEST curried component's args.
        const dcGetter = getDcComponentGetter();

        // Copy curried named args as lazy getters.
        // Read from cArgs[key] to see in-place updates.
        // Also use dcGetter when available for $_dc-rendered components.
        const cArgs = komp.__curriedArgs || {};
        for (const key of Object.keys(cArgs)) {
          if (dcGetter) {
            // Dynamic getter: reads from the LATEST curried component via $_dc getter
            Object.defineProperty(mergedArgs, key, {
              get: () => {
                let latest: any;
                try {
                  latest = dcGetter();
                } catch {
                  latest = null;
                }
                if (latest && latest.__isCurriedComponent) {
                  const latestVal = latest.__curriedArgs?.[key];
                  return typeof latestVal === 'function' && !latestVal.__isCurriedComponent
                    ? latestVal()
                    : latestVal;
                }
                // Fallback: read from cArgs[key] for in-place updates
                const value = cArgs[key];
                return typeof value === 'function' && !(value as any).__isCurriedComponent
                  ? (value as any)()
                  : value;
              },
              enumerable: true,
              configurable: true,
            });
          } else {
            Object.defineProperty(mergedArgs, key, {
              get: () => {
                const value = cArgs[key];
                return typeof value === 'function' && !(value as any).__isCurriedComponent
                  ? (value as any)()
                  : value;
              },
              enumerable: true,
              configurable: true,
            });
          }
        }

        // Store curried named arg getters for mut source lookup.
        // The original getter (cArgs[key]) may have __mutParentCtx.
        const curriedMutSources: Record<string, Function> = {};
        for (const key of Object.keys(cArgs)) {
          const val = cArgs[key];
          if (
            typeof val === 'function' &&
            !val.__isCurriedComponent &&
            (val as any).__mutParentCtx
          ) {
            curriedMutSources[key] = val;
          }
        }
        if (Object.keys(curriedMutSources).length > 0) {
          mergedArgs.__mutArgSources = {
            ...(mergedArgs.__mutArgSources || {}),
            ...curriedMutSources,
          };
        }

        // Copy invocation args (these override curried args). Configurable, so
        // the positional arguments below can be moved.
        if (args) {
          for (const key of Object.keys(args)) {
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(mergedArgs, key, { ...desc, configurable: true });
            }
          }
          // Also copy non-enumerable GXT internal properties that are needed
          // for rendering ($slots, __thunkId). Note: skip $_scope to avoid
          // creating circular references (it will be set during rendering).
          for (const internalKey of ['$slots', '__thunkId']) {
            if (internalKey in args && !(internalKey in mergedArgs)) {
              mergedArgs[internalKey] = args[internalKey];
            }
          }
        }

        // Handle curried positional params. As in Glimmer (the curried
        // positional arguments are prepended to the invocation's,
        // `args.positional.prepend`), the curried ones come first and the
        // invocation's follow them.
        const cPositionals = komp.__curriedPositionals || [];
        if (cPositionals.length > 0) {
          const invocationPosCount =
            typeof mergedArgs.__posCount__ === 'function'
              ? mergedArgs.__posCount__()
              : mergedArgs.__posCount__;
          const invocationCount = typeof invocationPosCount === 'number' ? invocationPosCount : 0;
          // Move the invocation's positional arguments after the curried ones,
          // the last one first.
          for (let i = invocationCount - 1; i >= 0; i--) {
            const desc = Object.getOwnPropertyDescriptor(mergedArgs, `__pos${i}__`);
            delete mergedArgs[`__pos${i}__`];
            if (desc) {
              Object.defineProperty(mergedArgs, `__pos${cPositionals.length + i}__`, desc);
            }
          }
          // Also store raw getters for mut support
          const posSourceGetters: any[] = [];
          for (let i = 0; i < cPositionals.length; i++) {
            const val = cPositionals[i];
            const posIdx = i;
            if (dcGetter) {
              Object.defineProperty(mergedArgs, `__pos${i}__`, {
                get: () => {
                  let latest: any;
                  try {
                    latest = dcGetter();
                  } catch {
                    latest = null;
                  }
                  if (latest && latest.__isCurriedComponent) {
                    const latestPos = latest.__curriedPositionals;
                    if (latestPos && posIdx < latestPos.length) {
                      const lv = latestPos[posIdx];
                      return typeof lv === 'function' && !lv.__isCurriedComponent ? lv() : lv;
                    }
                  }
                  const pv = cPositionals[posIdx];
                  return typeof pv === 'function' && !pv.__isCurriedComponent ? pv() : pv;
                },
                enumerable: true,
                configurable: true,
              });
            } else {
              Object.defineProperty(mergedArgs, `__pos${i}__`, {
                get: () => {
                  const pv = cPositionals[posIdx];
                  return typeof pv === 'function' && !pv.__isCurriedComponent ? pv() : pv;
                },
                enumerable: true,
                configurable: true,
              });
            }
            // Store the raw getter for mut to use as a setter source
            if (typeof val === 'function' && !val.__isCurriedComponent) {
              posSourceGetters[i] = val;
            }
          }
          Object.defineProperty(mergedArgs, '__posCount__', {
            value: cPositionals.length + invocationCount,
            enumerable: true,
            configurable: true,
            writable: true,
          });
          // Store positional source getters for mut support
          if (posSourceGetters.length > 0) {
            mergedArgs.__posSourceGetters = posSourceGetters;
          }
        }
        const resolvedKomp = komp.__name;
        // Temporarily ensure the ambient owner is set for the recursive call,
        // so dash-prefixed components (e.g., "-inner-component") can be resolved.
        // Use the curried component's captured owner if the current ambient owner
        // is null or destroyed — this handles reactive re-evaluations correctly.
        const prevOwner = getAmbientOwner();
        const resolveOwner =
          prevOwner && !prevOwner.isDestroyed && !prevOwner.isDestroying ? prevOwner : owner;
        if (resolveOwner && resolveOwner !== prevOwner) {
          setAmbientOwner(resolveOwner);
        }
        // Propagate the per-render dc-capture callback through the recursive
        // handle() call so renderClassicComponent / renderGlimmerComponent can
        // fire it for the underlying component instance.
        const _outerDcCap = args && (args as any).__gxtDcCapture;
        if (typeof _outerDcCap === 'function') {
          Object.defineProperty(mergedArgs, '__gxtDcCapture', {
            value: _outerDcCap,
            configurable: true,
            enumerable: false,
            writable: true,
          });
        }
        try {
          const result = this.handle(resolvedKomp, mergedArgs, fw, ctx);
          return result;
        } finally {
          if (resolveOwner !== prevOwner) {
            setAmbientOwner(prevOwner);
          }
        }
      }

      // Handle wrapped component functions from $_componentHelper
      if (typeof komp === 'function' && komp.__stringComponentName) {
        // Create a CurriedComponent from the wrapped function
        const wrappedArgs: Record<string, any> = {};
        // The wrapped function merges its hash into passed args when called
        // We need to extract the hash. Call it with an empty object to get the curried args.
        const tempArgs: any = {};
        komp(tempArgs);
        // Now tempArgs has the curried named args
        for (const [key, value] of Object.entries(tempArgs)) {
          wrappedArgs[key] = value;
        }
        if (args) {
          for (const key of Object.keys(args)) {
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(wrappedArgs, key, desc);
            }
          }
        }
        // Temporarily ensure the ambient owner is set for the recursive call
        const prevOwner2 = getAmbientOwner();
        if (!prevOwner2 && owner) {
          setAmbientOwner(owner);
        }
        // Propagate the per-render dc-capture callback through the recursive
        // handle() call (see CurriedComponent branch above for rationale).
        const _outerDcCap2 = args && (args as any).__gxtDcCapture;
        if (typeof _outerDcCap2 === 'function') {
          Object.defineProperty(wrappedArgs, '__gxtDcCapture', {
            value: _outerDcCap2,
            configurable: true,
            enumerable: false,
            writable: true,
          });
        }
        try {
          const result = this.handle(komp.__stringComponentName, wrappedArgs, fw, ctx);
          return result;
        } finally {
          if (!prevOwner2 && owner) {
            setAmbientOwner(prevOwner2);
          }
        }
      }

      // EmberHtmlRaw — triple-stache {{{expr}}} compiled as <EmberHtmlRaw @value={{expr}} />
      // Returns a getter function marked __htmlRaw for reactive innerHTML updates
      if (komp === 'ember-html-raw') {
        // Capture the raw getter from args to preserve reactivity.
        // Accessing args.value directly evaluates the getter and loses reactivity.
        const desc = args ? Object.getOwnPropertyDescriptor(args, 'value') : null;
        const rawGetter = desc?.get || (() => args?.value);

        const htmlGetter = () => {
          // Call the getter each time to get the current reactive value
          const raw = rawGetter();
          const actual = typeof raw === 'function' ? raw() : raw;
          if (actual == null) return '';
          return actual?.toHTML?.() ?? String(actual);
        };
        (htmlGetter as any).__htmlRaw = true;
        return htmlGetter;
      }

      // Handle string-based component lookup
      if (typeof komp === 'string') {
        // Strip curly-c- prefix added by Vite plugin's transformCurlyComponents
        const isCurlyInvocation = komp.startsWith('curly-c-');
        const resolvedKomp = isCurlyInvocation ? komp.slice(8) : komp;
        const result = handleStringComponent(resolvedKomp, args, fw, ctx, owner);
        if (result !== null) return result;

        // Helper fallback — inline curlies like {{my-helper "foo"}} get transformed
        // to <MyHelper @__pos0__="foo" /> and compiled as $_c("my-helper", ...).
        // Resolve as helper if component wasn't found.
        //
        // EXCEPT: block form `{{#some-helper}}...{{/some-helper}}` is illegal in
        // Ember — helpers cannot accept blocks. When slots are present, fall
        // through to the "component not found" error path instead of invoking
        // the helper silently. Detect this by checking args.$slots /
        // args[$SLOTS_SYMBOL] / args.default (the block body function).
        let hasBlockSlot = false;
        if (args && typeof args === 'object') {
          const slotsObj = (args as any).$slots || (args as any)[$SLOTS_SYMBOL];
          if (slotsObj && typeof slotsObj === 'object') {
            if (
              typeof slotsObj.default === 'function' ||
              typeof slotsObj.inverse === 'function' ||
              typeof slotsObj.else === 'function'
            ) {
              hasBlockSlot = true;
            }
          }
          if (!hasBlockSlot && typeof (args as any).default === 'function') {
            hasBlockSlot = true;
          }
          // $_args places the slots object on the args symbol set. Walk symbol keys.
          if (!hasBlockSlot) {
            try {
              const syms = Object.getOwnPropertySymbols(args);
              for (const sym of syms) {
                const val = (args as any)[sym];
                if (
                  val &&
                  typeof val === 'object' &&
                  (typeof val.default === 'function' ||
                    typeof val.inverse === 'function' ||
                    typeof val.else === 'function')
                ) {
                  hasBlockSlot = true;
                  break;
                }
              }
            } catch {
              /* ignore */
            }
          }
        }
        // If block slot is present AND the name resolves to a helper (not a
        // component), this is an illegal `{{#helper-name}}...{{/helper-name}}`
        // invocation. Throw the expected Ember error immediately.
        if (hasBlockSlot && owner) {
          try {
            const helperName = pascalToKebab(resolvedKomp);
            const hf = owner.factoryFor?.(`helper:${helperName}`);
            const hl = !hf ? owner.lookup?.(`helper:${helperName}`) : null;
            if (hf || hl) {
              throw new GxtHelperAsBlockError(
                `Attempted to resolve \`${helperName}\`, which was expected to be a component, but nothing was found.`
              );
            }
          } catch (e) {
            if (e instanceof GxtHelperAsBlockError) throw e;
            // Other lookup errors: fall through to normal flow.
          }
        }
        if (owner && !hasBlockSlot) {
          try {
            // Convert PascalCase to kebab-case for helper lookup
            const helperName = pascalToKebab(resolvedKomp);
            const helperFactory = owner.factoryFor(`helper:${helperName}`);
            const helperLookup = !helperFactory ? owner.lookup(`helper:${helperName}`) : null;
            if (helperFactory || helperLookup) {
              // Reconstruct positional args from @__pos*__ named args
              const positional: any[] = [];
              const named: Record<string, any> = {};
              const posCount =
                typeof args?.__posCount__ === 'function' ? args.__posCount__() : args?.__posCount__;
              if (posCount > 0) {
                for (let i = 0; i < posCount; i++) {
                  const val = args[`__pos${i}__`];
                  positional.push(typeof val === 'function' ? val() : val);
                }
              }
              // Collect regular named args (skip internal @__pos*__ and $-prefixed)
              if (args) {
                for (const key of Object.keys(args)) {
                  if (!key.startsWith('__') && !key.startsWith('$')) {
                    const val = args[key];
                    named[key] = typeof val === 'function' ? val() : val;
                  }
                }
              }

              // Use $_maybeHelper to invoke the helper through Ember's protocol.
              // Wrap the result in a getter function so GXT can render it as a text node.
              // The component manager's handle() must return a function (not a raw value),
              // because GXT expects component results to be renderable.
              const maybeHelper = (globalThis as any).$_maybeHelper;
              if (typeof maybeHelper === 'function') {
                // Temporarily ensure the ambient owner is set so $_maybeHelper can resolve
                const prevOwnerH = getAmbientOwner();
                if (!prevOwnerH && owner) {
                  setAmbientOwner(owner);
                }
                let helperResult: any;
                try {
                  helperResult = maybeHelper(helperName, positional, named, ctx);
                } finally {
                  if (!prevOwnerH && owner) {
                    setAmbientOwner(prevOwnerH);
                  }
                }
                // Return a getter so GXT renders the value as text
                return () => {
                  const val = helperResult;
                  if (val == null) return '';
                  return String(val);
                };
              }
            }
          } catch {
            /* ignore errors */
          }
        }

        // Custom element fallback: names containing a dash that are not registered
        // as components or helpers should render as plain HTML custom elements.
        // EXCEPT: explicit curly-block invocation `{{#name}}...{{/name}}` against
        // an unresolved name must throw — classic Ember rejects this form because
        // a block body is not meaningful for a raw custom element. Angle-bracket
        // and inline-curly call sites still fall through to custom elements.
        if (isCurlyInvocation && hasBlockSlot) {
          const notFoundErr = new Error(
            `Attempted to resolve \`${resolvedKomp}\`, which was expected to be a component, but nothing was found. ` +
              `Could not find component named "${resolvedKomp}" (no component or template with that name was found)`
          );
          throw notFoundErr;
        }
        const kebabKomp = pascalToKebab(komp);
        if (kebabKomp.includes('-')) {
          // The dash-name custom-element fallback is classic-only. In a native
          // build (__GXT_CLASSIC_COMPONENTS__ === false) the `renderCustomElement`
          // subtree is DCE'd, so hard-error instead.
          if (!__GXT_CLASSIC_COMPONENTS__) {
            throw new Error(
              `[gxt] custom-element <${kebabKomp}> requires the classic-components build (this is a native GXT build; the @ember/component emulation was DCE-stripped)`
            );
          }
          return renderCustomElement(kebabKomp, args, fw, ctx);
        }

        // Throw when a component name cannot be resolved (matches Ember's behavior).
        const notFoundErr = new Error(
          `Attempted to resolve \`${komp}\`, which was expected to be a component, but nothing was found. ` +
            `Could not find component named "${komp}" (no component or template with that name was found)`
        );
        throw notFoundErr;
      }

      // A component class with a custom component manager (its own or a base
      // class's): its registered template, else its class-body `<template>`.
      if (typeof komp === 'function') {
        const customManager = _customComponentManagerFactory(komp);
        if (customManager !== undefined) {
          const template = getComponentTemplate(komp);
          return template === undefined
            ? _renderClassBodyComponent(komp, customManager, args, fw, ctx, owner)
            : _renderCustomManagedComponent(komp, customManager, args, fw, ctx, owner, template);
        }
      }

      // An `(element "tag")` definition renders its element. (Its internal
      // manager builds a wrapped component in the Glimmer VM; here it would
      // reach the Input/Textarea render of `handleManagedComponent`.)
      if (komp !== null && typeof komp === 'object' && komp.__isElementHelperDefinition === true) {
        return _renderElementHelperDefinition(komp, args, fw, ctx);
      }

      // Handle component with internal/custom manager (walk prototype chain)
      let manager = INTERNAL_MANAGERS.get(komp) || COMPONENT_MANAGERS.get(komp);
      if (!manager && komp !== null && komp !== undefined && typeof komp === 'object') {
        let proto = Object.getPrototypeOf(komp);
        while (proto && proto !== Object.prototype) {
          manager = INTERNAL_MANAGERS.get(proto) || COMPONENT_MANAGERS.get(proto);
          if (manager) break;
          proto = Object.getPrototypeOf(proto);
        }
      }
      if (manager) {
        // Template-only components have an internal manager without a create() method.
        // If the component has a GXT template, render it directly instead of
        // going through handleManagedComponent (which requires manager.create).
        if (typeof manager.create !== 'function') {
          const tpl =
            COMPONENT_TEMPLATES.get(komp) || COMPONENT_TEMPLATES.get(_proxyToRaw.get(komp) || komp);
          if (tpl) {
            const rendered = _renderTemplateOnlyComponent(
              tpl,
              args,
              fw,
              owner,
              _gxtDebugComponent(ctx, komp, null, manager, args)
            );
            if (rendered !== null) return rendered;
          }
          // No template found and no create method — return empty
          return () => document.createComment('template-only (no template)');
        }
        return handleManagedComponent(komp, args, fw, ctx, manager, owner);
      }

      // Fallback: if the component has a template in COMPONENT_TEMPLATES but
      // no manager was found in INTERNAL_MANAGERS, it may be a template-only
      // component whose manager was set via the original (pre-bundled) @glimmer/manager
      // module, which has a separate private WeakMap. Render the template directly.
      {
        const fallbackTpl =
          COMPONENT_TEMPLATES.get(komp) || COMPONENT_TEMPLATES.get(_proxyToRaw.get(komp) || komp);
        if (fallbackTpl) {
          const rendered = _renderTemplateOnlyComponent(
            fallbackTpl,
            args,
            fw,
            owner,
            _gxtDebugComponent(ctx, komp, null, null, args)
          );
          if (rendered !== null) return rendered;
        }
      }

      // Handle classic factory-based component
      if (komp?.create && typeof komp.create === 'function') {
        // Classic-curly entry (gated). Native builds DCE
        // `handleClassicComponent` + `renderClassicComponent` + the
        // wrapper/binding builders. Glimmer/template-only components never
        // reach this branch (they resolve via the manager/template paths above).
        if (!__GXT_CLASSIC_COMPONENTS__) {
          throw new Error(
            '[gxt] classic @ember/component requires the classic-components build (this is a native GXT build; the @ember/component emulation was DCE-stripped)'
          );
        }
        return handleClassicComponent(komp, args, fw, ctx, owner);
      }

      return null;
    },
  },

  helper: {
    canHandle(helper: any): boolean {
      if (typeof helper === 'string') {
        const owner = getOwnerWithFallback();
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          // Only claim we can handle if the helper actually exists
          const factory = owner.factoryFor?.(`helper:${helper}`);
          if (factory) return true;
          // Also try direct lookup (for helpers registered via application.register)
          try {
            const lookup = owner.lookup?.(`helper:${helper}`);
            if (lookup != null) return true;
          } catch {
            /* ignore destroyed owner errors */
          }
          // Also check built-in helpers
          const BUILTIN_HELPERS = getGxtRenderer()?.compilePipeline.getBuiltinHelpers?.();
          if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) return true;
        }
      }
      // Also handle our curried ember helper functions
      if (typeof helper === 'function' && helper.__isEmberCurriedHelper) {
        return true;
      }
      // Plain functions can be used as helpers via the default helper manager
      // This handles scope-provided functions like (helper foo "arg") where
      // foo is a plain arrow function from strict-mode scope values
      if (typeof helper === 'function') {
        return true;
      }
      // Handle function/class-based helpers with a registered helper manager
      // Walk the prototype chain for both functions (classes) and objects
      if (helper != null && typeof helper === 'object') {
        let pointer = helper;
        while (pointer != null && pointer !== Object.prototype && pointer !== Function.prototype) {
          if (INTERNAL_HELPER_MANAGERS.has(pointer)) return true;
          try {
            pointer = Object.getPrototypeOf(pointer);
          } catch {
            break;
          }
        }
      }
      return false;
    },

    handle(helper: any, params: any, hash: any): any {
      // Handle curried ember helper functions (from a previous (helper "name") call)
      if (typeof helper === 'function' && helper.__isEmberCurriedHelper) {
        const additionalPositionals = _helperPositionalArgs(params);
        const additionalNamed = _helperNamedArgs(hash);

        // Create a new curried function with merged args. The inner curried
        // may have been created via either the delegate pathway (which closes
        // over `delegate`/`bucket`/`reactiveArgs` and exposes no `__resolvedFn`)
        // or the plain-function pathway (which sets `__resolvedFn`). We always
        // delegate to the inner curried, passing the merged positionals so both
        // pathways compute correctly.
        const innerCurried = helper;
        const prevPositionals = helper.__curriedPositionals || [];
        const prevNamed = helper.__curriedNamed || {};
        const mergedPositionals = [...prevPositionals, ...additionalPositionals];
        const mergedNamed = { ...prevNamed, ...additionalNamed };

        const newCurried = function __emberCurriedHelper(extraPos?: any[], extraHash?: any) {
          const addPos = [...additionalPositionals, ..._helperPositionalArgs(extraPos)];
          const addHash = { ...additionalNamed, ...(extraHash || {}) };
          return innerCurried(addPos, addHash);
        };
        (newCurried as any).__isEmberCurriedHelper = true;
        if (typeof innerCurried.__gxtHelperInstance === 'function') {
          (newCurried as any).__gxtHelperInstance = (positional: any[] = [], named: object = {}) =>
            innerCurried.__gxtHelperInstance([...additionalPositionals, ...positional], {
              ...additionalNamed,
              ...named,
            });
        }
        (newCurried as any).__resolvedFn = helper.__resolvedFn;
        (newCurried as any).__curriedPositionals = mergedPositionals;
        (newCurried as any).__curriedNamed = mergedNamed;
        return newCurried;
      }

      // Handle function/object helpers with registered helper managers (e.g., defineSimpleHelper)
      if (helper != null && typeof helper !== 'string') {
        const internalManager = getInternalHelperManager(helper);
        if (internalManager) {
          const owner = getOwnerWithFallback();

          if (typeof internalManager.getDelegateFor === 'function') {
            const delegate = internalManager.getDelegateFor(owner);
            _assertHelperDelegateCapabilities(delegate);
            if (
              delegate &&
              typeof delegate.createHelper === 'function' &&
              delegate.capabilities?.hasValue
            ) {
              return _curryDelegateHelper(delegate, helper, params, hash);
            }
          }

          // Fallback: use getHelper if available
          if (typeof internalManager.getHelper === 'function') {
            const resolvedFn = (positional: any[], named: any) => {
              // getHelper() returns a Reference (to match stock Glimmer VM
              // contract). Unwrap via `.value` for GXT curry-helper paths.
              const maybeRef = internalManager.getHelper(helper)(
                { positional, named: named || {} },
                owner
              );
              if (maybeRef != null && typeof maybeRef === 'object' && 'value' in maybeRef) {
                return (maybeRef as any).value;
              }
              return maybeRef;
            };
            return _curryFnHelper(resolvedFn, params, hash);
          }
        }
      }

      if (typeof helper === 'string') {
        const owner = getOwnerWithFallback();

        // For string-based helpers, check if the definition has a delegate manager.
        // If so, create the helper bucket ONCE and reuse it across re-renders,
        // updating reactive args in place. This ensures:
        // 1. Helper instances are stable (tracked property mutations trigger re-renders)
        // 2. getValue is called on the same bucket (count increments correctly)
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          const factory = owner.factoryFor?.(`helper:${helper}`);
          if (factory) {
            const definition = factory.class || factory;
            const internalManager = getInternalHelperManager(definition);
            if (internalManager && typeof internalManager.getDelegateFor === 'function') {
              const delegate = internalManager.getDelegateFor(owner);
              _assertHelperDelegateCapabilities(delegate);
              if (
                delegate &&
                typeof delegate.createHelper === 'function' &&
                delegate.capabilities?.hasValue
              ) {
                return _curryDelegateHelper(delegate, definition, params, hash);
              }
            }
          }
        }

        // Fast path for built-in helpers: call them directly with the raw args.
        // Built-in helpers like `get`, `concat`, etc. already handle getter
        // functions (they check typeof arg === 'function' and call it). Eagerly
        // unwrapping the args would lose reactivity and break cases where the
        // getter reads from a GXT formula (e.g., each-loop index).
        const BUILTIN_HELPERS = getGxtRenderer()?.compilePipeline.getBuiltinHelpers?.();
        if (BUILTIN_HELPERS && BUILTIN_HELPERS[helper]) {
          const builtinFn = BUILTIN_HELPERS[helper];
          // Call built-in directly with the raw params (which may be getter fns)
          const rawPositionals = Array.isArray(params) ? params : [];
          return builtinFn(...rawPositionals);
        }

        // Fallback: resolve via _resolveEmberHelper for registered helpers
        // without a delegate manager. GXT's $_helperHelper expects a curried
        // reference, so that {{helper (helper "name") extraArgs}} works; in
        // content position ({{helper "name"}}) GXT calls it with no extra args.
        const resolvedFn = _resolveEmberHelper(helper, owner);
        if (resolvedFn) {
          return _curryFnHelper(resolvedFn, params, hash);
        }
      }
      return null;
    },
  },

  modifier: {
    // Cache modifier instances by element, one slot per modifier invocation
    // (`_modifierSlot`), to support the update lifecycle.
    // GXT's reactive system re-calls $_maybeModifier on each arg change inside a formula.
    // The formula pattern is: call destructor() → call fn(element) again.
    // We intercept this to provide install/update/destroy lifecycle.
    _cache: new WeakMap<
      HTMLElement,
      Map<string, { instance: any; manager: any; ModifierClass: any; pendingDestroy: boolean }>
    >(),
    // Track which modifier instances were already updated in the current sync cycle.
    // Cleared at the start of each `_gxtSyncDomNow` (compile.ts).
    _updatedInstances: new Set<any>(),

    // Built-in keyword modifiers resolved lazily.
    // The 'on' modifier from @glimmer/runtime is registered via
    // setInternalModifierManager and stored here for string-based resolution.
    _builtinModifiers: {} as Record<string, any>,

    canHandle(modifier: any): boolean {
      // An empty string names no modifier. It is the value of a dynamic
      // modifier position whose value is not a modifier (the compat
      // `(unless cond x)` evaluates to `''` when its condition is true), where
      // Glimmer's dynamic modifier installs nothing for a value that is not an
      // object.
      if (modifier === '') return false;
      if (typeof modifier === 'string') {
        // Flush any pending builtin modifier registrations
        if (_pendingBuiltinModifiers.length > 0) {
          _flushPendingBuiltinModifiers();
        }
        // Check built-in keyword modifiers
        if ((this as any)._builtinModifiers[modifier]) return true;

        const owner = getAmbientOwner();
        if (owner && !owner.isDestroyed && !owner.isDestroying) {
          const factory = owner.factoryFor?.(`modifier:${modifier}`);
          if (factory) return true;

          // If the modifier name is a registered helper, throw an error.
          // Helpers cannot be used as modifiers (element position).
          try {
            const helperFactory = owner.factoryFor?.(`helper:${modifier}`);
            const helperLookup = !helperFactory ? owner.lookup?.(`helper:${modifier}`) : null;
            if (helperFactory || helperLookup) {
              const err = new Error(
                `Attempted to resolve \`${modifier}\`, which was expected to be a modifier, but nothing was found.`
              );
              captureRenderError(err);
              return true; // Claim we can handle it to prevent GXT default behavior
            }
          } catch (e: any) {
            if (e?.message?.includes('expected to be a modifier')) {
              captureRenderError(e);
              return true;
            }
          }
        }
        return false;
      }
      // Check if modifier has a registered modifier manager (via setModifierManager)
      if (modifier !== null && modifier !== undefined) {
        let pointer = modifier;
        const visited = new Set();
        while (pointer && !visited.has(pointer)) {
          visited.add(pointer);
          if (INTERNAL_MODIFIER_MANAGERS.has(pointer)) return true;
          try {
            pointer = Object.getPrototypeOf(pointer);
          } catch {
            break;
          }
        }
      }
      return false;
    },

    handle(modifier: any, element: HTMLElement, props: any[], hashArgs: any): any {
      // In non-interactive (SSR-style) rendering, modifiers — which exist to
      // imperatively interact with DOM — must not install. Stock Ember uses
      // an `InertRenderer` that skips modifier installation wholesale; we
      // mirror that by short-circuiting here. Without this, the `on` modifier
      // would still attach listeners and drift the `adds` counter.
      if (!isInteractiveModeChecked()) {
        return undefined;
      }

      // The definition as the template invoked it (its debug render tree name
      // can be the template's name for it, see `_gxtDebugModifier`).
      const invoked = modifier;
      const owner = getAmbientOwner();
      const self = this as any;
      // Built-in modifiers like `on` (registered in `_builtinModifiers`
      // via `setInternalModifierManager`) do not require an Ember owner —
      // they install directly into the DOM. For these we proceed without
      // an owner so that strict-mode keyword-modifier tests (which run
      // outside an Ember application context, see
      // packages/@glimmer-workspace/integration-tests/lib/modes/jit/delegate.ts#renderGxtComponent)
      // can still attach event listeners. Custom modifiers — resolved
      // through `owner.factoryFor('modifier:...')` — still require the
      // owner and short-circuit below.
      const isBuiltinModifierName =
        typeof modifier === 'string' && !!self._builtinModifiers?.[modifier];
      // Modifier definitions registered directly via `setModifierManager(factory, obj)`
      // (strict-mode shadowed `on` modifiers, RFC 757 modifiers in test contexts,
      // etc.) carry their factory on `INTERNAL_MODIFIER_MANAGERS`. They
      // don't need an Ember owner either — the factory itself is invoked with
      // the (possibly absent) owner below and is responsible for handling that
      // case. Without this carve-out, strict-mode modifiers (e.g. a shadowed
      // `on`) would silently no-op because the user's `createModifier()` is
      // never reached.
      const hasRegisteredManager =
        modifier !== null &&
        modifier !== undefined &&
        typeof modifier !== 'string' &&
        (function walk(): boolean {
          let p = modifier;
          const seen = new Set();
          while (p && !seen.has(p)) {
            seen.add(p);
            if (INTERNAL_MODIFIER_MANAGERS.has(p)) return true;
            try {
              p = Object.getPrototypeOf(p);
            } catch {
              break;
            }
          }
          return false;
        })();
      // Curried modifiers (from the `(modifier)` keyword) are self-installing
      // — they were tagged with `__isCurriedModifier` by createEmberModifierHelper
      // and carry their own install closure. Treat them like registered-manager
      // modifiers for the owner-less carve-out.
      const isCurriedModifier =
        typeof modifier === 'function' && (modifier as any).__isCurriedModifier;
      if (!owner && !isBuiltinModifierName && !hasRegisteredManager && !isCurriedModifier) {
        return undefined;
      }

      // Helper to unwrap GXT getter args
      const unwrapGxtArg = (v: any) => (typeof v === 'function' && !v.prototype ? v() : v);

      // Build args object (eager — reads all args immediately)
      const buildArgs = () => {
        const positional = (props || []).map(unwrapGxtArg);
        const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
        const named: Record<string, any> = {};
        for (const key of Object.keys(rawHash)) {
          if (key.startsWith('$_') || key === 'hash') continue;
          const val = rawHash[key];
          named[key] =
            typeof val === 'function' && !(val as any).__isCurriedComponent ? (val as any)() : val;
        }
        return { positional, named };
      };

      // The arguments of one evaluation of the invocation: its positional
      // values and its hash (the evaluated `hashArgs`).
      const argSourceOf = (currentProps: any[], currentHashArgs: any): _ModifierArgSource => ({
        props: currentProps || [],
        hash: currentHashArgs
          ? typeof currentHashArgs === 'function'
            ? currentHashArgs()
            : currentHashArgs
          : {},
      });

      // Build LAZY args object — only resolves GXT getters when actually accessed.
      // This is crucial for per-arg tracking: GXT's formula only tracks cells that
      // are read, so non-consumed args won't trigger formula re-evaluation.
      // The members read `source` when they are accessed: the update path
      // points an installed modifier's source at each evaluation's arguments,
      // so the args object a manager kept from `createModifier` reads the
      // current arguments, as Glimmer's args proxy reads its references.
      const buildLazyArgs = (source: _ModifierArgSource) => {
        const positionalProxy = new Proxy([] as any[], {
          get(target, prop, receiver) {
            const rawPositional = source.props;
            if (typeof prop === 'string' && isAllDigits(prop)) {
              const idx = Number(prop);
              if (idx < rawPositional.length) {
                return unwrapGxtArg(rawPositional[idx]);
              }
              return undefined;
            }
            if (prop === 'length') return rawPositional.length;
            if (prop === Symbol.iterator) {
              return function* () {
                for (let i = 0; i < rawPositional.length; i++) {
                  yield unwrapGxtArg(rawPositional[i]);
                }
              };
            }
            return Reflect.get(target, prop, receiver);
          },
        });

        const namedKeys = () =>
          Object.keys(source.hash).filter((k: string) => !k.startsWith('$_') && k !== 'hash');
        const namedProxy = new Proxy({} as Record<string, any>, {
          get(target, prop, receiver) {
            if (typeof prop === 'string' && namedKeys().includes(prop)) {
              const val = source.hash[prop];
              return typeof val === 'function' && !(val as any).__isCurriedComponent
                ? (val as any)()
                : val;
            }
            return Reflect.get(target, prop, receiver);
          },
          ownKeys() {
            return namedKeys();
          },
          getOwnPropertyDescriptor(target, prop) {
            if (typeof prop === 'string' && namedKeys().includes(prop)) {
              return { configurable: true, enumerable: true, writable: true, value: undefined };
            }
            return Object.getOwnPropertyDescriptor(target, prop);
          },
          has(target, prop) {
            if (typeof prop === 'string') return namedKeys().includes(prop);
            return Reflect.has(target, prop);
          },
        });

        return { positional: positionalProxy, named: namedProxy };
      };

      // Find this invocation's cache slot. A re-run of an installed invocation
      // finds its slot pending destroy (its destructor ran first) and takes
      // the update path. Any other call is a new invocation and installs a
      // new modifier instance in a free slot, as Glimmer installs every
      // modifier on an element: e.g. the element's own `{{on "click"}}` and
      // another `{{on "click"}}` forwarded through `...attributes` are two
      // listeners. The key is the modifier's name only: an argument change
      // (even the event name of an `{{on}}`) is an update of the same slot.
      const baseName = typeof modifier === 'string' ? modifier : modifier?.name || String(modifier);
      const slot = _modifierSlot(self._cache.get(element), baseName);
      const modKey = slot.key;
      // (A block: the install path below declares its own `cached`.)
      {
        const cached = slot.cached;
        if (cached) {
          // The destructor was called (GXT formula re-eval), but we haven't
          // actually destroyed yet — this is an update, not a reinstall.
          cached.pendingDestroy = false;
          // The destructor of this evaluation: the modifier's destroy is
          // queued, and the next evaluation of the invocation takes it back.
          const destructor = () =>
            _queueModifierDestroy({
              cached,
              destroyable: cached.isInternal
                ? cached.manager.getDestroyable?.(cached.instance)
                : null,
              element,
              modKey,
              cache: self._cache,
              isCustom: !cached.isInternal,
            });
          // Check if this modifier was already updated in the current sync cycle.
          // GXT formulas can fire multiple times per sync (e.g., when tracked cells
          // are re-bound during the first evaluation). Skip duplicate updates.
          const currentSyncCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
          if (cached.__gxtUpdatedInSyncCycle === currentSyncCycle && currentSyncCycle > 0) {
            return destructor;
          }
          // Mark that this modifier was updated in Phase 1 (GXT native reactivity)
          // for the current render pass. The force-rerender (Phase 2b) checks this
          // to avoid double-updating. Uses the sync cycle ID so stale flags from
          // previous sync cycles are ignored.
          cached.__gxtUpdatedInSyncCycle = currentSyncCycle;

          if (cached.isInternal) {
            // Internal modifier manager update path.
            // Use CURRENT props/hashArgs (from this handle() call), not the
            // stale closure from install time. GXT re-calls the modifier
            // function with fresh arguments on each formula re-evaluation.
            //
            // Build fresh Glimmer ConstRefs for positional/named args — this
            // matches what's built at install time so OnModifierManager and
            // friends can call `valueForRef()` on them successfully.
            const freshPositional = (props || []).map((v: any) => {
              return _createConstRef(v, DEBUG ? 'modifier-arg' : false);
            });
            const rawHash = hashArgs
              ? typeof hashArgs === 'function'
                ? hashArgs()
                : hashArgs
              : {};
            const freshNamed: Record<string, any> = {};
            for (const k of Object.keys(rawHash)) {
              if (k.startsWith('$_') || k === 'hash') continue;
              const val = rawHash[k];
              const resolved =
                typeof val === 'function' && !(val as any).__isCurriedComponent ? val() : val;
              freshNamed[k] = _createConstRef(resolved, DEBUG ? k : false);
            }

            if (cached.instance.args) {
              // Replace positional refs with fresh ones (ConstRef.lastValue is
              // set at construction; creating new refs is simpler than mutating).
              cached.instance.args.positional.length = 0;
              for (const ref of freshPositional) {
                cached.instance.args.positional.push(ref);
              }
              // Replace named refs with fresh ones.
              for (const k of Object.keys(cached.instance.args.named)) {
                if (!(k in freshNamed)) delete cached.instance.args.named[k];
              }
              for (const k of Object.keys(freshNamed)) {
                cached.instance.args.named[k] = freshNamed[k];
              }
            }
            if (cached.manager.update) {
              _modifierCommit(() => cached.manager.update(cached.instance));
            }
          } else {
            // Custom modifier manager update path.
            // The installed modifier's args read this evaluation's arguments.
            const current = argSourceOf(props, hashArgs);
            const argSource: _ModifierArgSource = cached.argSource ?? current;
            argSource.props = current.props;
            argSource.hash = current.hash;
            // Per-arg tracking: only call updateModifier when consumed args changed
            // OR when external tracked values changed (autotracking).
            // We eagerly read ALL args UNTRACKED to get fresh values for comparison.
            const freshArgs: any = _untracked(buildArgs);
            let shouldUpdate = false;
            if (cached._consumedPositional && cached._lastPositional) {
              // Check if any consumed positional args changed
              for (const idx of cached._consumedPositional) {
                if (
                  idx < freshArgs.positional.length &&
                  freshArgs.positional[idx] !== cached._lastPositional[idx]
                ) {
                  shouldUpdate = true;
                  break;
                }
              }
              // Check if any consumed named args changed
              if (!shouldUpdate && cached._consumedNamed && cached._lastNamed) {
                for (const key of cached._consumedNamed) {
                  if (freshArgs.named[key] !== cached._lastNamed[key]) {
                    shouldUpdate = true;
                    break;
                  }
                }
              }
              // If no consumed args changed, check if this was triggered by an
              // external tracked value change (not an arg change at all).
              // We detect this by checking: did ANY positional/named arg change?
              // Only trigger external tracking in a DIFFERENT sync cycle from the
              // last update — within the same cycle, GXT's formula double-fires
              // should not cause spurious updates.
              if (!shouldUpdate) {
                let anyArgChanged = false;
                for (let i = 0; i < freshArgs.positional.length; i++) {
                  if (freshArgs.positional[i] !== cached._lastPositional[i]) {
                    anyArgChanged = true;
                    break;
                  }
                }
                if (!anyArgChanged) {
                  for (const key of Object.keys(freshArgs.named)) {
                    if (freshArgs.named[key] !== cached._lastNamed?.[key]) {
                      anyArgChanged = true;
                      break;
                    }
                  }
                }
                // If no arg changed at all, this may be an external tracking
                // change (e.g., a @tracked value read in didInsertElement changed).
                // Skip if this is the sync cycle immediately after install —
                // that is just GXT's run-loop settling, not a real change.
                const syncCycleNow = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
                if (!anyArgChanged && syncCycleNow - (cached.__gxtInstallCycle || 0) > 1) {
                  shouldUpdate = true;
                }
              }
            } else {
              // No consumption tracking info — always update
              shouldUpdate = true;
            }
            // Guard against duplicate updates within the same sync cycle.
            // GXT formulas can fire multiple times per cycle, and the cache entry
            // may be replaced by a parallel fresh install. Use a Set of already-
            // updated instances (cleared at the start of each sync cycle) to
            // reliably prevent duplicate updateModifier calls.
            if (shouldUpdate && self._updatedInstances.has(cached.instance)) {
              shouldUpdate = false;
            }
            if (shouldUpdate && cached.manager.updateModifier) {
              self._updatedInstances.add(cached.instance);
              // Use lazy args for the actual update call so GXT tracks per-consumed-arg
              const lazyArgs = buildLazyArgs(argSource);
              _modifierCommit(() => cached.manager.updateModifier(cached.instance, lazyArgs));
            }
            // Snapshot for next comparison
            cached._lastPositional = [...freshArgs.positional];
            cached._lastNamed = { ...freshArgs.named };
          }

          return destructor;
        }
      }

      // First time: resolve modifier class and create instance

      // Resolve built-in keyword modifiers (e.g., "on" → the on modifier object)
      if (typeof modifier === 'string' && self._builtinModifiers[modifier]) {
        modifier = self._builtinModifiers[modifier];
      }

      // Handle curried modifiers (from the (modifier) keyword) — they are
      // self-contained functions that already know how to install themselves.
      if (typeof modifier === 'function' && (modifier as any).__isCurriedModifier) {
        const positional = (props || []).map(unwrapGxtArg);
        const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
        const namedArgs: Record<string, any> = {};
        for (const key of Object.keys(rawHash)) {
          if (key.startsWith('$_') || key === 'hash') continue;
          const val = rawHash[key];
          namedArgs[key] =
            typeof val === 'function' && !(val as any).__isCurriedComponent ? (val as any)() : val;
        }
        return modifier(element, positional, namedArgs);
      }

      // Resolve modifier class from the owner registry if it's a string
      let ModifierClass: any;
      if (typeof modifier === 'string') {
        // Built-in modifiers (e.g. `on`, `on-ext`) are registered in
        // `_builtinModifiers` and resolve directly without owner.factoryFor.
        // This path supports owner-less GXT renders (see the
        // `isBuiltinModifierName` check above).
        const builtin = self._builtinModifiers?.[modifier];
        if (builtin) {
          ModifierClass = builtin;
        } else {
          if (!owner) return undefined;
          const factory = owner.factoryFor?.(`modifier:${modifier}`);
          if (!factory) return undefined;
          ModifierClass = factory.class;
        }
      } else {
        ModifierClass = modifier;
      }

      // Walk the prototype chain to find the manager factory
      let managerFactory: any = null;
      let pointer = ModifierClass;
      const visited = new Set();
      while (pointer && !visited.has(pointer)) {
        visited.add(pointer);
        const mgr = INTERNAL_MODIFIER_MANAGERS.get(pointer);
        if (mgr) {
          managerFactory = mgr;
          break;
        }
        try {
          pointer = Object.getPrototypeOf(pointer);
        } catch {
          break;
        }
      }

      if (!managerFactory) return undefined;

      // managerFactory can be either a factory function (from setModifierManager)
      // or a manager instance (from setInternalModifierManager)
      let manager: any;
      if (typeof managerFactory === 'function') {
        manager = managerFactory(owner);
      } else {
        manager = managerFactory;
      }

      if (!manager) return undefined;

      // Detect if this is an internal modifier manager (like OnModifierManager).
      // Internal managers use create/install/update/getDestroyable API.
      // Custom managers use createModifier/installModifier/updateModifier/destroyModifier.
      const isInternalManager =
        typeof manager.create === 'function' &&
        typeof manager.install === 'function' &&
        typeof manager.getDestroyable === 'function' &&
        !manager.createModifier;

      if (isInternalManager) {
        // Internal modifier manager path (e.g., {{on}} modifier).
        // Build CapturedArguments-like object with proper Glimmer Reference
        // objects so that OnModifierManager's `valueForRef()` reads work.
        // Classic Glimmer's internal modifier managers expect positional/named
        // args to be Reference instances (with `tag`, `lastValue`, etc.); a
        // plain `{value, debugLabel}` object would make `valueForRef()` return
        // undefined and drop the callback.
        //
        // GXT compiles modifier positional args as direct values (not reactive
        // getters), so we must not call them. A `typeof v === 'function' &&
        // !v.prototype` getter check would misfire because concise methods and
        // arrow-function callbacks also lack `.prototype`, so every value is
        // wrapped in a const ref without unwrapping.
        const buildCapturedArgs = () => {
          // Positional args: GXT compiles modifier positionals as direct values
          // (e.g., "click", this.callback), not reactive getters. We must not
          // call them — concise methods and arrow callbacks lack .prototype and
          // would be mistaken for getters.
          const positional = (props || []).map((v: any) => {
            return _createConstRef(v, DEBUG ? 'modifier-arg' : false);
          });
          // Named args: GXT wraps dynamic named values in () => getters
          // (e.g., once: () => this.once), but passes literals directly
          // (e.g., once: true). Unwrap getter functions for named args only.
          const rawHash = hashArgs ? (typeof hashArgs === 'function' ? hashArgs() : hashArgs) : {};
          const named: Record<string, any> = {};
          for (const k of Object.keys(rawHash)) {
            if (k.startsWith('$_') || k === 'hash') continue;
            const val = rawHash[k];
            const resolved =
              typeof val === 'function' && !(val as any).__isCurriedComponent ? val() : val;
            named[k] = _createConstRef(resolved, DEBUG ? k : false);
          }
          return { positional, named };
        };

        const capturedArgs = buildCapturedArgs();
        const state = manager.create(owner, element, ModifierClass, capturedArgs);
        // Glimmer installs a modifier at commit, after the render's tracking
        // transaction (see `outsideRenderPassReads`).
        if (DEBUG) _modifierCommit(() => outsideRenderPassReads(() => manager.install(state)));
        else _modifierCommit(() => manager.install(state));

        // Cache the state for subsequent update calls
        let cache = self._cache.get(element);
        if (!cache) {
          cache = new Map();
          self._cache.set(element, cache);
        }
        const cached = {
          instance: state,
          manager,
          ModifierClass,
          pendingDestroy: false,
          isInternal: true,
          // Its node in the debug render tree (released when it is destroyed).
          debugNode:
            gxtDebugParent() === null
              ? undefined
              : _gxtDebugModifier(
                  invoked,
                  manager,
                  ModifierClass,
                  element,
                  capturedArgs,
                  manager.getDebugInstance?.(state) ?? null
                ),
        };
        cache.set(modKey, cached);

        const destroyable = manager.getDestroyable(state);

        // Return a destructor.
        // The deferred approach (Promise.resolve) distinguishes formula
        // re-evaluation (destructor -> handle within one synchronous block)
        // from actual element removal (destructor with no subsequent handle).
        // But because test assertions run before microtasks, we need to
        // detect element removal synchronously.
        //
        // Strategy: mark pendingDestroy, then at end of current GXT sync
        // cycle, flush any still-pending destroys synchronously
        // (`_queueModifierDestroy`).
        return () =>
          _queueModifierDestroy({ cached, destroyable, element, modKey, cache: self._cache });
      }

      // Custom modifier manager path
      // Validate capabilities - must be from modifierCapabilities()
      const caps = manager.capabilities;
      if (caps && !FROM_CAPABILITIES.has(caps)) {
        const err = new Error(
          capabilitiesErrorPrefix('modifier') + 'Received: ' + JSON.stringify(caps)
        );
        throw err;
      }

      if (!caps) {
        const err = new Error(capabilitiesErrorPrefix('modifier'));
        throw err;
      }

      // Install the modifier immediately.
      // Use lazy args with consumption tracking so we know which args
      // the modifier reads. Only consumed args trigger future updates.
      const _consumedPositional = new Set<number>();
      const _consumedNamed = new Set<string>();
      const installArgSource = argSourceOf(props, hashArgs);
      const lazyInstallArgs = buildLazyArgs(installArgSource);
      // Wrap with consumption-tracking proxies.
      // Must handle both numeric indexing AND destructuring (Symbol.iterator).
      const trackedInstallArgs = {
        positional: new Proxy(lazyInstallArgs.positional, {
          get(target: any, prop: any, receiver: any) {
            if (typeof prop === 'string' && isAllDigits(prop)) {
              _consumedPositional.add(Number(prop));
            }
            // Intercept Symbol.iterator to track which indices are accessed during destructuring
            if (prop === Symbol.iterator) {
              const innerIter = Reflect.get(target, prop, receiver);
              return function* () {
                let idx = 0;
                for (const val of { [Symbol.iterator]: innerIter }) {
                  _consumedPositional.add(idx++);
                  yield val;
                }
              };
            }
            return Reflect.get(target, prop, receiver);
          },
        }),
        named: new Proxy(lazyInstallArgs.named, {
          get(target: any, prop: any, receiver: any) {
            if (typeof prop === 'string') {
              _consumedNamed.add(prop);
            }
            return Reflect.get(target, prop, receiver);
          },
        }),
      };
      // Phantom-element migration: if a prior install in the same sync cycle
      // had its destructor called (pending-destroy), reuse that instance
      // instead of creating a new one. This happens when GXT re-evaluates
      // the modifier formula multiple times in a single sync cycle (e.g.,
      // during an `{{#if}}` toggle that triggers intermediate DOM renders),
      // creating then abandoning phantom elements. Without migration each
      // phantom fires spurious didInsertElement/willDestroyElement.
      const currentCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
      // The `.splice(i, 1)` below mutates the array in place.
      const pendingDestroysForMigrate = _pendingModifierDestroys;
      let migratedCached: any = null;
      let migratedFromIndex = -1;
      if (currentCycle > 0 && pendingDestroysForMigrate.length > 0) {
        for (let i = 0; i < pendingDestroysForMigrate.length; i++) {
          const entry = pendingDestroysForMigrate[i]!;
          if (!entry.isCustom) continue;
          if (entry.modKey !== modKey) continue;
          if (!entry.cached || entry.cached.ModifierClass !== ModifierClass) continue;
          if (entry.element === element) continue;
          // Only migrate if BOTH install AND destructor happened in this cycle.
          // That's the phantom signature: an install-then-destructor within a
          // single sync cycle with no intervening useful work. We do NOT check
          // pendingDestroy here because GXT may have subsequently re-evaluated
          // the formula on the phantom element (taking the cached-hit path,
          // which resets pendingDestroy to false) without actually cancelling
          // the destroy.
          const installCycle = entry.cached.__gxtInstallCycle || 0;
          const destructCycle = entry.cached.__gxtDestructorCycle || 0;
          if (installCycle !== currentCycle || destructCycle !== currentCycle) continue;
          migratedCached = entry.cached;
          migratedFromIndex = i;
          break;
        }
      }

      beginBacktrackingFrame();
      let instance: any;
      try {
        if (migratedCached) {
          // Reuse the prior instance — do NOT call createModifier/installModifier
          // again. This suppresses the spurious phantom didInsertElement call
          // (and the eventual phantom willDestroyElement) that would otherwise
          // fire in a single sync cycle when GXT internally reconciles DOM.
          instance = migratedCached.instance;
          migratedCached.pendingDestroy = false;
          if (migratedFromIndex >= 0) {
            pendingDestroysForMigrate.splice(migratedFromIndex, 1);
          }
          // Remove from old element's cache entry.
          const oldEl = instance && instance.element;
          if (oldEl) {
            const oldCache = self._cache.get(oldEl);
            if (oldCache) {
              oldCache.delete(modKey);
              if (oldCache.size === 0) self._cache.delete(oldEl);
            }
            // Update instance.element so future update/destroy targets correctly.
            try {
              instance.element = element;
            } catch {
              /* ignore (sealed instance) */
            }
          }
        } else {
          instance = manager.createModifier(ModifierClass, trackedInstallArgs);
          // Detect "dirty-during-install": classic Ember's CustomModifierManager
          // wraps installModifier in a track() frame. If the modifier's install
          // hook mutates its own tracked/notifiable state (e.g. `this.set('savedElement', ...)`)
          // that was implicitly READ by the set path itself (set first reads for
          // an equality check), classic captures this tag in the frame, and the
          // subsequent dirty schedules an updateModifier() on the next validation
          // tick — producing an extra `didUpdate` hook call.
          //
          // In GXT we mimic this by installing a per-modifier notifyPropertyChange
          // watcher for the duration of installModifier. If any property on the
          // instance is set during install, we fire `updateModifier` once right
          // after install returns.
          let _selfSetDuringInstall = false;
          // `.set(instance, ...)` / `.delete(instance)` bracket the
          // `installModifier` track frame; the cross-file reader in
          // compile.ts's `_gxtTriggerReRenderBody` consults this Map through
          // the `getModifierInstallWatchers` bridge getter.
          const installWatchers = _modifierInstallWatchers;
          if (instance) {
            installWatchers.set(instance, () => {
              _selfSetDuringInstall = true;
            });
          }
          try {
            // Glimmer installs a modifier at commit, after the render's
            // tracking transaction (see `outsideRenderPassReads`).
            if (DEBUG) {
              _modifierCommit(() =>
                outsideRenderPassReads(() =>
                  manager.installModifier(instance, element, trackedInstallArgs)
                )
              );
            } else {
              _modifierCommit(() => manager.installModifier(instance, element, trackedInstallArgs));
            }
          } finally {
            if (instance) installWatchers.delete(instance);
          }
          // Store manager reference on instance for teardown cleanup
          if (instance) instance.__gxtModManager = manager;
          // If installModifier mutated its own state (mirroring classic's
          // backtracking-via-set pattern), schedule one updateModifier call.
          // This gives user code a chance to observe the post-install state and
          // matches classic Ember's lifecycle hook count for modifiers of this
          // shape.
          if (_selfSetDuringInstall && instance && typeof manager.updateModifier === 'function') {
            try {
              const lazyArgs = buildLazyArgs(installArgSource);
              if (DEBUG) {
                _modifierCommit(() =>
                  outsideRenderPassReads(() => manager.updateModifier(instance, lazyArgs))
                );
              } else {
                _modifierCommit(() => manager.updateModifier(instance, lazyArgs));
              }
            } catch (err) {
              // Surface the error through the render-error channel so it is
              // visible to tests and users, but do NOT rethrow — the install
              // path has already succeeded and the modifier is live. Rethrowing
              // here would abort the render pipeline mid-cycle.
              try {
                captureRenderError(err);
              } catch (_rethrowErr) {
                throw err;
              }
            }
          }
        }
      } finally {
        endBacktrackingFrame();
      }

      // Snapshot initial arg values for change detection.
      // Read UNTRACKED to avoid establishing cell dependencies outside the formula.
      const initialArgs: any = _untracked(buildArgs);

      // Cache the instance for subsequent update calls
      let cache = self._cache.get(element);
      if (!cache) {
        cache = new Map();
        self._cache.set(element, cache);
      }
      let cached: any;
      if (migratedCached) {
        // Reuse the migrated cache entry and refresh its state for the new
        // element.  Preserve _lastPositional/_lastNamed for the next update's
        // per-arg diffing.
        cached = migratedCached;
        cached.pendingDestroy = false;
        // The migrated instance keeps the args object it was created with:
        // point its source at this evaluation's arguments.
        if (cached.argSource) {
          cached.argSource.props = installArgSource.props;
          cached.argSource.hash = installArgSource.hash;
        } else {
          cached.argSource = installArgSource;
        }
        cached._consumedPositional = _consumedPositional;
        cached._consumedNamed = _consumedNamed;
        cached._lastPositional = [...initialArgs.positional];
        cached._lastNamed = { ...initialArgs.named };
        cached.__gxtUpdatedInSyncCycle = currentCycle;
        cached.__gxtInstallCycle = currentCycle;
        cached.__gxtDestructorCycle = 0;
        // Its debug render tree node is on the new element.
        if (cached.debugNode) {
          cached.debugNode.first = element;
          cached.debugNode.last = element;
        }
      } else {
        cached = {
          instance,
          manager,
          ModifierClass,
          pendingDestroy: false,
          // Its node in the debug render tree (released when it is destroyed),
          // with the arguments its manager reads.
          debugNode:
            gxtDebugParent() === null
              ? undefined
              : _gxtDebugModifier(
                  invoked,
                  manager,
                  ModifierClass,
                  element,
                  lazyInstallArgs,
                  instance
                ),
          argSource: installArgSource,
          _consumedPositional,
          _consumedNamed,
          _lastPositional: [...initialArgs.positional],
          _lastNamed: { ...initialArgs.named },
          __gxtUpdatedInSyncCycle: currentCycle,
          // Record the install sync cycle so we can skip the spurious re-eval
          // that happens in the very next cycle (run-loop settling).
          __gxtInstallCycle: currentCycle,
        };
      }
      cache.set(modKey, cached);
      // Track instance for teardown cleanup (destroyModifier -> willDestroyElement)
      self._updatedInstances.add(instance);

      // Return a destructor. GXT calls this before re-evaluating the formula
      // (for updates) and also during final teardown.
      return () => {
        cached.__gxtDestructorCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
        _queueModifierDestroy({
          cached,
          destroyable: null,
          element,
          modKey,
          cache: self._cache,
          isCustom: true,
        });
      };
    },
  },
};

// =============================================================================
// Component Handling by Type
// =============================================================================

// Build-time-compiled components resolved by NAME from the owner registry
// (see the branch in handleStringComponent) render through a synthesized
// one-tag template, compiled once per component function: one name can be
// registered with different functions (another owner, another test). Each
// function gets its own tag name, because compile.ts keeps ONE scope-value
// slot per template source and every compiled body reads the latest value:
// two functions sharing a template source would render each other.
const _gxtBuildTimeComponentTpls = new WeakMap<object, any>();
let _gxtBuildTimeComponentCount = 0;

// The invocation's blocks in gxt's slot shape. A gxt template reads
// `(has-block-params)` for block `name` from `slots[name + '_']`; the slots
// compile.ts builds for a by-name invocation carry it on the slot function
// (`__hasBlockParams`). Both slot kinds are called as `(slotCtx, ...params)`.
function _gxtInvocationSlots(slots: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!slots || typeof slots !== 'object') return out;
  for (const name of Object.keys(slots)) out[name] = slots[name];
  for (const name of Object.keys(slots)) {
    const slot = slots[name];
    if (typeof slot === 'function' && out[`${name}_`] === undefined) {
      out[`${name}_`] = slot.__hasBlockParams === true;
    }
  }
  return out;
}

// An invocation's forwarded attributes as gxt's `[props, attrs, events]`
// tuple: `fw`, else the args object's, else none (gxt passes `$_edp`, not a
// tuple, when there are none).
function _gxtFwTuple(args: any, fw: any): any[] {
  const propsFromArgs = args?.[$PROPS_SYMBOL];
  return (
    (Array.isArray(fw) ? fw : null) ||
    (Array.isArray(propsFromArgs) ? propsFromArgs : null) || [[], [], []]
  );
}

// An invocation's arguments as gxt's component args object: its own named
// arguments, read from the invocation when the component reads them (so they
// stay current), its blocks, and the forwarded attributes `fw`.
// An argument reads as its value (`argumentValue`: a `(mut x)` cell or a
// `(readonly x)` marker stands for its value), and as what the invocation
// passed in a read of the argument's reference (`readArgumentReference`).
// As Glimmer's args proxy, the object tags an argument with the tag of what
// the argument reads (`_gxtNamedArgTag`), so a dependent key through an
// argument (`@computed('args.hash.firstName')`) follows it.
function _gxtInvocationArgs(invocation: any, fw: any): any {
  const named: Record<string, () => unknown> = {};
  for (const key of Object.keys(invocation || {})) {
    if (key.startsWith('__') || key.startsWith('$') || key === 'args') continue;
    named[key] = () =>
      isReadingArgumentReference() ? invocation[key] : argumentValue(invocation[key]);
  }
  const slots = _gxtInvocationSlots(invocation?.[$SLOTS_SYMBOL] || invocation?.$slots);
  const args = _gxtArgs(named, slots, fw);
  setCustomTagFor(args, _gxtNamedArgTag);
  return args;
}

// The tag of the argument `key` of a component args object: the tag of what
// reading it consumes (Glimmer's `tagForNamedArg`, `track(() =>
// valueForRef(ref))`).
function _gxtNamedArgTag(args: any, key: string): unknown {
  return _classicArgumentTag(() => {
    if (key in args) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      args[key];
    }
  });
}

// The component the synthesized template invokes for `fn`: it calls `fn` as
// gxt calls a component (`new fn(args, fw)`), with the by-name invocation's
// named arguments, blocks and forwarded attributes. The invocation's args
// object arrives as the synthesized template's `@invocation`; `fw` is the
// synthesized element's `...attributes`, i.e. the invocation's.
function _gxtBuildTimeInvoker(fn: any): (gxtArgs: any, fw: any) => any {
  return function GxtBuildTimeInvocation(gxtArgs: any, fw: any) {
    return new fn(_gxtInvocationArgs(gxtArgs.invocation, fw), fw);
  };
}

// The custom component manager factory (`setComponentManager`) of a component
// CLASS: its own, or the nearest one on its prototype chain (@glimmer/component's
// Component, or any custom-managed base), as Glimmer's
// `getInternalComponentManager` finds it. One found first in the internal table
// (a classic or built-in component) is not this kind.
function _customComponentManagerFactory(definition: any): Function | undefined {
  let pointer = definition;
  while (pointer && pointer !== Function.prototype && pointer !== Object.prototype) {
    if (INTERNAL_MANAGERS.has(pointer)) return undefined;
    const factory = COMPONENT_MANAGERS.get(pointer);
    if (factory !== undefined) {
      return typeof factory === 'function' ? factory : undefined;
    }
    pointer = Object.getPrototypeOf(pointer);
  }
  return undefined;
}

// The component manager factory of a component CLASS with a custom component
// manager (see `_customComponentManagerFactory`) but no registered template,
// own or inherited. That is how gxt compiles a .gjs/.gts class with a
// class-body `<template>`: the template becomes an instance field
// (`[$template]`), not a `setComponentTemplate` call, so it exists only once
// the manager has created the component.
function _classBodyComponentManager(definition: any): Function | undefined {
  const factory = _customComponentManagerFactory(definition);
  return factory !== undefined && getComponentTemplate(definition) === undefined
    ? factory
    : undefined;
}

// Render a component class with a custom component manager and a registered
// template (`setComponentTemplate`, own or inherited, or the registry's
// template for its name): its manager creates it from the invocation's
// arguments and the template renders with the manager's context as `this`,
// whether it is invoked by name or lexically. Returns the thunk the component
// manager's callers run to render it. `resolvedName` is the name it was
// invoked by, if it was (its name in the debug render tree).
function _renderCustomManagedComponent(
  definition: any,
  managerFactory: Function,
  args: any,
  fw: any,
  ctx: any,
  owner: any,
  template: any,
  resolvedName?: string
): () => any {
  // RFC-213 custom component managers are classic-only. Native builds DCE
  // `handleCustomManagedComponent` + the eager-validate block below
  // (everything after this throw is unreachable when the flag is false).
  if (!__GXT_CLASSIC_COMPONENTS__) {
    throw new Error(
      '[gxt] custom component managers (setComponentManager) require the classic-components build (this is a native GXT build; the @ember/component emulation was DCE-stripped)'
    );
  }
  // Eagerly validate capabilities so the error propagates to assert.throws()
  // via the captureRenderError / flushRenderErrors mechanism.
  const eagerManager = managerFactory(owner);
  if (eagerManager) {
    const caps = eagerManager.capabilities;
    if (caps && !FROM_CAPABILITIES.has(caps)) {
      const err = new Error(
        capabilitiesErrorPrefix('component') + 'Received: `' + JSON.stringify(caps) + '`'
      );
      captureRenderError(err);
      return () => null;
    }
  }
  return handleCustomManagedComponent(
    definition,
    args,
    fw,
    ctx,
    managerFactory,
    owner,
    template,
    eagerManager,
    resolvedName
  );
}

// Whether `definition`'s template (`template`, else its registered one) is
// one registered for a base class, not for `definition` itself.
function _inheritsComponentTemplate(definition: any, template: any): boolean {
  const raw = _proxyToRaw.get(definition) || definition;
  if (COMPONENT_TEMPLATES.has(raw)) return false;
  const inherited = getComponentTemplate(raw);
  return inherited !== undefined && (template == null || template === inherited);
}

// The nearest template of a component class's chain (`nearestTemplateKind`):
// a registration or a class-body `<template>`, `undefined` when gxt branded no
// class of the chain.
function _nearestTemplateKind(definition: any): 'registered' | 'class-body' | undefined {
  const raw = _proxyToRaw.get(definition) || definition;
  return nearestTemplateKind(raw, (klass) => COMPONENT_TEMPLATES.has(klass));
}

// Whether a component has a class-body `<template>`: gxt compiles one to an
// instance field (`[$template]`), an own property of the component.
function _hasClassBodyTemplate(component: any): boolean {
  return (
    component !== null &&
    typeof component === 'object' &&
    Object.prototype.hasOwnProperty.call(component, _gxtTemplateKey) &&
    typeof component[_gxtTemplateKey] === 'function'
  );
}

// Glimmer's template for a component that has none: `{{yield}}`.
function _gxtDefaultComponentTemplate(this: any): unknown {
  _gxtGetArgs(this, arguments as any);
  const slots = _gxtGetSlots(this, arguments as any);
  return _gxtFin([_gxtSlot('default', () => [], slots, this)], this);
}

// Render a component class whose template is a class-body `<template>` (see
// `_classBodyComponentManager`) as Glimmer renders a custom-managed component:
// its manager creates it from the invocation's arguments, the template renders
// with the manager's context as `this`, and the manager destroys it when it is
// torn down. That is gxt's own protocol for a constructed object carrying a
// `[$template]`: `$_c` adds the object to the caller's render tree and runs
// `object[$template](args)`, and tearing the tree down runs the destructors
// registered on the object. Without a class-body template, the component
// renders Glimmer's default `{{yield}}`.
//
// `args` / `fw` are the invocation's (gxt's args object for a lexical
// invocation, compile.ts's args object for one by name); the component reads
// its arguments from the invocation when it reads them, so a manager's
// `updateComponent` hook is not called. Returns the thunk the component
// manager's callers run to render it.
function _renderClassBodyComponent(
  definition: any,
  managerFactory: Function,
  args: any,
  fw: any,
  ctx: any,
  owner: any
): () => unknown {
  const delegate = managerFactory(owner);
  if (!delegate || typeof delegate.createComponent !== 'function') {
    return () => [];
  }
  const caps = delegate.capabilities;
  if (caps && !FROM_CAPABILITIES.has(caps)) {
    captureRenderError(
      new Error(capabilitiesErrorPrefix('component') + 'Received: `' + JSON.stringify(caps) + '`')
    );
    return () => [];
  }
  const gxtArgs = _gxtInvocationArgs(args, _gxtFwTuple(args, fw));

  return () => {
    let component: any;
    const rendered = _gxtRenderComponentNode(
      () => {
        component = delegate.createComponent(definition, { named: gxtArgs, positional: [] });
        return _gxtComponentNode(delegate, component);
      },
      gxtArgs,
      ctx
    );
    if (caps?.asyncLifecycleCallbacks && typeof delegate.didCreateComponent === 'function') {
      delegate.didCreateComponent(component);
    }
    return rendered;
  };
}

// The gxt render-tree node of a component its manager (`delegate`) created:
// the manager's context, with a gxt tree id, the component's class-body
// template (else Glimmer's default `{{yield}}`) as its `[$template]`, and a gxt
// destructor that destroys the component as the components of a destroyed
// block are (`_gxtDestroyComponentsOfDestroyedBlocks`): its manager's
// `destroyComponent` runs in the run loop that tore the node down.
function _gxtComponentNode(delegate: any, component: any): any {
  const context =
    typeof delegate.getContext === 'function' ? delegate.getContext(component) : component;
  const node = context !== null && typeof context === 'object' ? context : {};
  // gxt adds the node to its render tree by this id before it runs the
  // template (a gxt component class assigns it as a class field).
  if (node[_gxtComponentIdKey] === undefined) {
    node[_gxtComponentIdKey] = _gxtComponentId();
  }
  if (typeof node[_gxtTemplateKey] !== 'function') {
    const classBody = component?.[_gxtTemplateKey];
    Object.defineProperty(node, _gxtTemplateKey, {
      value: typeof classBody === 'function' ? classBody : _gxtDefaultComponentTemplate,
      configurable: true,
      writable: true,
    });
  }
  if (delegate.capabilities?.destructor && typeof delegate.destroyComponent === 'function') {
    const entry: CustomManagedEntry = {
      node: null,
      region: null,
      destroyFn: () => delegate.destroyComponent(component),
      release: () => {},
      destroyed: false,
      order: ++_customManagedOrder,
      block: null,
      blockDestroyed: false,
    };
    _gxtRegisterDestructor(node, () => {
      _queueComponentOfDestroyedBlock(entry);
      _gxtDestroyComponentsOfDestroyedBlocksOutsideSync();
    });
  }
  return node;
}

// Render the node `createNode` returns with gxt's component protocol (`$_c`
// constructs `GxtClassBodyComponent` and runs the node's `[$template]` with
// `gxtArgs`), in the caller's render tree.
function _gxtRenderComponentNode(createNode: () => object, gxtArgs: any, ctx: any): unknown {
  function GxtClassBodyComponent(): object {
    return createNode();
  }
  // The render-tree node the component joins: the caller's, else (a caller
  // that has none, such as a curried component rendered as content) the
  // node being rendered.
  const parent =
    ctx && ctx[_gxtComponentIdKey] !== undefined
      ? ctx
      : (_gxtLibGetParentContext() ?? getGxtRenderer()?.compilePipeline.getRootContext?.());
  return (_gxtC as any)(GxtClassBodyComponent, gxtArgs, parent);
}

/**
 * Handle a string-based component name (e.g., 'foo-bar').
 */
function handleStringComponent(
  name: string,
  args: any,
  fw: any,
  ctx: any,
  owner: any
): (() => any) | null {
  const resolved = resolveComponent(name, owner);
  if (!resolved) {
    return null;
  }

  const { factory, template, manager } = resolved;

  // Build-time-compiled GXT components (.gjs/.gts <template> output)
  // registered in the owner registry. The @lifeart/gxt compiler emits a bare
  // render function (body starts with `$_GET_ARGS(this, arguments)`) with no
  // Ember factory surface at all — no `create`/`extend`, an empty prototype,
  // and no manager/template association — so the classic instantiation path
  // below would throw container's "Failed to create an instance" assert.
  // Detect that shape and invoke it GXT-natively by synthesizing a one-tag
  // runtime template that references it lexically (scopeValues) — the same
  // `$_c(<lexical>)` path build-time-compiled callers use, so all
  // root/tree wiring is inherited from the runtime pipeline. The tag is
  // `_gxtBuildTimeInvoker(fn)`, which hands `fn` the invocation's named
  // arguments and blocks (block params, named blocks, has-block). The
  // invocation's attributes and modifiers (`fw`) become the synthesized
  // template's own (`$fw`), which its `...attributes` hands on, so the
  // component's `...attributes` receives them as Glimmer's would.
  const _btClass = factory?.class;
  if (
    !manager &&
    !template &&
    typeof _btClass === 'function' &&
    typeof (_btClass as any).create !== 'function' &&
    typeof (_btClass as any).extend !== 'function' &&
    (!_btClass.prototype || Object.getOwnPropertyNames(_btClass.prototype).length <= 1) &&
    !COMPONENT_TEMPLATES.has(_btClass) &&
    !INTERNAL_MANAGERS.has(_btClass) &&
    !COMPONENT_MANAGERS.has(_btClass)
  ) {
    const compileFn = getGxtRenderer()?.compilePipeline.compileTemplate;
    if (typeof compileFn === 'function') {
      let tplFactory = _gxtBuildTimeComponentTpls.get(_btClass);
      if (!tplFactory) {
        const tag = `GxtBuildTimeComponent${++_gxtBuildTimeComponentCount}`;
        tplFactory = compileFn(`<${tag} ...attributes @invocation={{this.__gxtBtArgs}} />`, {
          strictMode: true,
          scopeValues: { [tag]: _gxtBuildTimeInvoker(_btClass) },
          moduleName: `gxt-build-time:${name}`,
        });
        _gxtBuildTimeComponentTpls.set(_btClass, tplFactory);
      }
      return () => {
        const resolvedTpl =
          typeof tplFactory === 'function' && !(tplFactory as any).render
            ? (tplFactory as any)(owner)
            : tplFactory;
        if (!resolvedTpl?.render) return null;
        // Forward splat-attrs into `$fw` (see the template-only branches in
        // `handle`): gxt passes `$_edp`, not a tuple, when there are none.
        const propsFromArgs = args?.[$PROPS_SYMBOL];
        const $fw = (Array.isArray(fw) ? fw : null) ||
          (Array.isArray(propsFromArgs) ? propsFromArgs : null) || [[], [], []];
        const renderCtx: any = { __gxtBtArgs: args, owner, $fw };
        const container = document.createDocumentFragment();
        renderTemplateWithParentView(resolvedTpl, renderCtx, container, null);
        return container;
      };
    }
  }

  // A component class whose template is a class-body `<template>` (no
  // template registered for it, and none in the registry): rendered as a
  // lexical invocation renders it, in the caller's render tree.
  if (!template && typeof _btClass === 'function') {
    const classBodyManager = _classBodyComponentManager(_btClass);
    if (classBodyManager !== undefined) {
      return _renderClassBodyComponent(_btClass, classBodyManager, args, fw, ctx, owner);
    }
  }

  // If this component has an internal manager (e.g., Input, Textarea),
  // delegate to handleManagedComponent which properly creates the instance
  // via the manager's create() method with CapturedArguments.
  if (manager && factory?.class) {
    // Check if this is a custom component manager (from setComponentManager)
    // These are factory functions, not internal manager objects
    if (typeof manager === 'function') {
      return _renderCustomManagedComponent(
        factory.class,
        manager,
        args,
        fw,
        ctx,
        owner,
        template,
        name
      );
    }
    // Internal manager (Input, Textarea). One that creates no component (no
    // `create`: Glimmer's `createInstance` capability is off, as for a
    // template-only component's manager) renders the template with no
    // instance, below.
    if (typeof manager.create === 'function') {
      return handleManagedComponent(factory.class, args, fw, ctx, manager, owner);
    }
  }

  // Handle positional params mapping
  // If the component has static positionalParams, map __pos0__, __pos1__, etc. to named args
  const posCount = args.__posCount__;
  if (posCount !== undefined && factory?.class) {
    const positionalParams = factory.class.positionalParams;
    const count = typeof posCount === 'function' ? posCount() : posCount;

    if (positionalParams && Array.isArray(positionalParams)) {
      // positionalParams is an array like ['name', 'age'] - map each positional arg to its name
      // Also build mut source mapping for two-way binding support
      const posSourceGetters = args.__posSourceGetters || [];
      const mutArgSources: Record<string, Function> = {};
      for (let i = 0; i < positionalParams.length && i < count; i++) {
        const paramName = positionalParams[i];
        const posKey = `__pos${i}__`;
        // Capture the getter if available (for reactivity), otherwise use the value directly
        const posDesc = Object.getOwnPropertyDescriptor(args, posKey);
        const posGetter = posDesc?.get;
        const rawValue = posGetter ? posGetter() : args[posKey];

        // Store the original source getter for mut support
        if (posSourceGetters[i]) {
          mutArgSources[paramName] = posSourceGetters[i];
        }

        // Check for conflict between positional param and hash argument
        if (paramName in args && rawValue !== undefined) {
          assert(
            `You cannot specify both a positional param (at position ${i}) and the hash argument \`${paramName}\`.`,
            false
          );
        }

        // Only set if not already defined as a named arg
        if (!(paramName in args) && rawValue !== undefined) {
          const getValue = posGetter
            ? posGetter // Use the original getter for reactivity
            : () => {
                const v =
                  typeof rawValue === 'function' && !rawValue.__isCurriedComponent
                    ? rawValue()
                    : rawValue;
                return v;
              };
          Object.defineProperty(args, paramName, {
            get: getValue,
            enumerable: true,
            configurable: true,
          });
        }

        delete args[posKey];
      }
      // Store mut arg sources on args for the component to pick up
      if (Object.keys(mutArgSources).length > 0) {
        args.__mutArgSources = mutArgSources;
      }
    } else if (typeof positionalParams === 'string') {
      // positionalParams is a string like 'names' - collect all positional args into an array
      const paramName = positionalParams;

      // Check for conflict between positional params and hash argument
      if (paramName in args && count > 0) {
        assert(
          `You cannot specify positional parameters and the hash argument \`${paramName}\`.`,
          false
        );
      }

      // Only set if not already defined as a named arg
      if (!(paramName in args)) {
        // Collect all positional values into an array
        // Store references to the getters since we'll delete __posN__ keys
        const posGetters: Function[] = [];
        for (let i = 0; i < count; i++) {
          const posKey = `__pos${i}__`;
          const rawValue = args[posKey];
          if (rawValue !== undefined) {
            const desc = Object.getOwnPropertyDescriptor(args, posKey);
            if (desc?.get) {
              posGetters.push(desc.get);
            } else {
              posGetters.push(typeof rawValue === 'function' ? rawValue : () => rawValue);
            }
          }
        }

        const getValues = () => {
          return posGetters.map((getter) => getter());
        };

        Object.defineProperty(args, paramName, {
          get: getValues,
          enumerable: true,
          configurable: true,
        });
      }

      for (let i = 0; i < count; i++) {
        delete args[`__pos${i}__`];
      }
    }
    delete args.__posCount__;
  }

  // Build mut arg sources from named args that have __mutParentCtx.
  // This handles (component "foo" val=this.model.val2) where val is a hash arg
  // with a getter that has __mutParentCtx for two-way binding support.
  if (!args.__mutArgSources) {
    const namedMutSources: Record<string, Function> = {};
    for (const key of Object.keys(args)) {
      if (key.startsWith('__') || key === '$slots') continue;
      const desc = Object.getOwnPropertyDescriptor(args, key);
      if (desc?.get && (desc.get as any).__mutParentCtx) {
        namedMutSources[key] = desc.get;
      } else if (typeof args[key] === 'function' && (args[key] as any).__mutParentCtx) {
        namedMutSources[key] = args[key];
      }
    }
    if (Object.keys(namedMutSources).length > 0) {
      args.__mutArgSources = namedMutSources;
    }
  } else {
    // Merge named args mut sources into existing ones (from positional params)
    for (const key of Object.keys(args)) {
      if (key.startsWith('__') || key === '$slots') continue;
      if (args.__mutArgSources[key]) continue; // positional already set
      const desc = Object.getOwnPropertyDescriptor(args, key);
      if (desc?.get && (desc.get as any).__mutParentCtx) {
        args.__mutArgSources[key] = desc.get;
      } else if (typeof args[key] === 'function' && (args[key] as any).__mutParentCtx) {
        args.__mutArgSources[key] = args[key];
      }
    }
  }

  // Capture parentView at closure creation time, not at invocation time.
  // GXT may re-evaluate this closure (e.g., for formula tracking) after the
  // parentView stack has been popped, so we cannot rely on getCurrentParentView()
  // inside the closure.
  //
  // Fallback: ctx (the render context) IS the enclosing component in
  // createRenderContext. For {{#each ... {{else}} ... /each}} inverse-branch
  // invocations and other paths where the block fn executes after the parent
  // stack has popped, ctx still points to the invoking component. Without
  // this fallback, components rendered by the `{{else}}` branch of {{#each}}
  // end up with a null parentView, breaking lifecycle assertions and
  // child-view linkage.
  const _resolveParentViewFromCtx = (c: any): any => {
    if (!c) return null;
    const raw = c.__gxtRawTarget || c;
    // Only treat real view instances (components) as parents — NOT controllers.
    // Controllers have _debugContainerKey too but are not views; tagless components
    // whose template lives at the route level should have parentView = null
    // (matches classic Ember behavior where getRootViews lists them as roots).
    if (raw && typeof raw === 'object' && raw.isView === true && raw._state !== undefined) {
      return raw;
    }
    return null;
  };
  const capturedParentView = getCurrentParentView() || _resolveParentViewFromCtx(ctx);

  // Cache the rendered result. GXT may re-evaluate this closure during
  // formula tracking. When that happens, return the cached DOM result
  // instead of creating duplicate component instances.
  let _cachedResult: any = undefined;
  let _cachedRenderPassId: number = -1;

  return () => {
    // If this closure was already evaluated in this render pass, return cached result.
    // This prevents duplicate component instances when GXT re-evaluates formulas.
    const currentRenderPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
    if (_cachedResult !== undefined && _cachedRenderPassId === currentRenderPassId) {
      return _cachedResult;
    }

    // Init-phase throws (e.g. `init() { throw ... }` on a classic Ember
    // component) propagate up to renderer.ts's try/catch around
    // `template.render(...)`, which clears the DOM and re-throws.
    {
      // Check if this is a template-only component (no backing class).
      // Template-only components have an internal manager set on them and
      // don't need an instance. Just render the template directly.
      const isTemplateOnly =
        factory?.class &&
        (getGxtRenderer()!.compilePipeline.isTemplateOnlyDefinition!(factory.class) ||
          factory.class.__templateOnly === true ||
          factory.class.moduleName === '@glimmer/component/template-only' ||
          (INTERNAL_MANAGERS.has?.(factory.class) && !factory.class.prototype?.init));

      // Re-evaluate at invocation time: if the closure was created with a null
      // parent but the stack has since been populated, prefer the live value.
      const effectiveParentView =
        capturedParentView || getCurrentParentView() || _resolveParentViewFromCtx(ctx);

      const instance =
        factory && !isTemplateOnly
          ? getCachedOrCreateInstance(factory, args, factory.class, owner, effectiveParentView)
          : null;

      let resolvedTemplate = template;
      if (!resolvedTemplate && instance) {
        // Classic Ember precedence: when both `layout` and `layoutName` are set,
        // `layout` wins. Check `layout` first so that an explicitly-assigned
        // compiled template overrides a sibling `layoutName` lookup.
        if (instance.layout) {
          resolvedTemplate = instance.layout;
        }
        // Fall back to layoutName (looks up template by name)
        if (!resolvedTemplate && instance.layoutName && owner) {
          resolvedTemplate =
            owner.lookup(`template:${instance.layoutName}`) ||
            owner.lookup(`template:components/${instance.layoutName}`);
        }
        // Fallback to template registry
        if (!resolvedTemplate) {
          resolvedTemplate =
            getComponentTemplate(instance) ||
            getComponentTemplate(instance.constructor) ||
            getComponentTemplate(factory?.class);
        }
      }

      // If template is a factory function, call it to get the actual template
      if (typeof resolvedTemplate === 'function' && !resolvedTemplate.render) {
        resolvedTemplate = resolvedTemplate(owner);
      }

      if (!resolvedTemplate?.render) {
        // Component without a template - synthesise a default layout that yields
        // the block content (classic Ember's default component layout is just
        // `{{yield}}`). Handle the full shape of slot results: Nodes,
        // DocumentFragments, reactive node thunks, and reactive text getters.
        resolvedTemplate = {
          __gxtCompiled: true,
          render(ctx: any, container: Element) {
            const slots = ctx.$slots || ctx[$SLOTS_SYMBOL] || {};
            if (typeof slots.default !== 'function') {
              return { nodes: [] };
            }
            // Slot functions are bound to the parent scope and already resolve
            // `{{this.x}}` against the calling controller/component. Pass `null`
            // so they don't get re-pointed at the child component's instance.
            const result = slots.default(null);
            const items = Array.isArray(result) ? result : result == null ? [] : [result];
            for (const item of items) {
              if (item instanceof Node) {
                if (item.nodeType === 11) {
                  const kids = Array.from((item as DocumentFragment).childNodes);
                  for (const k of kids) container.appendChild(k);
                } else {
                  container.appendChild(item);
                }
              } else if (typeof item === 'function') {
                _appendSlotFunctionItem(container, item);
              } else if (item != null) {
                container.appendChild(document.createTextNode(String(item)));
              }
            }
            return { nodes: Array.from(container.childNodes) };
          },
        };
      }

      // Check if classic component needs wrapper
      const isClassic =
        instance &&
        (typeof instance.trigger === 'function' || typeof instance._transitionTo === 'function');

      let result;
      if (isClassic) {
        // Classic-curly render path for by-name resolution (gated). The
        // Glimmer branch below must survive a native build; only the classic
        // `renderClassicComponent` subtree is DCE'd.
        if (!__GXT_CLASSIC_COMPONENTS__) {
          throw new Error(
            '[gxt] classic @ember/component requires the classic-components build (this is a native GXT build; the @ember/component emulation was DCE-stripped)'
          );
        }
        result = renderClassicComponent(
          instance,
          resolvedTemplate,
          args,
          fw,
          factory?.class,
          owner
        );
      } else {
        result = renderGlimmerComponent(
          instance,
          resolvedTemplate,
          args,
          fw,
          owner,
          _gxtDebugComponent(ctx, factory?.class, instance, manager, args, name)
        );
      }

      // Cache the result for this render pass to prevent duplicate renders
      _cachedResult = result;
      _cachedRenderPassId = currentRenderPassId;
      return result;
    }
  };
}

// Cache for custom-managed component instances, keyed by ComponentClass -> array of pool entries
const _customManagedPool = new Map<
  any,
  { instance: any; context: any; manager: any; claimed: boolean }[]
>();

// Properties added by createRenderContext that should be hidden from user code on
// custom-managed component instances so deep-equality checks against the user's
// original instance shape still pass.
const _GXT_INTERNAL_CONTEXT_PROPS = [
  '$fw',
  'attrs',
  'args',
  '$slots',
  '__gxtSelfString__',
  '$_hasBlock',
  '$_hasBlockParams',
  // The args-revision cell backs reactivity but must not pollute the user
  // instance's enumerable shape: a custom manager may push the component
  // instance somewhere and deep-compare it later, and these GXT-internal own
  // keys would break that. Hide them so the instance reads as the bare user
  // shape.
  '__gxtArgsRev',
  '__gxtArgsRevCell',
  'nodeType',
  'setInterval',
  'length',
];
function _hideOneProp(target: any, key: string) {
  if (!Object.prototype.hasOwnProperty.call(target, key)) return;
  const desc = Object.getOwnPropertyDescriptor(target, key);
  if (!desc || desc.enumerable === false) return;
  if (desc.configurable === false) return;
  try {
    if ('value' in desc) {
      Object.defineProperty(target, key, {
        value: desc.value,
        writable: desc.writable !== false,
        enumerable: false,
        configurable: true,
      });
    } else {
      Object.defineProperty(target, key, {
        get: desc.get,
        set: desc.set,
        enumerable: false,
        configurable: true,
      });
    }
  } catch {
    /* ignore */
  }
}
function hideGxtInternalPropsOn(target: any) {
  if (!target || typeof target !== 'object') return;
  for (const key of _GXT_INTERNAL_CONTEXT_PROPS) {
    _hideOneProp(target, key);
  }
  // Also strip any remaining `__gxt*`-prefixed own enumerable keys
  // (per-component cells/markers the reactivity may have stamped on the
  // instance).
  {
    try {
      for (const key of Object.keys(target)) {
        if (key.startsWith('__gxt')) _hideOneProp(target, key);
      }
    } catch {
      /* ignore */
    }
  }
}

// Clearing of `_customManagedPool` and `_customManagedInstances` lives in
// `_gxtClearInstancePools` (defined earlier in this file).

/**
 * Handle a component with a custom component manager (from setComponentManager).
 * The manager factory function is called with (owner) to get the actual manager,
 * which implements createComponent(Factory, args) and getContext(instance).
 */
function handleCustomManagedComponent(
  ComponentClass: any,
  args: any,
  fw: any,
  ctx: any,
  managerFactory: Function,
  owner: any,
  template: any,
  preCreatedManager?: any,
  resolvedName?: string
): () => any {
  return () => {
    // Use pre-created manager if available (from eager validation in handleStringComponent),
    // otherwise invoke the factory.
    const actualManager = preCreatedManager || managerFactory(owner);
    if (!actualManager || typeof actualManager.createComponent !== 'function') {
      return null;
    }

    // Build named/positional args from the GXT args object
    const { namedArgs, positionalArgs, liveNamed, livePositional, argGetters, posGetters } =
      buildCustomManagedArgs(args);

    // Check for a cached instance from a previous render pass (for instance reuse on re-render)
    const currentPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
    let pool = _customManagedPool.get(ComponentClass);
    if (!pool) {
      pool = [];
      _customManagedPool.set(ComponentClass, pool);
      // Seed lastPassId so the first invocation in this pass doesn't spuriously
      // reset claimed flags on entries that were just pushed during this same pass.
      (pool as any).__lastPassId = currentPassId;
    }
    // Reset claimed flags only when we've actually advanced to a new render pass.
    if ((pool as any).__lastPassId !== currentPassId) {
      (pool as any).__lastPassId = currentPassId;
      for (const entry of pool) entry.claimed = false;
    }

    let cachedEntry = pool.find((e) => !e.claimed);
    let instance: any;
    let context: any;
    let isRerender = false;
    const asyncCaps = actualManager.capabilities;
    // When the component is created: its place in the creation order, before
    // the components its template renders, and the block it renders in.
    let order = 0;
    let block: object | null = null;

    if (cachedEntry) {
      // Reuse existing instance — call updateComponent
      cachedEntry.claimed = true;
      instance = cachedEntry.instance;
      context = cachedEntry.context;
      isRerender = true;

      // Notify the manager of updated args.
      //
      // Custom managers built with `componentCapabilities('3.13', {})`
      // (or any options bag with no `updateHook` key) end up with
      // `capabilities.updateHook === undefined`. We treat undefined as
      // "call updateComponent", as Ember historically did on every arg
      // change in that case; basic managers depend on it to bridge the new
      // captured args into the component via `set(component, 'args', ...)`.
      //
      // Only suppress the dispatch when the user explicitly set
      // `updateHook: false`, the documented opt-out.
      const newCapturedArgs = { named: namedArgs, positional: positionalArgs };
      const _updateHookExplicitlyFalse = asyncCaps && asyncCaps.updateHook === false;
      if (!_updateHookExplicitlyFalse && typeof actualManager.updateComponent === 'function') {
        actualManager.updateComponent(instance, newCapturedArgs);
      }

      // Update live named/positional on instance.args (non-enumerable to hide from user code)
      if (instance?.args) {
        Object.defineProperty(instance.args, 'named', {
          value: liveNamed,
          writable: true,
          enumerable: false,
          configurable: true,
        });
        Object.defineProperty(instance.args, 'positional', {
          value: livePositional,
          writable: true,
          enumerable: false,
          configurable: true,
        });
      }

      // Call didUpdateComponent if supported
      if (
        asyncCaps?.asyncLifecycleCallbacks &&
        typeof actualManager.didUpdateComponent === 'function'
      ) {
        actualManager.didUpdateComponent(instance);
      }
    } else {
      // A class that inherits its registered template from a base class may
      // have its own class-body `<template>`, which wins over the inherited
      // one (Glimmer renders the nearest). gxt compiles that template to an
      // instance field, so it is known once the component exists: such a
      // component is created as a class-body component is (`classBodyArgs`,
      // its arguments read from the invocation when it reads them) and, when
      // it has one, rendered as one.
      // gxt brands the class that declares a class-body template: a
      // registration nearer than it (an intermediate class's) wins.
      const classBodyArgs =
        _inheritsComponentTemplate(ComponentClass, template) &&
        _nearestTemplateKind(ComponentClass) !== 'registered'
          ? _gxtInvocationArgs(args, _gxtFwTuple(args, fw))
          : null;
      const capturedArgs = { named: classBodyArgs ?? liveNamed, positional: livePositional };
      instance = actualManager.createComponent(ComponentClass, capturedArgs);
      order = ++_customManagedOrder;
      block = _gxtBlockOf(ctx);

      if (classBodyArgs !== null && _hasClassBodyTemplate(instance)) {
        const component = instance;
        const rendered = _gxtRenderComponentNode(
          () => _gxtComponentNode(actualManager, component),
          classBodyArgs,
          ctx
        );
        if (
          asyncCaps?.asyncLifecycleCallbacks &&
          typeof actualManager.didCreateComponent === 'function'
        ) {
          actualManager.didCreateComponent(component);
        }
        return rendered;
      }

      // Get the rendering context (may be null for template-only custom components)
      context =
        typeof actualManager.getContext === 'function'
          ? actualManager.getContext(instance)
          : instance;

      // Cache for future re-renders
      pool.push({
        instance,
        context,
        manager: actualManager,
        claimed: true,
      });

      // Call didCreateComponent if supported
      if (
        asyncCaps?.asyncLifecycleCallbacks &&
        typeof actualManager.didCreateComponent === 'function'
      ) {
        actualManager.didCreateComponent(instance);
      }
    }

    let resolvedTemplate = template;
    if (!resolvedTemplate) {
      resolvedTemplate = getComponentTemplate(ComponentClass);
    }
    if (typeof resolvedTemplate === 'function' && !resolvedTemplate.render) {
      resolvedTemplate = resolvedTemplate(owner);
    }
    if (!resolvedTemplate?.render) {
      return null;
    }

    const container = document.createDocumentFragment();
    const renderContext = createRenderContext(context, args, fw, owner);
    // The sources `(mut @x)` writes for the arguments a curried component
    // (`(component "x" val=this.model.val)`) passes (classic instances carry
    // them as `__mutArgSources`).
    setMutArgumentSources(renderContext, args?.__mutArgSources);

    // Augment renderContext.args with named/positional sub-objects (non-enumerable).
    //
    // A custom-managed component whose template is `<p>{{this.salutation}}</p>`
    // where `salutation` is a PLAIN native getter reading
    // `this.args.positional`/`named` (NO `@computed`) has its text rendered by
    // GXT's own element-child effect (inside glimmer-next, not compile.ts).
    // That effect tracks the GXT cells `this.salutation` reads — but
    // `this.args.positional` is a plain array (no cell), so the effect captures
    // nothing and the text never updates on arg change. Back the
    // `named`/`positional` reads with a per-component GXT "args revision" cell:
    // reading `this.args.named`/`.positional` inside the text effect's tracker
    // frame reads `argsRevCell.value` (subscribing), then returns the live
    // `liveNamed`/`livePositional`. `_installCustomManagedArgEffect` dirties +
    // flushes this cell on a genuine arg change, re-firing the effect which
    // re-reads `this.salutation` fresh.
    let _argsRevCell: any = null;
    if (renderContext) {
      try {
        _argsRevCell = _gxtCellFor(renderContext, '__gxtArgsRev', /* skipDefine */ true);
        if (_argsRevCell) {
          // Seed so the first read has a defined value.
          if (_argsRevCell.value === undefined) _argsRevCell.update(0);
          // Stash the cell + flush helper on the instance/context/renderContext
          // so _installCustomManagedArgEffect can dirty it on arg change.
          (renderContext as any).__gxtArgsRevCell = _argsRevCell;
          if (context) (context as any).__gxtArgsRevCell = _argsRevCell;
          if (instance) (instance as any).__gxtArgsRevCell = _argsRevCell;
        }
      } catch {
        _argsRevCell = null;
      }
    }
    const _defineArgSub = (target: any, key: string, live: any) => {
      if (_argsRevCell) {
        Object.defineProperty(target, key, {
          get() {
            // Subscribe the reading effect to the args-revision cell.
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            try {
              _argsRevCell.value;
            } catch {
              /* ignore */
            }
            return live;
          },
          enumerable: false,
          configurable: true,
        });
      } else {
        Object.defineProperty(target, key, {
          value: live,
          writable: true,
          enumerable: false,
          configurable: true,
        });
      }
    };
    if (renderContext.args) {
      _defineArgSub(renderContext.args, 'named', liveNamed);
      _defineArgSub(renderContext.args, 'positional', livePositional);
    }
    if (instance && instance !== context && instance.args) {
      Object.defineProperty(instance.args, 'named', {
        value: liveNamed,
        writable: true,
        enumerable: false,
        configurable: true,
      });
      Object.defineProperty(instance.args, 'positional', {
        value: livePositional,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }

    // For custom-managed components: hide GXT render-internal properties on the
    // user's instance/context so user code (e.g. updateComponent callbacks that
    // store `component` for later deep comparison) sees a clean object.
    // These were added by createRenderContext as enumerable by default.
    hideGxtInternalPropsOn(renderContext);
    if (instance && instance !== renderContext) hideGxtInternalPropsOn(instance);
    if (context && context !== renderContext && context !== instance)
      hideGxtInternalPropsOn(context);

    // Collect the YIELDED reactive-text getters so updateComponent can re-fire
    // when the host's yielded content changes (e.g.
    // `<FooBar>{{this.value}}</FooBar>` where `foo-bar`'s template is
    // `{{yield}}`). The yielded `{{this.value}}` is rendered by GXT's own text
    // opcode (`resolveRenderable` wraps the getter in a formula → opcodeFor),
    // so the CONTENT updates on change — but nothing tells the custom MANAGER
    // (updateComponent/didUpdateComponent) about it. These deps can't be
    // captured synchronously during `slots.default()` (capturedSize=0); but the
    // getters returned BY `slots.default()` ARE the reactive bindings — read one
    // inside a tracker frame and it subscribes to the same outer cell. Wrap the
    // default slot fn to collect those getters; `_installCustomManagedYieldEffect`
    // reads them in its own gxtEffect and dispatches updateComponent on a genuine
    // change. Initial-render only, and not when updateHook is false.
    const _yieldGetters: Array<() => any> = [];
    if (
      !isRerender &&
      !(asyncCaps && asyncCaps.updateHook === false) &&
      typeof actualManager.updateComponent === 'function'
    ) {
      try {
        const slotsObj: any =
          (renderContext as any)?.$slots ||
          (renderContext as any)?.[$SLOTS_SYMBOL] ||
          (args as any)?.$slots ||
          (args as any)?.[$SLOTS_SYMBOL];
        const origDefault =
          slotsObj && typeof slotsObj.default === 'function' ? slotsObj.default : null;
        if (origDefault && !(origDefault as any).__gxtYieldWrapped) {
          const wrapped = function (this: any, ...slotArgs: any[]) {
            const result = origDefault.apply(this, slotArgs);
            const items = Array.isArray(result) ? result : result == null ? [] : [result];
            return items.map((child: any) => {
              // Only wrap REACTIVE TEXT getters: plain functions that are not
              // node thunks ($_tag/$_c/$_dc/$_eachSync) and not curried
              // components / Nodes. These are `() => this.<path>` bindings.
              if (
                typeof child === 'function' &&
                !(child as any).__isCurriedComponent &&
                !(child instanceof Node)
              ) {
                // Node thunks carry the compiler's `$_isNode` marker.
                const isNodeThunk = (child as any).$_isNode === true;
                if (!isNodeThunk) {
                  _yieldGetters.push(child as () => any);
                }
              }
              return child;
            });
          };
          (wrapped as any).__hasBlockParams = (origDefault as any).__hasBlockParams;
          (wrapped as any).__gxtYieldWrapped = true;
          // Replace on whichever container actually holds the default slot fn so
          // the render (`createSlot` → `value(...)`) invokes the wrapper.
          try {
            slotsObj.default = wrapped;
          } catch {
            /* slot object may be frozen — best-effort */
          }
        }
      } catch {
        /* yield-getter collection is best-effort */
      }
    }

    // The invocation's bound attribute values (`...attributes`, `fw[0]` /
    // `fw[1]`). They are not arguments, but in Glimmer a change to one re-runs
    // the component's update hooks as an argument change does (the attributes
    // are evaluated in the component's invocation, like its arguments).
    const _forwardedGetters: Array<() => any> = [];
    if (
      !isRerender &&
      !(asyncCaps && asyncCaps.updateHook === false) &&
      typeof actualManager.updateComponent === 'function' &&
      Array.isArray(fw)
    ) {
      for (const list of [fw[0], fw[1]]) {
        if (!Array.isArray(list)) continue;
        for (const [key, value] of list) {
          if (typeof key === 'string' && !key.startsWith('@') && typeof value === 'function') {
            _forwardedGetters.push(value);
          }
        }
      }
    }

    // In the debug render tree the component is its manager's context, with the
    // arguments its manager gave it (Glimmer's `getSelf` and captured args).
    renderTemplateWithParentView(
      resolvedTemplate,
      renderContext,
      container,
      context,
      _gxtDebugComponent(
        ctx,
        ComponentClass,
        context ?? null,
        null,
        args,
        resolvedName,
        liveNamed,
        livePositional
      )
    );

    // Re-run the internal-prop hide pass AFTER render. The render path (and the
    // args-revision cell) stamp further GXT-internal own keys (`__gxtArgsRev`,
    // `nodeType`, `setInterval`, `length`, …) on the instance/render-context
    // that the pre-render hide couldn't see yet. A custom manager that pushes
    // the component for deep-equality needs the bare user shape, so strip them
    // now too.
    hideGxtInternalPropsOn(renderContext);
    if (instance && instance !== renderContext) hideGxtInternalPropsOn(instance);
    if (context && context !== renderContext && context !== instance)
      hideGxtInternalPropsOn(context);

    // Set up destructor on initial render only: the component is destroyed with
    // the block it rendered in (`_trackBlockComponent`), or once its nodes left
    // the document (`_gxtDestroyCustomManagedInstances`), whichever comes first.
    if (
      !isRerender &&
      asyncCaps?.destructor &&
      typeof actualManager.destroyComponent === 'function'
    ) {
      const release = () => {
        const idx = pool!.findIndex((e) => e.instance === instance);
        if (idx >= 0) pool!.splice(idx, 1);
      };
      const destroyFn = () => {
        actualManager.destroyComponent(instance);
        release();
      };
      const firstChild = container.firstChild;
      const entry: CustomManagedEntry = {
        node: firstChild,
        region: firstChild !== null ? (_dynamicRegionByFirstNode.get(firstChild) ?? null) : null,
        destroyFn,
        release,
        destroyed: false,
        order,
        block,
        blockDestroyed: false,
      };
      _customManagedInstances.push(entry);
      _trackBlockComponent(entry);
    }

    // Custom-managed arg reactivity.
    //
    // Custom-managed components render their template ONCE via the thunk above.
    // Without a subscription, nothing ties the OUTER arg source cell to either
    // the manager lifecycle hooks or the component's args-derived computed text
    // bindings (e.g. `{{this.salutation}}` where
    // salutation = @computed('args.named.firstName')), so the hooks never fire
    // and the text stays at the snapshot captured on first render.
    //
    // Install a single gxtEffect (initial render only) that READS every arg
    // source getter — subscribing to the outer source cells — and on a genuine
    // change re-dispatches the manager lifecycle hooks AND recomputes the
    // component's `@computed('args.named.*'/'args.positional.*')` CPs (dirtying
    // their cells so the subscribed text effects re-fire).
    if (!isRerender) {
      try {
        _installCustomManagedArgEffect({
          instance,
          context,
          renderContext,
          actualManager,
          asyncCaps,
          argGetters,
          posGetters,
          liveNamed,
          livePositional,
        });
      } catch {
        /* best-effort */
      }

      // Yielded-content and forwarded-attribute reactivity: when the host's
      // YIELDED `{{this.value}}` or a bound attribute it forwards changes (no
      // arg change), re-dispatch the manager lifecycle hooks (updateComponent /
      // didUpdateComponent). Separate from the arg effect above (which only
      // fires on arg changes) so it covers the no-args case
      // (`<FooBar>{{this.value}}</FooBar>`). De-duped by value comparison so
      // exactly one updateComponent fires per genuine change.
      if (_yieldGetters.length > 0 || _forwardedGetters.length > 0) {
        try {
          _installCustomManagedYieldEffect({
            instance,
            context,
            renderContext,
            actualManager,
            asyncCaps,
            yieldGetters: [..._yieldGetters, ..._forwardedGetters],
            argGetters,
            posGetters,
          });
        } catch {
          /* best-effort */
        }
      }
    }

    return container;
  };
}

/**
 * Custom-managed arg-reactivity effect.
 *
 * Subscribes to the outer arg source cells (by reading every `argGetters` /
 * `posGetters` inside a gxtEffect) and, on a genuine change, re-dispatches the
 * manager lifecycle hooks (updateComponent / didUpdateComponent) and recomputes
 * the component's args-derived computed properties so the subscribed template
 * text bindings re-fire. The effect skips its OWN first run (the initial render
 * already produced the current output).
 */
function _installCustomManagedArgEffect(o: {
  instance: any;
  context: any;
  renderContext: any;
  actualManager: any;
  asyncCaps: any;
  argGetters: Record<string, () => any>;
  posGetters: (() => any)[];
  liveNamed: Record<string, any>;
  livePositional: any[];
}): void {
  const { instance, context, renderContext, actualManager, asyncCaps } = o;
  const argGetters = o.argGetters || {};
  const posGetters = o.posGetters || [];
  const namedKeys = Object.keys(argGetters);
  // Nothing to subscribe to (no live arg sources) → no effect.
  if (namedKeys.length === 0 && posGetters.length === 0) return;

  const _recompute = (obj: any, changedKey: string) => {
    try {
      const deps = getGxtRenderer()?.compilePipeline.recomputeDependents?.(obj, changedKey);
      if (deps) {
        for (const { key, value } of deps) {
          try {
            const dc = _gxtCellFor(obj, key, /* skipDefine */ true);
            if (dc) {
              dc.update(value);
              // This effect runs DURING the GXT sync drain (it was re-fired by
              // the dirtied source cell). A `cell.update()` issued mid-drain
              // lands in `tagsToRevalidate` AFTER the drain snapshotted its
              // work list, and the drain's terminal clear wipes it — so the CP
              // cell's text opcode would never re-run. Flush the cell's related
              // opcodes synchronously here so the bound text node updates in the
              // same tick.
              try {
                _gxtFlushCellOpcodes(dc);
              } catch {
                /* ignore */
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  };

  // Seed last-seen values from the snapshot captured at initial render so the
  // effect's first run is a no-op (it only PRIMES the subscription).
  const lastNamed: Record<string, any> = {};
  for (const k of namedKeys) lastNamed[k] = o.liveNamed[k];
  const lastPos: any[] = [];
  for (let i = 0; i < posGetters.length; i++) lastPos[i] = o.livePositional[i];
  let primed = false;
  const _updateHookExplicitlyFalse = asyncCaps && asyncCaps.updateHook === false;

  _gxtEffectWithOwner(instance || context || renderContext, () => {
    // READ every source getter to subscribe to its cells. Build the change set.
    const newNamed: Record<string, any> = {};
    const changedNamed: string[] = [];
    for (const k of namedKeys) {
      let v: any;
      try {
        v = argGetters[k]!();
      } catch {
        v = lastNamed[k];
      }
      newNamed[k] = v;
      if (v !== lastNamed[k]) changedNamed.push(k);
    }
    const newPos: any[] = [];
    let posChanged = false;
    for (let i = 0; i < posGetters.length; i++) {
      let v: any;
      try {
        v = posGetters[i]!();
      } catch {
        v = lastPos[i];
      }
      newPos[i] = v;
      if (v !== lastPos[i]) posChanged = true;
    }

    if (!primed) {
      primed = true;
      return;
    }
    if (changedNamed.length === 0 && !posChanged) return;

    // Record new snapshot before dispatching so a re-entrant read sees fresh.
    for (const k of namedKeys) lastNamed[k] = newNamed[k];
    for (let i = 0; i < posGetters.length; i++) lastPos[i] = newPos[i];

    // (1) Re-dispatch manager lifecycle hooks. updateComponent receives a
    // freshly-captured args object built from the just-read source values.
    // We deliberately do not reuse `o.liveNamed` / `o.livePositional` here:
    // those proxies memoize per render-pass id, and this effect fires without
    // advancing the pass id (no re-render runs), so their getters would
    // return the stale snapshot from initial render. Building plain objects
    // from `newNamed` / `newPos` ensures `this.args.named.<key>` reads fresh
    // after a manager that does `set(component, 'args', args)`.
    const freshNamed: Record<string, any> = {};
    for (const k of namedKeys) freshNamed[k] = newNamed[k];
    const freshPositional: any[] = newPos.slice();
    const newCapturedArgs = {
      named: freshNamed,
      positional: freshPositional,
    };
    try {
      if (!_updateHookExplicitlyFalse && typeof actualManager.updateComponent === 'function') {
        actualManager.updateComponent(instance, newCapturedArgs);
      }
    } catch {
      /* ignore */
    }
    try {
      if (
        asyncCaps?.asyncLifecycleCallbacks &&
        typeof actualManager.didUpdateComponent === 'function'
      ) {
        actualManager.didUpdateComponent(instance);
      }
    } catch {
      /* ignore */
    }

    // (2) Recompute the component's args-derived computed properties so the
    // subscribed text bindings re-fire. The computed declares its dependency
    // as `args.named.<key>` / `args.positional.<i>` / `args.positional.[]`;
    // recomputeDependents matches those against the CP's _dependentKeys.
    const recomputeTargets = [context, renderContext, instance].filter(
      (t, idx, arr) => t && arr.indexOf(t) === idx
    );
    for (const target of recomputeTargets) {
      for (const k of changedNamed) {
        _recompute(target, 'args.named.' + k);
      }
      if (posChanged) {
        _recompute(target, 'args.positional.[]');
        for (let i = 0; i < newPos.length; i++) {
          _recompute(target, 'args.positional.' + i);
        }
      }
    }

    // (3) Re-fire PLAIN native-getter text bindings (`<p>{{this.salutation}}</p>`
    // where `salutation` reads `this.args.positional`/`named` with NO `@computed`).
    // recomputeDependents (step 2) only matches CP-declared dependents; a plain
    // native getter has none. The component's GXT element-child text effect
    // subscribed to the per-component args-revision cell (via the cell-backed
    // `this.args.named`/`.positional` getters that handleCustomManagedComponent
    // installs).
    // Dirty + synchronously flush that cell here so the effect re-runs and
    // re-reads `this.salutation` with the new args this tick. Best-effort.
    try {
      for (const target of recomputeTargets) {
        const revCell = (target as any)?.__gxtArgsRevCell;
        if (revCell && typeof revCell.update === 'function') {
          try {
            revCell.update((revCell.value || 0) + 1);
            _gxtFlushCellOpcodes(revCell);
          } catch {
            /* per-cell best-effort */
          }
        }
      }
    } catch {
      /* re-flush bridge is best-effort */
    }
  });
}

/**
 * Custom-managed yielded-content reactivity.
 *
 * For a custom-managed component whose template yields its block content
 * (`{{yield}}`) and whose invoker yields a reactive binding
 * (`<FooBar>{{this.value}}</FooBar>`), the yielded `{{this.value}}` text node
 * updates correctly on its own (GXT's text opcode subscribes to the outer
 * `value` cell). But the custom manager's `updateComponent` /
 * `didUpdateComponent` hooks never fire on a yielded-content change because
 * nothing connects the outer source cell to the manager lifecycle — the
 * `_installCustomManagedArgEffect` above only subscribes to arg sources, and a
 * no-args component (`<FooBar>…`) has none.
 *
 * Dispatch the hooks by subscribing to the yielded getters collected at render
 * time. Reading each getter inside this effect's tracker frame subscribes to
 * the very same outer cell the text opcode tracks, so the effect re-fires on a
 * genuine yielded-content change. We de-dup by value comparison + prime the
 * first run, so exactly one updateComponent fires per change.
 *
 * Initial-render only (caller). Independent of the arg effect — when only
 * `value` (yielded) changes, only this effect fires; the arg effect stays quiet
 * (args unchanged). The narrow scope (custom-managed + yielded reactive text
 * only) means no non-yielding component or Helpers binding is affected.
 */
function _installCustomManagedYieldEffect(o: {
  instance: any;
  context: any;
  renderContext: any;
  actualManager: any;
  asyncCaps: any;
  yieldGetters: Array<() => any>;
  argGetters: Record<string, () => any>;
  posGetters: (() => any)[];
}): void {
  const { instance, context, renderContext, actualManager, asyncCaps } = o;
  const yieldGetters = o.yieldGetters || [];
  if (yieldGetters.length === 0) return;

  const _updateHookExplicitlyFalse = asyncCaps && asyncCaps.updateHook === false;
  if (_updateHookExplicitlyFalse || typeof actualManager.updateComponent !== 'function') return;

  // Resolve a yielded getter to its underlying primitive/object value. The
  // getter may itself return a nested function or a GXT reactive formula
  // (object with a `value` accessor / `fn`); unwrap a few levels so the
  // comparison is against the resolved value (mirrors glimmer-next deepFnValue).
  const _resolve = (g: () => any): any => {
    let v: any;
    try {
      v = g();
    } catch {
      return undefined;
    }
    let depth = 0;
    while (depth < 5 && v != null) {
      if (typeof v === 'function' && !v.prototype) {
        try {
          v = v();
        } catch {
          break;
        }
      } else if (
        typeof v === 'object' &&
        v !== null &&
        ('value' in v || typeof (v as any).fn === 'function') &&
        // Don't treat a real Node / array as a reactive wrapper.
        !(v instanceof Node) &&
        !Array.isArray(v)
      ) {
        try {
          v = (v as any).value;
        } catch {
          break;
        }
      } else {
        break;
      }
      depth++;
    }
    return v;
  };

  const last: any[] = new Array(yieldGetters.length);
  let primed = false;

  _gxtEffectWithOwner(instance || context || renderContext, () => {
    // READ every yielded getter to subscribe to its outer cell(s) and detect a
    // genuine change.
    let changed = false;
    const next: any[] = new Array(yieldGetters.length);
    for (let i = 0; i < yieldGetters.length; i++) {
      const v = _resolve(yieldGetters[i]!);
      next[i] = v;
      if (primed && v !== last[i]) {
        changed = true;
      }
    }

    if (!primed) {
      primed = true;
      for (let i = 0; i < next.length; i++) last[i] = next[i];
      return;
    }
    if (!changed) return;

    for (let i = 0; i < next.length; i++) last[i] = next[i];

    // Dispatch the manager lifecycle hooks once for this genuine change.
    // updateComponent receives the component's current captured args (the
    // args themselves did not change), as Glimmer passes the bucket's args;
    // read untracked, so this effect does not subscribe to the args.
    const named: Record<string, any> = {};
    for (const k of Object.keys(o.argGetters || {})) named[k] = _untracked(o.argGetters[k]!);
    const positional = (o.posGetters || []).map((getter) => _untracked(getter));
    try {
      actualManager.updateComponent(instance, { named, positional });
    } catch {
      /* ignore */
    }
    try {
      if (
        asyncCaps?.asyncLifecycleCallbacks &&
        typeof actualManager.didUpdateComponent === 'function'
      ) {
        actualManager.didUpdateComponent(instance);
      }
    } catch {
      /* ignore */
    }
  });
}

/**
 * Build named/positional args from GXT args object for custom-managed components.
 *
 * The component reads its arguments' values (Glimmer's args proxy reads each
 * reference through `valueForRef`): a `(mut x)` cell or a `(readonly x)`
 * marker passed as an argument is read as the value it stands for
 * (`argumentValue`). `(mut @x)` in the component's template writes through
 * the argument's reference instead (the `mut` helper, compile.ts).
 */
function buildCustomManagedArgs(args: any) {
  const namedArgs: Record<string, any> = {};
  const positionalArgs: any[] = [];
  const argGetters: Record<string, () => any> = {};
  const posGetters: (() => any)[] = [];

  if (args && typeof args === 'object') {
    const keys = Object.keys(args);
    const posCount = args.__posCount__;
    const resolvedPosCount = typeof posCount === 'function' ? posCount() : posCount || 0;
    for (let i = 0; i < resolvedPosCount; i++) {
      const posKey = `__pos${i}__`;
      const desc = Object.getOwnPropertyDescriptor(args, posKey);
      const getter = desc?.get;
      const value = getter ? getter() : args[posKey];
      positionalArgs.push(
        argumentValue(typeof value === 'function' && !value.prototype ? value() : value)
      );
      if (getter) {
        posGetters.push(() => {
          const v = getter();
          return argumentValue(typeof v === 'function' && !v.prototype ? v() : v);
        });
      } else {
        const argRef = args[posKey];
        posGetters.push(
          typeof argRef === 'function' && !argRef.prototype
            ? () => argumentValue(argRef())
            : () => argumentValue(argRef)
        );
      }
    }

    for (const key of keys) {
      if (key.startsWith('__') || key.startsWith('$') || key === 'class') continue;
      const desc = Object.getOwnPropertyDescriptor(args, key);
      const getter = desc?.get;
      const value = getter ? getter() : args[key];
      if (
        typeof value === 'function' &&
        !value.prototype &&
        !value.__isCurriedComponent &&
        !value.__isMutCell
      ) {
        namedArgs[key] = argumentValue(value());
        argGetters[key] = () => argumentValue(value());
      } else {
        namedArgs[key] = argumentValue(value);
        if (getter) {
          argGetters[key] = () => {
            const v = getter();
            return argumentValue(typeof v === 'function' && !v.prototype ? v() : v);
          };
        }
      }
    }
  }

  // Memoize arg-getter reads per render pass. Without this, `this.args.<key>`
  // invokes the upstream getter (which may chain into a user-defined `get
  // count() { rc++; … }`) on every read. When a child component's formula
  // re-evaluates and reads `this.args.count` multiple times (or when a force-
  // rerender re-renders the same subtree), the upstream getter's side effects
  // fire repeatedly. Glimmer avoids this via per-component tag caching; we
  // approximate it by caching per render-pass id so that repeated reads of the
  // same arg within one render pass share a value.
  const liveNamed: Record<string, any> = {};
  for (const key of Object.keys(namedArgs)) {
    if (argGetters[key]) {
      const origGetter = argGetters[key]!;
      let lastPassId: number = -1;
      let cachedValue: any = undefined;
      const memoGet = function () {
        const currentPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
        if (currentPassId > 0 && currentPassId === lastPassId) {
          return cachedValue;
        }
        const v = origGetter();
        lastPassId = currentPassId;
        cachedValue = v;
        return v;
      };
      Object.defineProperty(liveNamed, key, { get: memoGet, enumerable: true, configurable: true });
    } else {
      liveNamed[key] = namedArgs[key];
    }
  }
  const livePositional: any[] = [];
  for (let i = 0; i < positionalArgs.length; i++) {
    const origPos = posGetters[i]!;
    let lastPassId: number = -1;
    let cachedValue: any = undefined;
    const memoGet = function () {
      const currentPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
      if (currentPassId > 0 && currentPassId === lastPassId) {
        return cachedValue;
      }
      const v = origPos();
      lastPassId = currentPassId;
      cachedValue = v;
      return v;
    };
    Object.defineProperty(livePositional, i, {
      get: memoGet,
      enumerable: true,
      configurable: true,
    });
  }
  Object.defineProperty(livePositional, 'length', { value: positionalArgs.length, writable: true });

  return { namedArgs, positionalArgs, liveNamed, livePositional, argGetters, posGetters };
}

/**
 * Render an unknown dash-cased tag name as a plain HTML custom element.
 * Applies named args as attributes and renders block children as innerHTML.
 */
function renderCustomElement(tagName: string, args: any, fw: any, ctx: any): () => any {
  return () => {
    const el = document.createElement(tagName);
    const gxtEffect = _gxtEffect;

    if (args) {
      for (const key of Object.keys(args)) {
        if (key.startsWith('__') || key.startsWith('$')) continue;
        const desc = Object.getOwnPropertyDescriptor(args, key);
        const getter = desc?.get || (() => args[key]);
        gxtEffect(() => {
          const val = getter();
          if (val !== undefined && val !== null && val !== false) {
            el.setAttribute(key, String(val));
          } else if (val === false) {
            el.removeAttribute(key);
          }
        });
      }
    }

    if (fw && Array.isArray(fw)) {
      const fwProps = fw[0];
      if (Array.isArray(fwProps)) {
        for (const [key, value] of fwProps) {
          const attrKey = key === '' ? 'class' : key;
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(attrKey, String(resolved));
            }
          });
        }
      }
      const fwAttrs = fw[1];
      if (Array.isArray(fwAttrs)) {
        for (const [key, value] of fwAttrs) {
          if (key.startsWith('@')) continue;
          gxtEffect(() => {
            const resolved = typeof value === 'function' ? value() : value;
            if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(key, String(resolved));
            }
          });
        }
      }
      const fwEvents = fw[2];
      if (Array.isArray(fwEvents)) {
        // No component instance here (an unknown HTML tag name): the element
        // owns the modifier effects, so their cleanup is still registered.
        _forwardEventsToElement(el, fwEvents, el);
      }
    }

    const defaultBlock = args?.__defaultBlock__ || args?.__hasBlock__;
    if (typeof defaultBlock === 'function') {
      const blockResult = defaultBlock();
      if (blockResult instanceof Node) {
        el.appendChild(blockResult);
      } else if (typeof blockResult === 'string') {
        el.textContent = blockResult;
      } else if (Array.isArray(blockResult)) {
        for (const item of blockResult) {
          if (item instanceof Node) el.appendChild(item);
          else if (typeof item === 'string') el.appendChild(document.createTextNode(item));
        }
      }
    }

    return el;
  };
}

/**
 * Render a LinkTo internal component as an <a> element.
 * The instance has reactive getters for href, class, id, click, etc.
 * Renders slot content into the <a> and sets up reactive bindings
 * for attributes and block content.
 */
function renderLinkToElement(instance: any, args: any, fw: any): HTMLAnchorElement {
  const el = document.createElement('a');
  const gxtEffect = _gxtEffect;

  // Bridge classic @glimmer/validator tags to GXT effects.
  // Classic _LinkTo reads routing state via consumeTag(tagFor(routing,'currentState')).
  // The dirty notification may land on a DIFFERENT object (router vs routingService,
  // alias chains, etc.), and GXT's effect scheduler does not reliably pick up
  // classic @glimmer/validator tag dirties — so we use a side-channel reactor
  // registered per-element that re-applies the reactive attributes whenever
  // ANY classic tag is dirtied. This keeps href/class/active in sync with
  // router state and @tracked field mutations without depending on the GXT
  // formula re-evaluation path.
  const touchClassicTags = _gxtTouchClassicBridge;

  // Register a side-channel reactor that auto-unsubscribes once the element
  // is no longer connected to the DOM. This avoids leaking reactors across
  // test runs when LinkTo elements are re-rendered. Importantly, the element
  // is created BEFORE insertion into the DOM, so isConnected is false on the
  // first classic-tag dirties that happen during the router transition
  // setup — if we treated those as "detached" and unsubscribed we'd miss
  // the href/active updates that land the moment the transition settles
  // but before the element reaches the document. We therefore only start
  // counting detached ticks AFTER the element has been connected at least
  // once.
  let _hasBeenConnected = false;
  let _disconnectedTicks = 0;
  let _preConnectTicks = 0;
  // Hard-cap on lifetime fires for this LinkTo reactor. The
  // _disconnectedTicks heuristic doesn't trip in routing tests that
  // reattach the same <a> element across transitions, so the reactor
  // can leak across tests and saturate the runloop. 10,000 fires is
  // two orders of magnitude above any plausible real-app bound and
  // bounds the cost of leaked reactors. The cap fires inside the wrapped
  // callback (before invoking cb()) to prevent the runaway from
  // accumulating further work on the runloop.
  let _totalFires = 0;
  const HARD_CAP = 10_000;
  const _registerReactor = (cb: () => void) => {
    let unsub: () => void = () => {};
    const wrapped = () => {
      _totalFires++;
      if (_totalFires > HARD_CAP) {
        try {
          unsub();
        } catch {
          /* ignore */
        }
        return;
      }
      if (el.isConnected) {
        _hasBeenConnected = true;
        _disconnectedTicks = 0;
        cb();
        return;
      }
      if (!_hasBeenConnected) {
        // Before the element ever lands in the DOM: still fire the
        // callback so the latest reactive state is ready the moment the
        // element is inserted. Cap pre-connection firings so we don't
        // leak a reactor on an element that ultimately never gets
        // inserted (e.g., rendered into a discarded branch).
        cb();
        _preConnectTicks++;
        if (_preConnectTicks > 256) {
          try {
            unsub();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      // Was connected, now detached. Allow a brief grace period for
      // re-attachment, then unsubscribe to prevent cross-test leaks.
      _disconnectedTicks++;
      if (_disconnectedTicks > 4) {
        try {
          unsub();
        } catch {
          /* ignore */
        }
      }
    };
    unsub = (_gxtRegisterClassicReactor as any)(wrapped, 'renderLinkToElement');
  };

  // id attribute (doesn't change over the element's lifetime, so no reactor)
  let _lastId: any = undefined;
  const applyId = () => {
    try {
      const id = instance.id;
      if (id && id !== _lastId) {
        el.id = id;
        _lastId = id;
      }
    } catch {
      /* ignore */
    }
  };
  gxtEffect(() => {
    touchClassicTags();
    applyId();
  });

  // class attribute (includes 'ember-view', 'active', 'disabled', etc.)
  let _lastClass: any = undefined;
  const applyClass = () => {
    try {
      const cls = instance.class;
      if (cls != null && cls !== _lastClass) {
        el.className = cls;
        _lastClass = cls;
      }
    } catch {
      /* ignore */
    }
  };
  gxtEffect(() => {
    touchClassicTags();
    applyClass();
  });
  _registerReactor(applyClass);

  // href attribute
  let _lastHref: any = undefined;
  let _hrefAttempts = 0;
  const applyHref = () => {
    try {
      const href = instance.href;
      if (href !== undefined && href !== null && href !== _lastHref) {
        // LinkTo's template binds `href={{this.href}}`: sanitized like any
        // dynamic URL attribute.
        el.setAttribute('href', String(sanitizedAttrValue(el, 'href', href)));
        _lastHref = href;
      }
    } catch (e) {
      // Fall back to '#' so the <a> remains renderable (e.g., tests that
      // render LinkTo without a started router expect href='#/' or '#').
      if (_lastHref !== '#') {
        el.setAttribute('href', '#');
        _lastHref = '#';
      }
      // Capture the error on the very first attempt so test assertions
      // using assert.rejectsAssertion() during initial visit() can see it
      // (e.g., LinkTo to a route with unsupplied dynamic segments). Later
      // re-runs of applyHref (classic-tag bridge, reactor) must NOT capture
      // repeatedly — that would leak an error across subsequent tests.
      if (_hrefAttempts === 0) {
        try {
          captureRenderError(e);
        } catch {
          /* ignore */
        }
      }
      _hrefAttempts++;
    }
  };
  gxtEffect(() => {
    touchClassicTags();
    applyHref();
  });
  _registerReactor(applyHref);

  // LinkTo's template is `<a id class role title rel tabindex target
  // ...attributes href={{this.href}} {{on 'click' this.click}}>`. As in
  // Glimmer, a forwarded attribute replaces an own one written before
  // `...attributes`, and the own `href`, written after it, replaces a
  // forwarded `href`.
  const forwardedNames = _forwardedAttrNames(fw);

  // Optional attributes from the LinkTo template
  const optionalAttrs = ['role', 'title', 'rel', 'tabindex', 'target'];
  for (const attr of optionalAttrs) {
    if (forwardedNames.has(attr)) continue;
    gxtEffect(() => {
      try {
        const val = instance[attr];
        if (val !== undefined && val !== null) {
          el.setAttribute(attr, String(val));
        } else {
          el.removeAttribute(attr);
        }
      } catch {
        /* ignore */
      }
    });
  }

  // Click handler
  if (typeof instance.click === 'function') {
    el.addEventListener('click', (e: Event) => {
      try {
        instance.click(e);
      } catch {
        // click handler may throw if routing service is unavailable
      }
    });
  }

  // Apply forwarded attributes (...attributes) from fw, except `href`.
  if (fw && Array.isArray(fw)) {
    if (Array.isArray(fw[0])) {
      _forwardPropsToElement(
        el,
        fw[0].filter(([key]: [string, unknown]) => key !== 'href'),
        instance
      );
    }
    if (Array.isArray(fw[1])) {
      for (const [key, value] of fw[1]) {
        if (key.startsWith('@') || key === 'href') continue;
        gxtEffect(() => {
          const resolved = _forwardedAttrValue(el, key, value);
          if (resolved !== undefined && resolved !== null && resolved !== false) {
            el.setAttribute(key, String(resolved));
          } else {
            el.removeAttribute(key);
          }
        });
      }
    }
    if (Array.isArray(fw[2])) {
      _forwardEventsToElement(el, fw[2], instance || el);
    }
  }

  // Render slot content ({{yield}} / block content) into the <a> element.
  // Use raw children (unevaluated getter functions) for reactive text updates.
  // Each getter is wrapped in a gxtEffect so GXT cell reads inside the getter
  // are tracked and the text node updates when the cell changes.
  //
  // For static text (strings), render directly without effect wrapping.
  const rawChildren = args?.__rawSlotChildren;
  if (rawChildren && rawChildren.length > 0) {
    for (const child of rawChildren) {
      if (typeof child === 'function') {
        _appendSlotFunctionItem(el, child);
      } else if (child instanceof Node) {
        el.appendChild(child);
      } else if (child != null) {
        el.appendChild(document.createTextNode(String(child)));
      }
    }
  } else {
    // Fallback: use slot function (for block content from ember-gxt-wrappers path)
    const slots = args?.[$SLOTS_SYMBOL] || args?.$slots || {};
    if (typeof slots.default === 'function') {
      const result = slots.default(null);
      const items = Array.isArray(result) ? result : [result];
      for (const item of items) {
        if (item instanceof Node) {
          el.appendChild(item);
        } else if (typeof item === 'function') {
          // e.g. {{this.title}} inside {{#link-to}}: rendered as live text,
          // not as the stringified function.
          _appendSlotFunctionItem(el, item);
        } else if (item != null) {
          el.appendChild(document.createTextNode(String(item)));
        }
      }
    }
  }

  return el;
}

// Cache for managed component instances and DOM elements (Input, Textarea, LinkTo).
// GXT re-invokes handle() on reactive updates, creating new InternalComponent
// instances (new guidFor ids, losing ForkedValue state). This cache ensures
// the same instance+element are reused across re-renders within the same owner.
// Keyed by owner → { slots: Map<slotKey, { instance, renderFn }>, callCounter }.
// The call counter resets at the start of each render pass so that sequential
// invocations match to the same slot across re-renders.
//
// Each slot holds mutable "arg backing" maps (argGetters, namedRefSlots) that
// are swapped in place on every re-invocation. Closures in the renderFn and
// the sync callback read from these mutable maps, and the instance's
// `this.args.named.X.value` ref reads through `namedRefSlots[X].getter`.
// This lets us refresh the upstream args on cache HIT without re-creating the
// instance — which matters when the SAME owner renders two DIFFERENT templates
// (e.g., index.hbs and about.hbs both with <LinkTo @route=...>) and the slot
// #0 assignment would otherwise return a renderFn closed over the wrong
// template's args, leaking the previous route's href/attrs into the new DOM.
interface _ManagedSlot {
  instance: any;
  renderFn: () => any;
  liveEl?: HTMLElement;
  argGetters: Record<string, () => any>;
  namedRefSlots: Record<string, { getter: () => any }>;
  lastArgValues: Record<string, any>;
  // Latest (args, fw) from the most recent invocation. Refreshed on every
  // cache HIT so renderFn can read args.__rawSlotChildren / fw forwards from
  // the CURRENT template instead of the closed-over first-invocation values.
  latestArgs: any;
  latestFw: any;
}
const _managedComponentCache = new WeakMap<
  object,
  {
    slots: Map<string, _ManagedSlot>;
    callCounter: Map<any, number>;
  }
>();
// Per-component-class id for the slot keys above.
const _managedComponentIds = new WeakMap<object, number>();
let _nextManagedComponentId = 0;
function _managedComponentId(komp: object): number {
  let id = _managedComponentIds.get(komp);
  if (id === undefined) {
    id = _nextManagedComponentId++;
    _managedComponentIds.set(komp, id);
  }
  return id;
}

// Build a named-arg getter map from the current `args` object. Used both
// at initial construction (by argsForInternalManager via refSlots below) and
// at every cache HIT to refresh the instance's view of upstream args.
function _collectNamedArgGetters(args: any): Record<string, () => any> {
  const out: Record<string, () => any> = {};
  if (!args) return out;
  for (const key of Object.keys(args)) {
    if (key.startsWith('$') || key === 'args') continue;
    const desc = Object.getOwnPropertyDescriptor(args, key);
    out[key] = desc?.get || (() => args[key]);
  }
  return out;
}

// Build argGetters map used by syncCallback / reactive attribute setup.
// Shared by the initial path and the cache-HIT refresh so both produce the
// same shape.
function _collectAllArgGetters(args: any, fw: any): Record<string, () => any> {
  const argGetters = _collectNamedArgGetters(args);
  if (fw && Array.isArray(fw)) {
    for (const fwSet of [fw[0], fw[1]]) {
      if (!Array.isArray(fwSet)) continue;
      for (const [key, value] of fwSet) {
        const attrKey = key === '' ? 'class' : key;
        if (attrKey.startsWith('@') || attrKey === '__splatLocal__') continue;
        if (argGetters[attrKey]) continue;
        argGetters[attrKey] = typeof value === 'function' ? value : () => value;
      }
    }
  }
  return argGetters;
}

// Same as argsForInternalManager but backed by a mutable `namedRefSlots`
// record so the ref.value getter can be redirected to a fresh upstream
// getter on each cache HIT. Returns both the CapturedArguments-compatible
// wrapper and the mutable slot map to rewrite later.
function _argsForInternalManagerWithSlots(
  args: any,
  fw: any
): {
  capture: () => { positional: any[]; named: Record<string, any> };
  namedRefSlots: Record<string, { getter: () => any }>;
} {
  const namedRefSlots: Record<string, { getter: () => any }> = {};
  const named: Record<string, any> = {};
  for (const key of Object.keys(args || {})) {
    if (key.startsWith('$') || key === 'args') continue;
    const desc = Object.getOwnPropertyDescriptor(args, key);
    const initialGetter = desc?.get || (() => args[key]);
    const slot = { getter: initialGetter };
    namedRefSlots[key] = slot;

    let initialValue: any;
    try {
      initialValue = slot.getter();
    } catch {
      initialValue = undefined;
    }
    const hasMutCell = initialValue && initialValue.__isMutCell;
    const isUpdatable = hasMutCell;

    const ref: any = {
      get value() {
        const v = slot.getter();
        if (v && v.__isMutCell) return v.value;
        if (v && v.__isReadonly) return v.__readonlyValue;
        return v;
      },
      set value(v: any) {
        const current = slot.getter();
        if (current && current.__isMutCell) {
          current.update(v);
          return;
        }
        const d = Object.getOwnPropertyDescriptor(args, key);
        if (d?.set) d.set(v);
      },
    };
    if (isUpdatable) {
      ref.update = function (v: any) {
        const current = slot.getter();
        if (current && current.__isMutCell) {
          current.update(v);
          return;
        }
        const d = Object.getOwnPropertyDescriptor(args, key);
        if (d?.set) d.set(v);
      };
    }
    named[key] = ref;
  }
  return {
    capture() {
      return { positional: [], named };
    },
    namedRefSlots,
  };
}

// On cache HIT, repoint the slot's mutable arg backings at the NEW invocation's
// args/fw. This keeps the reused instance semantically equivalent to a freshly
// created one without the DOM churn / id bump of reconstruction. Closures
// inside renderFn + syncCallback read through the mutable objects we mutate
// here, so they pick up the swap transparently. Clearing lastArgValues forces
// the sync callback to push every attribute on the next tick, ensuring the
// new template's values (e.g., href, class, disabled) flush to the DOM even
// when their literal values happen to match what was cached.
function _refreshManagedSlotArgs(slot: _ManagedSlot, args: any, fw: any): void {
  // Swap the latest args/fw so renderFn reads fresh slot children / fw forwards.
  slot.latestArgs = args;
  slot.latestFw = fw;
  const fresh = _collectAllArgGetters(args, fw);
  for (const key of Object.keys(slot.argGetters)) {
    if (!(key in fresh)) delete slot.argGetters[key];
  }
  for (const key of Object.keys(fresh)) {
    slot.argGetters[key] = fresh[key];
  }
  // Redirect each existing named-arg ref to the freshest upstream getter.
  // Add new keys that were absent at creation; swallow frozen-named errors.
  //
  // When an arg that was present at creation is NOT in the new invocation's
  // args, we must DELETE it from args.named (not just null the getter). LinkTo
  // uses `'model' in this.args.named` to decide whether the link is model-bound.
  // If we kept a stale 'model' key with value undefined, the LinkTo would
  // compute `isLoading = true` (undefined model is "missing") and render with
  // `class="loading" href="#"` — breaking navigation across templates that
  // reuse the same managed slot with different arg shapes (e.g. /about's
  // <LinkTo @route='item' @model={{person}}> cache-hitting /item's
  // <LinkTo id='home-link' @route='index'>).
  const freshNamed = _collectNamedArgGetters(args);
  const liveNamed = slot.instance?.args?.named;
  for (const key of Object.keys(slot.namedRefSlots)) {
    if (key in freshNamed) {
      slot.namedRefSlots[key].getter = freshNamed[key];
    } else {
      // Arg missing in new invocation: drop the key so `X in args.named`
      // guards reflect the new template's arg shape accurately.
      delete slot.namedRefSlots[key];
      if (liveNamed && typeof liveNamed === 'object') {
        try {
          delete (liveNamed as any)[key];
        } catch {
          /* frozen */
        }
      }
    }
  }
  for (const key of Object.keys(freshNamed)) {
    if (slot.namedRefSlots[key]) continue;
    slot.namedRefSlots[key] = { getter: freshNamed[key] };
    try {
      const named = slot.instance?.args?.named;
      if (named && typeof named === 'object' && !(key in named)) {
        const refSlot = slot.namedRefSlots[key];
        const ref: any = {
          get value() {
            const v = refSlot.getter();
            if (v && v.__isMutCell) return v.value;
            if (v && v.__isReadonly) return v.__readonlyValue;
            return v;
          },
        };
        Object.defineProperty(named, key, {
          configurable: true,
          enumerable: true,
          value: ref,
          writable: true,
        });
      }
    } catch {
      /* ignore frozen */
    }
  }
  for (const key of Object.keys(slot.lastArgValues)) {
    delete slot.lastArgValues[key];
  }
  for (const key of Object.keys(slot.argGetters)) {
    try {
      slot.lastArgValues[key] = slot.argGetters[key]();
    } catch {
      /* ignore */
    }
  }
}

// Generation counter: increments on each render/sync pass.
// Used to detect when handleManagedComponent enters a new render cycle
// so that the per-komp call counters can be reset.
let _managedComponentGeneration = 0;
const _managedComponentLastGeneration = new WeakMap<object, number>();

// Called at the start of each render/sync pass to advance the generation
// (internal-test-helpers' run loop calls it through the
// `compilePipeline.resetManagedComponentCounters` bridge member).
function _resetManagedComponentCounters(): void {
  _managedComponentGeneration++;
}

/**
 * Handle a component with an internal manager (Input, Textarea, LinkTo).
 * Instead of going through the full template render pipeline, we directly
 * create the DOM element and wire up reactive bindings via GXT effects, which
 * avoids createRenderContext overwriting instance.args.
 */
function handleManagedComponent(
  komp: any,
  args: any,
  fw: any,
  ctx: any,
  manager: any,
  owner: any
): () => any {
  // Check cache using owner + komp + invocation-order as key.
  // Multiple invocations of the same komp within one render pass
  // (e.g., <Input @type="text" /><Input @type="file" />) get
  // distinct slots via a sequential counter that resets per sync.
  if (owner && typeof owner === 'object') {
    let cache = _managedComponentCache.get(owner);
    if (!cache) {
      cache = { slots: new Map(), callCounter: new Map() };
      _managedComponentCache.set(owner, cache);
    }
    // Reset call counters when entering a new render generation
    const lastGen = _managedComponentLastGeneration.get(owner) || -1;
    if (lastGen !== _managedComponentGeneration) {
      cache.callCounter.clear();
      _managedComponentLastGeneration.set(owner, _managedComponentGeneration);
    }

    const callIdx = cache.callCounter.get(komp) || 0;
    cache.callCounter.set(komp, callIdx + 1);
    const slotKey = `${_managedComponentId(komp)}#${callIdx}`;

    const cached = cache.slots.get(slotKey);
    if (cached) {
      const inst = cached.instance;
      // Cache HIT: point the slot's mutable arg backings at the NEW
      // invocation's args/fw so the reused instance + renderFn + syncCallback
      // read from the freshest upstream getters. Without this, when two
      // different templates (e.g., index.hbs and about.hbs) render the SAME
      // internal component slot, the renderFn returned on the second template
      // would still close over the first template's args object, leaking
      // stale href/route/model/attrs into the new DOM.
      _refreshManagedSlotArgs(cached, args, fw);
      // Cache HIT means the parent formula is being re-evaluated to push new
      // args down. In classic Glimmer, this would create a fresh component
      // instance with a fresh ForkedValue. Since we reuse the instance to
      // preserve identity, we must manually sync the input's ForkedValue
      // fork to the current upstream value. We also directly write the
      // upstream value to the live DOM element — because the old gxtEffect
      // tied to the OLD LocalValue isn't guaranteed to re-fire when the
      // primitive value equals (a new LocalValue may have been assigned
      // and the old effect is disconnected from it).
      if (inst && inst._value && typeof inst._value.__syncFromUpstream === 'function') {
        inst._value.__syncFromUpstream();
        if (cached.liveEl && cached.liveEl.isConnected) {
          try {
            const upstreamVal = inst.value;
            const stringVal = upstreamVal == null ? '' : String(upstreamVal);
            if ((cached.liveEl as HTMLInputElement).value !== stringVal) {
              (cached.liveEl as HTMLInputElement).value = stringVal;
            }
          } catch {
            /* ignore */
          }
        }
      }
      return cached.renderFn;
    }
  }

  // Collect arg getters for later use in sync callbacks.
  // These getters read from the parent context (e.g., () => this.value).
  // We build the map via the shared helper so the cache-HIT refresh path
  // (which must produce the same shape) stays in lockstep.
  const argGetters: Record<string, () => any> = _collectAllArgGetters(args, fw);

  const internalArgsWithSlots = _argsForInternalManagerWithSlots(args, fw);
  const internalArgs = { capture: internalArgsWithSlots.capture };
  const instance = manager.create(
    owner,
    komp,
    internalArgs,
    {},
    {},
    formula(() => ctx)
  );

  // Slot reference captured by closure — allows renderFn to update liveEl
  // and the cache-HIT path to read it without additional lookups.
  // Holds the mutable argGetters/namedRefSlots/lastArgValues that the refresh
  // path rewrites on cache HIT. We also carry `latestArgs` and `latestFw` so
  // the renderFn (which is invoked anew on every #each iteration) reads the
  // freshest args/fw instead of closure-captured stale values — important for
  // LinkTo where the renderFn's inner renderer reads args.__rawSlotChildren
  // and forwards fw attributes directly.
  const slotRef: _ManagedSlot & { latestArgs: any; latestFw: any } = {
    instance,
    renderFn: null as any,
    argGetters,
    namedRefSlots: internalArgsWithSlots.namedRefSlots,
    lastArgValues: {},
    latestArgs: args,
    latestFw: fw,
  };

  const renderFn = () => {
    // Determine component type from the static toString() method
    const componentType = komp?.toString?.();

    // LinkTo: render as <a> element with reactive bindings.
    // Read args/fw through slotRef so that each call (including cache-HIT
    // re-invocations from a different template) uses the freshest upstream
    // values for block children and forwarded attributes. The instance itself
    // resolves reactive props (href, class, etc.) via args.named refs that
    // _refreshManagedSlotArgs also repoints on each HIT.
    if (componentType === 'LinkTo') {
      // Classic <LinkTo> rendering (gated). Native builds DCE
      // `renderLinkToElement`; the native implementation is link-to.gts.
      if (!__GXT_CLASSIC_COMPONENTS__) {
        throw new Error(
          '[gxt] <LinkTo> requires the classic-components build (this is a native GXT build; the @ember/component emulation was DCE-stripped)'
        );
      }
      return renderLinkToElement(instance, slotRef.latestArgs, slotRef.latestFw);
    }

    // Create the <input> or <textarea> element directly
    const tagName = componentType === 'Textarea' ? 'textarea' : 'input';
    const el = document.createElement(tagName);
    // Store as liveEl on the cache slot so cache HITs on parent re-render
    // can push the fresh upstream value directly to the in-DOM element.
    slotRef.liveEl = el;

    // Set initial attributes and set up reactive bindings
    const gxtEffect = _gxtEffect;

    // id attribute — set once eagerly (guidFor is stable per instance)
    el.id = instance.id;

    // class attribute
    gxtEffect(() => {
      const cls = instance.class;
      if (cls) el.className = cls;
    });

    // type attribute (for input elements)
    if (tagName === 'input') {
      gxtEffect(() => {
        const type = instance.type;
        if (type) el.setAttribute('type', type);
      });
    }

    // checked attribute (for checkboxes)
    gxtEffect(() => {
      const checked = instance.checked;
      if (checked !== undefined) {
        (el as HTMLInputElement).checked = !!checked;
      }
    });

    // For range inputs, min/max/step must be set BEFORE value so the browser
    // does not clamp value against the default [0,100] range.
    const _rangeConstraintAttrs = ['min', 'max', 'step'];
    const _appliedRangeAttrs = new Set<string>();
    for (const rAttr of _rangeConstraintAttrs) {
      if (rAttr in args) {
        _appliedRangeAttrs.add(rAttr);
        const rDesc = Object.getOwnPropertyDescriptor(args, rAttr);
        const rGetter = rDesc?.get || (() => args[rAttr]);
        gxtEffect(() => {
          const rVal = rGetter();
          if (rVal !== undefined && rVal !== null && rVal !== false) {
            el.setAttribute(rAttr, String(rVal));
          } else {
            el.removeAttribute(rAttr);
          }
        });
      }
    }
    if (fw && Array.isArray(fw)) {
      const fwDomAttrs1 = fw[1];
      if (Array.isArray(fwDomAttrs1)) {
        for (const [key, value] of fwDomAttrs1) {
          if (_rangeConstraintAttrs.includes(key) && !_appliedRangeAttrs.has(key)) {
            _appliedRangeAttrs.add(key);
            gxtEffect(() => {
              const rVal = typeof value === 'function' ? value() : value;
              if (rVal !== undefined && rVal !== null && rVal !== false) {
                el.setAttribute(key, String(rVal));
              } else {
                el.removeAttribute(key);
              }
            });
          }
        }
      }
      const fwProps1 = fw[0];
      if (Array.isArray(fwProps1)) {
        for (const [key, value] of fwProps1) {
          if (_rangeConstraintAttrs.includes(key) && !_appliedRangeAttrs.has(key)) {
            _appliedRangeAttrs.add(key);
            gxtEffect(() => {
              const rVal = typeof value === 'function' ? value() : value;
              if (rVal !== undefined && rVal !== null && rVal !== false) {
                el.setAttribute(key, String(rVal));
              } else {
                el.removeAttribute(key);
              }
            });
          }
        }
      }
    }

    // value property - use direct DOM property setting for proper behavior
    gxtEffect(() => {
      const value = instance.value;
      if (value !== undefined && value !== null) {
        // Preserve cursor position when updating value
        const activeEl = document.activeElement;
        if (activeEl === el) {
          const start = (el as HTMLInputElement).selectionStart;
          const end = (el as HTMLInputElement).selectionEnd;
          (el as HTMLInputElement).value = String(value);
          try {
            (el as HTMLInputElement).setSelectionRange(start, end);
          } catch {
            // setSelectionRange may fail for some input types
          }
        } else {
          (el as HTMLInputElement).value = String(value);
        }
      } else if (value === undefined || value === null) {
        (el as HTMLInputElement).value = '';
      }
    });

    // Two-way binding re-sync on upstream SOURCE change.
    //
    // The `value` effect above reads `instance.value` (= ForkedValue.get()),
    // which reads BOTH the upstream arg AND the local fork cell. So it re-fires
    // on user typing (local fork dirtied) as well as on parent arg pushes. But
    // ForkedValue.get() keeps the local fork whenever the new upstream PRIMITIVE
    // equals the last-synced one — which is wrong when the parent swaps the
    // SOURCE object in place (e.g. `set(ctx,'model',{val:X})` where the new
    // `.val` happens to equal the pre-typing upstream value, after the user
    // locally edited the fork). In classic Glimmer a fresh component instance
    // (with a fresh ForkedValue) would be created on such a push; here the
    // instance is reused, so we must reset the fork explicitly.
    //
    // This dedicated effect subscribes ONLY to the upstream source cells (it
    // never reads the local fork). It therefore re-fires precisely when the
    // PARENT re-pushes the bound value — including an object-identity swap whose
    // leaf primitive is unchanged — and NOT when the user types (which only
    // dirties the local fork). On every re-push (i.e. any run after the first)
    // we discard the local fork via __syncFromUpstream so the input reflects the
    // freshest upstream value, matching classic two-way-binding semantics.
    {
      const fv: any = (instance as any)._value;
      if (
        fv &&
        typeof fv.__peekUpstream === 'function' &&
        typeof fv.__syncFromUpstream === 'function'
      ) {
        let _firstUpstreamRun = true;
        gxtEffect(() => {
          // Read the upstream value to (a) subscribe to the upstream source
          // cells and (b) detect re-pushes. We intentionally ignore the value
          // returned here for equality purposes — a GXT cell dirty re-fires the
          // effect even when the primitive value is unchanged (per the
          // update-anyway contract), which is exactly the object-swap signal.
          //
          // IMPORTANT: this effect must read ONLY the upstream (never the local
          // fork). Reading `instance.value` (= ForkedValue.get(), which also
          // reads the local fork cell) would subscribe this effect to the local
          // cell, so subsequent user typing would re-fire it and wipe the typed
          // value via __syncFromUpstream. We therefore use the peeked upstream
          // value (which, after __syncFromUpstream, equals the local fork) for
          // the DOM write rather than re-reading `instance.value`.
          const upstreamVal = fv.__peekUpstream();
          if (_firstUpstreamRun) {
            _firstUpstreamRun = false;
            return;
          }
          // Parent re-pushed the bound value: discard the local fork.
          fv.__syncFromUpstream();
          // Push the synced upstream value directly to the live element. The
          // `value` effect (subscribed to the local fork cell that
          // __syncFromUpstream just set) will also re-run, but writing here
          // guarantees the DOM is correct within this synchronous flush
          // regardless of effect ordering.
          try {
            const stringVal = upstreamVal == null ? '' : String(upstreamVal);
            if ((el as HTMLInputElement).value !== stringVal) {
              const activeEl = document.activeElement;
              if (activeEl === el) {
                const start = (el as HTMLInputElement).selectionStart;
                const end = (el as HTMLInputElement).selectionEnd;
                (el as HTMLInputElement).value = stringVal;
                try {
                  (el as HTMLInputElement).setSelectionRange(start, end);
                } catch {
                  /* setSelectionRange may fail for some input types */
                }
              } else {
                (el as HTMLInputElement).value = stringVal;
              }
            }
          } catch {
            /* best-effort DOM sync */
          }
        });
      }
    }

    // Wire up event handlers.
    // Wrap handlers to suppress a re-render during user interaction — the
    // interaction updates the component's local value (ForkedValue.set), NOT the
    // parent arg. A force-rerender would re-create the element using the
    // parent's stale value, clobbering the user's input. We clear the pending
    // sync after the handler; the next parent arg change triggers a proper sync.
    const wrapHandler = (handler: (e: Event) => void) => (e: Event) => {
      // Suppress rendering during the handler. Otherwise @tracked setters
      // inside the handler would trigger a re-render and mark a sync pending,
      // dirtying cells and scheduling a sync whose gxtSyncDom() re-runs the
      // gxtEffect that reads instance.value before the ForkedValue has been
      // re-read, so it might return the upstream value.
      //
      // `withCurrentlyRendering(fn)` runs `fn` with the currently-rendering flag
      // set. The pending-sync cleanup is kept in a tail `finally` so it runs
      // regardless of bridge availability. The bridge helper is optional
      // (classic builds never install it); without it the handler is called
      // directly.
      const wcr = getGxtRenderer()?.compilePipeline.withCurrentlyRendering;
      try {
        if (typeof wcr === 'function') {
          wcr(() => handler(e));
        } else {
          handler(e);
        }
      } finally {
        // Clear any pending sync that was scheduled during the handler. These
        // flags live in compile.ts and are written through the bridge setters.
        const _cpWH = getGxtRenderer()?.compilePipeline;
        _cpWH?.setPendingSync?.(false);
        _cpWH?.setPendingSyncFromPropertyChange?.(false);
      }
    };
    if (typeof instance.change === 'function') {
      el.addEventListener(
        'change',
        wrapHandler((e: Event) => instance.change(e))
      );
    }
    if (typeof instance.input === 'function') {
      el.addEventListener(
        'input',
        wrapHandler((e: Event) => instance.input(e))
      );
    }
    if (typeof instance.keyUp === 'function') {
      el.addEventListener(
        'keyup',
        wrapHandler((e: Event) => instance.keyUp(e))
      );
    }
    if (typeof instance.valueDidChange === 'function') {
      el.addEventListener(
        'paste',
        wrapHandler((e: Event) => instance.valueDidChange(e))
      );
      el.addEventListener(
        'cut',
        wrapHandler((e: Event) => instance.valueDidChange(e))
      );
    }

    // Apply forwarded attributes (...attributes) from fw with reactive bindings
    if (fw && Array.isArray(fw)) {
      const fwAttrs = fw[0]; // DOM properties [key, value][]
      if (Array.isArray(fwAttrs)) {
        _forwardPropsToElement(el, fwAttrs, instance);
      }
      // Apply forwarded DOM attrs from fw[1] (attrs with key=value) reactively
      const fwDomAttrs = fw[1];
      if (Array.isArray(fwDomAttrs)) {
        for (const [key, value] of fwDomAttrs) {
          if (key.startsWith('@')) continue; // Skip named args
          gxtEffect(() => {
            const resolved = _forwardedAttrValue(el, key, value);
            if (key === 'disabled') {
              // disabled is a boolean attribute
              if (resolved || resolved === '') {
                el.setAttribute(key, '');
                (el as HTMLInputElement).disabled = true;
              } else {
                el.removeAttribute(key);
                (el as HTMLInputElement).disabled = false;
              }
            } else if (resolved !== undefined && resolved !== null && resolved !== false) {
              el.setAttribute(key, String(resolved));
            } else {
              el.removeAttribute(key);
            }
          });
        }
      }
      // Apply forwarded events from fw[2]
      const fwEvents = fw[2];
      if (Array.isArray(fwEvents)) {
        _forwardEventsToElement(el, fwEvents, instance || el);
      }
    }

    // Apply DOM attributes from args that are HTML attributes (not @args)
    // These come from the splattributes pattern
    const htmlAttrs = [
      'disabled',
      'readonly',
      'placeholder',
      'name',
      'maxlength',
      'minlength',
      'size',
      'tabindex',
      'role',
      'aria-label',
      'aria-describedby',
      'pattern',
      'autocomplete',
      'autofocus',
      'form',
      'multiple',
      'step',
      'min',
      'max',
      'accept',
      'required',
      'title',
      'lang',
      'dir',
      'spellcheck',
      'wrap',
      'rows',
      'cols',
    ];
    for (const attr of htmlAttrs) {
      if (_appliedRangeAttrs.has(attr)) continue;
      if (attr in args) {
        const desc = Object.getOwnPropertyDescriptor(args, attr);
        const getter = desc?.get || (() => args[attr]);
        gxtEffect(() => {
          const val = getter();
          if (attr === 'disabled') {
            if (val || val === '') {
              el.setAttribute(attr, '');
              (el as HTMLInputElement).disabled = true;
            } else {
              el.removeAttribute(attr);
              (el as HTMLInputElement).disabled = false;
            }
          } else if (val === true) {
            el.setAttribute(attr, '');
          } else if (val === false || val === undefined || val === null) {
            el.removeAttribute(attr);
          } else {
            el.setAttribute(attr, String(val));
          }
        });
      }
    }

    // Register a sync callback to manually update the DOM element when
    // parent args change. GXT effects don't track Ember property changes
    // (set() → notifyPropertyChange → cellFor with skipDefine=true), so
    // we poll the arg getters during `_gxtSyncAllWrappers` and apply changes.
    // Seed the slot's lastArgValues (shared, mutable) so the refresh path
    // observes the same map that the sync callback below mutates.
    for (const key of Object.keys(argGetters)) {
      try {
        slotRef.lastArgValues[key] = argGetters[key]();
      } catch {
        /* ignore */
      }
    }
    const lastArgValues = slotRef.lastArgValues;

    const syncCallback = () => {
      // Check each arg getter individually and only update what changed.
      // This prevents clobbering DOM values set by user interaction (two-way binding).
      const changedKeys = new Set<string>();
      // Iterate over the mutable argGetters that lives on slotRef; the cache-HIT
      // refresh path rewrites entries on this same object so we pick up new
      // template args transparently without re-creating the syncCallback.
      for (const key of Object.keys(slotRef.argGetters)) {
        try {
          const newVal = slotRef.argGetters[key]();
          if (newVal !== lastArgValues[key]) {
            lastArgValues[key] = newVal;
            changedKeys.add(key);
          }
        } catch {
          /* ignore */
        }
      }
      if (changedKeys.size === 0) return;

      // Value — only update if the VALUE arg actually changed
      if (changedKeys.has('value')) {
        const value = instance.value;
        if (value !== undefined && value !== null) {
          if ((el as HTMLInputElement).value !== String(value)) {
            (el as HTMLInputElement).value = String(value);
          }
        } else {
          if ((el as HTMLInputElement).value !== '') {
            (el as HTMLInputElement).value = '';
          }
        }
      }

      // Type — only update if type arg changed
      if (tagName === 'input' && changedKeys.has('type')) {
        const type = instance.type;
        if (type && el.getAttribute('type') !== type) {
          el.setAttribute('type', String(type));
        }
      }

      // Checked — only update if checked arg changed
      if (changedKeys.has('checked')) {
        const checked = instance.checked;
        if (checked !== undefined) {
          (el as HTMLInputElement).checked = !!checked;
        }
      }

      // HTML attrs from fw — check both HTML attribute names and DOM property
      // names (GXT normalizes some: maxlength→maxLength, tabindex→tabIndex)
      const allHtmlAttrs: Array<[string, string]> = [
        ['disabled', 'disabled'],
        ['readonly', 'readonly'],
        ['placeholder', 'placeholder'],
        ['name', 'name'],
        ['maxlength', 'maxLength'],
        ['minlength', 'minlength'],
        ['size', 'size'],
        ['tabindex', 'tabIndex'],
        ['role', 'role'],
        ['aria-label', 'aria-label'],
        ['aria-describedby', 'aria-describedby'],
        ['pattern', 'pattern'],
        ['autocomplete', 'autocomplete'],
        ['autofocus', 'autofocus'],
        ['form', 'form'],
        ['multiple', 'multiple'],
        ['step', 'step'],
        ['min', 'min'],
        ['max', 'max'],
        ['accept', 'accept'],
        ['required', 'required'],
        ['title', 'title'],
        ['lang', 'lang'],
        ['dir', 'dir'],
        ['spellcheck', 'spellcheck'],
        ['wrap', 'wrap'],
        ['rows', 'rows'],
        ['cols', 'cols'],
      ];
      for (const [attr, propName] of allHtmlAttrs) {
        // Only update attrs whose getter value actually changed
        if (!changedKeys.has(attr) && !changedKeys.has(propName)) continue;
        // Check both the HTML attribute name and the DOM property name
        // (read through slotRef.argGetters — refreshed on cache HIT).
        const getter = slotRef.argGetters[attr] || slotRef.argGetters[propName];
        if (!getter) continue;
        const val = getter();
        if (attr === 'disabled') {
          if (val || val === '') {
            el.setAttribute(attr, '');
            (el as HTMLInputElement).disabled = true;
          } else {
            el.removeAttribute(attr);
            (el as HTMLInputElement).disabled = false;
          }
        } else if (val === true) {
          el.setAttribute(attr, '');
        } else if (val === false || val === undefined || val === null) {
          el.removeAttribute(attr);
        } else {
          el.setAttribute(attr, String(val));
        }
      }
    };

    _internalComponentSyncCallbacks.add({ callback: syncCallback, el });

    return el;
  };

  slotRef.renderFn = renderFn;

  // Cache the render function for reuse on re-renders (same owner + komp + slot).
  if (owner && typeof owner === 'object') {
    let cache = _managedComponentCache.get(owner);
    if (!cache) {
      cache = { slots: new Map(), callCounter: new Map() };
      _managedComponentCache.set(owner, cache);
    }
    // The slot index was already incremented in the cache-check above,
    // so the current slot is (counter - 1).
    const callIdx = (cache.callCounter.get(komp) || 1) - 1;
    const slotKey = `${_managedComponentId(komp)}#${callIdx}`;
    cache.slots.set(slotKey, slotRef);
  }

  return renderFn;
}

/**
 * Handle a classic factory-based component.
 */
function handleClassicComponent(factory: any, args: any, fw: any, ctx: any, owner: any): () => any {
  // Same parentView fallback as handleStringComponent.
  const _resolveParentViewFromCtx = (c: any): any => {
    if (!c) return null;
    const raw = c.__gxtRawTarget || c;
    // Only treat real view instances (components) as parents — NOT controllers.
    // Controllers have _debugContainerKey too but are not views; tagless components
    // whose template lives at the route level should have parentView = null
    // (matches classic Ember behavior where getRootViews lists them as roots).
    if (raw && typeof raw === 'object' && raw.isView === true && raw._state !== undefined) {
      return raw;
    }
    return null;
  };
  const capturedParentView = getCurrentParentView() || _resolveParentViewFromCtx(ctx);
  // Cache the rendered result to prevent duplicate renders on GXT formula re-evaluation
  let _cachedResult: any = undefined;
  let _cachedRenderPassId: number = -1;
  return () => {
    const currentRenderPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
    if (_cachedResult !== undefined && _cachedRenderPassId === currentRenderPassId) {
      return _cachedResult;
    }
    // Init-phase throws propagate naturally — see the note on the
    // renderClassicComponent closure above.
    const effectiveParentView =
      capturedParentView || getCurrentParentView() || _resolveParentViewFromCtx(ctx);
    const instance = getCachedOrCreateInstance(
      factory,
      args,
      factory.class,
      owner,
      effectiveParentView
    );

    // Resolve template with layoutName/layout support.
    // Classic Ember precedence: when both `layout` and `layoutName` are
    // assigned, `layout` wins — it is treated as the explicit compiled
    // template and overrides any `layoutName`-driven lookup.
    let template;
    if (instance?.layout) {
      template = instance.layout;
    }
    if (!template && instance?.layoutName && owner) {
      template =
        owner.lookup(`template:${instance.layoutName}`) ||
        owner.lookup(`template:components/${instance.layoutName}`);
    }
    if (!template) {
      template =
        getComponentTemplate(instance) ||
        getComponentTemplate(instance?.constructor) ||
        getComponentTemplate(factory.class);
    }
    // If template is a factory function, call it to get the actual template
    if (typeof template === 'function' && !template.render) {
      template = template(owner);
    }

    if (!template?.render) {
      return null;
    }

    const result = renderClassicComponent(instance, template, args, fw, factory.class, owner);
    _cachedResult = result;
    _cachedRenderPassId = currentRenderPassId;
    return result;
  };
}

// =============================================================================
// Rendering Functions
// =============================================================================

/**
 * Render a classic Ember component with wrapper element.
 */
function renderClassicComponent(
  instance: any,
  template: any,
  args: any,
  fw: any,
  componentDef: any,
  owner: any
): any {
  // Check if this is a reused instance from the pool during force-rerender.
  // If so, skip initial lifecycle hooks (willRender, willInsertElement, etc.)
  // since the component already went through its initial render lifecycle.
  const isReused = instance && instance.__gxtReusedFromPool;
  const isForceRerender = getGxtRenderer()?.compilePipeline.isForceRerender?.() ?? false;
  const reusedWithChanges = isReused && !!instance.__gxtPoolHasArgChanges;
  if (isReused) {
    delete instance.__gxtReusedFromPool;
    delete instance.__gxtPoolHasArgChanges;
  }
  // Stamp a cycle-scoped flag so the compile.ts pool-reuse fallback can tell
  // that this reuse had real arg changes and still fire willRender, even
  // when syncAll's Phase 1 visited the instance without detecting changes
  // (the block-param closure held a stale value) and stamped
  // __gxtSyncAllFiredCycleId.
  if (reusedWithChanges && isForceRerender && instance) {
    try {
      const __gCycle = getGxtRenderer()?.compilePipeline.getSyncCycleId?.() ?? 0;
      (instance as any).__gxtPoolReuseWithChangesCycleId = __gCycle;
    } catch {
      /* ignore */
    }
  }

  // Suppress re-render triggering (notifyPropertyChange → compile.ts
  // `_gxtTriggerReRender`) during the first rendering of a new classic
  // component (not reused from the pool). Property changes during the
  // initial willRender and didReceiveAttrs are part of the initial render
  // and should not dirty cells or schedule re-renders; the template render
  // will create effects with the correct initial values. Without
  // suppression, dirtied cells cause spurious effect re-evaluations in
  // sibling components (e.g., inside {{each}}). For reused instances (pool
  // hit), triggering must remain active because the instance already has
  // cellFor getters from a previous render and cell updates are needed to
  // propagate property changes to the DOM.
  //
  // Suppression goes through `compilePipeline.withTriggerSuppressed(fn)`;
  // reused instances call the body directly.
  const suppressTrigger = !isReused;

  const _renderBody = (): any => {
    const skipInitHooks = isReused && isForceRerender;

    // Expose the current instance via stack-based capture so $_dc_ember can
    // track it for destroy lifecycle when dynamic component switching occurs.
    setInstanceCapture(instance);

    // Fire the per-render dc-capture callback (stashed on args by $_dc_ember)
    // so the swap-out path can call willDestroy on this instance later. The
    // callback's lifetime is exactly the render that owns it — there is no
    // cross-render leak surface because args is freshly built per renderComponent.
    const _dcCap = args && (args as any).__gxtDcCapture;
    if (typeof _dcCap === 'function') {
      _dcCap(instance);
      try {
        delete (args as any).__gxtDcCapture;
      } catch {
        /* configurable: true above ensures delete succeeds for our own writes */
      }
    }

    // Track this instance for destroy detection during force-rerender
    if (instance) {
      _allLiveInstances.add(instance);
      // Associate this instance with the `{{#each}}` row whose body is
      // currently rendering (no-op when not inside an each row) so the row's
      // pre-destroy destructor can fire its willDestroyElement /
      // willClearRender while the element is still connected. Runs
      // synchronously inside the row body fn (`wrappedEachFn`), which has set
      // `_gxtCurrentRowCtx` for the duration of this render.
      getGxtRenderer()?.compilePipeline.captureRowInstance?.(instance);
      // Track this instance as rendered in the current pass.
      // Use a flag directly on the instance to survive any timing issues
      // with set/passId tracking.
      const passId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
      if (_currentPassRenderedPassId !== passId) {
        _currentPassRenderedInstances.clear();
        _currentPassRenderedPassId = passId;
      }
      _currentPassRenderedInstances.add(instance);
      instance.__gxtRenderedInPass = passId;
    }

    const wrapper = buildWrapperElement(instance, args, componentDef, fw);
    const renderContext = createRenderContext(instance, args, fw, owner);

    // Apply forwarded props and attrs (splattributes) to the wrapper element
    // fw[0] contains props (class as ["", value], id, etc.)
    // fw[1] contains attrs (data-*, title, etc.)
    if (wrapper instanceof HTMLElement && fw) {
      const wrapperEl = wrapper;
      // Function-valued forwarded props/attrs are live thunks reading reactive
      // cells. Wrap them in a gxtEffect with reactive set/removeAttribute so the
      // wrapper element updates in place when the source changes (AngleBracket
      // `custom id` + `splattributes`). Without this, the eager one-time
      // evaluation below would capture a stale snapshot and never re-apply.
      // A bound URL attribute is sanitized, as Glimmer sanitizes a dynamic
      // attribute; a static value is written as authored.
      // Apply props (fw[0]) — class, id, etc.
      if (Array.isArray(fw[0])) {
        for (const [key, value] of fw[0]) {
          const attrKey = key === '' ? 'class' : key;
          if (typeof value === 'function') {
            if (attrKey === 'class') {
              const baseClass = wrapperEl.className;
              _gxtEffect(() => {
                const resolved = value();
                const extra = resolved != null && resolved !== false ? String(resolved) : '';
                wrapperEl.className = baseClass
                  ? extra
                    ? baseClass + ' ' + extra
                    : baseClass
                  : extra;
              });
            } else {
              _gxtEffect(() => {
                const resolved = sanitizedAttrValue(wrapperEl, attrKey, value());
                if (resolved != null && resolved !== false && resolved !== undefined) {
                  wrapperEl.setAttribute(attrKey, resolved === true ? '' : String(resolved));
                } else {
                  wrapperEl.removeAttribute(attrKey);
                }
              });
            }
            continue;
          }
          const attrValue = typeof value === 'function' ? value() : value;
          if (attrValue != null && attrValue !== false && attrValue !== undefined) {
            if (attrKey === 'class') {
              if (wrapper.className) {
                wrapper.className = wrapper.className + ' ' + attrValue;
              } else {
                wrapper.className = String(attrValue);
              }
            } else {
              wrapper.setAttribute(attrKey, attrValue === true ? '' : String(attrValue));
            }
          }
        }
      }
      // Apply attrs (fw[1]) — data-*, title, etc.
      if (Array.isArray(fw[1])) {
        for (const [key, value] of fw[1]) {
          if (typeof value === 'function') {
            _gxtEffect(() => {
              const resolved = sanitizedAttrValue(wrapperEl, key, value());
              if (resolved != null && resolved !== false && resolved !== undefined) {
                wrapperEl.setAttribute(key, resolved === true ? '' : String(resolved));
              } else {
                wrapperEl.removeAttribute(key);
              }
            });
            continue;
          }
          const attrValue = typeof value === 'function' ? value() : value;
          if (attrValue != null && attrValue !== false && attrValue !== undefined) {
            wrapper.setAttribute(key, attrValue === true ? '' : String(attrValue));
          }
        }
      }
    }

    // Apply forwarded events from fw[2] to the wrapper
    if (wrapper instanceof HTMLElement && fw && Array.isArray(fw[2])) {
      _forwardEventsToElement(wrapper, fw[2], instance || wrapper);
    }

    // Install reactive attribute/class binding interceptors on the instance
    // so that when properties change, the wrapper element is updated in place.
    if (instance && wrapper instanceof HTMLElement) {
      installBindingInterceptors(instance, wrapper, componentDef);
    }

    if (skipInitHooks) {
      // Force-rerender: skip initial lifecycle hooks.
      // Save the old element reference — the force-rerender preserves the OLD
      // element in the live DOM while the NEW wrapper is in a temp container.
      // Afterward the instance should still point to the old (live) element,
      // not the new (discarded) one.
      const oldElement = getViewElement(instance);

      if (instance && wrapper instanceof HTMLElement) {
        setViewElement(instance, wrapper);
        setElementView(wrapper, instance);
      }
      // Mark this instance as rendering for backtracking detection (before template render)
      markTemplateRendered(instance);
      // Render template into wrapper (rebuild DOM content)
      renderTemplateWithParentView(template, renderContext, wrapper, instance);

      // Restore the old element reference if the new wrapper isn't connected
      // (which happens during a force-rerender that preserves the old DOM
      // nodes). This ensures instance.element points to the live DOM element,
      // not the discarded temp container element.
      if (oldElement && oldElement.isConnected && instance) {
        setViewElement(instance, oldElement);
        setElementView(oldElement, instance);
      }

      // Queue transition to inDOM after insertion (no didInsertElement/didRender)
      if (instance) {
        const inst = instance;
        _afterInsertQueue.push(() => {
          if (inst._transitionTo && isInteractiveModeChecked()) {
            try {
              inst._transitionTo('inDOM');
            } catch {}
          }
          inst.__gxtEverInserted = true;
        });
      }
    } else {
      // Normal initial render path with full lifecycle hooks
      // Lifecycle: willRender (in preRender state), then transition to hasElement, then
      // willInsertElement
      // willRender is called while still in preRender state, with no element.
      // Fire `render.component` instrumentation with initialRender=true payload,
      // mirroring classic Ember's CurlyComponentManager.create() instrumentation
      // (glimmer/lib/component-managers/curly.ts). The finalizer runs after the
      // template/layout has been rendered.
      let _initialRenderInstrumentFinalizer: (() => void) | null = null;
      if (instance && typeof (instance as any).instrumentDetails === 'function') {
        try {
          _initialRenderInstrumentFinalizer = _gxtInstrumentStart(
            'render.component',
            _initialRenderInstrumentationPayload,
            instance
          );
        } catch {
          /* ignore */
        }
      }

      // Init-phase: rethrow synchronously so user-thrown errors surface in the
      // current runTask (attributed to the current test) instead of being queued
      // via captureRenderError. See triggerLifecycleHook.
      triggerLifecycleHook(instance, 'willRender', { rethrow: true });

      // Now transition to hasElement state and register the view element
      // setViewElement must be called AFTER willRender (which expects no element)
      // but BEFORE willInsertElement (which expects the element to exist)
      if (instance && wrapper instanceof HTMLElement) {
        setViewElement(instance, wrapper);
        setElementView(wrapper, instance);
      }
      if (instance?._transitionTo) {
        try {
          instance._transitionTo('hasElement');
        } catch {}
      }

      // willInsertElement is called in hasElement state (element now available).
      // Init-phase: rethrow (see willRender above).
      triggerLifecycleHook(instance, 'willInsertElement', { rethrow: true });

      // Mark this instance as rendering for backtracking detection.
      // This must happen BEFORE renderTemplateWithParentView so that if a child
      // component's lifecycle hook (e.g., didReceiveAttrs) modifies this instance's
      // properties, the backtracking assertion fires.
      markTemplateRendered(instance);

      renderTemplateWithParentView(template, renderContext, wrapper, instance);

      // Finalize the initial render instrumentation now that the layout has
      // been rendered. Classic Ember finalizes in didRenderLayout — we match
      // that timing here (immediately after renderTemplateWithParentView).
      if (_initialRenderInstrumentFinalizer) {
        try {
          _initialRenderInstrumentFinalizer();
        } catch {
          /* ignore */
        }
      }

      // Queue didInsertElement / didRender to fire after the element is in the DOM.
      // The queue is flushed by flushAfterInsertQueue() which is called from the
      // renderer after GXT has appended all nodes to the live document.
      if (instance) {
        const inst = instance;
        // For tagless classic components (wrapper is a DocumentFragment),
        // capture the first/last child nodes now so the after-insert callback
        // can detect whether the tagless component's content made it into the
        // live DOM. getViewElement() returns null for tagless components, so
        // without this capture the inDOM transition + didInsertElement hooks
        // would be skipped.
        const isTaglessWrapper = !(wrapper instanceof HTMLElement);
        const taglessFirstNode = isTaglessWrapper ? wrapper.firstChild : null;
        const taglessLastNode = isTaglessWrapper ? wrapper.lastChild : null;
        _afterInsertQueue.push(() => {
          // Only transition + fire didInsertElement if the instance's element
          // actually made it into the live document. Transient instances created
          // by GXT's re-evaluation of an inner {{#if}} whose outer condition is
          // already false end up in detached DOM trees and should be treated as
          // never having rendered (matching classic Ember's batching semantics).
          const el = getViewElement(inst);
          let isConnected = isElementLiveOrInElementHosted(el);
          // Tagless components: use captured first/last child to determine
          // whether the component's content is in the live DOM (or hosted in
          // a detached {{#in-element}} destination).
          if (!isConnected && isTaglessWrapper) {
            const firstOk = isElementLiveOrInElementHosted(taglessFirstNode);
            const lastOk = isElementLiveOrInElementHosted(taglessLastNode);
            isConnected = firstOk || lastOk;
          }
          if (!isConnected) return;
          if (inst._transitionTo && isInteractiveModeChecked()) {
            try {
              inst._transitionTo('inDOM');
            } catch {}
          }
          inst.__gxtEverInserted = true;
          triggerLifecycleHook(inst, 'didInsertElement');
          triggerLifecycleHook(inst, 'didRender');
        });
      }
    }

    // For tagless classic components (wrapper is a DocumentFragment),
    // capture first/last nodes for getViewBounds support before the
    // fragment is consumed by GXT's DOM insertion.
    if (instance && !(wrapper instanceof HTMLElement) && wrapper.childNodes.length > 0) {
      const firstNode = wrapper.firstChild;
      const lastNode = wrapper.lastChild;
      // Use a deferred getter for parentElement since the nodes aren't
      // in the live DOM yet at this point.
      Object.defineProperty(instance, '__gxtBounds', {
        get() {
          return {
            parentElement: firstNode?.parentNode,
            firstNode,
            lastNode,
          };
        },
        configurable: true,
        enumerable: false,
      });
    }

    return wrapper;
  };

  if (!suppressTrigger) {
    return _renderBody();
  }
  // Branch on whether the `withTriggerSuppressed` bridge method is installed
  // rather than using `?? _renderBody()`, because `_renderBody` can return
  // `undefined`, which would cause a second invocation.
  const _withSuppressed = getGxtRenderer()?.compilePipeline.withTriggerSuppressed;
  if (_withSuppressed) {
    return _withSuppressed(_renderBody);
  }
  return _renderBody();
}

/**
 * Render a Glimmer component (tagless). `debug` is the render in the debug
 * render tree (see `GxtDebugComponent`).
 */
function renderGlimmerComponent(
  instance: any,
  template: any,
  args: any,
  fw: any,
  owner: any,
  debug?: GxtDebugComponent
): any {
  // Expose the current instance via stack-based capture for $_dc_ember tracking
  setInstanceCapture(instance);

  // Fire the per-render dc-capture callback (see renderClassicComponent for
  // the lifetime contract). Both render functions consume from args so a
  // dynamic-component swap (`{{component this.name}}`) captures the instance
  // regardless of whether the resolved class is classic or tagless.
  const _dcCap = args && (args as any).__gxtDcCapture;
  if (typeof _dcCap === 'function') {
    _dcCap(instance);
    try {
      delete (args as any).__gxtDcCapture;
    } catch {
      /* configurable: true above ensures delete succeeds for our own writes */
    }
  }

  const container = document.createDocumentFragment();
  const renderContext = createRenderContext(instance, args, fw, owner);

  renderTemplateWithParentView(template, renderContext, container, instance, debug);

  return container;
}

// =============================================================================
// Manager API Exports
// =============================================================================

export function capabilityFlagsFrom(capabilities: Record<string, boolean>): number {
  let flags = 0;
  const capabilityNames = [
    'dynamicLayout',
    'dynamicTag',
    'prepareArgs',
    'createArgs',
    'attributeHook',
    'elementHook',
    'dynamicScope',
    'createCaller',
    'updateHook',
    'createInstance',
    'wrapped',
    'willDestroy',
    'hasSubOwner',
  ];
  capabilityNames.forEach((name, index) => {
    if (capabilities[name]) {
      flags |= 1 << index;
    }
  });
  return flags;
}

function assertManagerTarget(target: any, kind: string): void {
  if (
    target === null ||
    target === undefined ||
    (typeof target !== 'object' && typeof target !== 'function')
  ) {
    throw new Error(
      `Attempted to set a manager on a non-object value. Managers can only be associated with objects or functions. Value was ${String(target)}`
    );
  }
}

function assertNoExistingComponentManager(handle: any): void {
  if (INTERNAL_MANAGERS.has(handle) || COMPONENT_MANAGERS.has(handle)) {
    throw new Error(
      `Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type with a given value. Value was ${String(handle)}`
    );
  }
}

function assertNoExistingHelperManager(helper: any): void {
  if (INTERNAL_HELPER_MANAGERS.has(helper)) {
    throw new Error(
      `Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type with a given value. Value was ${String(helper)}`
    );
  }
}

function assertNoExistingModifierManager(modifier: any): void {
  if (INTERNAL_MODIFIER_MANAGERS.has(modifier)) {
    throw new Error(
      `Attempted to set the same type of manager multiple times on a value. You can only associate one manager of each type with a given value. Value was ${String(modifier)}`
    );
  }
}

export function setInternalComponentManager(manager: any, handle: any) {
  assertManagerTarget(handle, 'component');
  assertNoExistingComponentManager(handle);
  INTERNAL_MANAGERS.set(handle, manager);
  return handle;
}

export function getInternalHelperManager(helper: any, isOptional?: boolean) {
  if (helper === null || helper === undefined) {
    if (isOptional) return null;
    throw new Error(
      `Attempted to load a helper, but there wasn't a helper manager associated with the definition. The definition was: ${_managerDebugToString(helper)}`
    );
  }
  // Walk the full prototype chain
  let pointer = helper;
  while (pointer !== null && pointer !== undefined) {
    const manager = INTERNAL_HELPER_MANAGERS.get(pointer);
    if (manager !== undefined) {
      return manager;
    }
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  // Functions are the default helper type (simple function helpers)
  if (typeof helper === 'function') {
    return DEFAULT_HELPER_MANAGER;
  }
  if (isOptional) return null;
  throw new Error(
    `Attempted to load a helper, but there wasn't a helper manager associated with the definition. The definition was: ${_managerDebugToString(helper)}`
  );
}

export function helperCapabilities(v: string, value: any = {}) {
  if (v !== '3.23') {
    throw new Error(`Invalid helper manager compatibility specified`);
  }

  if (
    !(value.hasValue || value.hasScheduledEffect) ||
    (value.hasValue && value.hasScheduledEffect)
  ) {
    throw new Error(
      'You must pass either the `hasValue` OR the `hasScheduledEffect` capability when defining a helper manager. Passing neither, or both, is not permitted.'
    );
  }

  if (value.hasScheduledEffect) {
    throw new Error(
      'The `hasScheduledEffect` capability has not yet been implemented for helper managers. Please pass `hasValue` instead'
    );
  }

  const capabilities = {
    hasValue: Boolean(value.hasValue),
    hasDestroyable: Boolean(value.hasDestroyable),
    hasScheduledEffect: Boolean(value.hasScheduledEffect),
  };
  FROM_CAPABILITIES.add(capabilities);
  Object.freeze(capabilities);
  return capabilities;
}

export function modifierCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  const caps = capabilities || {};
  FROM_CAPABILITIES.add(caps);
  return caps;
}

export function componentCapabilities(_version: string, capabilities?: Record<string, boolean>) {
  // Canonicalize boolean flags so downstream gates (e.g. the `update` /
  // `didUpdate` lifecycle dispatch in handleCustomManagedComponent) can
  // distinguish "user explicitly set updateHook=false" from "user omitted the
  // options bag entirely (default behavior)".
  //
  // Classic Glimmer's `componentCapabilities('3.13', options)` always
  // returns `{ updateHook: Boolean(options?.updateHook), ... }` even when
  // `options === undefined`. Returning the raw options object (or `{}`)
  // would make `caps.updateHook === false` true for both
  // `componentCapabilities('3.13', {})` and `componentCapabilities('3.13')`,
  // but the two callers want different lifecycle behavior.
  //
  // When `capabilities` is undefined, we leave the relevant flags
  // unset (treated as "use default = true" by the lifecycle gate).
  // When `capabilities` is a (possibly empty) object, we normalize
  // every known flag to an explicit boolean so omitting a key reads
  // as `false`, matching classic Glimmer's semantics.
  if (capabilities === undefined) {
    const caps: Record<string, boolean> = {};
    FROM_CAPABILITIES.add(caps);
    return caps;
  }
  const caps = {
    asyncLifecycleCallbacks: Boolean(capabilities.asyncLifecycleCallbacks),
    destructor: Boolean(capabilities.destructor),
    updateHook: Boolean(capabilities.updateHook),
  } as Record<string, boolean>;
  FROM_CAPABILITIES.add(caps);
  return caps;
}

export function setHelperManager(factory: any, helper: any) {
  assertManagerTarget(helper, 'helper');
  assertNoExistingHelperManager(helper);
  return setInternalHelperManager(new CustomHelperManager(factory), helper, true);
}

// Caches wrapper CustomComponentManager / CustomModifierManager instances so
// repeated calls to getInternal*Manager on the same definition return a stable
// object identity.
const _COMPONENT_MANAGER_WRAPPERS = new WeakMap<object, any>();
const _MODIFIER_MANAGER_WRAPPERS = new WeakMap<object, any>();

export function getInternalComponentManager(handle: any, isOptional?: boolean) {
  if (handle === null || handle === undefined) {
    // When called from `constants.component(def, owner, true)` (optional lookup
    // path, used by `resolveOptionalComponentOrHelper` to distinguish
    // component-vs-helper-vs-value), we must return `null` so the caller's
    // `if (manager === null)` branch fires and the resolver falls through to
    // helper/value lookup. Returning `undefined` would trip the
    // `BUG: expected manager` localAssert that follows.
    return isOptional ? null : undefined;
  }
  // Walk the prototype chain — first look for internal managers
  // (setInternalComponentManager path), which are returned as-is.
  let pointer = handle;
  while (pointer !== null && pointer !== undefined) {
    const manager = INTERNAL_MANAGERS.get(pointer);
    if (manager !== undefined) return manager;
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  // Then look for custom component managers registered via setComponentManager.
  // For these, wrap the raw factory in a CustomComponentManager so tests that
  // reference-check via `instanceof CustomComponentManager` and read `.factory`
  // see the expected shape. The rendering path does NOT use this return value
  // — it reads COMPONENT_MANAGERS directly via resolveComponent().
  pointer = handle;
  while (pointer !== null && pointer !== undefined) {
    const factory = COMPONENT_MANAGERS.get(pointer);
    if (factory !== undefined) {
      let wrapper = _COMPONENT_MANAGER_WRAPPERS.get(pointer);
      if (wrapper === undefined) {
        wrapper = new CustomComponentManager(factory);
        _COMPONENT_MANAGER_WRAPPERS.set(pointer, wrapper);
      }
      return wrapper;
    }
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  // Nothing found. When the caller explicitly marks this as an optional lookup
  // (e.g. `resolveOptionalComponentOrHelper` probing whether `def` is a
  // component), return `null` so the caller can branch cleanly. When called
  // for a required resolution, throw the same message the stock @glimmer/manager
  // does so test assertions like `assert.throws(/Attempted to load a component/)`
  // see the expected error instead of a downstream "BUG: expected manager".
  if (isOptional) {
    return null;
  }
  throw new Error(
    `Attempted to load a component, but there wasn't a component manager associated with the definition. The definition was: ${_managerDebugToString(handle)}`
  );
}

// Lightweight debug-friendly stringifier — mirrors the helper used by the real
// @glimmer/manager. We try to pull a name from a function/class, fall back to
// String() for other shapes.
function _managerDebugToString(value: any): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'function') return value.name || value.toString?.() || 'function';
  if (typeof value === 'object') {
    const ctor = value.constructor;
    if (ctor && ctor.name && ctor !== Object) return `[object ${ctor.name}]`;
    try {
      return String(value);
    } catch {
      return '[object]';
    }
  }
  return String(value);
}

export function getComponentTemplate(comp: any): any {
  const direct = COMPONENT_TEMPLATES.get(comp);
  if (direct !== undefined) return direct;
  // Unwrap Proxy if needed — GXT's cell tracking wraps objects in Proxies,
  // but setComponentTemplate stores templates keyed by the original object.
  const unwrapped = _proxyToRaw.get(comp);
  if (unwrapped) {
    const fromRaw = COMPONENT_TEMPLATES.get(unwrapped);
    if (fromRaw !== undefined) return fromRaw;
  }
  // Walk prototype chain for inheritance support
  if (comp && typeof comp === 'function') {
    let proto = Object.getPrototypeOf(comp);
    while (proto && proto !== Function.prototype && proto !== Object.prototype) {
      const tpl = COMPONENT_TEMPLATES.get(proto);
      if (tpl !== undefined) return tpl;
      proto = Object.getPrototypeOf(proto);
    }
  }
  return undefined;
}

export function setComponentTemplate(tpl: any, comp: any) {
  if (
    comp === null ||
    comp === undefined ||
    (typeof comp !== 'object' && typeof comp !== 'function')
  ) {
    throw new Error(`Cannot call \`setComponentTemplate\` on \`${String(comp)}\``);
  }
  if (COMPONENT_TEMPLATES.has(comp)) {
    const name = comp.name || comp.toString?.() || String(comp);
    throw new Error(
      `Cannot call \`setComponentTemplate\` multiple times on the same class (\`${name}\`)`
    );
  }
  COMPONENT_TEMPLATES.set(comp, tpl);
  return comp;
}

// Store pending builtin modifier registrations for when $_MANAGERS is ready
const _pendingBuiltinModifiers: Array<{ name: string; modifier: any }> = [];

// {{on}} counter instrumentation.
//
// GXT's native template compiler converts `<el {{on "event" cb}}>` directly into an
// `el.addEventListener("event", cb)` call (dropping named args like once/capture
// and bypassing OnModifierManager.install entirely). That means stock
// @glimmer/runtime's on.ts `adds`/`removes` counters — which tests rely on via
// `getInternalModifierManager(on).counters` — never increment in GXT mode.
//
// Strategy:
//   1. Expose our own mutable counters { adds, removes }.
//   2. When OnModifierManager is registered (via setInternalModifierManager),
//      wrap the manager with a Proxy whose `.counters` getter resolves to
//      our instrumented pair.
//   3. Patch `Element.prototype.addEventListener` / `removeEventListener` so
//      that every listener install/removal bumps our counters. The tests
//      compare against a `startingCounters` baseline captured in beforeEach,
//      so delta accuracy matters; raw absolute values don't. The patch is
//      the only reliable hook point — GXT's DOM API provider is used for
//      some paths but `{{on}}` native bindings land directly on the
//      Element.prototype method.
//   4. A second listener for the same event on one element counts as an add
//      only: an element can have several `{{on "click"}}` listeners (its own
//      and one forwarded through `...attributes`). A changed `{{on}}`
//      callback is counted by the real remove + add the OnModifierManager
//      makes (every `{{on}}` reaches it through the `on-ext` alias).
const __gxtOnCounters: { adds: number; removes: number } = { adds: 0, removes: 0 };
let __gxtOnDomApiPatched = false;

function __gxtInstallOnElementPatch(): void {
  if (__gxtOnDomApiPatched) return;
  if (typeof Element === 'undefined' || !Element.prototype) return;
  const originalAdd = Element.prototype.addEventListener;
  const originalRemove = Element.prototype.removeEventListener;
  if (typeof originalAdd !== 'function' || typeof originalRemove !== 'function') return;
  __gxtOnDomApiPatched = true;
  // Patch Element.prototype.addEventListener/removeEventListener to bump our
  // OnModifierManager-compatible counters. The patch counts EVERY listener
  // add/remove regardless of origin; the tests compare against a
  // startingCounters baseline captured in beforeEach, so the delta is what
  // matters — and the `{{on}}` native event binding GXT emits ultimately
  // calls through Element.prototype.addEventListener, the one reliable
  // hook point.
  Element.prototype.addEventListener = function patchedAdd(this: Element, ...args: any[]): void {
    __gxtOnCounters.adds++;
    return (originalAdd as any).apply(this, args);
  } as any;
  Element.prototype.removeEventListener = function patchedRemove(
    this: Element,
    ...args: any[]
  ): void {
    __gxtOnCounters.removes++;
    return (originalRemove as any).apply(this, args);
  } as any;
  // We intentionally do not patch ChildNode.remove / Node.removeChild
  // to bump `removes` on DOM detachment. The stock `{{on}}` modifier registers
  // a destructor that calls `element.removeEventListener(...)` on teardown,
  // and GXT invokes destructors before removing elements from the DOM, so the
  // destructor path is already counted via `patchedRemove` above; an extra
  // bump on DOM removal would double-count the same remove.
  //
  // If a code path is ever found that removes elements from the DOM without
  // running their listeners' destructors, it should be addressed at that
  // teardown site rather than by instrumenting DOM removal here.
}

export function setInternalModifierManager(manager: any, modifier: any, _skipGuards?: boolean) {
  if (!_skipGuards) {
    assertManagerTarget(modifier, 'modifier');
    assertNoExistingModifierManager(modifier);
  }
  // Detect stock OnModifierManager (from @glimmer/runtime/lib/modifiers/on.ts)
  // by shape: it exposes a `counters` getter returning { adds, removes }.
  // Wrap it so that reads of `.counters` resolve to our instrumented pair
  // (which the Element.prototype patch above keeps in sync).
  if (manager && typeof manager === 'object') {
    try {
      const debugName =
        typeof manager.getDebugName === 'function' ? manager.getDebugName() : undefined;
      const desc = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(manager) || manager,
        'counters'
      );
      const hasCountersGetter = !!(desc && typeof desc.get === 'function');
      if (debugName === 'on' && hasCountersGetter) {
        __gxtInstallOnElementPatch();
        // Create a proxied manager that forwards everything to the original
        // OnModifierManager, but resolves `.counters` to our instrumented
        // pair. We proxy rather than mutate the original because the manager
        // prototype's getter returns a fresh object per read; we want the
        // test's `getInternalModifierManager(on).counters` to see OUR live
        // counters while leaving the Glimmer VM's install/update path
        // untouched.
        const wrapped = new Proxy(manager, {
          get(target, prop, receiver) {
            if (prop === 'counters') return { ...__gxtOnCounters };
            return Reflect.get(target, prop, receiver);
          },
        });
        manager = wrapped;
      }
    } catch {
      /* ignore */
    }
  }
  INTERNAL_MODIFIER_MANAGERS.set(modifier, manager);
  // Register internal modifier managers as built-in keyword modifiers
  // so that string-based resolution (e.g., {{on "click" ...}}) works.
  if (manager && typeof manager.getDebugName === 'function') {
    try {
      const name = manager.getDebugName();
      if (name) {
        if ($_MANAGERS?.modifier?._builtinModifiers) {
          $_MANAGERS.modifier._builtinModifiers[name] = modifier;
          // See the matching `on-ext` aliasing in
          // _flushPendingBuiltinModifiers below — the alias must also be
          // installed on this direct path, which is the one a consuming
          // app's import order typically takes.
          if (name === 'on') {
            $_MANAGERS.modifier._builtinModifiers['on-ext'] ??= modifier;
          }
        } else {
          _pendingBuiltinModifiers.push({ name, modifier });
        }
      }
    } catch {
      /* ignore */
    }
  }
  return modifier;
}

function _flushPendingBuiltinModifiers() {
  if ($_MANAGERS?.modifier?._builtinModifiers && _pendingBuiltinModifiers.length > 0) {
    for (const { name, modifier } of _pendingBuiltinModifiers) {
      $_MANAGERS.modifier._builtinModifiers[name] = modifier;
      // Templates reference `{{on}}` through the `on-ext` alias (the
      // gxtOnModifierTransform rewrite in compile.ts). compile.ts installs
      // the alias opportunistically at precompileTemplate time, but in a
      // consuming app the template modules can be evaluated BEFORE the `on`
      // modifier's registration module runs (import order is the app's, not
      // the test harness's) — leaving `on-ext` unresolvable and `{{on}}`
      // silently inert. Install the alias at the registration site too, so
      // whichever side runs last completes the pair.
      if (name === 'on') {
        $_MANAGERS.modifier._builtinModifiers['on-ext'] ??= modifier;
      }
    }
    _pendingBuiltinModifiers.length = 0;
  }
}

export function setComponentManager(manager: any, component: any) {
  assertManagerTarget(component, 'component');
  assertNoExistingComponentManager(component);
  COMPONENT_MANAGERS.set(component, manager);
  return component;
}

export function setModifierManager(factory: any, modifier: any) {
  assertManagerTarget(modifier, 'modifier');
  assertNoExistingModifierManager(modifier);
  INTERNAL_MODIFIER_MANAGERS.set(modifier, factory);
  return modifier;
}

const CUSTOM_TAG_FOR = new WeakMap<object, (obj: object, key: string) => any>();

export function getCustomTagFor(obj: any) {
  return CUSTOM_TAG_FOR.get(obj);
}

export function setCustomTagFor(obj: any, tagFn: (obj: object, key: string) => any) {
  CUSTOM_TAG_FOR.set(obj, tagFn);
}

export function setInternalHelperManager(manager: any, helper: any, _skipGuards?: boolean) {
  if (!_skipGuards) {
    assertManagerTarget(helper, 'helper');
    assertNoExistingHelperManager(helper);
  }
  INTERNAL_HELPER_MANAGERS.set(helper, manager);
  return helper;
}

export function hasInternalHelperManager(helper: any) {
  if (helper === null || helper === undefined) return false;
  // Functions are always default helpers
  if (typeof helper === 'function') return true;
  // Walk the prototype chain
  let pointer = helper;
  while (pointer !== null && pointer !== undefined) {
    if (INTERNAL_HELPER_MANAGERS.has(pointer)) {
      return true;
    }
    try {
      pointer = Object.getPrototypeOf(pointer);
    } catch {
      break;
    }
  }
  return false;
}

export function hasCapability(capabilities: number, capability: number): boolean {
  return (capabilities & capability) !== 0;
}

export function getInternalModifierManager(modifier: any, isOptional?: boolean) {
  if (modifier === null || modifier === undefined) {
    if (isOptional) return null;
    throw new Error(
      `Attempted to load a modifier, but there wasn't a modifier manager associated with the definition. The definition was: ${_managerDebugToString(modifier)}`
    );
  }
  // Walk the prototype chain so subclasses inherit the modifier manager set
  // on an ancestor class (matches @glimmer/manager's getInternalModifierManager,
  // which relies on getPrototypeOf traversal via its WeakMap lookup chain).
  // Without this, `class Bar extends Foo` — where Foo was associated via
  // setModifierManager — yields "no modifier manager associated" when Bar is
  // invoked as a modifier (because Bar itself isn't in the WeakMap).
  let stored = INTERNAL_MODIFIER_MANAGERS.get(modifier);
  if (stored === undefined) {
    let pointer: any = modifier;
    for (let depth = 0; depth < 20; depth++) {
      try {
        pointer = Object.getPrototypeOf(pointer);
      } catch {
        break;
      }
      if (pointer === null || pointer === undefined) break;
      const candidate = INTERNAL_MODIFIER_MANAGERS.get(pointer);
      if (candidate !== undefined) {
        stored = candidate;
        break;
      }
    }
  }
  if (stored === undefined) {
    if (isOptional) return null;
    throw new Error(
      `Attempted to load a modifier, but there wasn't a modifier manager associated with the definition. The definition was: ${_managerDebugToString(modifier)}`
    );
  }
  // If it's a factory function (from setModifierManager), wrap it in a
  // CustomModifierManager so tests that instanceof-check and read `.factory`
  // see the expected shape. The rendering path does NOT use this return value
  // — it reads INTERNAL_MODIFIER_MANAGERS directly and handles both shapes
  // via `typeof managerFactory === 'function'`.
  if (typeof stored === 'function') {
    let wrapper = _MODIFIER_MANAGER_WRAPPERS.get(modifier);
    if (wrapper === undefined) {
      wrapper = new CustomModifierManager(stored);
      _MODIFIER_MANAGER_WRAPPERS.set(modifier, wrapper);
    }
    return wrapper;
  }
  // Internal manager instance (from setInternalModifierManager) — return as-is.
  return stored;
}

export function managerHasCapability(
  _manager: unknown,
  capabilities: number,
  capability: number
): boolean {
  return hasCapability(capabilities, capability);
}

export function hasInternalComponentManager(component: any): boolean {
  if (component === null || component === undefined) return false;
  // Walk the prototype chain to find managers set on prototypes or class
  // hierarchy. Check both registries — internal managers
  // (setInternalComponentManager) and custom component managers
  // (setComponentManager) — mirroring getInternalComponentManager's two-phase
  // walk and upstream @glimmer/manager's single-registry semantics. Checking
  // only INTERNAL_MANAGERS would make the VM's dynamicContentType classify a
  // custom-managed component class as a helper (the shim treats any function
  // as a default helper), and the helper path would then call the class
  // ("Class constructor cannot be invoked without 'new'") on the
  // dynamic-append re-render path.
  let pointer = component;
  for (let depth = 0; depth < 20; depth++) {
    if (pointer === null || pointer === undefined) break;
    if (INTERNAL_MANAGERS.has(pointer) || COMPONENT_MANAGERS.has(pointer)) return true;
    try {
      const next = Object.getPrototypeOf(pointer);
      if (next === pointer || next === null) break;
      pointer = next;
    } catch {
      break;
    }
  }
  return false;
}

export function hasValue(manager: any): boolean {
  return Boolean(manager?.capabilities?.hasValue);
}

export function hasDestroyable(manager: any): boolean {
  return Boolean(manager?.capabilities?.hasDestroyable);
}

// =============================================================================
// Custom Manager Classes
// =============================================================================

// Default internal-shape capabilities for components built from a public
// `componentCapabilities('3.13')` capability descriptor. Mirrors the table in
// @glimmer/manager/lib/public/component.ts. Frozen so the VM can cache flag
// computations without worrying about mutation.
const DEFAULT_CUSTOM_COMPONENT_CAPABILITIES = Object.freeze({
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
});

// Bucket holding all per-instance state the VM will hand back to the wrapper
// on subsequent lifecycle hooks (update / didCreate / getSelf / getDestroyable).
class CustomComponentState {
  constructor(
    public component: any,
    public delegate: any,
    public args: any
  ) {}
}

// Wrap a Glimmer VM args object in a stable proxy whose `.named` resolves
// references on access and whose `.positional` returns plain values. Mirrors
// argsProxyFor from @glimmer/manager. Kept intentionally light — full reactive
// proxying would require Reflect/Proxy plumbing the wrapper does not need for
// the strict-mode + GlimmerishComponent rendering path the VM uses.
function _customComponentArgsProxyFor(vmArgs: any): any {
  if (!vmArgs) return { named: {}, positional: [] };
  // VMArguments has .capture() returning CapturedArguments; CapturedArguments
  // already exposes .named (Dict<Reference>) and .positional (Reference[]).
  const captured = typeof vmArgs.capture === 'function' ? vmArgs.capture() : vmArgs;
  const namedSource = captured.named || {};
  const positionalSource = captured.positional || [];

  const namedProxy: Record<string, any> = {};
  for (const key of Object.keys(namedSource)) {
    Object.defineProperty(namedProxy, key, {
      enumerable: true,
      configurable: true,
      get() {
        const ref = namedSource[key];
        // REFERENCE-branded refs (including raw gxt Cells, which is what the
        // VM's captured args hold in production builds — DEBUG wraps them in
        // createDebugAliasRef compute refs) resolve through valueForRef so
        // the read both unwraps the value and registers with any active
        // classic tracking frame. Without this, `instance.args.foo` returns
        // the Cell object itself in production.
        if (_isGlimmerRef(ref)) {
          try {
            return _valueForRefForManager(ref);
          } catch {
            return undefined;
          }
        }
        if (ref && typeof ref === 'object' && 'compute' in ref) {
          try {
            return (ref as any).compute();
          } catch {
            return undefined;
          }
        }
        // Some refs expose `.value` directly (e.g. ConstRef wrappers).
        if (ref && typeof (ref as any).value === 'function') {
          try {
            return (ref as any).value();
          } catch {
            return undefined;
          }
        }
        return ref;
      },
    });
  }

  const positionalArr: any[] = positionalSource.map((ref: any) => {
    if (_isGlimmerRef(ref)) {
      try {
        return _valueForRefForManager(ref);
      } catch {
        return undefined;
      }
    }
    if (ref && typeof ref === 'object' && 'compute' in ref) {
      try {
        return ref.compute();
      } catch {
        return undefined;
      }
    }
    if (ref && typeof ref.value === 'function') {
      try {
        return ref.value();
      } catch {
        return undefined;
      }
    }
    return ref;
  });

  return { named: namedProxy, positional: positionalArr };
}

/**
 * CustomComponentManager — public wrapper around a component manager factory
 * registered via setComponentManager(). Returned from
 * getInternalComponentManager() and used by the Glimmer VM as a real
 * InternalComponentManager. The wrapper:
 *  - validates that the delegate exposes a `capabilities` object built via
 *    `componentCapabilities('3.13')` (FROM_CAPABILITIES tracked)
 *  - exposes `getCapabilities()` returning the internal-shape capabilities
 *    object the VM consumes via capabilityFlagsFrom
 *  - returns a `CustomComponentState` bucket from `create()` and resolves
 *    `getSelf()` to a const Reference around the delegate's component context
 *
 * Tests also introspect the wrapper (instanceof, `.factory`, `.create()` for
 * capability validation).
 */
export class CustomComponentManager {
  factory: any;
  // Legacy alias — some older code paths may read `.delegate`.
  delegate: any;

  constructor(factory: any) {
    this.factory = factory;
    this.delegate = factory;
  }

  // Resolve & validate the delegate for a given owner. Throws the canonical
  // `Custom component managers must have a capabilities property…` error if
  // the delegate is missing or has bogus capabilities.
  private _resolveDelegate(owner: any): any {
    const delegate = typeof this.factory === 'function' ? this.factory(owner) : this.factory;
    const caps = delegate ? delegate.capabilities : undefined;
    if (!caps || !FROM_CAPABILITIES.has(caps)) {
      throw new Error(
        capabilitiesErrorPrefix('component') +
          'Received: `' +
          (caps === undefined ? 'undefined' : JSON.stringify(caps)) +
          '`'
      );
    }
    return delegate;
  }

  create(
    owner: any,
    definitionState: any,
    vmArgs: any,
    _env?: any,
    _dynamicScope?: any,
    _caller?: any,
    _hasDefaultBlock?: boolean
  ): CustomComponentState {
    const delegate = this._resolveDelegate(owner);
    const args = _customComponentArgsProxyFor(vmArgs);
    let component: any;
    if (typeof delegate.createComponent === 'function') {
      component = delegate.createComponent(definitionState, args);
    } else {
      component = delegate;
    }
    return new CustomComponentState(component, delegate, args);
  }

  // The Glimmer VM consumes the result via capabilityFlagsFrom — it expects
  // an internal-shape capabilities object with the well-known boolean keys
  // (dynamicLayout, createArgs, updateHook, …). We synthesize that from the
  // delegate's public-shape capabilities (asyncLifecycleCallbacks, destructor,
  // updateHook), falling back to the conservative defaults used by
  // @glimmer/manager when the delegate is unreachable.
  getCapabilities(_definitionState?: any): typeof DEFAULT_CUSTOM_COMPONENT_CAPABILITIES {
    return DEFAULT_CUSTOM_COMPONENT_CAPABILITIES;
  }

  getDebugName(definitionState: any): string {
    if (typeof definitionState === 'function') return definitionState.name || 'Component';
    if (definitionState && typeof definitionState === 'object') {
      const ctor = (definitionState as any).constructor;
      if (ctor && ctor.name) return ctor.name;
    }
    try {
      return String(definitionState);
    } catch {
      return 'Component';
    }
  }

  getSelf(state: CustomComponentState): any {
    if (state instanceof CustomComponentState) {
      const { component, delegate } = state;
      const ctx =
        typeof delegate?.getContext === 'function' ? delegate.getContext(component) : component;
      const r = _createConstRef(ctx, 'this');
      // Ensure `debugLabel` is set so downstream `childRefFor` produces
      // `this.Foo`-style labels for stock Glimmer VM error messages.
      try {
        (r as any).debugLabel = 'this';
      } catch {
        /* frozen */
      }
      return r;
    }
    // Defensive path for callers passing a raw instance (legacy tests).
    const r2 = _createConstRef(state, 'this');
    try {
      (r2 as any).debugLabel = 'this';
    } catch {
      /* frozen */
    }
    return r2;
  }

  getDestroyable(state: CustomComponentState): any {
    if (!(state instanceof CustomComponentState)) return state;
    const { delegate, component } = state;
    if (delegate?.capabilities?.destructor && typeof delegate.destroyComponent === 'function') {
      // Use the bucket as the destroyable — registering a destructor on the
      // bucket lets the VM's own destroyable plumbing drive teardown.
      _registerDestructor(state, () => delegate.destroyComponent(component));
      return state;
    }
    return null;
  }

  update(state: CustomComponentState, _dynamicScope?: any): void {
    if (!(state instanceof CustomComponentState)) return;
    const { delegate, component, args } = state;
    if (delegate?.capabilities?.updateHook && typeof delegate.updateComponent === 'function') {
      delegate.updateComponent(component, args);
    }
  }

  didCreate(state: CustomComponentState): void {
    if (!(state instanceof CustomComponentState)) {
      // Legacy call shape — some callers may pass the raw component instance.
      this.delegate?.didCreateComponent?.(state);
      return;
    }
    const { delegate, component } = state;
    if (
      delegate?.capabilities?.asyncLifecycleCallbacks &&
      typeof delegate.didCreateComponent === 'function'
    ) {
      delegate.didCreateComponent(component);
    }
  }

  didUpdate(state: CustomComponentState): void {
    if (!(state instanceof CustomComponentState)) {
      this.delegate?.didUpdateComponent?.(state);
      return;
    }
    const { delegate, component } = state;
    if (
      delegate?.capabilities?.asyncLifecycleCallbacks &&
      delegate?.capabilities?.updateHook &&
      typeof delegate.didUpdateComponent === 'function'
    ) {
      delegate.didUpdateComponent(component);
    }
  }

  didRenderLayout(_state: CustomComponentState, _bounds?: any): void {}
  didUpdateLayout(_state: CustomComponentState, _bounds?: any): void {}

  getDynamicLayout(instance: any) {
    return this.delegate?.getDynamicLayout?.(instance);
  }
}

// State shape mirrored from @glimmer/manager's public CustomModifierManager.
// We track the delegate, args, modifier instance and an updatable tag so the
// JIT delegate's modifier opcode (which calls `manager.getTag(state)`) sees the
// expected shape.
interface ShimCustomModifierState {
  tag: any;
  element: Element;
  delegate: any;
  args: any;
  modifier: any;
}

// Detect Glimmer Reference objects. References are tagged with the canonical
// REFERENCE symbol (via reference.ts brandRef) or expose a shape compatible with
// VM references (`compute` or `value` function). For defensive unwrapping,
// accept either shape — VM captures from `args.capture()` always brand via
// REFERENCE, while older GXT-native shapes may not.
function _isGlimmerRef(v: any): boolean {
  if (v == null) return false;
  if (typeof v !== 'object' && typeof v !== 'function') return false;
  if (_REFERENCE_FOR_MANAGER && _REFERENCE_FOR_MANAGER in v) return true;
  return false;
}

function _unwrapMaybeRef(v: any): any {
  if (_isGlimmerRef(v)) {
    try {
      return _valueForRefForManager(v);
    } catch {
      // fall through
    }
  }
  return v;
}

// Wrap CapturedArguments (`{ positional: Reference[], named: Dict<Reference> }`)
// into an Arguments-compatible proxy that unwraps References on read. This
// mirrors @glimmer/manager's argsProxyFor(). Required by CustomModifierManager
// so that `args.positional[0]` / `args.named.foo` expose the reified value
// instead of the underlying Reference. The positional proxy supports .length,
// numeric indexing, and iteration; the named proxy supports key reads and
// `in` checks. Both trigger tag consumption (valueForRef registers reads)
// when run inside a track() frame, which is how auto-tracking of consumed
// args drives per-arg invalidation in the VM's commit() wrapper.
function _modifierArgsProxyFor(capturedArgs: any): { positional: any; named: any } {
  if (!capturedArgs) return { positional: [], named: {} };
  const positional: any[] = capturedArgs.positional ?? [];
  const named: Record<string, any> = capturedArgs.named ?? {};

  const positionalProxy: any = new Proxy(positional, {
    get(target: any, prop: string | symbol) {
      if (prop === 'length') return target.length;
      if (prop === Symbol.iterator) {
        return function* () {
          for (let i = 0; i < target.length; i++) {
            yield _unwrapMaybeRef(target[i]);
          }
        };
      }
      if (typeof prop === 'string') {
        const num = Number(prop);
        if (Number.isInteger(num) && num >= 0 && num < target.length) {
          return _unwrapMaybeRef(target[num]);
        }
      }
      return (target as any)[prop as any];
    },
    has(target: any, prop: string | symbol) {
      if (prop === 'length' || prop === Symbol.iterator) return true;
      if (typeof prop === 'string') {
        const num = Number(prop);
        if (Number.isInteger(num)) return num >= 0 && num < target.length;
      }
      return prop in target;
    },
  });

  const namedProxy: any = new Proxy(named, {
    get(target: any, prop: string | symbol) {
      return _unwrapMaybeRef((target as any)[prop]);
    },
    has(target: any, prop: string | symbol) {
      return prop in target;
    },
    ownKeys(target: any) {
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target: any, prop: string | symbol) {
      if (prop in target) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  });

  return { positional: positionalProxy, named: namedProxy };
}

/**
 * CustomModifierManager — public wrapper around a modifier manager factory
 * registered via setModifierManager(). Same rationale as CustomComponentManager:
 * this class exists only for consumer introspection. The rendering path reads
 * the raw factory from INTERNAL_MODIFIER_MANAGERS directly.
 */
export class CustomModifierManager {
  factory: any;
  delegate: any;
  capabilities: number = 0;

  constructor(factory: any) {
    this.factory = factory;
    this.delegate = factory;
  }

  create(owner: any, element: Element, definition: any, args: any): ShimCustomModifierState {
    const delegate = typeof this.factory === 'function' ? this.factory(owner) : this.factory;
    const caps = delegate ? delegate.capabilities : undefined;
    if (!caps || !FROM_CAPABILITIES.has(caps)) {
      throw new Error(
        capabilitiesErrorPrefix('modifier') +
          'Received: `' +
          (caps === undefined ? 'undefined' : JSON.stringify(caps)) +
          '`'
      );
    }
    // Wrap captured args in a reference-unwrapping proxy. `args` from the VM is
    // CapturedArguments-shape with Reference values — delegate hooks expect an
    // Arguments object where `positional[i]` / `named[key]` are resolved values.
    // If the incoming args already look proxied (no Reference entries),
    // `_modifierArgsProxyFor` is a safe no-op: `_unwrapMaybeRef` passes non-refs
    // through. Gate on the presence of `.positional` to preserve legacy shapes
    // that pass pre-reified args.
    const proxiedArgs =
      args && (Array.isArray(args.positional) || args.named) ? _modifierArgsProxyFor(args) : args;
    const modifier =
      typeof delegate.createModifier === 'function'
        ? delegate.createModifier(definition, proxiedArgs)
        : delegate;
    // Lazy import: the validator shim creates an updatable tag we can return
    // from getTag(). This matches @glimmer/manager's public CustomModifierManager.
    const tag = _createUpdatableTagForModifier();
    const state: ShimCustomModifierState = { tag, element, delegate, args: proxiedArgs, modifier };
    // Match stock @glimmer/manager/lib/public/modifier.ts: register a
    // destructor on the state that invokes delegate.destroyModifier when the
    // state is destroyed. This is what drives willDestroy-style callbacks on
    // dynamic modifier swaps ({{@modifier}} where @modifier changes value) —
    // stock VM's UpdateDynamicModifierOpcode.evaluate calls destroy() on the
    // previous instance's destroyable, which (with the destructor registered
    // here) fires the modifier's destructor.
    if (typeof delegate?.destroyModifier === 'function') {
      try {
        _registerDestructor(state, () => delegate.destroyModifier(modifier, proxiedArgs));
      } catch {
        /* fall through — destructor registration optional */
      }
    }
    return state;
  }

  getTag(state: ShimCustomModifierState): any {
    return state?.tag ?? null;
  }

  getDebugName(definition: any) {
    // Mirror @glimmer/manager/lib/public/modifier.ts:getDebugName — when the
    // user delegate does not implement getDebugName, derive the name from the
    // definition itself: function classes use `definition.name`, otherwise
    // fall back to '<unknown>'. This matches the stock CustomModifierManager
    // and is what the debug-render-tree test expects (e.g. 'MyCustomModifier').
    const fromDelegate = this.delegate?.getDebugName?.(definition);
    if (fromDelegate) return fromDelegate;
    if (typeof definition === 'function') {
      return definition.name || definition.toString();
    }
    return '<unknown>';
  }

  // Mirror @glimmer/manager/lib/public/modifier.ts: stock VM's
  // ComponentElementOperations.addModifier calls `manager.getDebugInstance(state)`
  // when `env.debugRenderTree !== undefined` (i.e., enableDebugTooling=true).
  // Without this method, the VM throws `getDebugInstance is not a function` and
  // dies before any debug-render-tree assertion can run.
  getDebugInstance(state: ShimCustomModifierState): unknown {
    return state?.modifier ?? null;
  }

  getDestroyable(state: ShimCustomModifierState): any {
    const { delegate, modifier } = state;
    return delegate?.getDestroyable?.(modifier) ?? state;
  }

  install(state: ShimCustomModifierState) {
    const { delegate, modifier, element, args } = state;
    delegate?.installModifier?.(modifier, element, args);
  }

  update(state: ShimCustomModifierState) {
    const { delegate, modifier, args } = state;
    delegate?.updateModifier?.(modifier, args);
  }

  destroy(state: ShimCustomModifierState) {
    const { delegate, modifier } = state;
    delegate?.destroyModifier?.(modifier);
  }
}

function _createUpdatableTagForModifier(): any {
  try {
    return _gxtCreateUpdatableTag();
  } catch {
    return null;
  }
}

// =============================================================================
// Export $_MANAGERS for GXT Integration
// =============================================================================

// Install our handlers onto GXT's $_MANAGERS table via `registerHostManagers()`,
// which lives in the same module instance the runtime call sites close over,
// so the registration reaches the canonical table directly.
_gxtRegisterHostManagers({
  component: $_MANAGERS.component,
  helper: $_MANAGERS.helper,
  modifier: $_MANAGERS.modifier,
});

export { $_MANAGERS };

// Cross-file/-package readers of the manager table and the generation bump
// (wrappers' curried/compFactory paths, internal-test-helpers' modifier
// teardown probe and run loop) reach them through the compilePipeline.
installCompilePipelinePart({
  getManagers: () => $_MANAGERS,
  resetManagedComponentCounters: _resetManagedComponentCounters,
});

// =============================================================================
// gxt-bridge wiring
// =============================================================================
// Install the typed capabilities object on the leaf bridge module so sibling
// modules (compile.ts, ember-gxt-wrappers.ts) and a small set of cross-package
// consumers can call destruction hooks WITHOUT going through globalThis.
//
// Contract: this runs exactly once, at gxt-backend module init time. Classic
// builds never import this file, so the bridge stays null and the readers'
// `if (renderer)` guards (or build-time `__GXT_MODE__` gates upstream) DCE
// away the entire calling branch.
//
// Function references below are hoisted — the `function` declarations live
// hundreds of lines above. setGxtRenderer is a synchronous registration; no
// queueMicrotask deferral is needed (and would in fact break compile.ts's
// own top-level reads).

import {
  setGxtRenderer,
  getGxtRenderer,
  getCurrentOutletState,
  getAmbientOwner,
  setAmbientOwner,
  getDcComponentGetter,
  setEmberAssertDirect,
  installCompilePipelinePart,
  setCreateCurriedComponent,
} from './gxt-bridge';
setGxtRenderer({
  // See `gxtLib` doc in gxt-bridge.ts.
  gxtLib: {
    HTMLBrowserDOMApi: _EmberGxtDOMApi,
    destroyElementSync: _gxtLibDestroyElementSync,
    createRoot: _gxtLibCreateRoot,
    provideContext: _gxtLibProvideContext,
    RENDERING_CONTEXT: _gxtLibRenderingContext,
    getParentContext: _gxtLibGetParentContext,
    setParentContext: _gxtLibSetParentContext,
    captureRenderTree: _gxtLibCaptureRenderTree,
    renderComponent: _gxtLibRenderComponent,
    readProperty: _gxtReadProperty,
    cellFor: _gxtCellFor,
    Component: _gxtLibComponent,
    RENDERED_NODES_PROPERTY: _gxtLibRenderedNodesProperty,
    $SLOTS_SYMBOL,
  },
  // See `registries` doc in gxt-bridge.ts.
  registries: {
    componentTemplates: COMPONENT_TEMPLATES,
    componentManagers: COMPONENT_MANAGERS,
    internalManagers: INTERNAL_MANAGERS,
    internalHelperManagers: INTERNAL_HELPER_MANAGERS,
    internalModifierManagers: INTERNAL_MODIFIER_MANAGERS,
  },
  destruction: {
    destroyUnclaimedPoolEntries: _gxtDestroyUnclaimedPoolEntries,
    destroyInstancesInNodes: _gxtDestroyInstancesInNodes,
    destroyTrackedInstances: _gxtDestroyTrackedInstances,
    destroyEmberComponentInstance: _gxtDestroyEmberComponentInstance,
    finalizeInverseOldRows: _gxtFinalizeInverseOldRows,
    registerDynamicRegion: _gxtRegisterDynamicRegion,
    currentBlock: gxtCurrentBlock,
    renderInBlock: gxtRenderInBlock,
    destroyBlock: gxtDestroyBlock,
    destroyComponentsOfDestroyedBlocks: _gxtDestroyComponentsOfDestroyedBlocks,
  },
  // See debug-render-tree.ts. A root is the node a `renderComponent` render's
  // components are created under (base-renderer.ts `_renderComponentGxt`).
  debugRenderTree: {
    createRoot: () => gxtCreateDebugNode(null, 'component', '{ROOT}', null, null),
    renderWith: (root, render) => gxtWithDebugParent(root as GxtDebugNode | null, render),
    capture: (root) => gxtCaptureDebugNodes([root as GxtDebugNode])[0]!,
    isArgumentCaptureError: gxtIsArgumentCaptureError,
  },
  backtracking: {
    beginFrame: beginBacktrackingFrame,
    endFrame: endBacktrackingFrame,
    // compile.ts contributes a `transformBacktrackingMessage` host hook (via
    // `installBacktrackingPart`) that injects template-only component names
    // into the assertion message.
    checkBacktracking,
  },
  viewUtils: {
    pushParentView: _gxtBridgePushParentView,
    popParentView: _gxtBridgePopParentView,
    getCurrentParentView: _gxtBridgeGetCurrentParentView,
    getElementView: _gxtBridgeGetElementView,
    getViewElement: _gxtBridgeGetViewElement,
    // The adapter dispatches an `afterRebuildViewTreeFromDom` host hook
    // (contributed by compile.ts via `installViewUtilsPart`) AFTER the main
    // body runs, to reset stale `_wrapperIfUserFalse` view-registry children
    // and drain the in-element deferred-render queue.
    rebuildViewTreeFromDom: _gxtBridgeRebuildViewTreeFromDom,
    // The adapter dispatches an `afterFlushAfterInsertQueue` host hook
    // (contributed by compile.ts via `installViewUtilsPart`) AFTER the main
    // body runs, to drain the in-element deferred-render queue.
    flushAfterInsertQueue: _gxtBridgeFlushAfterInsertQueue,
  },
  compilePipeline: {
    // Classic-only (gated): _gxtSyncWrapper updates classic wrapper
    // classNameBindings/attributeBindings on property change. Glimmer is
    // tagless, so compile.ts's `syncWrapper?.(…)` callers no-op when this is
    // undefined. Folding to undefined in a native build leaves _gxtSyncWrapper
    // (and syncWrapperElement) unreferenced so rollup tree-shakes them.
    syncWrapper: __GXT_CLASSIC_COMPONENTS__ ? _gxtSyncWrapper : undefined,
    snapshotLiveInstances: _gxtSnapshotLiveInstances,
    syncAllWrappers: _gxtSyncAllWrappers,
    clearInstancePools: _gxtClearInstancePools,
    // `clearRenderErrors` is read cross-package by `internal-test-helpers/`.
    clearRenderErrors,
    // See the interface docs in gxt-bridge.ts.
    captureRenderError,
    classicDirtyTagFor: classicDirtyTagForGuarded,
    cellFor: _gxtCellFor,
    // Dynamic-component listener bridge methods. `addDynamicComponentListener`
    // returns an off-fn for symmetric cleanup; the `stringPath: true` variant
    // bumps a counter consulted by `hasStringDynamicComponentListeners()` for
    // compile.ts's render-skip logic and manager.ts's notifyPropertyChange
    // dispatch.
    addDynamicComponentListener: _gxtAddDynamicComponentListener,
    clearDynamicComponentListeners: _gxtClearDynamicComponentListeners,
    hasStringDynamicComponentListeners: _gxtHasStringDynamicComponentListeners,
    // Read-only getter for the `_allPoolArrays` Set. The cross-file reader is
    // compile.ts's inverse-branch teardown; the Set is mutated intra-file by
    // `getCachedOrCreateInstance` / `_gxtClearInstancePools`.
    getAllPoolArrays: _gxtGetAllPoolArrays,
    // Read-only getter for the `_modifierInstallWatchers` Map. The cross-file
    // reader is compile.ts's `_gxtTriggerReRenderBody` (notifyPropertyChange
    // dispatch into the per-instance watcher to flag the modifier's install
    // frame as dirty); the Map is mutated intra-file by the modifier-install
    // path only.
    getModifierInstallWatchers: _gxtGetModifierInstallWatchers,
    // Read-only getter for the `_pendingModifierDestroys` Array. The cross-file
    // reader is compile.ts's Phase-2d drain (and test-helpers at teardown);
    // consumers mutate the returned Array in place.
    getPendingModifierDestroys: _gxtGetPendingModifierDestroys,
    destroyPendingModifiers: _gxtDestroyPendingModifiers,
    // Sole reader is compile.ts's `_gxtSyncDomNow` (before the PHASE 0
    // if-watcher pre-flush).
    newRenderPass: _gxtNewRenderPass,
    // Sole reader is compile.ts's `_gxtSyncDomNow` PHASE 3 post-render hooks.
    postRenderHooks: _gxtPostRenderHooks,
    // Sole cross-package reader is `glimmer/lib/component.ts`'s
    // `Component.prototype._rerender` (fired when user code calls
    // `component.rerender()`). Distinct from `forceEmberRerender()`, the no-args
    // full-tree fallback fired from `_gxtSyncDomNow`.
    forceRerender: _gxtForceRerender,
  },
  renderPass: {
    // compile.ts contributes a `beforeBeginRenderPass` host hook (via
    // `installRenderPassPart`) that clears the template-only render state at
    // the start of each pass.
    beginRenderPass,
    endRenderPass,
    markTemplateRendered,
    flushAfterInsertQueue,
    renderErrorMark,
    flushRenderErrors,
    dropRenderErrors,
  },
  // Populated entirely via `installRootComponentPart` from
  // glimmer/lib/renderer.ts. Seeded empty here so `Object.assign` has a target
  // object regardless of which side loads first.
  rootComponent: {},
});

// Register manager.ts's BEFORE-chain host hook against compile.ts's
// `triggerReRender`. The hook records every dirtied object into
// `_dirtiedNestedObjectsForHooks` (consulted by `_gxtSyncAllWrappersBody`).
//
// Load-order: compile.ts's `installCompilePipelinePart` either ran before
// `setGxtRenderer` above (buffered in the bridge's pending queue and flushed
// by `setGxtRenderer`) or runs after (direct `Object.assign` into the
// now-present `compilePipeline` namespace). Either way, by the time
// `setGxtRenderer` returns the method is on the bridge if compile.ts is part of
// the import graph. If compile.ts hasn't loaded yet (rare — manager.ts loads
// first and compile.ts is pulled in lazily later), the deferred microtask below
// re-attempts the registration once compile.ts has finished its module init.
(function _gxtInstallTriggerReRenderHostHooks() {
  // Classic builds: the bridge reader is hard-gated to null (getGxtRenderer's
  // __GXT_MODE__ guard), so the retry below would re-queue itself forever and
  // starve the event loop before the page ever loads. Bail out entirely.
  if (!__GXT_MODE__) {
    return;
  }
  const cp = getGxtRenderer()?.compilePipeline;
  if (cp && typeof cp.addBeforeTriggerReRender === 'function') {
    cp.addBeforeTriggerReRender(_gxtRecordDirtiedNestedObject);
    return;
  }
  // Deferred-retry path: compile.ts hasn't published its contribution yet.
  queueMicrotask(_gxtInstallTriggerReRenderHostHooks);
})();

// Register the root-outlet-rerender instrumentation wrap on the bridge via
// `setRootOutletRerenderWrap`. The wrap closure fires `render.outlet`
// instrumentation around every dispatcher invocation. This IIFE is positioned
// at file EOF (AFTER the `setGxtRenderer` call above) so the bridge is
// installed when it runs. Same deferred-retry shape as
// `_gxtInstallTriggerReRenderHostHooks` above — if compile.ts's contribution
// hasn't been merged into the bridge yet, retry via `queueMicrotask` until
// `setRootOutletRerenderWrap` becomes callable.
(function _gxtInstallRootOutletRerenderInstrumentation() {
  // Same classic bail-out as _gxtInstallTriggerReRenderHostHooks above —
  // the bridge reader stays null in classic builds and the microtask retry
  // would spin forever.
  if (!__GXT_MODE__) {
    return;
  }
  const cp = getGxtRenderer()?.compilePipeline;
  const wrap = (fn: any): any => {
    if (typeof fn !== 'function') return fn;
    if ((fn as any).__gxtInstrumented) return fn;
    const wrapped = function (this: any, outletRef: any) {
      let finalizer: (() => void) | null = null;
      try {
        finalizer = _gxtInstrumentStart(
          'render.outlet',
          _outletRerenderInstrumentationPayload,
          outletRef
        );
      } catch {
        /* ignore */
      }
      try {
        return fn.call(this, outletRef);
      } finally {
        if (finalizer) {
          try {
            finalizer();
          } catch {
            /* ignore */
          }
        }
      }
    };
    (wrapped as any).__gxtInstrumented = true;
    return wrapped;
  };
  if (cp && typeof cp.setRootOutletRerenderWrap === 'function') {
    cp.setRootOutletRerenderWrap(wrap);
    return;
  }
  // Deferred-retry path: compile.ts hasn't published its contribution yet.
  queueMicrotask(_gxtInstallRootOutletRerenderInstrumentation);
})();
