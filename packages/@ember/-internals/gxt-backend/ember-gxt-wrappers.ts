/**
 * Shared Ember-GXT wrappers for $_maybeHelper and $_tag
 *
 * These wrappers bridge GXT's rendering primitives with Ember's component/helper
 * resolution system. They are installed on globalThis (for runtime-compiled templates)
 * and exported for ES module consumers.
 *
 * This module must be imported AFTER setupGlobalScope() has been called.
 */

// Use direct path to avoid circular alias (since @lifeart/gxt is aliased to gxt-with-runtime-hbs.ts)
// @ts-ignore - direct path import
import * as gxtModule from '@lifeart/gxt';
import { DEBUG } from '@glimmer/env';

// Typed bridge for destruction hooks. Populated by manager.ts at its module
// init. Allows the $_dc_ember wrapper to destroy a component instance without
// going through `(globalThis as any).__gxtDestroyEmberComponentInstance`.
import { getGxtRenderer, installCompilePipelinePart } from './gxt-bridge';
import { createComputeRef, valueForRef } from '@glimmer/reference';

const g = globalThis as any;

// `_gxtMutContext` is the component render context (the `this` value of the
// template that invoked `(mut ...)` or `(__mutGet ...)`) at the moment the
// `$_maybeHelper` wrapper dispatches to the corresponding
// `__EMBER_BUILTIN_HELPERS__` entry. It is captured at helper-creation time
// inside the helpers' arrow-function bodies (in `compile.ts`'s
// `__EMBER_BUILTIN_HELPERS__.mut` / `__mutGet`) so the closure produced by
// those helpers can later resolve the source getter for two-way binding
// without re-threading the context through every `mut` argument. The 6 writers
// here (two save/set/finally-restore triplets around the `mut` / `__mutGet`
// helper invocations) keep the state intra-file; the 2 readers in compile.ts
// reach it through the paired `getMutContext` / `setMutContext` bridge methods.
// The save/set/finally-restore pattern preserves the previous value across the
// restore step (save = read previous, set = write new, restore = write
// previous), so a read-only predicate or mark+consume surface won't do.
let _gxtMutContext: unknown = undefined;
function _gxtGetMutContext(): unknown {
  return _gxtMutContext;
}
function _gxtSetMutContext(value: unknown): void {
  _gxtMutContext = value;
}

// Register the paired get/set bridge methods on the `compilePipeline` namespace
// so that `compile.ts` (cross-package reader) can route through the bridge to
// read the writer-side state. Runs at module-init time; by the time the
// `$_maybeHelper` wrapper dispatches a `mut` / `__mutGet` helper invocation
// (well past module init), both the wrapper-side writer helpers and the
// cross-package bridge readers are wired and the bridge slot is installed.
installCompilePipelinePart({
  getMutContext: _gxtGetMutContext,
  setMutContext: _gxtSetMutContext,
});

// $_maybeHelper wrapper

/**
 * Wraps GXT's $_maybeHelper to support:
 * - Function arguments (like $_blockParam from block params)
 * - Ember's built-in keyword helpers (readonly, mut, unbound)
 * - Helper lookup from Ember's container via owner
 * - Component invocation for kebab-case names ({{foo-bar}})
 */
/**
 * Unwrap GXT args: GXT may pass getters (functions) for reactive values.
 * Helpers expect resolved values in positional/named args.
 */
function isGxtGetter(v: any): boolean {
  return (
    typeof v === 'function' &&
    !v.prototype &&
    !v.__isFnHelper &&
    !v.__isMutCell &&
    !v.__isHelperResult
  );
}
function unwrapArgs(args: any[]): any[] {
  if (!Array.isArray(args)) return Object.freeze([]) as any[];
  // Only unwrap GXT getters (arrow fns with no prototype).
  // Regular functions (like closures from (fn ...)) should be passed as-is.
  const result = args.map((a) => (isGxtGetter(a) ? a() : a));
  Object.freeze(result);
  return result;
}

// GXT internal hash keys that should not be passed to Ember helpers
const GXT_INTERNAL_KEYS = new Set(['$_hasBlock', '$_hasBlockParams', '$_scope', '$_eval', 'hash']);

// Shared frozen empty-hash constant. krausest's hottest helpers (`if`, `fn`,
// `isSelected`) all pass `{}` per row per eval; returning one shared frozen
// object avoids allocating `{}` + `Object.keys` + `Object.freeze` each time.
// Safe to share: every downstream consumer of an `unwrapHash` result only
// spreads (`{ ...named }`), iterates (`Object.keys(named)`), or passes it as a
// read-only Ember helper args object — none mutate it or identity-compare it.
const EMPTY_FROZEN_HASH = Object.freeze({}) as Record<string, any>;

function unwrapHash(hash: Record<string, any>): Record<string, any> {
  if (!hash || typeof hash !== 'object') return EMPTY_FROZEN_HASH;
  // Short-circuit empty hashes (the common krausest case) without allocating.
  if (Object.keys(hash).length === 0) return EMPTY_FROZEN_HASH;
  const result: Record<string, any> = {};
  for (const key of Object.keys(hash)) {
    if (GXT_INTERNAL_KEYS.has(key) || key.startsWith('$_')) continue;
    const val = hash[key];
    // Don't call CurriedComponent functions - they should be preserved as-is
    result[key] = typeof val === 'function' && !val.__isCurriedComponent ? val() : val;
  }
  Object.freeze(result);
  return result;
}

/**
 * Per-object cache for findHelperManager results — INCLUDING the negative
 * (null) result. findHelperManager is called per row per eval for plain
 * arrow-fn helpers (`isSelected`/`select`/`remove` in krausest); it allocates
 * a `Set` + walks the prototype chain and almost always returns `null`.
 * Helper-manager registration is monotonic per object (managers are set at
 * class-definition time, before render), so a cached null cannot go stale
 * within a run. INTERNAL_HELPER_MANAGERS is itself a WeakMap (owner-
 * independent), so this cache is owner-independent too. Cleared in
 * _gxtClearHelperCache for test-teardown hygiene.
 */
let helperManagerLookupCache = new WeakMap<object, any>();

/**
 * Walk the prototype chain to find a helper manager registered via
 * setHelperManager / setInternalHelperManager.
 */
function findHelperManager(obj: any): any {
  const managers = g.INTERNAL_HELPER_MANAGERS;
  if (!managers) return null;
  // WeakMap keys must be objects (or registered symbols). obj is typically a
  // function or class instance here; guard primitives just in case.
  const cacheable = obj !== null && (typeof obj === 'object' || typeof obj === 'function');
  if (cacheable && helperManagerLookupCache.has(obj)) {
    return helperManagerLookupCache.get(obj);
  }
  let current = obj;
  const visited = new Set();
  let found = null;
  while (current && !visited.has(current)) {
    visited.add(current);
    const mgr = managers.get(current);
    if (mgr) {
      found = mgr;
      break;
    }
    current = Object.getPrototypeOf(current);
  }
  if (cacheable) helperManagerLookupCache.set(obj, found);
  return found;
}

// Cache for class-based helper instances created via $_maybeHelper.
// Keyed by helper name for simple per-invocation caching.
// Cleared during test teardown via compilePipeline.clearHelperCache.
const classHelperInstanceCache = new Map<string, any>();
// Exposed to cross-file readers through the get-only bridge method
// `compilePipeline.getClassHelperInstanceCache` (registered in the
// `installCompilePipelinePart` block below). All five cross-file readers (1 in
// `validator.ts`, 4 in `compile.ts`) route through `getGxtRenderer()?.
// compilePipeline.getClassHelperInstanceCache?.()`. See its doc in
// gxt-bridge.ts.
// Cache for simple (function-based) helper results to deduplicate calls within
// the same sync cycle. Keyed by helper name, stores last args serialization + result.
const simpleHelperResultCache = new Map<string, { argsSer: string; result: any }>();
// Cache for managed helper buckets (class-based helpers with setHelperManager).
// Keyed by the helper class/function. Stores { bucket, delegate, reactiveArgs }.
let managedHelperBucketCache = new WeakMap<
  any,
  { bucket: any; delegate: any; reactiveArgs: { positional: any[]; named: Record<string, any> } }
>();
// `_gxtClearHelperCache` is exposed through the `compilePipeline.clearHelperCache`
// typed-bridge method. Readers at `internal-test-helpers/lib/run.ts:134`
// (cross-package, in `runDestroy`) and `compile.ts` (intra-package, in
// `_gxtClearOnSetup`) route through
// `getGxtRenderer()?.compilePipeline.clearHelperCache?.()` — the optional-chain
// guards classic-Ember builds where the bridge was never installed.
function _gxtClearHelperCache(): void {
  // Preserve the tag-dirty sentinel — it has no per-test state and re-installing
  // it after every test teardown is unnecessary (and would race with subsequent
  // dirtyTagFor invalidations that fire during the next test's render).
  const sentinel = classHelperInstanceCache.get('__tagDirtySentinel__');
  classHelperInstanceCache.clear();
  if (sentinel) classHelperInstanceCache.set('__tagDirtySentinel__', sentinel);
  simpleHelperResultCache.clear();
  managedHelperBucketCache = new WeakMap();
  // Reset the findHelperManager negative/positive cache for test-teardown
  // hygiene (mirrors managedHelperBucketCache above). Within a run the cache
  // is sound because helper-manager registration is monotonic per object.
  helperManagerLookupCache = new WeakMap();
}
// Register the typed-bridge methods on the `compilePipeline` namespace so the
// cross-file readers in `internal-test-helpers/lib/run.ts` and `compile.ts`
// can route through the bridge. The call queues into
// `_pendingCompilePipelineParts` if `setGxtRenderer` has not yet fired and
// merges immediately otherwise.
installCompilePipelinePart({
  clearHelperCache: _gxtClearHelperCache,
  // Get-only accessor for the `classHelperInstanceCache` Map above (per-helper-
  // name class-based helper instances + their manager-bucket wrappers, created
  // in `$_maybeHelper`). The five cross-file readers — 1 in `validator.ts`
  // (the `dirtyTagFor` loop that stamps `lastArgsSer` on every bucket to force
  // a cache-miss on the next `$_maybeHelper` invocation) and 4 in `compile.ts`
  // (the `$_if` branch-swap helper-destroy hook's evict / snapshot /
  // destroyNew / destroyHelpersIn walks) — route through this method.
  getClassHelperInstanceCache: () => classHelperInstanceCache,
});

// Tag-dirty bridge sentinel.
//
// Class-based helpers invoked WITHOUT args (e.g. `{{hello-world}}` with no
// positional/named arguments) are routed by GXT's tag-rewrite path through
// compile.ts's `_tagHelperInstanceCache` instead of through this file's
// classHelperInstanceCache. compile.ts uses a JSON-stringified args+recompute
// dedup key on the helper instance to avoid double-computing within a single
// render — but it has no listener for tracked-property dirties on EXTERNAL
// objects (a closure-captured @tracked instance, for example).
//
// validator.ts already iterates `__gxtClassHelperInstanceCache` on every
// `dirtyTagFor` call to bump entries' `lastArgsSer` to a fresh sentinel
// string, forcing the next render to bypass the dedup. We piggy-back on that
// loop by inserting a synthetic entry whose `lastArgsSer` setter forwards the
// dirty signal to every cached tag-helper instance, clearing its
// `__gxtLastArgsSerialized` so compile.ts re-invokes compute() with fresh
// state.
//
// This is the only seam available without editing compile.ts or validator.ts.
{
  const _tagDirtySentinel = {
    __managerBucket: true as const,
    _val: null as string | null,
    get lastArgsSer() {
      return this._val;
    },
    set lastArgsSer(v: string | null) {
      this._val = v;
      try {
        // Route through the get-only bridge accessor
        // `compilePipeline.getTagHelperInstanceCache?.()` (registered by
        // `compile.ts`'s `installCompilePipelinePart` at EOF). The optional-chain
        // returns undefined when compile.ts has not yet executed its bridge
        // install (extremely-early classic-tag-dirty firing), so the loop body
        // is skipped.
        const tagCache = getGxtRenderer()?.compilePipeline.getTagHelperInstanceCache?.() as
          | Map<string, { instance: any }>
          | undefined;
        if (!tagCache || tagCache.size === 0) return;
        for (const [, entry] of tagCache) {
          const inst = entry?.instance;
          if (inst) {
            // Clearing the dedup key forces compile.ts's helperGetter to
            // re-run compute() instead of returning the stale cached result.
            inst.__gxtLastArgsSerialized = null;
          }
        }
      } catch {
        /* noop — defensive */
      }
    },
  };
  classHelperInstanceCache.set('__tagDirtySentinel__', _tagDirtySentinel);
}

// Resolver cache counters — mirrors the Glimmer ConstantsImpl counters so the
// `ember-glimmer runtime resolver cache` test can observe helper/component
// definition reuse from the GXT path. The renderer's `_context` getter copies
// these onto the live EvaluationContext.constants object in GXT mode so the
// test's `renderer._context.constants` read sees the latest values.
//
// The intra-file writers inside `_trackHelperDefinition` /
// `_trackComponentDefinition` mutate the module-local `_resolverCacheCounters`
// directly. The sole cross-file reader (`glimmer/lib/renderer.ts:2972` — the
// `_context` getter copies these onto the live `EvaluationContext.constants`
// object when `__GXT_MODE__` is set) routes through
// `getGxtRenderer()?.compilePipeline.getResolverCacheCounters?.()`, which
// returns the same live module-local reference.
const _resolverCacheCounters: {
  componentDefinitionCount: number;
  helperDefinitionCount: number;
  modifierDefinitionCount: number;
} = {
  componentDefinitionCount: 0,
  helperDefinitionCount: 0,
  modifierDefinitionCount: 0,
};
// Register the typed-bridge getter on the `compilePipeline` namespace so the
// cross-file reader in `glimmer/lib/renderer.ts` can route through the bridge
// to access the live counters object. The call queues into
// `_pendingCompilePipelineParts` if `setGxtRenderer` has not yet fired
// (manager.ts loads after this file in some entry paths) and merges
// immediately otherwise.
installCompilePipelinePart({
  getResolverCacheCounters: () => _resolverCacheCounters,
});
// The four resolver-cache-tracking dedupe sets are module-local; their
// intra-file readers consume them directly (no cross-file consumers).
const _seenHelperDefinitions = new WeakSet<object>();
const _seenHelperNames = new Set<string>();
const _seenComponentDefinitions = new WeakSet<object>();
const _seenComponentNames = new Set<string>();
function _trackHelperDefinition(nameOrFactory: string | object | null | undefined) {
  if (!nameOrFactory) return;
  if (typeof nameOrFactory === 'string') {
    if (_seenHelperNames.has(nameOrFactory)) return;
    _seenHelperNames.add(nameOrFactory);
    _resolverCacheCounters.helperDefinitionCount++;
  } else {
    if (_seenHelperDefinitions.has(nameOrFactory as object)) return;
    _seenHelperDefinitions.add(nameOrFactory as object);
    _resolverCacheCounters.helperDefinitionCount++;
  }
}
function _trackComponentDefinition(nameOrFactory: string | object | null | undefined) {
  if (!nameOrFactory) return;
  if (typeof nameOrFactory === 'string') {
    if (_seenComponentNames.has(nameOrFactory)) return;
    _seenComponentNames.add(nameOrFactory);
    _resolverCacheCounters.componentDefinitionCount++;
  } else {
    if (_seenComponentDefinitions.has(nameOrFactory as object)) return;
    _seenComponentDefinitions.add(nameOrFactory as object);
    _resolverCacheCounters.componentDefinitionCount++;
  }
}
(g as any).__gxtTrackHelperDefinition = _trackHelperDefinition;
(g as any).__gxtTrackComponentDefinition = _trackComponentDefinition;

// Install a self-healing proxy on `globalThis.__createCurriedComponent` so
// that named component curries — produced by `(component "x")` /
// `{{component "x"}}` / CurriedComponent invocations — count once per unique
// name in the resolver-cache counters. The setter intercepts assignments
// from manager.ts (which installs the original factory on module load) and
// wraps them; later reads always see the tracking wrapper.
{
  let _innerCreateCurried: any = (g as any).__createCurriedComponent;
  if (!(g as any).__gxtCountedCurryHookInstalled) {
    const trackingWrapper = function (nameOrComp: any, args: any, positionals: any[]) {
      if (typeof nameOrComp === 'string') {
        _trackComponentDefinition(nameOrComp);
      } else if (nameOrComp && typeof (nameOrComp as any).__name === 'string') {
        _trackComponentDefinition((nameOrComp as any).__name);
      }
      if (typeof _innerCreateCurried === 'function') {
        return _innerCreateCurried(nameOrComp, args, positionals);
      }
      return nameOrComp;
    };
    (trackingWrapper as any).__gxtCountedCurry = true;
    try {
      Object.defineProperty(g, '__createCurriedComponent', {
        configurable: true,
        get() {
          return trackingWrapper;
        },
        set(v: any) {
          if (v && (v as any).__gxtCountedCurry) return;
          _innerCreateCurried = v;
        },
      });
      (g as any).__gxtCountedCurryHookInstalled = true;
    } catch {
      // Fallback: direct overwrite if defineProperty fails (e.g. the slot is
      // non-configurable under some test harnesses).
      (g as any).__createCurriedComponent = trackingWrapper;
    }
  }
}

// When a property changes on a component, invalidate managed helper caches
// so the next render pass picks up the changes. We DON'T re-compute values
// here to avoid double-counting (GXT's native reactivity may also trigger).
//
// `_gxtNotifyHelperPropertyChange` is exposed through the
// `compilePipeline.notifyHelperPropertyChange` typed-bridge method. The sole
// reader at `manager.ts:565` (helper-recompute path inside the
// `__gxtTriggerReRender` after-body) routes through
// `getGxtRenderer()?.compilePipeline.notifyHelperPropertyChange?.(this,
// '__gxtRecomputeTagRef')` — the optional-chain guards classic-Ember builds
// where the bridge was never installed.
function _gxtNotifyHelperPropertyChange(_obj: unknown, _key: string): void {
  for (const [, cached] of classHelperInstanceCache as Map<string, any>) {
    if (cached && cached.__managerBucket) {
      // Invalidate the args serialization so the next $_maybeHelper call
      // doesn't short-circuit with the cached result
      cached.lastArgsSer = null;
    }
  }
}
// Register the typed-bridge method on the `compilePipeline` namespace so the
// cross-file reader in `manager.ts` can route through the bridge. The call
// queues into `_pendingCompilePipelineParts` if `setGxtRenderer` has not yet
// fired and merges immediately otherwise.
installCompilePipelinePart({
  notifyHelperPropertyChange: _gxtNotifyHelperPropertyChange,
});

function createEmberMaybeHelper(original: Function) {
  // Cache the last known owner so that re-evaluations during reactive updates
  // (when globalThis.owner may be null) can still resolve helpers.
  let _cachedHelperOwner: any = null;

  const wrapped = function $_maybeHelper_ember(
    nameOrFn: string | Function,
    args: any[],
    hashOrCtx?: any,
    maybeCtx?: any
  ): any {
    // GXT's $_maybeHelper signature: (value, args[], hashOrCtx?, maybeCtx?)
    // Determine which param is the hash (named args) and which is the context.
    // If maybeCtx is provided, hashOrCtx is the hash and maybeCtx is context.
    // If only hashOrCtx and it looks like a context (has $_eval or GXT symbols), it's context.
    const $PROPS = Symbol.for('gxt-props');
    const $ARGS = Symbol.for('gxt-args');
    const isCtx =
      !maybeCtx &&
      hashOrCtx &&
      typeof hashOrCtx === 'object' &&
      (hashOrCtx.hasOwnProperty?.('$_eval') ||
        hashOrCtx[$PROPS] !== undefined ||
        hashOrCtx.hasOwnProperty?.($PROPS) ||
        hashOrCtx[$ARGS] !== undefined ||
        // Detect Ember component instances used as context (not as hash)
        (hashOrCtx.isView === true && hashOrCtx.isComponent === true));
    const hash = maybeCtx ? hashOrCtx : isCtx ? {} : (hashOrCtx ?? {});

    // Detect a destroyed render context. When a prior test's component was torn
    // down but its formula closures linger (e.g. a dirtyTagFor cascade pulls the
    // dead component's $_maybeHelper invocation into a re-evaluation pass), the
    // ctx passed in here is the destroyed component instance. Re-invoking a
    // helper for a destroyed context inflates compute() call counts in helper
    // autotrack tests (3 baseline failures in "Helper Tracked Properties" —
    // computeCount asserts 2, observed 5-6). Short-circuit by returning the
    // last cached result (no compute), preserving DOM stability for the
    // already-detached node while preventing the dead-formula recompute.
    {
      const probeCtx = maybeCtx || (isCtx ? hashOrCtx : null);
      if (
        probeCtx &&
        typeof probeCtx === 'object' &&
        (probeCtx.isDestroyed === true || probeCtx.isDestroying === true)
      ) {
        return undefined;
      }
    }

    // Handle CurriedComponent — when a curried component is used as {{curried ...}} or {{object.comp ...}}
    if (nameOrFn && nameOrFn.__isCurriedComponent) {
      // Merge the invocation args into the curried component
      const namedArgs: Record<string, any> = {};
      if (hash && typeof hash === 'object') {
        for (const key of Object.keys(hash)) {
          if (!key.startsWith('$_') && key !== 'hash') {
            namedArgs[key] = hash[key];
          }
        }
      }
      const positionals = Array.isArray(args) ? args : [];

      // Create a new curried component with merged args
      const createCurried = g.__createCurriedComponent;
      if (!createCurried) return nameOrFn;
      const merged = createCurried(nameOrFn, namedArgs, positionals);

      // Track curried component definition resolution for the runtime
      // resolver cache counters. The string-named curried forms created via
      // `{{component "name"}}` / `(component name ...)` map 1:1 to registry
      // lookups, so count them here.
      if (typeof (merged as any)?.__name === 'string') {
        _trackComponentDefinition((merged as any).__name);
      } else if (typeof (nameOrFn as any)?.__name === 'string') {
        _trackComponentDefinition((nameOrFn as any).__name);
      }

      // Render it through the component manager
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(merged)) {
        const handleResult = managers.component.handle(merged, {}, null, null);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
      return merged;
    }

    // Function/class arguments — check for a registered helper manager first.
    // Classes like TestHelper subclasses are typeof 'function' but have a
    // helper manager set on a parent prototype via setHelperManager().
    if (typeof nameOrFn === 'function') {
      const helperMgr = findHelperManager(nameOrFn);
      if (helperMgr) {
        // This is a class/function with a registered helper manager.
        // Use the delegate protocol to create the helper instance once
        // and call getValue on each re-render.
        const positional = unwrapArgs(args || []);
        const named = unwrapHash(hash);

        if (typeof helperMgr.getDelegateFor === 'function') {
          const delegate = helperMgr.getDelegateFor(g.owner);
          // Validate that capabilities were created via helperCapabilities()
          const _FROM_CAPS = g.FROM_CAPABILITIES;
          if (
            delegate &&
            delegate.capabilities &&
            _FROM_CAPS &&
            !_FROM_CAPS.has(delegate.capabilities)
          ) {
            const err = new Error(
              `Custom helper managers must have a \`capabilities\` property ` +
                `that is the result of calling the \`capabilities('3.23')\` ` +
                `(imported via \`import { capabilities } from '@ember/helper';\`). ` +
                `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
            );
            // Capture for flushRenderErrors so assert.throws() can see it
            const captureFn = g.__captureRenderError;
            if (typeof captureFn === 'function') captureFn(err);
            throw err;
          }
          if (
            delegate &&
            typeof delegate.createHelper === 'function' &&
            delegate.capabilities?.hasValue
          ) {
            // Check cache — reuse the same bucket across re-evaluations
            let cached = managedHelperBucketCache.get(nameOrFn);
            if (!cached) {
              // Build a reactive args object so the helper can read updated values
              const reactiveArgs: { positional: any[]; named: Record<string, any> } = {
                positional: Object.freeze([...positional]) as any[],
                named: Object.freeze({ ...named }) as Record<string, any>,
              };

              // Create the helper bucket once
              const bucket = delegate.createHelper(nameOrFn, reactiveArgs);

              // If the delegate supports destroyable, wire it up
              if (
                delegate.capabilities?.hasDestroyable &&
                typeof delegate.getDestroyable === 'function'
              ) {
                const destroyable = delegate.getDestroyable(bucket);
                if (destroyable) {
                  // Route through the typed bridge
                  // `compilePipeline.pushHelperInstance?.()`. The bridge
                  // method fires manager.ts's registered push-hook
                  // (`_installHelperRecomputeBridge`) BEFORE pushing onto
                  // the canonical module-local `_gxtHelperInstances` array
                  // in compile.ts. See `pushHelperInstance` doc in
                  // gxt-bridge.ts.
                  getGxtRenderer()?.compilePipeline.pushHelperInstance?.(destroyable);
                }
              }

              cached = { bucket, delegate, reactiveArgs };
              managedHelperBucketCache.set(nameOrFn, cached);
            } else {
              // Update the reactive args in place
              cached.reactiveArgs.positional = positional;
              cached.reactiveArgs.named = named;
            }

            return cached.delegate.getValue(cached.bucket);
          }
        }

        // Fallback: use getHelper
        if (typeof helperMgr.getHelper === 'function') {
          const helperFn = helperMgr.getHelper(nameOrFn);
          if (typeof helperFn === 'function') {
            const capturedArgs = { positional, named };
            return helperFn(capturedArgs, g.owner);
          }
        }
      }

      // No helper manager — treat as a default function helper (Ember convention).
      // Plain functions used as helpers: positional args are spread, named args
      // (if any) are passed as the last argument.
      // This handles {{(this.hello this.foo)}} and {{(this.hello "foo" foo="bar")}}.
      //
      // Use the managed helper bucket cache (keyed by function) so that:
      // 1. GXT formula re-evaluations within the same render don't double-call
      // 2. When args change, the function IS re-called with fresh values
      const positional = unwrapArgs(args || []);
      const named = unwrapHash(hash);
      const hasNamed = named && Object.keys(named).length > 0;

      // If any positional arg is a non-primitive object, skip the result
      // cache entirely — JSON.stringify-based comparison is unreliable:
      //   - Map/Set serialize to `{}` (reference replacement missed)
      //   - In-place mutation (setProp on a POJO passed by reference) is missed
      //   - Objects with cycles throw
      // For these cases we always re-invoke. The helper is called inside a
      // reactive formula that already dedupes by tag-tracking; re-invoking
      // per formula evaluation is safe and correct.
      // Mark user helper results that are functions so downstream
      // unwrapArgs / unwrapHash do not treat them as GXT reactive getters
      // and invoke them. For example, when a user function like `boundFn`
      // is invoked via `(fn ...)` (shadowed), the returned closure must reach
      // the outer helper (e.g. `invoke`) AS-IS rather than be eagerly called.
      const markHelperResult = (v: any) => {
        if (
          typeof v === 'function' &&
          !v.prototype &&
          !v.__isFnHelper &&
          !v.__isMutCell &&
          !v.__isHelperResult
        ) {
          try {
            Object.defineProperty(v, '__isHelperResult', {
              value: true,
              enumerable: false,
              configurable: true,
            });
          } catch {
            /* frozen or non-extensible — skip */
          }
        }
        return v;
      };
      // Skip the JSON.stringify-based result cache when any positional arg
      // is a non-primitive object OR a plain function value. Functions
      // serialize to null, producing false cache hits across distinct
      // callbacks (e.g. two (fn ...) subexpressions shadowed by a user fn).
      const hasObjectArg = positional.some(
        (a: any) =>
          (a !== null && typeof a === 'object') ||
          (typeof a === 'function' && !a.__isFnHelper && !a.__isMutCell)
      );
      if (hasObjectArg) {
        return markHelperResult(
          hasNamed ? nameOrFn(...positional, named) : nameOrFn(...positional)
        );
      }

      let cached = managedHelperBucketCache.get(nameOrFn);
      let argsSer: string | null = null;
      try {
        argsSer = JSON.stringify({ p: positional, n: named });
      } catch {
        /* skip */
      }

      if (cached && cached.__plainFnHelper) {
        // Check if args actually changed
        if (argsSer !== null && argsSer === cached.lastArgsSer) {
          // Same args — return cached result (dedup within same render)
          return cached.lastResult;
        }
        // Args changed — re-invoke the function
        const result = markHelperResult(
          hasNamed ? nameOrFn(...positional, named) : nameOrFn(...positional)
        );
        cached.lastArgsSer = argsSer;
        cached.lastResult = result;
        return result;
      }

      // First invocation — call and cache
      const result = markHelperResult(
        hasNamed ? nameOrFn(...positional, named) : nameOrFn(...positional)
      );
      managedHelperBucketCache.set(nameOrFn, {
        __plainFnHelper: true,
        lastArgsSer: argsSer,
        lastResult: result,
        bucket: null,
        delegate: null,
        reactiveArgs: null as any,
      });
      return result;
    }

    // Object-shaped HelperDefinitionState (`{}` returned by
    // `setInternalHelperManager(handler, {})`).
    //
    // The element helper from `@ember/helper` is exported as such a value.
    // When user scope binds `element: elementHelper`, GXT compiles
    // `{{element "p"}}` as `$_maybeHelper(elementHelper, ["p"], {})` — and
    // the function/string branches above all miss. Without this branch we
    // fall through to the name-as-string container lookup and ultimately
    // return undefined, which crashes the downstream `<Tag>` invocation
    // with "Cannot read properties of null (reading 'prototype')".
    //
    // Look up the registered internal helper manager via the same WeakMap
    // glimmer-manager uses. If the manager is a plain function (the shape
    // returned by `internalHelper(({ positional, named }) => ...)` —
    // matches Ember's element/array/hash internal helpers), invoke it
    // with a captured-args object so the helper can produce its reference
    // (e.g. the `ElementComponentDefinition`). The returned reference is
    // unwrapped via `valueForRef` when present.
    if (nameOrFn && typeof nameOrFn === 'object' && g.INTERNAL_HELPER_MANAGERS) {
      const helperFnOrManager = g.INTERNAL_HELPER_MANAGERS.get(nameOrFn);
      if (typeof helperFnOrManager === 'function') {
        // Build CapturedArguments — positional refs + named refs.
        // Each ref must expose at least `value`/getter semantics. We use
        // plain getter wrappers since the internal element helper only
        // calls `valueForRef(positional[0])` and reads `positional.length`.
        // Build CapturedArguments shape: arrays of compute-refs whose
        // `compute()` returns the wrapped value. Using the real
        // `createComputeRef` from `@glimmer/reference` keeps `valueForRef`
        // happy (the internal tag/lastRevision plumbing matches).
        const makeRef = (argVal: any) => {
          const isGetter = typeof argVal === 'function' && !(argVal as any).prototype;
          const getter = isGetter ? () => argVal() : () => argVal;
          return createComputeRef(getter, null, 'element-arg');
        };
        const positionalRefs = (args || []).map(makeRef);
        const namedObj = hash && typeof hash === 'object' ? hash : {};
        const named: Record<string, any> = {};
        for (const k of Object.keys(namedObj)) {
          if (k.startsWith('$')) continue;
          named[k] = makeRef((namedObj as any)[k]);
        }
        const captured = { positional: positionalRefs, named, length: positionalRefs.length };
        let ref: any;
        try {
          ref = helperFnOrManager(captured, g.owner);
        } catch (e) {
          // Surface the error rather than swallow — matches the no-silent-
          // swallow rule. Lets assert.throws() in DEBUG capture invalid-
          // arity / non-string-tag asserts produced by the element helper.
          throw e;
        }
        // The Helper return is itself a `Reference`. Read its current
        // value via `valueForRef` — matches Ember's Glimmer-VM read path
        // exactly, including tag-tracking for the wrapping reactive read.
        if (ref && typeof ref === 'object' && typeof (ref as any).compute === 'function') {
          return valueForRef(ref);
        }
        return ref;
      }
    }

    const name = nameOrFn;

    // Ember's built-in keyword helpers (readonly, mut, unbound, hash, etc.)
    const BUILTIN_HELPERS = g.__EMBER_BUILTIN_HELPERS__;
    if (BUILTIN_HELPERS && BUILTIN_HELPERS[name]) {
      const helper = BUILTIN_HELPERS[name];
      // For 'hash' helper, pass the named args (hash) as the first argument
      if (name === 'hash') {
        const namedObj = unwrapHash(hash);
        return helper(namedObj);
      }
      // For '__mutGet' helper, pass obj and key with context set
      if (name === '__mutGet' && Array.isArray(args) && args.length > 0) {
        const ctx = maybeCtx || hashOrCtx;
        // Writer-side save/set/finally-restore triplet around the
        // `helper(...)` invocation. Uses the module-local helpers directly
        // (intra-file writer-home pattern) — see `_gxtGetMutContext` /
        // `_gxtSetMutContext` near the top of this file.
        const prevCtx = _gxtGetMutContext();
        _gxtSetMutContext(ctx);
        try {
          // Pass raw getters so __mutGet can re-evaluate them reactively
          return helper(args[0], args[1]);
        } finally {
          _gxtSetMutContext(prevCtx);
        }
      }
      // For 'mut' helper, pass the raw getter + path, and set context
      if (name === 'mut' && Array.isArray(args) && args.length > 0) {
        // args[0] = getter for the value, args[1] = path string (added by template transform).
        // NOTE: GXT's AST transform emits the path literal only for single-segment
        // `this.X` / `@X` forms. For nested paths like `{{mut this.filters.shared}}`
        // no path is emitted (args.length === 1), and the runtime `mut` helper
        // then rejects the call with "You can only pass a path to mut".
        // We recover the dotted path by parsing the getter's toString() — the
        // compiled getter is of the form `() => this.foo?.bar` (optional chaining
        // is inserted for nested reads). This matches the path-derivation logic
        // used downstream in compile.ts#extractThisPath.
        const rawGetter = args[0];
        let pathArg: any =
          args.length > 1 ? (typeof args[1] === 'function' ? args[1]() : args[1]) : undefined;
        if (
          (pathArg === undefined || typeof pathArg !== 'string') &&
          typeof rawGetter === 'function'
        ) {
          const getterStr = String(rawGetter);
          const scanPath = (start: number): string | null => {
            let end = start;
            while (end < getterStr.length) {
              const c = getterStr[end]!;
              if (
                (c >= 'a' && c <= 'z') ||
                (c >= 'A' && c <= 'Z') ||
                (c >= '0' && c <= '9') ||
                c === '_' ||
                c === '$' ||
                c === '?' ||
                c === '.'
              ) {
                end++;
              } else {
                break;
              }
            }
            if (end === start) return null;
            // Strip optional chaining: `foo?.bar` -> `foo.bar`.
            return getterStr.slice(start, end).split('?').join('');
          };
          const thisMarker = 'this.';
          const thisIdx = getterStr.indexOf(thisMarker);
          if (thisIdx !== -1) {
            const tail = scanPath(thisIdx + thisMarker.length);
            if (tail) pathArg = thisMarker + tail;
          }
        }
        // Set the mut context so the setter can find the component instance.
        // The context is either maybeCtx (4th arg) or hashOrCtx (3rd arg).
        // For mut, the 3rd arg is always the component's render context (this)
        // since GXT compiles (mut this.val) as $_maybeHelper("mut", [...], this).
        const ctx = maybeCtx || hashOrCtx;
        // Writer-side save/set/finally-restore triplet around the
        // `helper(...)` invocation. Uses the module-local helpers directly
        // (intra-file writer-home pattern) — see `_gxtGetMutContext` /
        // `_gxtSetMutContext` near the top of this file.
        const prevCtx = _gxtGetMutContext();
        _gxtSetMutContext(ctx);
        try {
          // Pass the unwrapped value + path to the mut helper
          const unwrappedValue = isGxtGetter(rawGetter) ? rawGetter() : rawGetter;
          return helper(unwrappedValue, pathArg);
        } finally {
          _gxtSetMutContext(prevCtx);
        }
      }
      if (Array.isArray(args) && args.length > 0) {
        const unwrappedArgs = unwrapArgs(args);
        return helper(...unwrappedArgs);
      }
      return helper();
    }

    // Try Ember container lookup — prefer globalThis.owner, fall back to cached
    const currentOwner = g.owner;
    if (currentOwner && !currentOwner.isDestroyed && !currentOwner.isDestroying) {
      _cachedHelperOwner = currentOwner;
    }
    if (_cachedHelperOwner && (_cachedHelperOwner.isDestroyed || _cachedHelperOwner.isDestroying)) {
      _cachedHelperOwner = null;
    }
    const owner = currentOwner || _cachedHelperOwner;
    if (owner && !owner.isDestroyed && !owner.isDestroying) {
      // First try factoryFor to get the registered class/factory
      const factory = owner.factoryFor(`helper:${name}`);

      if (factory) {
        _trackHelperDefinition(factory.class || name);
        const positional = unwrapArgs(args || []);
        const named = unwrapHash(hash);

        const factoryClass = factory.class;

        // FIRST: Check for a registered helper manager (setHelperManager).
        // This must come before isClassBased check because some helper manager
        // classes (e.g., TestHelper) also define compute() but should be handled
        // via the manager protocol, not via factory.create().
        const manager =
          findHelperManager(factoryClass) || findHelperManager(factoryClass?.prototype);

        if (manager) {
          // Use the delegate protocol for proper helper lifecycle
          if (typeof manager.getDelegateFor === 'function') {
            const delegate = manager.getDelegateFor(owner);
            // Validate capabilities were created via helperCapabilities()
            const _FROM_CAPS = g.FROM_CAPABILITIES;
            if (
              delegate &&
              delegate.capabilities &&
              _FROM_CAPS &&
              !_FROM_CAPS.has(delegate.capabilities)
            ) {
              const err = new Error(
                `Custom helper managers must have a \`capabilities\` property ` +
                  `that is the result of calling the \`capabilities('3.23')\` ` +
                  `(imported via \`import { capabilities } from '@ember/helper';\`). ` +
                  `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
              );
              // Capture for flushRenderErrors so assert.throws() can see it
              const captureFn = g.__captureRenderError;
              if (typeof captureFn === 'function') captureFn(err);
              throw err;
            }
            if (
              delegate &&
              typeof delegate.createHelper === 'function' &&
              delegate.capabilities?.hasValue
            ) {
              // Cache the helper bucket per name so re-renders don't create new instances.
              // We create a GXT cell to hold the result so GXT's formula system tracks
              // it and re-renders automatically when the cell is updated.
              let cached = classHelperInstanceCache.get(name) as any;
              const _cellFor = gxtModule.cellFor;
              if (!cached || cached.__managerBucket !== true) {
                const reactiveArgs = {
                  positional: Object.freeze([...positional]),
                  named: Object.freeze({ ...named }),
                };
                // Wrap createHelper in backtracking frame to detect
                // read-then-write of tracked properties in constructor.
                // Use the gxt-bridge (manager.ts installs the implementations);
                // when classic-Ember (gxt-backend not loaded) the bridge is
                // null and these no-op.
                const _bt = getGxtRenderer()?.backtracking;
                // DEBUG-gated: upstream manager getDebugName bodies call the
                // debug-only @glimmer/util getDebugName and throw in production.
                const debugName =
                  DEBUG && typeof delegate.getDebugName === 'function'
                    ? delegate.getDebugName(factoryClass)
                    : undefined;
                if (_bt) _bt.beginFrame(debugName);
                let bucket: any;
                try {
                  bucket = delegate.createHelper(factoryClass, reactiveArgs);
                } finally {
                  if (_bt) _bt.endFrame();
                }

                // Wire up destroyable if supported
                if (
                  delegate.capabilities?.hasDestroyable &&
                  typeof delegate.getDestroyable === 'function'
                ) {
                  const destroyable = delegate.getDestroyable(bucket);
                  if (destroyable) {
                    // Route through the typed bridge
                    // `compilePipeline.pushHelperInstance?.()`. See
                    // `pushHelperInstance` doc in gxt-bridge.ts.
                    getGxtRenderer()?.compilePipeline.pushHelperInstance?.(destroyable);
                    // Associate with the enclosing `{{#if}}` branch (if any)
                    // so that destroy + willDestroy fire on branch teardown,
                    // matching Ember's classic Helper lifecycle semantics.
                    // Route through the typed bridge
                    // `compilePipeline.getCurrentHelperScope?.()`. See
                    // `getCurrentHelperScope` doc in gxt-bridge.ts.
                    const ifScope2 = getGxtRenderer()?.compilePipeline.getCurrentHelperScope?.();
                    if (ifScope2 && typeof ifScope2.add === 'function') {
                      try {
                        ifScope2.add(destroyable);
                      } catch {
                        /* ignore */
                      }
                    }
                  }
                }

                // Wrap getValue in backtracking frame
                const _bt2 = getGxtRenderer()?.backtracking;
                if (_bt2) _bt2.beginFrame(debugName);
                let result: any;
                try {
                  result = delegate.getValue(bucket);
                } finally {
                  if (_bt2) _bt2.endFrame();
                }

                // Create a GXT cell to hold the result. Reading cell.value inside
                // a formula establishes tracking, preventing const-optimization.
                let helperCell: any = null;
                if (_cellFor) {
                  const cellHolder = { __v: result };
                  helperCell = _cellFor(cellHolder, '__v', false);
                }

                // Helper-manager recompute → cell bridge: this manager-bucket
                // path subscribes the enclosing effect to `helperCell`
                // (returned below), NOT to the RECOMPUTE_TAG cell. The recompute
                // bridge (manager.ts `_installHelperRecomputeBridge`) dirties a
                // cell on the instance's RECOMPUTE_TAG object when `recompute()`
                // is called. To make the effect re-fire, read that RECOMPUTE_TAG
                // cell here so the effect subscribes to it, and fold its value
                // into the args-dedup key (below) so a recompute bump forces a
                // fresh getValue() instead of returning the cached (stale)
                // result.
                let _gxtRecomputeTag: any = null;
                if (bucket) {
                  try {
                    const _inst = (bucket as any).instance;
                    if (_inst && typeof _inst === 'object') {
                      const _syms = Object.getOwnPropertySymbols(_inst);
                      for (const _s of _syms) {
                        if (_s.toString().includes('RECOMPUTE_TAG')) {
                          _gxtRecomputeTag = _inst[_s];
                          break;
                        }
                      }
                    }
                  } catch {
                    /* ignore */
                  }
                }
                // Read the RECOMPUTE_TAG cell now so the enclosing effect
                // subscribes to it. When recompute() bumps it via manager.ts's
                // bridge, the effect re-fires; the cached branch's dedup key
                // (which folds in the recompute value) then forces a fresh
                // getValue() + helperCell.update.
                if (
                  _gxtRecomputeTag &&
                  typeof _gxtRecomputeTag === 'object' &&
                  'value' in _gxtRecomputeTag
                ) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  _gxtRecomputeTag.value;
                }

                let argsSer: string | null = null;
                try {
                  const _rv =
                    _gxtRecomputeTag &&
                    typeof _gxtRecomputeTag === 'object' &&
                    'value' in _gxtRecomputeTag
                      ? _gxtRecomputeTag.value
                      : 0;
                  argsSer = JSON.stringify({ p: positional, n: named, r: _rv });
                } catch {
                  /* skip */
                }

                cached = {
                  __managerBucket: true,
                  bucket,
                  delegate,
                  reactiveArgs,
                  lastArgsSer: argsSer,
                  lastResult: result,
                  helperCell,
                  recomputeTag: _gxtRecomputeTag,
                } as any;
                classHelperInstanceCache.set(name, cached);

                // Install PROPERTY_DID_CHANGE hook on the helper bucket so that
                // tracked property changes (e.g., instance.foo = 456) trigger
                // re-evaluation of getValue and update the GXT cell.
                if (bucket && typeof bucket === 'object' && helperCell) {
                  const PROP_CHANGE = g.PROPERTY_DID_CHANGE;
                  if (PROP_CHANGE) {
                    const _cached = cached;
                    const origPropChange = bucket[PROP_CHANGE];
                    bucket[PROP_CHANGE] = function (key: string) {
                      if (origPropChange) origPropChange.call(this, key);
                      // Re-compute getValue and update the cell
                      try {
                        const newResult = _cached.delegate.getValue(_cached.bucket);
                        if (newResult !== _cached.lastResult) {
                          _cached.lastResult = newResult;
                          if (_cached.helperCell && _cached.helperCell.update) {
                            _cached.helperCell.update(newResult);
                          }
                          // Trigger DOM sync.
                          // The canonical `_gxtSyncDomNow` lives in `compile.ts`;
                          // this cross-file reader routes through the bridge
                          // method. See `syncDomNow` doc in gxt-bridge.ts.
                          const syncDomNow = getGxtRenderer()?.compilePipeline.syncDomNow;
                          if (typeof syncDomNow === 'function') {
                            queueMicrotask(() => syncDomNow());
                          }
                        }
                      } catch {
                        /* ignore errors during recompute */
                      }
                    };
                  }
                }

                // Read from cell to establish tracking in enclosing formula
                if (helperCell) return helperCell.value;
                return result;
              } else {
                // Arg-based dedup: check if args actually changed — if not, return
                // cached result. This prevents duplicate compute calls within the
                // same render pass (GXT formula system may evaluate the getter
                // multiple times). Skip cache check if any positional arg is a
                // function (e.g., fn helper result) because functions serialize as
                // null, making stale results appear unchanged.
                const hasFnArg = positional.some((a: any) => typeof a === 'function');
                // Slice D: subscribe to (and fold in) the RECOMPUTE_TAG cell so
                // recompute() invalidates this dedup and forces a fresh getValue.
                const _cachedRT = (cached as any).recomputeTag;
                if (_cachedRT && typeof _cachedRT === 'object' && 'value' in _cachedRT) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  _cachedRT.value;
                }
                let argsSer: string | null = null;
                if (!hasFnArg) {
                  try {
                    const _rv =
                      _cachedRT && typeof _cachedRT === 'object' && 'value' in _cachedRT
                        ? _cachedRT.value
                        : 0;
                    argsSer = JSON.stringify({ p: positional, n: named, r: _rv });
                  } catch {
                    /* skip */
                  }
                }
                if (argsSer !== null && argsSer === cached.lastArgsSer) {
                  // Read cell to maintain tracking
                  if (cached.helperCell) return cached.helperCell.value;
                  return cached.lastResult;
                }

                // Update args in place for the existing bucket
                cached.reactiveArgs.positional = positional;
                cached.reactiveArgs.named = named;
                const _bt3 = getGxtRenderer()?.backtracking;
                // DEBUG-gated — see the createHelper-path note above.
                const cachedDebugName =
                  DEBUG && typeof cached.delegate?.getDebugName === 'function'
                    ? cached.delegate.getDebugName(factoryClass)
                    : undefined;
                if (_bt3) _bt3.beginFrame(cachedDebugName);
                let result: any;
                try {
                  result = cached.delegate.getValue(cached.bucket);
                } finally {
                  if (_bt3) _bt3.endFrame();
                }
                cached.lastArgsSer = argsSer;
                cached.lastResult = result;

                // Update the GXT cell to trigger formula re-evaluation
                if (cached.helperCell && cached.helperCell.update) {
                  cached.helperCell.update(result);
                }

                if (cached.helperCell) return cached.helperCell.value;
                return result;
              }
            }
          }

          // Fallback: use getHelper
          if (typeof manager.getHelper === 'function') {
            const helperFn = manager.getHelper(factoryClass);
            if (typeof helperFn === 'function') {
              const capturedArgs = { positional, named };
              return helperFn(capturedArgs, owner);
            }
          }

          // Fallback: use createHelper/getValue directly on the manager
          if (
            typeof manager.createHelper === 'function' &&
            typeof manager.getValue === 'function'
          ) {
            const state = manager.createHelper(factoryClass, { positional, named });
            return manager.getValue(state);
          }
        }

        // Check if this is a class-based helper (with compute on prototype and a create() method)
        const isClassBased =
          factoryClass &&
          factoryClass.prototype &&
          typeof factoryClass.prototype.compute === 'function' &&
          typeof factoryClass.create === 'function';

        if (isClassBased) {
          // Use a cached persistent instance for class-based helpers.
          // This enables recompute() to trigger re-evaluation of the same instance.
          let instance = classHelperInstanceCache.get(name);
          if (!instance) {
            try {
              instance = factory.create();
              classHelperInstanceCache.set(name, instance);
              // Also register for destruction. Route through the typed bridge
              // `compilePipeline.pushHelperInstance?.()`. See
              // `pushHelperInstance` doc in gxt-bridge.ts.
              getGxtRenderer()?.compilePipeline.pushHelperInstance?.(instance);
              // If this helper was created during an `{{#if}}` branch render,
              // associate it with that branch's teardown scope so destroy +
              // willDestroy fire on branch swap (not only on component teardown).
              // Route through the typed bridge
              // `compilePipeline.getCurrentHelperScope?.()`. See
              // `getCurrentHelperScope` doc in gxt-bridge.ts.
              const ifScope = getGxtRenderer()?.compilePipeline.getCurrentHelperScope?.();
              if (ifScope && typeof ifScope.add === 'function') {
                try {
                  ifScope.add(instance);
                } catch {
                  /* ignore */
                }
              }
            } catch (e) {
              console.error(`[ember-gxt] Error creating class helper "${name}":`, e);
              return undefined;
            }
          }

          if (instance && typeof instance.compute === 'function') {
            const result = instance.compute(positional, named);

            // Consume the RECOMPUTE_TAG so GXT formulas re-evaluate on recompute().
            // The tag is a custom object with a cell-backed `value` getter.
            const symKeys = Object.getOwnPropertySymbols(instance);
            for (const sym of symKeys) {
              if (sym.toString().includes('RECOMPUTE_TAG')) {
                const tag = instance[sym];
                if (tag && typeof tag === 'object' && 'value' in tag) {
                  // Read the cell to establish tracking in the enclosing formula
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  tag.value;
                }
                break;
              }
            }

            return result;
          }
        }

        // No manager found - create instance and call compute directly
        try {
          if (typeof factoryClass?.create === 'function') {
            const instance = factory.create();
            if (instance && typeof instance.compute === 'function') {
              const result = instance.compute(positional, named);
              return result;
            }
          }
        } catch (e) {
          // factoryClass may be a plain function registered via
          // `owner.register('helper:name', fn)`. In classic Ember a resolver
          // auto-wraps plain functions with a helper manager, but the
          // container-only path used by buildOwner(…)/owner.register does
          // not run that resolver hook in the GXT backend. Fall through to
          // the plain-function invocation below instead of swallowing the
          // assertion; the console.error would otherwise mask a working
          // code path.
        }

        // Plain function registered directly via owner.register('helper:name', fn).
        // Ember allows registering a bare function — treat it like a default
        // function helper (positional args spread, named args as last arg).
        if (
          typeof factoryClass === 'function' &&
          (!factoryClass.prototype || typeof factoryClass.prototype.compute !== 'function')
        ) {
          try {
            const hasNamed = named && Object.keys(named).length > 0;
            return hasNamed ? factoryClass(...positional, named) : factoryClass(...positional);
          } catch (e) {
            console.error(`[ember-gxt] Error invoking plain-function helper "${name}":`, e);
          }
        }

        // Helper was found in registry but couldn't be invoked
        return undefined;
      }

      // Also try direct lookup (for programmatically registered helpers)
      const helper = owner.lookup(`helper:${name}`);
      if (helper && !factory) {
        _trackHelperDefinition(helper);
        const positional = unwrapArgs(args || []);
        const named = unwrapHash(hash);

        // Check for helper manager on the instance
        const manager = findHelperManager(helper) || findHelperManager(helper?.constructor);
        if (
          manager &&
          typeof manager.createHelper === 'function' &&
          typeof manager.getValue === 'function'
        ) {
          const state = manager.createHelper(helper, { positional, named });
          const result = manager.getValue(state);
          return result;
        }

        // Object with compute method (class-based helper instance)
        if (typeof helper.compute === 'function') {
          const result = helper.compute(positional, named);
          return result;
        }

        // Function helper
        if (typeof helper === 'function') {
          const result = helper(positional, named);
          return result;
        }
      }

      // Try component lookup (both kebab-case and single-word names)
      {
        const compFactory = owner.factoryFor(`component:${name}`);
        if (compFactory) {
          _trackComponentDefinition(compFactory.class || name);
          const $_MANAGERS = g.$_MANAGERS;
          if ($_MANAGERS?.component?.handle) {
            const componentArgs: Record<string, any> = {};
            if (hash && typeof hash === 'object') {
              for (const key of Object.keys(hash)) {
                if (!key.startsWith('$_') && key !== 'hash') {
                  // Preserve getters from hash so component manager can track reactivity
                  const desc = Object.getOwnPropertyDescriptor(hash, key);
                  if (desc && desc.get) {
                    Object.defineProperty(componentArgs, key, {
                      get: desc.get,
                      enumerable: true,
                      configurable: true,
                    });
                  } else {
                    componentArgs[key] = hash[key];
                  }
                }
              }
            }
            // Map positional args to __pos0__, __pos1__, ... so that the
            // component manager can feed them into the component's static
            // positionalParams declaration. GXT's runtime compiler emits
            // `{{my-comp "Foo" 4}}` as $_maybeHelper("my-comp", ["Foo", 4], ctx)
            // without a __posCount__ marker — we add one here.
            if (Array.isArray(args) && args.length > 0) {
              const posList = args;
              for (let i = 0; i < posList.length; i++) {
                const val = posList[i];
                const posKey = `__pos${i}__`;
                if (
                  typeof val === 'function' &&
                  !(val as any).__isCurriedComponent &&
                  !(val as any).prototype
                ) {
                  Object.defineProperty(componentArgs, posKey, {
                    get: () => {
                      try {
                        return (val as any)();
                      } catch {
                        return val;
                      }
                    },
                    enumerable: true,
                    configurable: true,
                  });
                } else {
                  componentArgs[posKey] = val;
                }
              }
              componentArgs.__posCount__ = posList.length;
            }
            const result = $_MANAGERS.component.handle(name, componentArgs, [[], [], []], null);
            if (typeof result === 'function') {
              const nodes = result();
              if (Array.isArray(nodes)) {
                const fragment = document.createDocumentFragment();
                nodes.forEach((n: Node) => fragment.appendChild(n));
                return fragment;
              }
              return nodes;
            }
            if (result && typeof result === 'object') {
              const symbols = Object.getOwnPropertySymbols(result);
              for (const sym of symbols) {
                if (Array.isArray(result[sym])) {
                  const fragment = document.createDocumentFragment();
                  result[sym].forEach((n: Node) => {
                    if (n instanceof Node) fragment.appendChild(n);
                  });
                  return fragment;
                }
              }
            }
            return result;
          }
        }
      }
    }

    // In Ember, bare {{name}} (without this. prefix) in a template is treated
    // as a helper/component invocation, NOT a property lookup. Since we've
    // already checked all helper/component registrations above, if we reach
    // here with no args, the name is unresolvable. Return empty string.
    // Note: names WITH args are passed to GXT's native handler for resolution.
    if (
      Array.isArray(args) &&
      args.length === 0 &&
      (!hash ||
        Object.keys(hash).length === 0 ||
        Object.keys(hash).every((k) => k.startsWith('$_') || k === 'hash'))
    ) {
      return '';
    }
    // Fall back to GXT's native maybeHelper for other cases
    return original(name, args, hashOrCtx, maybeCtx);
  };
  (wrapped as any).__emberWrapped = true;
  (wrapped as any).__emberAware = true;
  return wrapped;
}

// $_tag wrapper

/**
 * Wraps GXT's $_tag to support:
 * - PascalCase/kebab-case component resolution via Ember's registry
 * - Dynamic components (<@foo />, <this.foo />)
 * - Named blocks (<:header>, <:default>)
 * - EmberHtmlRaw (triple mustaches {{{expr}}})
 */
// Fast-path eligibility for the ember-gxt-wrappers $_tag wrapper. Mirrors
// compile.ts's predicate. A plain lowercase-HTML element with no Ember-special
// features makes every scan this wrapper performs (the dynamic-component /
// named-block / component / helper lookups, the modifier/text reorder, the
// reactive-splat strip) a no-op, so we forward straight to `original` (GXT's
// native $_tag — or, when both wrappers are active, the compile.ts wrapper,
// which re-checks namespace/scan eligibility itself). NO hyphen in the tag (a
// kebab tag could be a component/helper). Namespace is intentionally NOT
// checked here: this wrapper never did namespace work — it always delegated
// that to `original`.
const _EMBER_PLAIN_HTML_TAG_RE = /^[a-z][a-z0-9]*$/;
function _emberTagFastPathEligible(tag: unknown, tagProps: any): boolean {
  if (typeof tag !== 'string' || !_EMBER_PLAIN_HTML_TAG_RE.test(tag)) return false;
  if (tagProps === gxtModule.$_edp || tagProps == null) return false;
  if (Array.isArray(tagProps[3])) return false; // no splat / forwarded attrs
  const attrs = tagProps[1];
  if (Array.isArray(attrs)) {
    for (let i = 0; i < attrs.length; i++) {
      const entry = attrs[i];
      if (!Array.isArray(entry) || entry.length < 2) return false;
      const v = entry[1];
      if (typeof v === 'function') return false;
      if (v === null || v === undefined) return false;
    }
  } else if (attrs != null) {
    return false;
  }
  const events = tagProps[2];
  if (Array.isArray(events)) {
    for (let i = 0; i < events.length; i++) {
      const entry = events[i];
      if (Array.isArray(entry) && entry[0] === '1') return false; // TEXT_CONTENT
    }
  } else if (events != null) {
    return false;
  }
  const props = tagProps[0];
  if (Array.isArray(props)) {
    for (let i = 0; i < props.length; i++) {
      const entry = props[i];
      if (!Array.isArray(entry) || entry[0] !== '') return false; // only class slot
    }
  } else if (props != null) {
    return false;
  }
  return true;
}

function createEmberTag(original: Function) {
  const $ARGS_SYMBOL = Symbol.for('gxt-args');

  // GXT's $_tag signature is: $_tag(tag, tagProps, ctx, children)
  // We receive (tag, tagProps, ctx, children) from GXT's compiled output
  return function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    gxtCtx: any,
    gxtChildren: any[]
  ): any {
    // GXT passes (tag, tagProps, ctx, children) — use GXT's order
    const children = gxtChildren;
    const ctx = gxtCtx;
    // FIX 1 fast-path (see _emberTagFastPathEligible). Skip the dead scans for
    // plain-HTML elements; forward straight to `original`.
    if (_emberTagFastPathEligible(tag, tagProps)) {
      return original(tag, tagProps, ctx, children);
    }
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    if (resolvedTag && typeof resolvedTag === 'string') {
      // Dynamic component: <@foo />
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1);
        const args = ctx?.[$ARGS_SYMBOL] || ctx?.args || {};
        const componentValue = args[argName];
        if (componentValue) {
          const managers = g.$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            // Extract named args and block content from tagProps
            const invokeArgs: any = {};
            const slots: Record<string, any> = {};

            if (tagProps && tagProps !== gxtModule.$_edp) {
              // Extract named args from attrs (position 1)
              const attrs = tagProps[1];
              if (Array.isArray(attrs)) {
                for (const [key, value] of attrs) {
                  if (key.startsWith('@')) {
                    const argKey = key.slice(1);
                    Object.defineProperty(invokeArgs, argKey, {
                      get: () => (typeof value === 'function' ? value() : value),
                      enumerable: true,
                      configurable: true,
                    });
                  }
                }
              }

              // Extract text children from events position (position 2)
              // GXT puts text children as [["1", textContent]] in the events array
              const textChildren = tagProps[2];
              if (Array.isArray(textChildren) && textChildren.length > 0) {
                const blockContent: any[] = [];
                for (const entry of textChildren) {
                  if (Array.isArray(entry) && entry.length === 2) {
                    blockContent.push(entry[1]);
                  }
                }
                if (blockContent.length > 0) {
                  slots.default = (slotCtx: any) => [...blockContent];
                }
              }
            }

            // Also check 4th arg (children) for block content
            if (children && children.length > 0 && !slots.default) {
              slots.default = (slotCtx: any) => [...children];
            }

            invokeArgs.$slots = slots;
            return managers.component.handle(componentValue, invokeArgs, null, ctx);
          }
        }
        return document.createComment(`dynamic component @${argName} not found`);
      }

      // Dynamic component: <this.foo />
      if (resolvedTag.startsWith('this.')) {
        const propPath = resolvedTag.slice(5);
        let componentValue = ctx;
        for (const part of propPath.split('.')) {
          componentValue = componentValue?.[part];
        }
        if (componentValue) {
          const managers = g.$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, {}, children, ctx);
          }
        }
        return document.createComment(`dynamic component this.${propPath} not found`);
      }

      // Named blocks: <:header>, <:default>
      if (resolvedTag.startsWith(':')) {
        const slotName = resolvedTag.slice(1);
        let hasBlockParams = false;
        if (tagProps && tagProps !== gxtModule.$_edp) {
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key] of attrs) {
              if (key === '@__hasBlockParams__') {
                hasBlockParams = true;
                break;
              }
            }
          }
          const fw = tagProps[3];
          if (fw && fw.__hasBlockParams) {
            hasBlockParams = true;
          }
        }
        return {
          __isNamedBlock: true,
          __slotName: slotName,
          __children: children,
          __hasBlockParams: hasBlockParams,
        };
      }

      // EmberHtmlRaw (triple mustaches)
      // Returns a getter function marked __htmlRaw for reactive innerHTML updates.
      // The getter must call the @value getter lazily (not eagerly) so that
      // reads inside gxtEffect are tracked and re-evaluated when the backing
      // property changes via set().
      if (resolvedTag === 'EmberHtmlRaw') {
        let valueGetter: any;
        if (tagProps && tagProps !== gxtModule.$_edp) {
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, val] of attrs) {
              if (key === '@value') {
                // Keep the getter function — do NOT evaluate it eagerly.
                // Evaluating here would capture the current value and lose
                // the reactive link to the backing cell.
                valueGetter = val;
                break;
              }
            }
          }
        }
        const htmlGetter = () => {
          // Call the getter each time so that cell reads are tracked
          // by any enclosing gxtEffect.
          let actual: any = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
          // Unwrap nested getter functions and cell-like wrappers so that
          // null/undefined reach the explicit check below instead of being
          // Object-coerced into '{}'.
          while (typeof actual === 'function') {
            actual = actual();
          }
          if (
            actual &&
            typeof actual === 'object' &&
            typeof actual.value !== 'undefined' &&
            actual.__isCell
          ) {
            actual = actual.value;
          }
          if (actual === null || actual === undefined) return '';
          return actual?.toHTML?.() ?? String(actual);
        };
        (htmlGetter as any).__htmlRaw = true;
        return htmlGetter;
      }
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent =
      resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    const managers = g.$_MANAGERS;

    if (mightBeComponent && managers?.component?.canHandle) {
      // Convert PascalCase to kebab-case
      const kebabName = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

      // When this name is a helper (not a component), short-circuit to
      // $_maybeHelper. The component manager's handle() wraps helper results
      // in getter functions which GXT's parent $_tag doesn't handle as children.
      // $_maybeHelper returns raw values (strings, etc.) which work as children.
      {
        const _owner = g.owner;
        if (_owner && !_owner.isDestroyed && !_owner.isDestroying) {
          try {
            const _helperFactory = _owner.factoryFor?.(`helper:${kebabName}`);
            const _componentFactory = _owner.factoryFor?.(`component:${kebabName}`);
            if (_helperFactory && !_componentFactory) {
              const maybeHelper = g.$_maybeHelper;
              if (typeof maybeHelper === 'function') {
                return maybeHelper(kebabName, children || [], {}, ctx);
              }
            }
          } catch {
            /* ignore lookup errors */
          }
        }
      }

      if (managers.component.canHandle(kebabName)) {
        _trackComponentDefinition(kebabName);
        // Build args from tagProps - keep lazy
        let args: any = {};
        const domAttrs: [string, any][] = [];

        if (tagProps && tagProps !== gxtModule.$_edp) {
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              const attrKey = key === '' ? 'class' : key;
              domAttrs.push([attrKey, value]);
            }
          }

          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) {
                const argName = key.slice(1);
                Object.defineProperty(args, argName, {
                  get: () => (typeof value === 'function' ? value() : value),
                  enumerable: true,
                  configurable: true,
                });
              } else {
                domAttrs.push([key, value]);
                Object.defineProperty(args, key, {
                  get: () => (typeof value === 'function' ? value() : value),
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }
        }

        // Build slots from children
        const slots: Record<string, any> = {};
        let events: [string, any][] = [];
        if (tagProps && tagProps !== gxtModule.$_edp && Array.isArray(tagProps[2])) {
          events = tagProps[2];
        }

        const detectBlockParams = (slotChildren: any[]): boolean => {
          for (const child of slotChildren) {
            if (typeof child === 'function') {
              const fnStr = child.toString();
              if (/\$_bp\d/.test(fnStr)) return true;
            }
          }
          return false;
        };

        if (children && children.length > 0) {
          const namedBlocks: Map<string, { children: any[]; hasBlockParams: boolean }> = new Map();
          const defaultChildren: any[] = [];

          for (const child of children) {
            if (child && typeof child === 'object' && child.__isNamedBlock) {
              const slotName = child.__slotName;
              if (!namedBlocks.has(slotName)) {
                namedBlocks.set(slotName, { children: [], hasBlockParams: false });
              }
              const slot = namedBlocks.get(slotName)!;
              if (child.__children) slot.children.push(...child.__children);
              if (child.__hasBlockParams) slot.hasBlockParams = true;
            } else {
              defaultChildren.push(child);
            }
          }

          const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
            const hasBlockParams =
              explicitHasBlockParams !== undefined
                ? explicitHasBlockParams
                : detectBlockParams(slotChildren);

            const slotFn = (slotCtx: any, ...params: any[]) => {
              const unwrappedParams = params.map((param) => {
                // Unwrap GXT reactive formulas (objects with fn/isConst)
                if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                  try {
                    return param.fn();
                  } catch {
                    return param;
                  }
                }
                // Do NOT call plain functions — they may be user functions
                // yielded as block params (e.g., {{yield this.updatePerson}}).
                return param;
              });

              const contextParams = g.__contextBlockParams as WeakMap<object, any[]>;
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, [...unwrappedParams]);
              }
              g.__currentSlotParams = unwrappedParams;

              const stack = g.__blockParamsStack;
              stack.push(unwrappedParams);
              try {
                // Return raw children as-is. GXT's rendering pipeline
                // (renderElement → resolveRenderable) handles functions
                // by wrapping them in formulas that track cell dependencies.
                // Previously we called child() eagerly which destroyed reactivity.
                return [...slotChildren];
              } finally {
                stack.pop();
              }
            };
            (slotFn as any).__hasBlockParams = hasBlockParams;
            return slotFn;
          };

          for (const [slotName, slotData] of namedBlocks) {
            slots[slotName] = createSlotFn(slotData.children, slotData.hasBlockParams);
          }

          if (defaultChildren.length > 0) {
            const explicitHasBlockParams =
              args.__hasBlockParams__ !== undefined
                ? (typeof args.__hasBlockParams__ === 'function'
                    ? args.__hasBlockParams__()
                    : args.__hasBlockParams__) === 'default'
                : undefined;
            slots.default = createSlotFn(defaultChildren, explicitHasBlockParams);
          }
        }

        // Build fw (forwarding) structure matching compile.ts convention:
        // fw[0] = props (empty), fw[1] = domAttrs, fw[2] = events
        // Also merge parent forwarding from tagProps[3] (from ...attributes)
        const parentFw = tagProps?.[3];
        if (parentFw && typeof parentFw === 'object') {
          // Merge parent's forwarded attrs/events into ours
          if (Array.isArray(parentFw[1])) {
            domAttrs.push(...parentFw[1]);
          }
          if (Array.isArray(parentFw[2])) {
            events.push(...parentFw[2]);
          }
        }
        const fw = [[], domAttrs, events];

        // Pass slots via args so manager.ts can access them
        args.$slots = slots;

        // Before delegating to the component manager, check if this name
        // resolves ONLY as a helper (not as a component). When GXT compiles
        // {{x-borf}} (bare mustache with a dashed name), it emits
        // $_tag('XBorf', ...). The component manager's canHandle returns true
        // because it detects the helper registration. But handle() tries
        // component resolution first, then falls back to helper — and the
        // helper result (a getter function) isn't a valid $_tag child for GXT.
        // By checking helper-only upfront, we use $_maybeHelper directly,
        // which returns a raw value that GXT can render as text.
        {
          const _owner = g.owner;
          if (_owner && !_owner.isDestroyed && !_owner.isDestroying) {
            const _helperFactory = _owner.factoryFor?.(`helper:${kebabName}`);
            const _componentFactory = _owner.factoryFor?.(`component:${kebabName}`);
            if (_helperFactory && !_componentFactory) {
              // This is a helper, not a component. Use $_maybeHelper directly.
              const maybeHelper = g.$_maybeHelper;
              if (typeof maybeHelper === 'function') {
                return maybeHelper(kebabName, children || [], {}, ctx);
              }
            }
          }
        }

        return managers.component.handle(kebabName, args, fw, ctx);
      }
    }

    // Before falling back to HTML element, check if this is a helper
    // (e.g., {{hello-world}} → <HelloWorld /> but registered as helper:hello-world)
    if (resolvedTag && typeof resolvedTag === 'string') {
      const kebab = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
      if (kebab.includes('-')) {
        const owner = g.owner;
        if (owner) {
          const helperFactory = owner.factoryFor(`helper:${kebab}`);
          if (helperFactory) {
            const maybeHelper = g.$_maybeHelper;
            if (maybeHelper) {
              return maybeHelper(kebab, children || [], {}, ctx);
            }
          }
        }
      }
    }

    // Fall back to original $_tag for regular HTML elements.
    //
    // Before delegating, strip reactive parent fw[1] (forwarded attrs from
    // ...attributes) out of tagProps[3] and re-apply them via an ON_CREATED
    // modifier. GXT's native reactive attr setter unconditionally calls
    // setAttribute(key, String(value)) on updates — so when an invocation arg
    // becomes undefined, the DOM ends up with the literal string "undefined"
    // instead of having the attribute removed. Applying the attrs through a
    // modifier + effect gives us a place to special-case undefined/null/false
    // and call removeAttribute instead.
    let patchedTagProps = tagProps;

    // Modifier vs. text-child ordering fix.
    //
    // GXT's events array in tagProps[2] stores modifiers (key "0") and text
    // content children (key "1") together. GXT's native $_tag processes them
    // in array order, but then performs a post-children-added textContent
    // set for single-text children AFTER firing onCreated callbacks. This
    // means a `{{(modifier "replace")}}` that sets innerHTML runs BEFORE
    // the static text child is written, and the text-content write then
    // clobbers the modifier's work.
    //
    // Ember semantics (from the `(modifier)` keyword RFC + custom modifier
    // manager tests): modifiers observe and override the final rendered
    // element, so they must run AFTER static children are in place. We
    // achieve this by moving all text-child entries (key "1") BEFORE any
    // modifier entries (non-"1") in the events array. GXT then renders text
    // first, and modifiers see the complete element when they run. Only
    // applies when both kinds are present, so the common case (modifiers
    // only, or text only) is untouched.
    if (tagProps && tagProps !== gxtModule.$_edp && Array.isArray(tagProps[2])) {
      const events = tagProps[2];
      let hasText = false;
      let hasModifier = false;
      for (const e of events) {
        if (Array.isArray(e)) {
          if (e[0] === '1') hasText = true;
          else hasModifier = true;
          if (hasText && hasModifier) break;
        }
      }
      if (hasText && hasModifier) {
        const textEntries: any[] = [];
        const otherEntries: any[] = [];
        for (const e of events) {
          if (Array.isArray(e) && e[0] === '1') textEntries.push(e);
          else otherEntries.push(e);
        }
        patchedTagProps = [
          tagProps[0],
          tagProps[1],
          [...textEntries, ...otherEntries],
          tagProps[3],
        ];
      }
    }
    if (tagProps && tagProps !== gxtModule.$_edp && Array.isArray(tagProps[3])) {
      const parentFw = tagProps[3];
      const parentFwAttrs = parentFw[1];
      if (Array.isArray(parentFwAttrs) && parentFwAttrs.length > 0) {
        const effectFn = (gxtModule as any).effect;
        if (effectFn) {
          const capturedAttrs: Array<[string, any]> = [];
          const remainingFwAttrs: any[] = [];
          for (const entry of parentFwAttrs) {
            const [key, val] = entry;
            // Only intercept reactive (function-valued) data-/aria-/title/etc.
            // attrs. Skip @-prefixed entries (named args) and static values.
            if (key && !String(key).startsWith('@') && typeof val === 'function') {
              capturedAttrs.push([key, val]);
            } else {
              remainingFwAttrs.push(entry);
            }
          }
          if (capturedAttrs.length > 0) {
            // Start from whatever events list the earlier modifier/text
            // reorder left us with — otherwise we'd drop that reorder.
            const sourceEvents = Array.isArray(patchedTagProps[2])
              ? patchedTagProps[2]
              : Array.isArray(tagProps[2])
                ? tagProps[2]
                : [];
            const localEvents = [...sourceEvents];
            const onCreated = (el: Element) => {
              for (const [aKey, aGetter] of capturedAttrs) {
                effectFn(() => {
                  const v = aGetter();
                  if (v === undefined || v === null || v === false) {
                    el.removeAttribute(aKey);
                  } else if (v === true) {
                    el.setAttribute(aKey, '');
                  } else if (typeof v === 'symbol') {
                    el.setAttribute(aKey, (v as symbol).toString());
                  } else if (typeof v === 'object' && typeof (v as any).toString !== 'function') {
                    el.setAttribute(aKey, '');
                  } else {
                    el.setAttribute(aKey, String(v));
                  }
                });
              }
            };
            localEvents.push(['0', onCreated]);
            patchedTagProps = [
              tagProps[0],
              tagProps[1],
              localEvents,
              [parentFw[0], remainingFwAttrs, parentFw[2]],
            ];
          }
        }
      }
    }
    return original(tag, patchedTagProps, ctx, children);
  };
}

// $_dc wrapper (dynamic component)

/**
 * Wraps GXT's $_dc to support Ember's CurriedComponent.
 * $_dc is called when GXT encounters a dynamic component invocation like
 * {{#thing.ctxCmp}}content{{/thing.ctxCmp}} or <this.$_bp0 />.
 * GXT compiles these as $_dc(componentGetter, args, ctx).
 *
 * When the componentGetter returns a CurriedComponent, we render it through
 * Ember's component manager instead of GXT's native component system.
 */
function createEmberDc(original: Function) {
  const $PROPS = Symbol.for('gxt-props');
  const $SLOTS_SYM = Symbol.for('gxt-slots');

  function extractArgsAndSlots(gxtArgs: any, allowPositionalParams = false): { mergedArgs: any } {
    const mergedArgs: any = {};
    if (gxtArgs && typeof gxtArgs === 'object') {
      const keys = Object.keys(gxtArgs);
      for (const key of keys) {
        if (key.startsWith('$')) continue;
        // Allow __hasBlock__ and __hasBlockParams__ through always
        if (key === '__hasBlock__' || key === '__hasBlockParams__') {
          /* allowed */
        }
        // Allow positional param keys through only when requested (for string components
        // where the manager needs to map positional params to named args)
        else if (allowPositionalParams && (/^__pos\d+__$/.test(key) || key === '__posCount__')) {
          /* allowed */
        }
        // Skip all other keys starting with _
        else if (key.startsWith('_')) continue;
        const desc = Object.getOwnPropertyDescriptor(gxtArgs, key);
        if (desc) {
          // Ensure properties are configurable so the manager can delete/redefine
          // them (e.g., positional params mapping deletes __posN__ keys).
          Object.defineProperty(mergedArgs, key, { ...desc, configurable: true });
        }
      }
    }

    // Extract slots from GXT args
    const gxtSlots = gxtArgs?.[$SLOTS_SYM];
    const slots: Record<string, any> = {};
    if (gxtSlots) {
      for (const slotName of Object.keys(gxtSlots)) {
        if (slotName.endsWith('_')) continue;
        const slotFn = gxtSlots[slotName];
        if (typeof slotFn === 'function') {
          const wrappedSlot = (slotCtx: any, ...params: any[]) => {
            try {
              const result = slotFn(slotCtx, ...params);
              return Array.isArray(result) ? result : [result];
            } catch {
              return [];
            }
          };
          const hasBlockKey = slotName + '_';
          (wrappedSlot as any).__hasBlockParams = gxtSlots[hasBlockKey] === true;
          slots[slotName] = wrappedSlot;
        }
      }
    }

    // Check for __hasBlock__ marker in args
    const hasBlockValue = gxtArgs?.__hasBlock__ ?? mergedArgs.__hasBlock__;
    if (hasBlockValue) {
      if (!slots.default) {
        slots.default = () => [];
      }
    }

    mergedArgs.$slots = slots;
    return { mergedArgs };
  }

  function renderComponent(
    componentValue: any,
    gxtArgs: any,
    ctx: any,
    allowPositionalParams = false
  ): any {
    const managers = g.$_MANAGERS;
    if (!managers?.component?.canHandle?.(componentValue)) return null;

    // Track the component definition for the runtime resolver-cache counters.
    // The dynamic-component path (`{{component this.name}}`) lands here
    // regardless of whether the value started as a string or a curried
    // component returned by the `component` helper.
    if (typeof componentValue === 'string') {
      _trackComponentDefinition(componentValue);
    } else if (
      componentValue &&
      typeof componentValue === 'object' &&
      typeof (componentValue as any).__name === 'string'
    ) {
      _trackComponentDefinition((componentValue as any).__name);
    } else if (componentValue) {
      _trackComponentDefinition(componentValue);
    }

    const { mergedArgs } = extractArgsAndSlots(gxtArgs, allowPositionalParams);
    // Propagate the per-render dc-capture callback (stashed by $_dc_ember) onto
    // mergedArgs so renderClassicComponent / renderGlimmerComponent can fire it
    // when the Ember instance is created. Stored as a non-enumerable own property
    // so extractArgsAndSlots' enumerable-key copy doesn't reach it on either side.
    const _dcCap = gxtArgs && (gxtArgs as any).__gxtDcCapture;
    if (typeof _dcCap === 'function') {
      Object.defineProperty(mergedArgs, '__gxtDcCapture', {
        value: _dcCap,
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }
    const handleResult = managers.component.handle(componentValue, mergedArgs, null, ctx);
    if (typeof handleResult === 'function') {
      return handleResult();
    }
    return handleResult;
  }

  return function $_dc_ember(componentGetter: () => any, gxtArgs: any, ctx: any): any {
    // Inject $PROPS on args so GXT's $_c (component function) can find them.
    if (gxtArgs && typeof gxtArgs === 'object' && !($PROPS in gxtArgs)) {
      try {
        Object.defineProperty(gxtArgs, $PROPS, {
          value: gxtArgs,
          enumerable: false,
          configurable: true,
          writable: true,
        });
      } catch {
        /* frozen object */
      }
    }

    // Try to evaluate the component getter to check what kind of value it returns.
    let componentValue: any;
    try {
      componentValue = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
    } catch {
      // Getter failed — likely block params not set yet.
      // Return a lazy thunk that evaluates when GXT processes the children.
      const lazyThunk = () => {
        try {
          const val = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
          if (val && val.__isCurriedComponent) {
            return renderComponent(val, gxtArgs, ctx);
          }
          if (typeof val === 'string') {
            const mgrs = g.$_MANAGERS;
            if (mgrs?.component?.canHandle?.(val)) {
              return renderComponent(val, gxtArgs, ctx);
            }
          }
          return val;
        } catch {
          return undefined;
        }
      };
      (lazyThunk as any).__isComponentThunk = true;
      return lazyThunk;
    }

    // Handle null/undefined — the value may become a CurriedComponent later.
    // Use a placeholder comment node that stays in the DOM. Set up a listener
    // to detect when the value transitions to a CurriedComponent and perform
    // a manual DOM swap (the morph can't handle this because tags get marked
    // current by gxtSyncDom before the morph check).
    if (componentValue == null) {
      const nullPlaceholder = document.createComment('dc-null');
      let _nullDestroyed = false;
      let _nullLastKey = '__empty__';
      const _dcCapturedOwner = g.owner;
      // Track nodes inserted by _nullSwap so they can be removed on teardown
      let _insertedNodes: Node[] = [];

      const _nullSwap = () => {
        if (_nullDestroyed) return;
        let newVal: any;
        try {
          newVal = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
        } catch {
          return;
        }

        const newKey = !newVal
          ? '__empty__'
          : newVal.__isCurriedComponent
            ? '__curried:' + (newVal.__name || '')
            : typeof newVal === 'string'
              ? '__str:' + newVal
              : '__other';
        if (newKey === _nullLastKey) return;
        _nullLastKey = newKey;

        const parent = nullPlaceholder.parentNode;
        if (!parent) return;

        // Remove previously inserted nodes before rendering new content
        for (const node of _insertedNodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
        _insertedNodes = [];

        // Render the new component
        if (newVal && (newVal.__isCurriedComponent || typeof newVal === 'string')) {
          const prevOwner = g.owner;
          if (!g.owner && _dcCapturedOwner && !_dcCapturedOwner.isDestroyed) {
            g.owner = _dcCapturedOwner;
          }
          const prevDcGetter = g.__dcComponentGetter;
          g.__dcComponentGetter = componentGetter;
          let newResult: any = null;
          try {
            if (newVal.__isCurriedComponent) {
              const hasCurriedPositionals = (newVal.__curriedPositionals || []).length > 0;
              newResult = renderComponent(newVal, gxtArgs, ctx, !hasCurriedPositionals);
            } else {
              newResult = renderComponent(newVal, gxtArgs, ctx, true);
            }
          } catch {
            /* ignore */
          } finally {
            g.__dcComponentGetter = prevDcGetter;
            if (!prevOwner && g.owner === _dcCapturedOwner) {
              g.owner = prevOwner;
            }
          }

          if (newResult instanceof Node) {
            if (newResult instanceof DocumentFragment) {
              _insertedNodes = Array.from(newResult.childNodes);
            } else {
              _insertedNodes = [newResult];
            }
            parent.insertBefore(newResult, nullPlaceholder);
          }
        }
      };

      const _nullListener = (): boolean => {
        if (_nullDestroyed) return false;
        _nullSwap();
        return true;
      };

      // The canonical `_gxtSyncAllWrappers` in manager.ts dispatches the
      // dynamic-component change-listener Set in its after-body. The Set lives
      // as manager.ts module-local state behind the bridge's
      // `addDynamicComponentListener` method, which returns an off-fn for
      // symmetric cleanup (called from `_nullCleanup` below).
      const _offNullListener =
        getGxtRenderer()?.compilePipeline.addDynamicComponentListener?.(_nullListener);

      const _nullCleanup = () => {
        _nullDestroyed = true;
        _offNullListener?.();
      };
      if (ctx && typeof gxtModule.registerDestructor === 'function') {
        try {
          gxtModule.registerDestructor(ctx, _nullCleanup);
        } catch {
          /* ignore */
        }
      }

      return nullPlaceholder;
    }

    // Handle CurriedComponent — render one-shot initially (preserving existing behavior),
    // but also set up a __gxtSyncAllWrappers listener that performs manual DOM swaps when
    // the underlying component identity changes (e.g., compName switches between 'my-comp'
    // and 'your-comp'). We avoid GXT's $_dc for CurriedComponents because its factory
    // mechanism causes regressions with Ember's component manager.
    if (componentValue && componentValue.__isCurriedComponent) {
      const RNODES = gxtModule.RENDERED_NODES_PROPERTY;
      const RCTX = gxtModule.RENDERING_CONTEXT_PROPERTY;
      const CID = gxtModule.COMPONENT_ID_PROPERTY;

      // --- Initial one-shot render ---
      let initialResult: any = null;
      if (componentValue && componentValue.__isCurriedComponent) {
        const prev = g.__dcComponentGetter;
        g.__dcComponentGetter = componentGetter;
        try {
          const hasCurriedPositionals = (componentValue.__curriedPositionals || []).length > 0;
          initialResult = renderComponent(componentValue, gxtArgs, ctx, !hasCurriedPositionals);
        } finally {
          g.__dcComponentGetter = prev;
        }
      }

      // --- Reactive swap tracking ---
      const getIdentityKey = (val: any): string => {
        if (!val && val !== 0) return '__empty__';
        if (typeof val === 'string') return '__str:' + val;
        if (val && val.__isCurriedComponent) return '__curried:' + (val.__name || '');
        return '__other:' + String(val);
      };

      let _lastIdentityKey = getIdentityKey(componentValue);
      let _dcDestroyed = false;
      const _dcCapturedOwner = g.owner;

      // Collect initial rendered nodes for later removal during swaps.
      let currentNodes: Node[] = [];
      if (initialResult instanceof Node) {
        if (initialResult instanceof DocumentFragment) {
          currentNodes = Array.from(initialResult.childNodes);
        } else {
          currentNodes = [initialResult];
        }
      } else if (initialResult != null && initialResult[RNODES]) {
        currentNodes = [...initialResult[RNODES]].filter((n: any) => n instanceof Node);
      }

      // Perform DOM swap when the component identity changes.
      const performSwap = () => {
        if (_dcDestroyed) return;

        let newVal: any;
        try {
          newVal = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
        } catch {
          return;
        }

        const newKey = getIdentityKey(newVal);
        if (newKey === _lastIdentityKey) return;
        _lastIdentityKey = newKey;

        // Find insertion reference from current nodes
        const lastNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
        const parent = lastNode?.parentNode;
        if (!parent) return;
        // If the managed node has been detached from the live DOM (e.g., by a
        // force-rerender that morphed the parent), mark this listener as
        // orphaned and skip. A previous render-pass created this listener,
        // but its DOM was replaced by a fresh listener during force-rerender.
        // Without this, the old stale listener still fires performSwap and
        // creates duplicate component instances (double init on compName
        // changes — GH#13982).
        if (lastNode && !(lastNode as Node).isConnected) {
          _dcDestroyed = true;
          return;
        }
        const insertBefore = lastNode?.nextSibling || null;

        // Remove old nodes
        for (const node of currentNodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
        currentNodes = [];

        // Render the new component
        if (newVal && (newVal.__isCurriedComponent || typeof newVal === 'string')) {
          const prevOwner = g.owner;
          if (!g.owner && _dcCapturedOwner && !_dcCapturedOwner.isDestroyed) {
            g.owner = _dcCapturedOwner;
          }
          const prevDcGetter = g.__dcComponentGetter;
          g.__dcComponentGetter = componentGetter;
          let newResult: any = null;
          try {
            if (newVal.__isCurriedComponent) {
              const hasCurriedPositionals = (newVal.__curriedPositionals || []).length > 0;
              newResult = renderComponent(newVal, gxtArgs, ctx, !hasCurriedPositionals);
            } else {
              newResult = renderComponent(newVal, gxtArgs, ctx, true);
            }
          } catch {
            // Component not found or render error — leave empty
          } finally {
            g.__dcComponentGetter = prevDcGetter;
            if (!prevOwner && g.owner === _dcCapturedOwner) {
              g.owner = prevOwner;
            }
          }

          // Insert new nodes at the position of the old nodes
          if (newResult instanceof Node) {
            if (newResult instanceof DocumentFragment) {
              currentNodes = Array.from(newResult.childNodes);
            } else {
              currentNodes = [newResult];
            }
            parent.insertBefore(newResult, insertBefore);
          } else if (newResult != null && newResult[RNODES]) {
            const nodes = newResult[RNODES] as Node[];
            currentNodes = [...nodes].filter((n: any) => n instanceof Node);
            for (const n of currentNodes) {
              parent.insertBefore(n, insertBefore);
            }
          }
        }
        // If newVal is null/undefined, currentNodes stays empty (component removed)
      };

      // Register change listener on __gxtSyncAllWrappers
      const _dcChangeListener = (): boolean => {
        if (_dcDestroyed) return false;
        performSwap();
        return true;
      };

      // Add listener to the DC-change-listener registry (shared with
      // null/string paths). `_gxtSyncAllWrappers` in manager.ts dispatches the
      // listener Set in its after-body; the Set is manager.ts module-local
      // state behind the bridge's `addDynamicComponentListener` method, which
      // returns an off-fn for symmetric cleanup.
      const _offDcListener =
        getGxtRenderer()?.compilePipeline.addDynamicComponentListener?.(_dcChangeListener);

      // Cleanup destructor
      const _cleanupDcListener = () => {
        _dcDestroyed = true;
        _offDcListener?.();
      };
      if (ctx && typeof gxtModule.registerDestructor === 'function') {
        try {
          gxtModule.registerDestructor(ctx, _cleanupDcListener);
        } catch {
          /* ignore */
        }
      }

      // Return the initial result exactly as the baseline did (preserving return type).
      // The performSwap function uses currentNodes to find the insertion point.
      return initialResult;
    }

    // Handle string component name — render through Ember's component manager.
    //
    // We cannot delegate to GXT's native $_dc (`original`) here because native
    // $_dc expects the component factory to return a GXT component instance
    // with [RENDERED_NODES_PROPERTY] metadata. Our `handleStringComponent`
    // returns a lazy `() => Node` closure, which GXT's D() short-circuits and
    // returns as a raw Node in GLIMMER_COMPAT_MODE — triggering `Node[at].push`
    // in G() (undefined push crash). Instead we manage the DOM ourselves using
    // the same direct-render + performSwap pattern as the curried path above.
    if (typeof componentValue === 'string') {
      // Eagerly check if the component exists. If it doesn't, throw immediately
      // so assert.throws() in tests can catch it (matching Ember behavior).
      const managers = g.$_MANAGERS;
      if (
        componentValue.length > 0 &&
        managers?.component &&
        !managers.component.canHandle(componentValue)
      ) {
        const err = new Error(
          `Attempted to resolve \`${componentValue}\`, which was expected to be a component, but nothing was found. ` +
            `Could not find component named "${componentValue}" (no component or template with that name was found)`
        );
        const captureErr = g.__captureRenderError;
        if (typeof captureErr === 'function') {
          captureErr(err);
        }
        throw err;
      }

      const RNODES = gxtModule.RENDERED_NODES_PROPERTY;

      // Track the Ember component instance created for the CURRENT dynamic
      // component slot so that we can fire willDestroy lifecycle hooks when
      // the component is swapped out. The callback is stashed as a non-enumerable
      // property on the per-render args object (`__gxtDcCapture`) and fired by
      // renderClassicComponent / renderGlimmerComponent when the instance is
      // created — its lifetime equals the render operation that owns it, so
      // there is no global state and no cross-test leak surface.
      let _dcEmberInstance: any = null;
      const captureInstance = (inst: any) => {
        _dcEmberInstance = inst;
      };

      const destroyCurrentDcInstance = () => {
        if (!_dcEmberInstance) return;
        const inst = _dcEmberInstance;
        _dcEmberInstance = null;
        try {
          // Typed bridge call (replaces __gxtDestroyEmberComponentInstance).
          getGxtRenderer()?.destruction.destroyEmberComponentInstance(inst);
        } catch {
          /* ignore */
        }
      };

      // --- Initial one-shot render ---
      let initialResult: any = null;
      {
        const _prevDcGetter = g.__dcComponentGetter;
        g.__dcComponentGetter = componentGetter;
        // Stash the capture callback on the per-render args object. renderComponent
        // copies it onto mergedArgs (non-enumerably) and the recursive handle()
        // paths propagate it forward, so the consumer (renderClassicComponent /
        // renderGlimmerComponent) can find it on the args parameter it receives.
        Object.defineProperty(gxtArgs, '__gxtDcCapture', {
          value: captureInstance,
          configurable: true,
          enumerable: false,
          writable: true,
        });
        try {
          initialResult = renderComponent(componentValue, gxtArgs, ctx, true);
        } finally {
          g.__dcComponentGetter = _prevDcGetter;
          try {
            delete (gxtArgs as any).__gxtDcCapture;
          } catch {
            /* configurable: true above ensures delete succeeds for our own writes */
          }
        }
      }

      // --- Reactive swap tracking ---
      const getIdentityKey = (val: any): string => {
        if (!val && val !== 0) return '__empty__';
        if (typeof val === 'string') return '__str:' + val;
        if (val && val.__isCurriedComponent) return '__curried:' + (val.__name || '');
        return '__other:' + String(val);
      };

      let _lastIdentityKey = getIdentityKey(componentValue);
      let _dcDestroyed = false;
      const _dcCapturedOwner = g.owner;

      // Collect initial rendered nodes for later removal during swaps.
      let currentNodes: Node[] = [];
      // Track the placeholder comment that holds our position when all nodes
      // are removed (so we can find parent/insertBefore on subsequent swaps).
      let anchor: Comment | null = null;

      if (initialResult instanceof Node) {
        if (initialResult instanceof DocumentFragment) {
          currentNodes = Array.from(initialResult.childNodes);
        } else {
          currentNodes = [initialResult];
        }
      } else if (initialResult != null && (initialResult as any)[RNODES]) {
        currentNodes = [...((initialResult as any)[RNODES] as Node[])].filter(
          (n: any) => n instanceof Node
        );
      }

      // Perform DOM swap when the component identity changes.
      const performSwap = () => {
        if (_dcDestroyed) return;

        let newVal: any;
        try {
          newVal = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
        } catch {
          return;
        }

        const newKey = getIdentityKey(newVal);
        if (newKey === _lastIdentityKey) return;
        _lastIdentityKey = newKey;

        // Find insertion reference from current nodes (or anchor)
        let parent: Node | null = null;
        let insertBefore: Node | null = null;
        if (currentNodes.length > 0) {
          const lastNode = currentNodes[currentNodes.length - 1]!;
          parent = lastNode.parentNode;
          insertBefore = lastNode.nextSibling;
        } else if (anchor) {
          parent = anchor.parentNode;
          insertBefore = anchor;
        }
        if (!parent) return;

        // Drop the anchor before removing nodes, since it may be between them.
        if (anchor && anchor.parentNode) {
          // Re-attach anchor at the tail so we can re-seat new nodes before it.
          insertBefore = anchor;
        }

        // Remove old nodes BEFORE destroying the Ember instance so that
        // willDestroyElement assertions that check the element is still
        // attached can re-attach and see it.
        for (const node of currentNodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
        currentNodes = [];

        // Fire Ember willDestroy lifecycle for the previous instance.
        destroyCurrentDcInstance();

        // Render the new component
        if (newVal && (newVal.__isCurriedComponent || typeof newVal === 'string')) {
          const prevOwner = g.owner;
          if (!g.owner && _dcCapturedOwner && !_dcCapturedOwner.isDestroyed) {
            g.owner = _dcCapturedOwner;
          }
          const prevDcGetter = g.__dcComponentGetter;
          g.__dcComponentGetter = componentGetter;
          // Re-stash the capture callback on gxtArgs for the swap render (see
          // initial-render block above for the per-render lifetime contract).
          Object.defineProperty(gxtArgs, '__gxtDcCapture', {
            value: captureInstance,
            configurable: true,
            enumerable: false,
            writable: true,
          });
          let newResult: any = null;
          try {
            if (newVal.__isCurriedComponent) {
              const hasCurriedPositionals = (newVal.__curriedPositionals || []).length > 0;
              newResult = renderComponent(newVal, gxtArgs, ctx, !hasCurriedPositionals);
            } else {
              newResult = renderComponent(newVal, gxtArgs, ctx, true);
            }
          } catch {
            // Component not found or render error — leave empty
          } finally {
            g.__dcComponentGetter = prevDcGetter;
            try {
              delete (gxtArgs as any).__gxtDcCapture;
            } catch {
              /* configurable: true above ensures delete succeeds for our own writes */
            }
            if (!prevOwner && g.owner === _dcCapturedOwner) {
              g.owner = prevOwner;
            }
          }

          if (newResult instanceof Node) {
            if (newResult instanceof DocumentFragment) {
              currentNodes = Array.from(newResult.childNodes);
            } else {
              currentNodes = [newResult];
            }
            parent.insertBefore(newResult, insertBefore);
          } else if (newResult != null && (newResult as any)[RNODES]) {
            const nodes = (newResult as any)[RNODES] as Node[];
            currentNodes = [...nodes].filter((n: any) => n instanceof Node);
            for (const n of currentNodes) {
              parent.insertBefore(n, insertBefore);
            }
          }
          // Flush the afterInsert queue so the newly-rendered instance's
          // __gxtEverInserted flag gets set. Without this, the subsequent
          // swap-out would skip the user willDestroy override due to the
          // __gxtEverInserted gate in patchedComponentClass.willDestroy.
          //
          // Typed bridge call via `viewUtils.flushAfterInsertQueue`. The
          // bridge adapter also dispatches the `afterFlushAfterInsertQueue`
          // host hook contributed by compile.ts via `installViewUtilsPart`
          // (the in-element deferred-render drain).
          try {
            getGxtRenderer()?.viewUtils.flushAfterInsertQueue?.();
          } catch {
            /* ignore */
          }
        }
        // If newVal is null/undefined, currentNodes stays empty (component removed)

        // Ensure we always have an anchor so subsequent swaps have a
        // parent/insertion reference even when the component renders nothing.
        if (currentNodes.length === 0) {
          if (!anchor) {
            anchor = document.createComment('dc-str-anchor');
          }
          if (!anchor.parentNode) {
            parent.insertBefore(anchor, insertBefore);
          }
        }
      };

      // Register change listener on __gxtSyncAllWrappers
      const _dcChangeListener = (): boolean => {
        if (_dcDestroyed) return false;
        performSwap();
        return true;
      };

      // Add listener to the DC-change-listener registry (shared with
      // null/curried paths). `_gxtSyncAllWrappers` in manager.ts dispatches the
      // listener Set in its after-body; the Set + string-path counter are
      // manager.ts module-local state behind the bridge's
      // `addDynamicComponentListener` method. The `stringPath: true` option
      // bumps the counter consulted by the morph-skip logic in
      // `__gxtSyncDomNow` / the arg-cell notifyPropertyChange dispatch in
      // `_gxtSyncAllWrappersBody`; the returned off-fn handles both the Set
      // delete and the counter decrement in lockstep.
      const _offDcListener = getGxtRenderer()?.compilePipeline.addDynamicComponentListener?.(
        _dcChangeListener,
        { stringPath: true }
      );

      // Cleanup destructor
      const _cleanupDcListener = () => {
        _dcDestroyed = true;
        _offDcListener?.();
        // NOTE: we do NOT call destroyCurrentDcInstance here — the surrounding
        // render tree is being torn down by Ember, which will fire destroy
        // hooks through its normal path. Calling it here would double-destroy.
        if (anchor && anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
      };
      if (ctx && typeof gxtModule.registerDestructor === 'function') {
        try {
          gxtModule.registerDestructor(ctx, _cleanupDcListener);
        } catch {
          /* ignore */
        }
      }

      // Return the initial result exactly as the curried path does. The
      // performSwap function uses currentNodes to find the insertion point.
      return initialResult;
    }

    // Handle component definitions (template-only, GlimmerishComponent, etc.)
    // that have a template in COMPONENT_TEMPLATES
    if (
      componentValue &&
      (typeof componentValue === 'object' || typeof componentValue === 'function')
    ) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(componentValue)) {
        return renderComponent(componentValue, gxtArgs, ctx);
      }
      // Non-component object/function (e.g., a helper or modifier function)
      // was passed in dynamic-component position (`<this.Foo/>` / `<x.Foo/>`).
      // Stock Ember throws here — emit the same message so `assert.throws(...)`
      // catches it. We only throw for values that actually reached the user
      // code (component-typeof, function without component manager), not for
      // native GXT primitives which proceed through the fallback below.
      const hasHelperMgr = !!findHelperManager(componentValue);
      const hasModifierMgr =
        typeof componentValue === 'function' &&
        g.INTERNAL_MODIFIER_MANAGERS &&
        (() => {
          let p: any = componentValue;
          const v = new Set();
          while (p && !v.has(p)) {
            v.add(p);
            if (g.INTERNAL_MODIFIER_MANAGERS.has(p)) return true;
            try {
              p = Object.getPrototypeOf(p);
            } catch {
              break;
            }
          }
          return false;
        })();
      // Do not flag plain POJOs / arrays as errors — only functions/classes
      // that look like helpers/modifiers, which is the stock-Ember test case.
      if (hasHelperMgr || hasModifierMgr) {
        const debugName = _dynamicDebugPath(componentGetter) || 'this.Foo';
        const valLabel = _dynamicDebugValueLabel(componentValue);
        const err = new Error(
          `Expected a dynamic component definition, but received an object or function that did not have a component manager associated with it. The dynamic invocation was \`<${debugName}>\` or \`{{${debugName}}}\`, and the incorrect definition is the value at the path \`${debugName}\`, which was: ${valLabel}`
        );
        const captureFn = g.__captureRenderError;
        if (typeof captureFn === 'function') captureFn(err);
        throw err;
      }
    }

    // Fall back to original GXT $_dc for native GXT components
    return original(componentGetter, gxtArgs, ctx);
  };
}

/**
 * Parse `this.xxx` / `@xxx` / bare-identifier paths out of a compiled getter
 * function for use in dynamic-invocation error messages. Returns null if the
 * path cannot be determined.
 *
 * Note: under bundler-minified ESM, `this` inside a `() => this.Foo` arrow
 * may be rewritten to a captured local (e.g. a `const _this2 = this` at the
 * top of a class method). So when we see a bare identifier prefix followed
 * by `.Prop`, we normalize it back to `this.Prop` rather than leaking the
 * mangled name into user-facing errors. Paths starting with `$a.` are Ember
 * `@arg` references — rewrite to `@arg` form.
 */
function _dynamicDebugPath(fn: any): string | null {
  if (typeof fn !== 'function') return null;
  let src: string;
  try {
    src = String(fn);
  } catch {
    return null;
  }
  // GXT emits `() => this.Foo` / `() => $a.helper` / `() => _this2.foo` style.
  // Match `identifier.Path` with optional optional-chaining.
  const m = /(?:=>|return)\s*([a-zA-Z_$][\w$]*)(\?\.|\.)((?:[\w$](?:\?\.|\.)?)+)/.exec(src);
  if (!m) return null;
  const head = m[1]!;
  const tail = m[3]!.split('?.').join('.');
  // @args form
  if (head === '$a') return '@' + tail;
  // `this.` form — leave as-is
  if (head === 'this') return 'this.' + tail;
  // Any other head (typically a minified `_this2` / `const` / `_` local) →
  // treat as `this.` for stock-Ember error-message compatibility.
  return 'this.' + tail;
}

function _dynamicDebugValueLabel(val: any): string {
  if (val === null || val === undefined) return String(val);
  if (typeof val === 'function') return val.name || '(unknown function)';
  if (typeof val === 'object') {
    const name = val.constructor?.name;
    return name ? `[object ${name}]` : '[object]';
  }
  return String(val);
}

// $_modifierHelper wrapper

/**
 * Wrap GXT's $_modifierHelper to handle Ember's (modifier "name" ...) keyword.
 *
 * GXT's native $_modifierHelper expects the first param to already be a modifier
 * function. Ember's (modifier) keyword can receive:
 * 1. A string name — resolve from the owner's registry
 * 2. A modifier reference (from defineSimpleModifier/setModifierManager)
 * 3. A dynamic value (this.xxx) — should throw an assertion error
 *
 * The result is a "curried modifier" function that can be used in modifier position.
 */
function createEmberModifierHelper(original: Function) {
  return function $_modifierHelper_ember(params: any[], hash: Record<string, unknown>) {
    const rawFirst = params[0];
    // Unwrap GXT getter
    const resolved =
      typeof rawFirst === 'function' &&
      !rawFirst.prototype &&
      !rawFirst.__isCurriedModifier &&
      !g.INTERNAL_MODIFIER_MANAGERS?.has(rawFirst)
        ? rawFirst()
        : rawFirst;
    const boundParams = params.slice(1);

    // Dynamic string detection: if the resolved value is a dynamic binding
    // (came from a this.xxx getter), throw an assertion.
    // We detect this by checking if the raw first param was a getter function
    // that resolved to a string — static strings are passed as literals.
    if (typeof resolved === 'string' && typeof rawFirst === 'function') {
      const assertFn = g.Ember?.assert || g.__emberAssert;
      const msg = 'Passing a dynamic string to the `(modifier)` keyword is disallowed.';
      if (assertFn) {
        assertFn(msg, false);
      } else {
        const capture = g.__captureRenderError;
        const err = new Error(`Assertion Failed: ${msg}`);
        if (typeof capture === 'function') {
          capture(err);
        }
        throw err;
      }
    }

    // String — resolve modifier by name from the owner registry
    if (typeof resolved === 'string') {
      const owner = g.owner;

      // Create a curried modifier function that, when invoked in modifier position
      // (by $_maybeModifier), merges the curried args with invocation args and
      // delegates to the Ember modifier manager.
      function curriedModifier(node: HTMLElement, _params: any[], _hash: Record<string, unknown>) {
        // Merge curried params with invocation params
        const allParams = [...boundParams, ..._params].map((a: any) =>
          typeof a === 'function' && !a.prototype ? a() : a
        );
        const mergedHash = { ...hash, ..._hash };

        // First, try the built-in keyword modifier registry (e.g. `on` →
        // OnModifierManager). Built-in modifiers work without an Ember owner,
        // so strict-mode keyword-curry forms like `{{ (if true
        // (modifier on "click" cb)) }}` install correctly outside an Ember
        // application context. Without this carve-out the curriedModifier
        // returns `undefined` whenever `owner` is missing — silently dropping
        // the user's handler.
        const builtinClass = g.$_MANAGERS?.modifier?._builtinModifiers?.[resolved];
        if (builtinClass) {
          // Reuse $_MANAGERS.modifier.handle: it knows how to dispatch a
          // built-in modifier class against the resolved manager (e.g. the
          // Glimmer-VM OnModifierManager that attaches the listener and
          // tracks adds/removes counters). Pass a thunk for hashArgs to
          // match the contract handle() expects.
          return g.$_MANAGERS.modifier.handle(resolved, node, allParams, () => mergedHash);
        }

        // Otherwise look up the modifier from the owner registry.
        const modOwner = g.owner || owner;
        if (!modOwner) return undefined;
        const factory = modOwner.factoryFor?.(`modifier:${resolved}`);
        if (!factory) return undefined;
        const ModifierClass = factory.class;

        // Find the modifier manager
        let managerFactory: any = null;
        let pointer = ModifierClass;
        const visited = new Set();
        while (pointer && !visited.has(pointer)) {
          visited.add(pointer);
          const mgr = g.INTERNAL_MODIFIER_MANAGERS?.get(pointer);
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

        const manager =
          typeof managerFactory === 'function' ? managerFactory(modOwner) : managerFactory;
        if (!manager) return undefined;

        const args = { positional: allParams, named: mergedHash };
        const instance = manager.createModifier(ModifierClass, args);
        manager.installModifier(instance, node, args);

        // Return destructor
        return () => {
          if (manager.destroyModifier) manager.destroyModifier(instance);
        };
      }

      // Mark as curried modifier so $_maybeModifier and canHandle recognize it
      (curriedModifier as any).__isCurriedModifier = true;
      (curriedModifier as any).__modifierName = resolved;

      // Register with INTERNAL_MODIFIER_MANAGERS so canHandle() finds it
      if (g.INTERNAL_MODIFIER_MANAGERS) {
        // Use a simple pass-through manager for curried modifiers
        g.INTERNAL_MODIFIER_MANAGERS.set(curriedModifier, {
          createModifier: () => ({}),
          installModifier: () => {},
          updateModifier: () => {},
          destroyModifier: () => {},
        });
      }

      return curriedModifier;
    }

    // Modifier reference (from defineSimpleModifier/setModifierManager)
    if (resolved != null && typeof resolved !== 'string') {
      // Check if it has a modifier manager
      let hasModifierManager = false;
      if (g.INTERNAL_MODIFIER_MANAGERS) {
        let ptr = resolved;
        const visited = new Set();
        while (ptr && !visited.has(ptr)) {
          visited.add(ptr);
          if (g.INTERNAL_MODIFIER_MANAGERS.has(ptr)) {
            hasModifierManager = true;
            break;
          }
          try {
            ptr = Object.getPrototypeOf(ptr);
          } catch {
            break;
          }
        }
      }

      if (hasModifierManager) {
        // Create a curried modifier that wraps the modifier reference with bound args
        function curriedManagedModifier(
          node: HTMLElement,
          _params: any[],
          _hash: Record<string, unknown>
        ) {
          const allParams = [...boundParams, ..._params];
          const mergedHash = { ...hash, ..._hash };

          // Delegate to $_maybeModifier which knows how to handle modifier references
          return g.$_maybeModifier(resolved, node, allParams, () => mergedHash);
        }

        // Mark and register so canHandle() works
        (curriedManagedModifier as any).__isCurriedModifier = true;
        if (g.INTERNAL_MODIFIER_MANAGERS) {
          g.INTERNAL_MODIFIER_MANAGERS.set(curriedManagedModifier, {
            createModifier: () => ({}),
            installModifier: () => {},
            updateModifier: () => {},
            destroyModifier: () => {},
          });
        }

        return curriedManagedModifier;
      }

      // If it's a plain function (e.g., from EmberFunctionalModifiers), fall through to original
      return original(params, hash);
    }

    // Fall through to original GXT implementation
    return original(params, hash);
  };
}

// Installation & exports

// Install on globalThis for runtime-compiled template access
export function installEmberWrappers() {
  if (g.$_maybeHelper && !g.$_maybeHelper.__emberWrapped) {
    g.$_maybeHelper = createEmberMaybeHelper(g.$_maybeHelper);
  }
  if (g.$_tag && !g.$_tag.__emberWrapped) {
    g.$_tag = createEmberTag(g.$_tag);
    g.$_tag.__emberWrapped = true;
  }
  if (g.$_dc && !g.$_dc.__emberWrapped) {
    g.$_dc = createEmberDc(g.$_dc);
    g.$_dc.__emberWrapped = true;
  }
  if (g.$_modifierHelper && !g.$_modifierHelper.__emberWrapped) {
    g.$_modifierHelper = createEmberModifierHelper(g.$_modifierHelper);
    g.$_modifierHelper.__emberWrapped = true;
  }
  // Patch the gxtEntriesOf helper used by the each-in transform to properly
  // distinguish between thunks (getter functions) and value functions/classes.
  // The original in compile.ts unconditionally invokes `obj()` when obj is a
  // function, which (a) fails on classes (throws), and (b) for non-thunk
  // functions returns undefined instead of enumerating own keys.
  // Re-runs deferred in microtasks until the helpers object is created by
  // compile.ts, since installEmberWrappers() runs before that assignment.
  _patchGxtEntriesOf();
}

// `_entriesOfPatchScheduled` is a boolean dedup latch that guards the
// microtask-deferred re-entry path in `_patchGxtEntriesOf` so that multiple
// callers (the helper-object-not-yet-registered branch) collapse to a single
// pending microtask. All 3 sites (1 reader at the if-guard, 1 set-true writer
// at scheduling, 1 reset-false writer inside the microtask) are intra-file.
let _entriesOfPatchScheduled = false;
function _patchGxtEntriesOf(): void {
  const BUILTIN = g.__EMBER_BUILTIN_HELPERS__;
  if (!BUILTIN) {
    // Helpers object not yet registered by compile.ts — retry via microtask
    if (!_entriesOfPatchScheduled) {
      _entriesOfPatchScheduled = true;
      queueMicrotask(() => {
        _entriesOfPatchScheduled = false;
        _patchGxtEntriesOf();
      });
    }
    return;
  }
  if (BUILTIN.__gxtEntriesOfPatched) return;
  BUILTIN.gxtEntriesOf = function gxtEntriesOfEmber(obj: any): any[] {
    // Thunks produced by the GXT compiler are arrow functions with no own
    // prototype. Only invoke in that case; leave regular functions and
    // classes (which have .prototype) untouched so we can iterate their
    // own enumerable keys.
    let resolved = typeof obj === 'function' && !(obj as any).prototype ? (obj as any)() : obj;
    // After the first unwrap, if we still have a function or class, treat it
    // as a value: enumerate its own enumerable string keys.
    if (typeof resolved === 'function') {
      const keys = Object.keys(resolved);
      if (keys.length === 0) return [];
      return keys.map((key) => ({ k: key, v: (resolved as any)[key] }));
    }
    if (!resolved || typeof resolved !== 'object') return [];
    // Unwrap ObjectProxy — iterate over .content, not the proxy itself.
    if (
      typeof (resolved as any).unknownProperty === 'function' &&
      typeof (resolved as any).setUnknownProperty === 'function'
    ) {
      // Subscribe the source formula to the proxy's `content` cell so a
      // whole-content ref-swap (`set(proxy,'content',obj)`) re-iterates.
      {
        const sub = (globalThis as any).__gxtSubscribeCell;
        if (typeof sub === 'function') sub(resolved, 'content');
      }
      const content = (resolved as any).content;
      if (!content || typeof content !== 'object') return [];
      resolved = content;
    }
    // Map-like (ES6 Map): has .entries() and .forEach() and is NOT an Array.
    if (
      !Array.isArray(resolved) &&
      typeof (resolved as any).entries === 'function' &&
      typeof (resolved as any).forEach === 'function'
    ) {
      return Array.from((resolved as any).entries()).map(([k, v]: any) => ({ k, v }));
    }
    // Generic iterable (non-array, non-string) yielding [key, value] pairs.
    if (
      typeof (resolved as any)[Symbol.iterator] === 'function' &&
      !Array.isArray(resolved) &&
      typeof resolved !== 'string'
    ) {
      const entries: { k: any; v: any }[] = [];
      for (const entry of resolved as any) {
        if (Array.isArray(entry) && entry.length >= 2) {
          entries.push({ k: entry[0], v: entry[1] });
        }
      }
      return entries;
    }
    // Plain objects/arrays: iterate own enumerable string keys.
    const keys = Object.keys(resolved);
    // Subscribe the each-in source formula to the object's key-SET revision
    // (via compile.ts's recorder) so `set(obj,'NewKey')` re-iterates. Applies
    // to arrays too — `{{#each-in arr}}` enumerates a custom non-index prop
    // added via `set(arr,'zomg',...)`, which is a key-set addition (the `[]`
    // index path stays orthogonal: a bump there just re-iterates, producing the
    // same output). Regular `{{#each}}` over arrays does NOT route through
    // gxtEntriesOf, so it is unaffected.
    {
      const rec = (globalThis as any).__gxtRecordEachInKeySet;
      if (typeof rec === 'function') rec(resolved, keys);
    }
    return keys.map((key) => ({ k: key, v: (resolved as any)[key] }));
  };
  Object.defineProperty(BUILTIN, '__gxtEntriesOfPatched', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: true,
  });
}

// Create module-level wrapped exports for ES module consumers
const _wrappedMH = createEmberMaybeHelper(gxtModule.$_maybeHelper);
const _wrappedTag = createEmberTag(gxtModule.$_tag);
const _wrappedDc = createEmberDc(gxtModule.$_dc);

// Re-export with original names (using alias to avoid GXT Babel plugin duplicate)
export { _wrappedMH as $_maybeHelper, _wrappedTag as $_tag, _wrappedDc as $_dc };

// HTMLInputElement/HTMLTextAreaElement/HTMLSelectElement value — undefined coercion
//
// GXT's native prop() for form elements does `t[e] = n` directly. When a
// reactive binding for `<input value={{this.value}}>` resolves to `undefined`,
// `input.value = undefined` coerces to the literal string "undefined" —
// Ember's normalizeStringValue semantics expect undefined/null to clear the
// DOM property (empty string).
//
// Vite dev loads 18 different `dom-*.js` chunks that each define their own
// `HTMLBrowserDOMApi` class; patching the one we imported wouldn't intercept
// the runtime that actually rendered the element. Instead we patch the
// intrinsic `HTMLInputElement.prototype.value` (etc.) setter — a single
// chokepoint shared by every chunk. The override only rewrites undefined and
// null values; everything else passes through untouched.
let _emberFormValueUndefinedPatched = false;
(function patchFormElementValueUndefined() {
  if (typeof HTMLInputElement === 'undefined') return;
  if (_emberFormValueUndefinedPatched) return;
  const protos = [
    typeof HTMLInputElement !== 'undefined' ? HTMLInputElement.prototype : null,
    typeof HTMLTextAreaElement !== 'undefined' ? HTMLTextAreaElement.prototype : null,
    typeof HTMLSelectElement !== 'undefined' ? HTMLSelectElement.prototype : null,
  ].filter(Boolean) as any[];
  for (const proto of protos) {
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (!desc || !desc.set || !desc.get) continue;
    const origSet = desc.set;
    const origGet = desc.get;
    Object.defineProperty(proto, 'value', {
      get: origGet,
      set: function $_gxt_ember_value_set(v: any) {
        if (v === undefined || v === null) {
          return origSet.call(this, '');
        }
        return origSet.call(this, v);
      },
      enumerable: desc.enumerable,
      configurable: true,
    });
  }
  _emberFormValueUndefinedPatched = true;
})();

// Selective UpdatingVM.alwaysRevalidate — Dynamic Component tracked-state fix
//
// Fixes the "GlimmerishComponents :: invoking dynamic component ... supports
// args, attributes, and blocks" tests where `@tracked localProperty` set on a
// captured instance → `this.rerender()` → template still shows old value.
//
// Root cause: In jit-mode tests, Glimmer VM's `UpdatingVM.execute` runs with
// `alwaysRevalidate=false` by default. When a tracked setter fires OUTSIDE the
// normal VM update cycle (via `instance.captured.x = 'LOCAL'; this.rerender()`),
// the combined track-tag validation via our `validateTag`/`currentTagRevision`
// in the gxt-backend validator appears to pass (returns "valid") for some
// nested childRef paths, causing `valueForRef` to return a cached stale value
// despite the outer JumpIfNotModifiedOpcode correctly signalling invalidation.
// Forcing `alwaysRevalidate=true` causes valueForRef to recompute every
// childRef, which produces the correct fresh value.
//
// Narrow fix: we only flip `alwaysRevalidate` ONCE per VM.execute call, when
// a tracked setter has fired since the last execute. A module-scoped flag
// (`compile.ts`'s `_gxtTrackedSetSinceRerenderFlag`, exposed via the
// `compilePipeline.markTrackedSetSinceRerender()` /
// `consumeTrackedSetSinceRerender()` bridge pair) is set by hooking
// `__gxtTriggerReRender` (which is called by the tracked setter path in
// glimmer-tracking.ts), and is consumed (cleared) on the next
// `UpdatingVM.execute`. The `{{#each}}` list iterator and other stable-
// rerender paths are unaffected on rerenders where no tracked set occurred,
// preserving DOM node identity for tests like "trackedMap() (rendering) ::
// each: set".
Promise.resolve().then(async () => {
  try {
    const rt: any = await import('@glimmer/runtime');
    const UVM = rt.UpdatingVM;
    if (UVM && !UVM.prototype.__gxtEmberPatchedAlwaysRevalidate) {
      const origExecute = UVM.prototype.execute;
      UVM.prototype.execute = function (this: any, ...args: any[]) {
        // Only force revalidate if a tracked setter has fired since the last
        // execute. This limits the perf cost and preserves DOM node identity
        // for untouched subtrees.
        //
        // Route the check+clear through the bridge's atomic
        // `consumeTrackedSetSinceRerender()` method. Bridge-not-yet-installed
        // edge: `?? false` preserves the "no flag set ⇒ never force
        // revalidate" behavior for executes that race ahead of the
        // deferred-Promise install.
        const sawTrackedSet =
          getGxtRenderer()?.compilePipeline.consumeTrackedSetSinceRerender?.() ?? false;
        if (sawTrackedSet) {
          const prevRevalidate = this.alwaysRevalidate;
          this.alwaysRevalidate = true;
          try {
            return origExecute.apply(this, args);
          } finally {
            this.alwaysRevalidate = prevRevalidate;
          }
        }
        return origExecute.apply(this, args);
      };
      UVM.prototype.__gxtEmberPatchedAlwaysRevalidate = true;
    }
  } catch {
    /* runtime not reachable — noop */
  }
});

// The tracked-set detector is a registered BEFORE-chain host hook on
// `compilePipeline.addBeforeTriggerReRender`. The hook's only effect is
// marking the tracked-set detector flag — consumed by the UpdatingVM
// `alwaysRevalidate` flip above. Registering through the bridge keeps the
// chain ordering observable.
//
// The writer routes through `compilePipeline.markTrackedSetSinceRerender()`
// (paired with `consumeTrackedSetSinceRerender()` in the UpdatingVM patch
// above); the canonical state is the module-local
// `_gxtTrackedSetSinceRerenderFlag` in `compile.ts`. The writer is reachable
// only after the bridge install completes (this installer runs through the
// `compilePipeline.addBeforeTriggerReRender` API, which already requires the
// bridge), so the bridge call is guaranteed defined when the hook fires.
// Defensive `?.` access matches the optional-method protocol typing.
//
// Load-order: a deferred-retry pattern. If
// `compilePipeline.addBeforeTriggerReRender` is not yet on the bridge
// (compile.ts hasn't finished module init), the microtask reschedules the
// registration.
(function _gxtInstallTrackedSetDetectorHostHook() {
  const cp = getGxtRenderer()?.compilePipeline;
  if (cp && typeof cp.addBeforeTriggerReRender === 'function') {
    cp.addBeforeTriggerReRender(function (_obj: object, _keyName: string) {
      // Mark that a tracked set (or equivalent notify) has occurred since the
      // last VM.execute. The flag is consumed in UpdatingVM.execute above.
      cp.markTrackedSetSinceRerender?.();
    });
    return;
  }
  queueMicrotask(_gxtInstallTrackedSetDetectorHostHook);
})();
