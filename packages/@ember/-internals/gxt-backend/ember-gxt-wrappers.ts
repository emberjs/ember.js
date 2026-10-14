/**
 * Shared Ember-GXT wrappers for $_maybeHelper and $_tag
 *
 * These wrappers bridge GXT's rendering primitives with Ember's component/helper
 * resolution system. They are installed on globalThis (for runtime-compiled templates)
 * and exported for ES module consumers.
 *
 * This module must be imported AFTER setupGlobalScope() has been called.
 */

import * as gxtModule from '@lifeart/gxt';
import { $PROPS_SYMBOL, $SLOTS_SYMBOL } from '@lifeart/gxt';
import { DEBUG } from '@glimmer/env';

// Typed bridge populated by manager.ts at its module init (e.g. the
// destruction hooks the $_dc_ember wrapper uses to destroy a component
// instance).
import {
  getGxtRenderer,
  installCompilePipelinePart,
  getAmbientOwner,
  setAmbientOwner,
  getDcComponentGetter,
  setDcComponentGetter,
  getCreateCurriedComponent,
  setCreateCurriedComponentWrapper,
  GXT_ARGS_SYMBOL,
} from './gxt-bridge';
import { createComputeRef, valueForRef } from '@glimmer/reference';
import {
  capabilitiesErrorPrefix,
  classAsAttribute,
  isPlainHtmlTagFastPath,
  sanitizedAttrValue,
} from './utils';
import { GXT_HELPER_SITE_KEY } from './ast-transforms';
import {
  destroy as destroyDestroyable,
  isDestroying as isDestroyingDestroyable,
} from './destroyable';

const g = globalThis as any;

// `_gxtMutContext` is the component render context (the `this` of the
// template that invoked `(mut ...)` or `(__mutGet ...)`) while the
// `$_maybeHelper` wrapper dispatches to the corresponding
// built-in helper entry. The helpers in compile.ts read it (via
// the `getMutContext` bridge method) when they are created, so the closure
// they return can later resolve the source getter for two-way binding without
// re-threading the context through every `mut` argument. Writers save the
// previous value, set the new one and restore it in a `finally`.
let _gxtMutContext: unknown = undefined;
function _gxtGetMutContext(): unknown {
  return _gxtMutContext;
}
function _gxtSetMutContext(value: unknown): void {
  _gxtMutContext = value;
}

// Register the read accessor so compile.ts can read the mut context through
// the bridge.
installCompilePipelinePart({
  getMutContext: _gxtGetMutContext,
});

// $_maybeHelper wrapper

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
// A `(hash)`/`(array)` value passed as a component arg is `$__cached(() =>
// $__hash/$__array(...))`; reading the arg getter yields the CACHED getter (one
// extra wrapper). The first unwrap lands on it, so resolve that extra
// cached-helper level too — otherwise a functional helper receives the
// un-invoked cached getter instead of the hash/array value. Bounded so a stray
// self-returning function can't loop.
function resolveGxtArg(a: any): any {
  let v = isGxtGetter(a) ? a() : a;
  let guard = 0;
  while (typeof v === 'function' && (v as any).__isCachedHelper && guard++ < 8) {
    v = v();
  }
  return v;
}
function unwrapArgs(args: any[]): any[] {
  if (!Array.isArray(args)) return Object.freeze([]) as any[];
  // Only unwrap GXT getters (arrow fns with no prototype).
  // Regular functions (like closures from (fn ...)) should be passed as-is.
  const result = args.map(resolveGxtArg);
  Object.freeze(result);
  return result;
}

// GXT internal hash keys that should not be passed to Ember helpers
const GXT_INTERNAL_KEYS = new Set(['$_hasBlock', '$_hasBlockParams', '$_scope', '$_eval', 'hash']);

// Shared frozen empty-hash constant. Hot helpers called per row per eval
// (`if`, `fn`, ...) mostly pass `{}`; returning one shared frozen object
// avoids allocating `{}` + `Object.keys` + `Object.freeze` each time.
// Safe to share: every downstream consumer of an `unwrapHash` result only
// spreads (`{ ...named }`), iterates (`Object.keys(named)`), or passes it as a
// read-only Ember helper args object — none mutate it or identity-compare it.
const EMPTY_FROZEN_HASH = Object.freeze({}) as Record<string, any>;

function unwrapHash(hash: Record<string, any>): Record<string, any> {
  if (!hash || typeof hash !== 'object') return EMPTY_FROZEN_HASH;
  // Short-circuit empty hashes (the common case) without allocating.
  if (Object.keys(hash).length === 0) return EMPTY_FROZEN_HASH;
  const result: Record<string, any> = {};
  for (const key of Object.keys(hash)) {
    if (GXT_INTERNAL_KEYS.has(key) || key.startsWith('$_')) continue;
    const val = hash[key];
    // Don't call CurriedComponent functions - they should be preserved as-is
    let resolved = typeof val === 'function' && !val.__isCurriedComponent ? val() : val;
    // Resolve the extra `$__cached` level for a `(hash)`/`(array)` named arg
    // (see resolveGxtArg).
    let guard = 0;
    while (typeof resolved === 'function' && (resolved as any).__isCachedHelper && guard++ < 8) {
      resolved = resolved();
    }
    result[key] = resolved;
  }
  Object.freeze(result);
  return result;
}

/**
 * Per-object cache for findHelperManager results — including the negative
 * (null) result. findHelperManager is called per row per eval for plain
 * arrow-fn helpers; it allocates a `Set` + walks the prototype chain and
 * almost always returns `null`. Helper-manager registration is monotonic per
 * object (managers are set at class-definition time, before render), so a
 * cached null cannot go stale within a run. INTERNAL_HELPER_MANAGERS is itself
 * a WeakMap (owner-independent), so this cache is owner-independent too.
 * Cleared in _gxtClearHelperCache for test-teardown hygiene.
 */
let helperManagerLookupCache = new WeakMap<object, any>();

/**
 * Walk the prototype chain to find a helper manager registered via
 * setHelperManager / setInternalHelperManager.
 */
function findHelperManager(obj: any): any {
  const managers = getGxtRenderer()?.registries.internalHelperManagers;
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

// The helper-cache entries other modules walk (validator.ts's `dirtyTagFor`,
// compile.ts's branch teardown): the tag-dirty sentinel below. Helper instances
// live in the per-scope tables that follow.
// Cleared during test teardown via compilePipeline.clearHelperCache.
const classHelperInstanceCache = new Map<string, any>();
// Helper instances (a manager bucket, or a classic helper instance) of calls by
// name, per render scope (a template's `this`, a block's context, an
// `{{#each}}` row) and call. Glimmer creates one helper instance per call site
// and render scope, and destroys it with the scope. A call the compiler marked
// is keyed by its site id (ast-transforms.ts `gxtHelperCallSiteTransform`). A
// zero-argument or named-only call carries none, and is keyed by the helper's
// name (`helperNameKey`): two such calls of one helper in one render scope
// share an instance, as gxt's compat emission tells them apart nowhere.
const helperSiteInstances = new WeakMap<object, Map<string, any>>();
// The same, per owner, for a call by name that comes with no render scope.
const helperOwnerInstances = new WeakMap<object, Map<string, any>>();

// The owner a render scope resolves helpers by name in: the owner of the
// render that created the scope, recorded the first time a call resolves in
// it. Glimmer resolves a template's helpers once, in the owner it renders with;
// the compat build resolves a call by name each time it is evaluated, and an
// update evaluates it outside of any render, where the ambient owner is
// another render's, or one that has been destroyed since.
const helperScopeOwners = new WeakMap<object, any>();

// Whether `owner` can still resolve: not destroyed nor being destroyed (an
// owner without `isDestroyed` / `isDestroying` flags too).
function isLiveOwner(owner: any): boolean {
  return (
    owner !== null &&
    typeof owner === 'object' &&
    owner.isDestroyed !== true &&
    owner.isDestroying !== true &&
    !isDestroyingDestroyable(owner)
  );
}

// The key of a call by name without a site id. Site ids are numbers.
function helperNameKey(name: string): string {
  return `name:${name}`;
}

// The table holding the helper instance of a call by name: its render scope's,
// else its owner's.
function helperInstancesFor(scope: unknown, owner: object): Map<string, any> {
  if (scope !== null && typeof scope === 'object') return helperSiteInstancesFor(scope);
  let instances = helperOwnerInstances.get(owner);
  if (instances === undefined) {
    instances = new Map();
    helperOwnerInstances.set(owner, instances);
  }
  return instances;
}

// A table entry, unless its helper was destroyed (an `{{#if}}` branch's
// teardown destroys the helpers created in it): a destroyed helper is never
// reused, the call creates a new one.
function liveHelperEntry(entry: any): any {
  const destroyable = entry?.__managerBucket === true ? entry.destroyable : entry;
  return destroyable !== null &&
    typeof destroyable === 'object' &&
    isDestroyingDestroyable(destroyable)
    ? undefined
    : entry;
}

function helperSiteInstancesFor(ctx: object): Map<string, any> {
  let sites = helperSiteInstances.get(ctx);
  if (sites === undefined) {
    const owned = new Map<string, any>();
    sites = owned;
    helperSiteInstances.set(ctx, owned);
    // The call sites live as long as the render scope holding them.
    gxtModule.registerDestructor(ctx as never, () => {
      helperSiteInstances.delete(ctx);
      owned.forEach(destroyHelperSiteEntry);
      owned.clear();
    });
  }
  return sites;
}

function destroyHelperSiteEntry(entry: any): void {
  const destroyable = entry?.__managerBucket === true ? entry.destroyable : entry;
  if (
    destroyable !== null &&
    typeof destroyable === 'object' &&
    !isDestroyingDestroyable(destroyable)
  ) {
    destroyDestroyable(destroyable);
  }
}
// Exposed to validator.ts and compile.ts through the get-only bridge method
// `compilePipeline.getClassHelperInstanceCache` (registered below).
// Cache for simple (function-based) helper results to deduplicate calls within
// the same sync cycle. Keyed by helper name, stores last args serialization + result.
const simpleHelperResultCache = new Map<string, { argsSer: string; result: any }>();
// Cache for managed helper buckets (class-based helpers with setHelperManager).
// Keyed by the helper class/function. Stores { bucket, delegate, reactiveArgs }.
let managedHelperBucketCache = new WeakMap<
  any,
  { bucket: any; delegate: any; reactiveArgs: { positional: any[]; named: Record<string, any> } }
>();
// `_gxtClearHelperCache` is exposed as the `compilePipeline.clearHelperCache`
// bridge method, called from `runDestroy` in internal-test-helpers and from
// compile.ts's `_gxtClearOnSetup`.
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
// Register the bridge methods for internal-test-helpers and compile.ts.
installCompilePipelinePart({
  clearHelperCache: _gxtClearHelperCache,
  // Get-only accessor for the `classHelperInstanceCache` Map above. Read by
  // validator.ts's `dirtyTagFor` loop (which stamps `lastArgsSer` on every
  // `__managerBucket` entry; only the tag-dirty sentinel below reacts to it)
  // and by compile.ts's `$_if` branch-swap helper-destroy hooks.
  getClassHelperInstanceCache: () => classHelperInstanceCache,
});

// Tag-dirty bridge sentinel.
//
// Class-based helpers invoked without args (e.g. `{{hello-world}}`) are
// routed by GXT's tag-rewrite path through compile.ts's
// `_tagHelperInstanceCache` instead of through this file's
// classHelperInstanceCache. compile.ts uses a JSON-stringified args+recompute
// dedup key on the helper instance to avoid double-computing within a single
// render — but it has no listener for tracked-property dirties on external
// objects (a closure-captured @tracked instance, for example).
//
// validator.ts's `dirtyTagFor` walks classHelperInstanceCache and stamps each
// `__managerBucket` entry's `lastArgsSer`. This synthetic entry piggy-backs on
// that loop: its `lastArgsSer` setter forwards the dirty signal to every
// cached tag-helper instance, clearing its `__gxtLastArgsSerialized` so
// compile.ts re-invokes compute() with fresh state.
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
        // The bridge accessor is undefined before compile.ts has installed its
        // pipeline part, in which case there is nothing to clear.
        const tagCache = getGxtRenderer()?.compilePipeline.getTagHelperInstanceCache?.() as
          | Map<string, { instance: any }>
          | undefined;
        if (!tagCache || tagCache.size === 0) return;
        // forEach, NOT for…of — gxt's reactive Map.prototype patch would
        // otherwise register this bookkeeping Map with the ambient tracking
        // frame (see the dirtyTagFor cache loop in validator.ts).
        tagCache.forEach((entry) => {
          const inst = entry?.instance;
          if (inst) {
            // Clearing the dedup key forces compile.ts's helperGetter to
            // re-run compute() instead of returning the stale cached result.
            inst.__gxtLastArgsSerialized = null;
          }
        });
      } catch {
        /* noop — defensive */
      }
    },
  };
  classHelperInstanceCache.set('__tagDirtySentinel__', _tagDirtySentinel);
}

// Resolver cache counters — mirrors the Glimmer ConstantsImpl counters so the
// `ember-glimmer runtime resolver cache` test can observe helper/component
// definition reuse from the GXT path. The renderer's `_context` getter (in
// glimmer/lib/renderer.ts) copies these onto the live
// EvaluationContext.constants object in GXT mode, reading them through
// `compilePipeline.getResolverCacheCounters`.
const _resolverCacheCounters: {
  componentDefinitionCount: number;
  helperDefinitionCount: number;
  modifierDefinitionCount: number;
} = {
  componentDefinitionCount: 0,
  helperDefinitionCount: 0,
  modifierDefinitionCount: 0,
};
// Register the bridge getter for glimmer/lib/renderer.ts. Queued until
// `setGxtRenderer` runs if manager.ts has not loaded yet.
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

// Register the resolver-cache counting wrapper for the curried-component
// factory: named component curries — produced by `(component "x")` /
// `{{component "x"}}` / CurriedComponent invocations — count once per unique
// name in the resolver-cache counters. The bridge composes this wrapper over
// whatever factory manager.ts registers, regardless of module-init order.
setCreateCurriedComponentWrapper((inner) => {
  return function trackingWrapper(nameOrComp: any, args: any, positionals: any[]) {
    if (typeof nameOrComp === 'string') {
      _trackComponentDefinition(nameOrComp);
    } else if (nameOrComp && typeof (nameOrComp as any).__name === 'string') {
      _trackComponentDefinition((nameOrComp as any).__name);
    }
    return inner(nameOrComp, args, positionals);
  };
});

// When a property changes on a component, stamp the `__managerBucket` entries
// of the helper cache (as validator.ts's `dirtyTagFor` does): the tag-dirty
// sentinel forwards it to compile.ts's tag helpers; the custom-manager buckets
// need nothing, their `getValue` is a cache over args and consumed tags. We
// don't re-compute values here to avoid double-counting.
//
// Exposed as the `compilePipeline.notifyHelperPropertyChange` bridge method,
// called from manager.ts's helper-recompute path.
function _gxtNotifyHelperPropertyChange(_obj: unknown, _key: string): void {
  // forEach, NOT for…of — gxt's reactive Map.prototype patch would otherwise
  // register this bookkeeping Map with the ambient tracking frame (see the
  // dirtyTagFor cache loop in validator.ts).
  (classHelperInstanceCache as Map<string, any>).forEach((cached) => {
    if (cached && cached.__managerBucket) {
      cached.lastArgsSer = null;
    }
  });
}
installCompilePipelinePart({
  notifyHelperPropertyChange: _gxtNotifyHelperPropertyChange,
});

// Whether `value` is a render context (a template's `this`, a block's
// context, a classic component instance) rather than a named-argument hash.
function _isRenderContext(value: object): boolean {
  const v = value as any;
  return (
    gxtModule.COMPONENT_ID_PROPERTY in v ||
    Object.prototype.hasOwnProperty.call(v, '$_eval') ||
    v[$PROPS_SYMBOL] !== undefined ||
    v[GXT_ARGS_SYMBOL] !== undefined ||
    (v.isView === true && v.isComponent === true)
  );
}

/**
 * Wraps GXT's $_maybeHelper to support:
 * - Function arguments (e.g. values yielded as block params)
 * - Ember's built-in keyword helpers (readonly, mut, unbound)
 * - Helper lookup from Ember's container via owner
 * - Component invocation for kebab-case names ({{foo-bar}})
 */
function createEmberMaybeHelper(original: Function) {
  // Cache the last known owner so that re-evaluations during reactive updates
  // (when the ambient owner may be null) can still resolve helpers.
  let _cachedHelperOwner: any = null;

  const wrapped = function $_maybeHelper_ember(
    nameOrFn: string | Function,
    args: any[],
    hashOrCtx?: any,
    maybeCtx?: any
  ): any {
    // Which argument is the call site's named-argument hash and which its
    // render context. gxt's emission (compiler `we`): a call by NAME passes the
    // render context last — `(name, positional, ctx)`, or with named arguments
    // `(name, positional, named, ctx)`; a call of a BINDING (a scope value, a
    // block param) passes `(definition, positional, named)`. The Ember-side
    // callers pass all four. So with four arguments the third is the hash, and
    // a name's third argument is its context. A binding's third argument is a
    // context only when compile.ts's scope rewrite turned a name call into a
    // binding call (it keeps the name call's arguments): a render context
    // carries gxt's component id (`COMPONENT_ID_PROPERTY`), a hash never does.
    // (Guessing from the shape alone took a template-only component's context
    // — `{ $fw, args, attrs }` — and a block's context for the hash, so the
    // helper received them as named arguments.)
    const fourArgs = arguments.length >= 4;
    const thirdIsCtx =
      !fourArgs &&
      hashOrCtx != null &&
      typeof hashOrCtx === 'object' &&
      (typeof nameOrFn === 'string' || _isRenderContext(hashOrCtx));
    let hash = thirdIsCtx ? {} : (hashOrCtx ?? {});
    const ctx = fourArgs ? maybeCtx : thirdIsCtx ? hashOrCtx : undefined;
    // The call site's id, which the compiler passes as a named argument
    // (ast-transforms.ts `gxtHelperCallSiteTransform`); not one of the call's
    // named arguments. With the render scope it keys the helper instance
    // (`helperSiteInstances`).
    let siteCtx: object | null = null;
    let siteId = '';
    let siteStripped = false;
    if (
      typeof hash === 'object' &&
      Object.prototype.hasOwnProperty.call(hash, GXT_HELPER_SITE_KEY)
    ) {
      const descriptors = Object.getOwnPropertyDescriptors(hash);
      const site = hash[GXT_HELPER_SITE_KEY];
      delete descriptors[GXT_HELPER_SITE_KEY];
      hash = Object.defineProperties({}, descriptors);
      siteStripped = true;
      if (ctx !== null && typeof ctx === 'object') {
        siteCtx = ctx;
        siteId = String(typeof site === 'function' ? site() : site);
      }
    }

    // Detect a destroyed render context. When a prior test's component was torn
    // down but its formula closures linger (e.g. a dirtyTagFor cascade pulls the
    // dead component's $_maybeHelper invocation into a re-evaluation pass), the
    // ctx passed in here is the destroyed component instance. Re-invoking the
    // helper would inflate compute() call counts, so return the last cached
    // result instead, keeping the already-detached node stable.
    {
      if (
        ctx &&
        typeof ctx === 'object' &&
        (ctx.isDestroyed === true || ctx.isDestroying === true)
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
      const createCurried = getCreateCurriedComponent();
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
      const managers = getGxtRenderer()?.compilePipeline.getManagers?.();
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
          const delegate = helperMgr.getDelegateFor(getAmbientOwner());
          // Validate that capabilities were created via helperCapabilities()
          const _FROM_CAPS = g.FROM_CAPABILITIES;
          if (
            delegate &&
            delegate.capabilities &&
            _FROM_CAPS &&
            !_FROM_CAPS.has(delegate.capabilities)
          ) {
            const err = new Error(
              capabilitiesErrorPrefix('helper') +
                `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
            );
            // Capture for flushRenderErrors so assert.throws() can see it
            const captureFn = getGxtRenderer()?.compilePipeline.captureRenderError;
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
                  // Fires manager.ts's registered push hook, then records the instance
                  // for destruction (see `pushHelperInstance` in gxt-bridge.ts).
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
            return helperFn(capturedArgs, getAmbientOwner());
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

      // Mark user helper results that are functions so downstream
      // unwrapArgs / unwrapHash do not treat them as GXT reactive getters
      // and invoke them. For example, when a user function like `boundFn`
      // is invoked via `(fn ...)` (shadowed), the returned closure must reach
      // the outer helper (e.g. `invoke`) as-is rather than be eagerly called.
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
      // Skip the JSON.stringify-based result cache when any positional arg is a
      // non-primitive object or a plain function value, because the comparison is
      // unreliable for them: Map/Set serialize to `{}`, in-place mutation of a POJO
      // is missed, cycles throw, and functions serialize to null (false hits across
      // distinct callbacks, e.g. two (fn ...) subexpressions shadowed by a user fn).
      // The helper runs inside a reactive formula that already dedupes by tag
      // tracking, so re-invoking per formula evaluation is safe.
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
    if (
      nameOrFn &&
      typeof nameOrFn === 'object' &&
      getGxtRenderer()?.registries.internalHelperManagers
    ) {
      const helperFnOrManager = getGxtRenderer()?.registries.internalHelperManagers.get(nameOrFn);
      if (typeof helperFnOrManager === 'function') {
        // Build a CapturedArguments shape: arrays of compute-refs over the
        // (possibly getter-valued) args. Using the real `createComputeRef` keeps
        // `valueForRef` working; the internal element helper only calls
        // `valueForRef(positional[0])` and reads `positional.length`.
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
          ref = helperFnOrManager(captured, getAmbientOwner());
        } catch (e) {
          // Rethrow so assert.throws() in DEBUG can capture invalid-arity /
          // non-string-tag asserts produced by the element helper.
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
    const BUILTIN_HELPERS = getGxtRenderer()?.compilePipeline.getBuiltinHelpers?.();
    if (BUILTIN_HELPERS && BUILTIN_HELPERS[name]) {
      const helper = BUILTIN_HELPERS[name];
      // For 'hash' helper, pass the named args (hash) as the first argument
      if (name === 'hash') {
        const namedObj = unwrapHash(hash);
        return helper(namedObj);
      }
      // For '__mutGet' helper, pass obj and key with context set
      if (name === '__mutGet' && Array.isArray(args) && args.length > 0) {
        // Save/set/restore the mut context around the `helper(...)` invocation.
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
        // args[0] = getter for the value, args[1] = the full dotted write-path
        // string, which the compiler emits from the AST for both the subexpression
        // `(mut this.a.b)` and mustache `@v={{mut this.a.b}}` forms. A missing path
        // means a non-`this.`/`@`-headed target, which the mut helper rejects.
        const rawGetter = args[0];
        const pathArg: any =
          args.length > 1 ? (typeof args[1] === 'function' ? args[1]() : args[1]) : undefined;
        // Set the mut context so the setter can find the component instance:
        // GXT compiles (mut this.val) as $_maybeHelper("mut", [...], this).
        // Save/set/restore the mut context around the `helper(...)` invocation.
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

    // Try Ember container lookup — in the owner of the call's render scope
    // (`helperScopeOwners`), else the ambient owner, else the cached one.
    const currentOwner = getAmbientOwner();
    if (isLiveOwner(currentOwner)) {
      _cachedHelperOwner = currentOwner;
    }
    if (_cachedHelperOwner && !isLiveOwner(_cachedHelperOwner)) {
      _cachedHelperOwner = null;
    }
    const scope = siteCtx ?? (ctx !== null && typeof ctx === 'object' ? ctx : null);
    let owner: any = scope !== null ? helperScopeOwners.get(scope) : undefined;
    if (owner === undefined || !isLiveOwner(owner)) {
      owner = isLiveOwner(currentOwner) ? currentOwner : (_cachedHelperOwner ?? undefined);
      if (owner !== undefined && scope !== null) helperScopeOwners.set(scope, owner);
    }
    if (owner !== undefined && isLiveOwner(owner)) {
      // Where this call's helper instance lives: its call site in its render
      // scope, else the helper's name in its render scope, else in its owner
      // (see `helperSiteInstances`).
      const instances = helperInstancesFor(siteCtx ?? ctx, owner);
      const instanceKey = siteCtx ? siteId : helperNameKey(name);

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
                capabilitiesErrorPrefix('helper') +
                  `Received: \`${JSON.stringify(delegate.capabilities)}\` for manager \`${delegate.constructor?.name || 'unknown'}\``
              );
              // Capture for flushRenderErrors so assert.throws() can see it
              const captureFn = getGxtRenderer()?.compilePipeline.captureRenderError;
              if (typeof captureFn === 'function') captureFn(err);
              throw err;
            }
            if (
              delegate &&
              typeof delegate.createHelper === 'function' &&
              delegate.capabilities?.hasValue
            ) {
              // Cache the helper bucket per call (`instances`) so re-renders
              // don't create new instances; a bucket of another definition (the
              // name registered again) is not this helper's.
              // We create a GXT cell to hold the result so GXT's formula system tracks
              // it and re-renders automatically when the cell is updated.
              let cached = liveHelperEntry(instances.get(instanceKey));
              const _cellFor = gxtModule.cellFor;
              if (
                !cached ||
                cached.__managerBucket !== true ||
                cached.definition !== factoryClass
              ) {
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
                let bucketDestroyable: object | null = null;
                if (
                  delegate.capabilities?.hasDestroyable &&
                  typeof delegate.getDestroyable === 'function'
                ) {
                  const destroyable = delegate.getDestroyable(bucket);
                  if (destroyable) {
                    bucketDestroyable = destroyable;
                    // Record the instance for destruction (see `pushHelperInstance` in
                    // gxt-bridge.ts).
                    getGxtRenderer()?.compilePipeline.pushHelperInstance?.(destroyable);
                    // Associate with the enclosing `{{#if}}` branch (if any) so that
                    // destroy + willDestroy fire on branch teardown, matching Ember's
                    // classic Helper lifecycle semantics.
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
                // cell here so the effect subscribes to it; `getValue` (a cache
                // that consumed the RECOMPUTE_TAG) then re-runs compute().
                let _gxtRecomputeTag: any = null;
                if (bucket) {
                  try {
                    const _inst = (bucket as any).instance;
                    if (_inst && typeof _inst === 'object') {
                      _gxtRecomputeTag =
                        getGxtRenderer()!.compilePipeline.getHelperRecomputeTag!(_inst) ?? null;
                    }
                  } catch {
                    /* ignore */
                  }
                }
                // Read the RECOMPUTE_TAG cell now so the enclosing effect
                // subscribes to it. When recompute() bumps it via manager.ts's
                // bridge, the effect re-fires and the cached branch below reads
                // the re-computed value.
                if (
                  _gxtRecomputeTag &&
                  typeof _gxtRecomputeTag === 'object' &&
                  'value' in _gxtRecomputeTag
                ) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  _gxtRecomputeTag.value;
                }

                cached = {
                  __managerBucket: true,
                  bucket,
                  delegate,
                  reactiveArgs,
                  lastResult: result,
                  helperCell,
                  recomputeTag: _gxtRecomputeTag,
                  destroyable: bucketDestroyable,
                  definition: factoryClass,
                } as any;
                instances.set(instanceKey, cached);

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
                          // Trigger DOM sync (bridge `syncDomNow`).
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
                // A re-evaluation of the formula that renders the helper.
                // Glimmer semantics: the bucket's args are references
                // (helper-manager.ts): assigning the current values records a
                // change only for a slot whose value differs (`Object.is`,
                // functions by identity), and `getValue` is the helper's cached
                // reference, which re-runs compute only when an argument or a
                // tag it consumed changed. Reading it on every evaluation keeps
                // this formula subscribed to the helper's tracked reads.
                //
                // Nothing here writes reactive state: the formula that is
                // reading the helper must not be dirtied by the read. (Writing
                // the args unconditionally, or with no comparison when an
                // argument was a function, dirtied a tag this formula consumed,
                // so every evaluation scheduled the next one.)
                const _cachedRT = (cached as any).recomputeTag;
                if (_cachedRT && typeof _cachedRT === 'object' && 'value' in _cachedRT) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  _cachedRT.value;
                }
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
                cached.lastResult = result;
                // Subscribe to the cell that the out-of-formula paths update
                // (the PROPERTY_DID_CHANGE hook above); this read path never
                // writes it.
                if (cached.helperCell) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  cached.helperCell.value;
                }
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
          // Use a cached persistent instance for class-based helpers, one per
          // call (`instances`).
          // This enables recompute() to trigger re-evaluation of the same instance.
          let instance = liveHelperEntry(instances.get(instanceKey));
          if (!instance || instance.__managerBucket === true) {
            try {
              instance = factory.create();
              instances.set(instanceKey, instance);
              // Also record the instance for destruction (see
              // `pushHelperInstance` in gxt-bridge.ts).
              getGxtRenderer()?.compilePipeline.pushHelperInstance?.(instance);
              // If this helper was created during an `{{#if}}` branch render,
              // associate it with that branch's teardown scope so destroy +
              // willDestroy fire on branch swap (not only on component teardown).
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
            const tag: any = getGxtRenderer()!.compilePipeline.getHelperRecomputeTag!(instance);
            if (tag && typeof tag === 'object' && 'value' in tag) {
              // Read the cell to establish tracking in the enclosing formula
              // eslint-disable-next-line @typescript-eslint/no-unused-expressions
              tag.value;
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
          const $_MANAGERS = getGxtRenderer()?.compilePipeline.getManagers?.();
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
    if (siteStripped) return original(name, args, hash, ctx);
    return original(name, args, hashOrCtx, maybeCtx);
  };
  (wrapped as any).__emberWrapped = true;
  return wrapped;
}

// $_tag wrapper

// Fast-path eligibility for this $_tag wrapper: the predicate compile.ts's
// wrapper uses (`isPlainHtmlTagFastPath`, which also lists why every scan is a
// no-op then), minus the namespace check, since this wrapper leaves namespaces
// to `original` (GXT's native $_tag, or compile.ts's wrapper when both are
// active, which re-checks).
function _emberTagFastPathEligible(tag: unknown, tagProps: any): boolean {
  return isPlainHtmlTagFastPath(tag, tagProps, gxtModule.$_edp);
}

/**
 * Wraps GXT's $_tag to support:
 * - PascalCase/kebab-case component resolution via Ember's registry
 * - Arg components (<@foo />)
 * - EmberHtmlRaw (triple mustaches {{{expr}}})
 *
 * This inner layer is wrapped again by compile.ts's `$_tag_ember` for
 * runtime-compiled templates, but build-time .gts/.gjs templates import it
 * directly as `$_tag` (vite's `gxtEmberWrapperRedirect` points their `$_tag`
 * import here). `<this.foo/>` and `<:named>` blocks need no branch here: gxt
 * compiles them to `$_dc` and slots at build time, and compile.ts's outer
 * wrapper handles (and returns for) both before calling this one. The by-name
 * lookup is reachable: an undeclared PascalCase tag and a hyphenated tag
 * (`<foo-bar>`) compile to `$_tag('Name')` / `$_tag('foo-bar')`.
 *
 * The `<@foo/>` arg-component branch (resolvedTag.startsWith('@')) is
 * load-bearing: an arg is not a lexical binding, so build-time templates emit
 * a string `$_tag('@foo', ...)` for `<@foo/>`, and this wrapper is its only
 * handler — native GXT `$_tag` has no `@`-handling and would build a broken
 * `<@foo>` element.
 */
function createEmberTag(original: Function) {
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
    // Fast path (see _emberTagFastPathEligible): skip the scans for plain-HTML
    // elements and forward straight to `original`. Every HTML element's
    // classes reach gxt as one `class` attribute (`classAsAttribute`), here
    // and at the slow path's exit below.
    if (_emberTagFastPathEligible(tag, tagProps)) {
      return original(tag, classAsAttribute(tagProps, gxtModule.$_edp), ctx, children);
    }
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    if (resolvedTag && typeof resolvedTag === 'string') {
      // Dynamic component: <@foo />
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1);
        const args = ctx?.[GXT_ARGS_SYMBOL] || ctx?.args || {};
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
        const _owner = getAmbientOwner();
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
                // An attribute is forwarded through ...attributes only; as in
                // Glimmer, it is never an argument.
                domAttrs.push([key, value]);
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

          // A block declares params only through the `@__hasBlockParams__`
          // marker or a named block's `__hasBlockParams`.
          const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
            const hasBlockParams = explicitHasBlockParams ?? false;

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

              // Block-params structures live module-locally in compile.ts and are
              // reached through the compilePipeline bridge.
              const _slotPipeline = getGxtRenderer()?.compilePipeline;
              const contextParams = _slotPipeline?.getContextBlockParams?.();
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, [...unwrappedParams]);
              }
              _slotPipeline?.setCurrentSlotParams?.(unwrappedParams);

              const stack = _slotPipeline?.getBlockParamsStack?.() as any[][];
              stack.push(unwrappedParams);
              try {
                // Return raw children as-is. GXT's rendering pipeline
                // (renderElement → resolveRenderable) handles functions
                // by wrapping them in formulas that track cell dependencies;
                // calling child() eagerly here would lose that reactivity.
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
          const _owner = getAmbientOwner();
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
        const owner = getAmbientOwner();
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
    //
    // The classes go first, into one `class` attribute (`classAsAttribute`),
    // so a `class` forwarded in fw[1] merges with the element's own classes
    // instead of being captured below as an ordinary attribute.
    tagProps = classAsAttribute(tagProps, gxtModule.$_edp);
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
          // A URL attribute is sanitized first, as Glimmer sanitizes a
          // dynamic attribute (these never reach the `normalizeAttrValue`
          // hook that sanitizes gxt's own attribute writes).
          const onCreated = (el: Element) => {
            for (const [aKey, aGetter] of capturedAttrs) {
              gxtModule.effect(() => {
                const v = sanitizedAttrValue(el, aKey, aGetter());
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
    const gxtSlots = gxtArgs?.[$SLOTS_SYMBOL];
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

  // The swap paths below render the dynamic component's new value with the
  // owner captured at the first render (when none is ambient) and with the
  // component getter as the current dc getter; a string path also stashes its
  // instance-capture callback on the args for the render (see `__gxtDcCapture`).
  // A render error leaves the slot empty.
  function renderSwappedValue(
    newVal: any,
    componentGetter: any,
    gxtArgs: any,
    ctx: any,
    capturedOwner: any,
    captureInstance?: (inst: any) => void
  ): any {
    const prevOwner = getAmbientOwner();
    if (!getAmbientOwner() && capturedOwner && !capturedOwner.isDestroyed) {
      setAmbientOwner(capturedOwner);
    }
    const prevDcGetter = getDcComponentGetter();
    setDcComponentGetter(componentGetter);
    if (captureInstance) {
      Object.defineProperty(gxtArgs, '__gxtDcCapture', {
        value: captureInstance,
        configurable: true,
        enumerable: false,
        writable: true,
      });
    }
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
      setDcComponentGetter(prevDcGetter);
      if (captureInstance) {
        try {
          delete (gxtArgs as any).__gxtDcCapture;
        } catch {
          /* configurable: true above ensures delete succeeds for our own writes */
        }
      }
      if (!prevOwner && getAmbientOwner() === capturedOwner) {
        setAmbientOwner(prevOwner);
      }
    }
    return newResult;
  }

  // Identity of a dynamic component value; a swap happens only when it changes.
  function dcIdentityKey(val: any): string {
    if (!val && val !== 0) return '__empty__';
    if (typeof val === 'string') return '__str:' + val;
    if (val && val.__isCurriedComponent) return '__curried:' + (val.__name || '');
    return '__other:' + String(val);
  }

  // The DOM nodes of a render result: a node, a fragment's children, or a GXT
  // component's rendered nodes.
  function renderedNodesOf(result: any): Node[] {
    if (result instanceof Node) {
      return result instanceof DocumentFragment ? Array.from(result.childNodes) : [result];
    }
    if (result != null && result[gxtModule.RENDERED_NODES_PROPERTY]) {
      return [...(result[gxtModule.RENDERED_NODES_PROPERTY] as Node[])].filter(
        (n: any) => n instanceof Node
      );
    }
    return [];
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
    // Derive fw (forwarded splat attrs) from the invocation's own props tuple
    // `gxtArgs[$PROPS_SYMBOL]` and re-home @-args onto mergedArgs, so a dynamic-tag
    // invocation (`<x.foo class="…" @a=… {{on …}} />`) forwards class/attrs to
    // the resolved component's `...attributes` the way a static invocation does.
    let __fw: any = null;
    const __tuple = gxtArgs && typeof gxtArgs === 'object' ? (gxtArgs as any)[$PROPS_SYMBOL] : null;
    if (gxtModule.hasDynamicSplatProps(__tuple)) {
      const __derived = gxtModule.deriveManagerFwFromPropsTuple(__tuple);
      __fw = __derived.fw;
      for (const [__name, __getter] of __derived.argEntries) {
        Object.defineProperty(mergedArgs, __name, {
          get: __getter,
          enumerable: true,
          configurable: true,
        });
      }
    }
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
    const handleResult = managers.component.handle(componentValue, mergedArgs, __fw, ctx);
    if (typeof handleResult === 'function') {
      return handleResult();
    }
    return handleResult;
  }

  return function $_dc_ember(componentGetter: () => any, gxtArgs: any, ctx: any): any {
    // Inject $PROPS_SYMBOL on args so GXT's $_c (component function) can find them.
    if (gxtArgs && typeof gxtArgs === 'object' && !($PROPS_SYMBOL in gxtArgs)) {
      try {
        Object.defineProperty(gxtArgs, $PROPS_SYMBOL, {
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
    // Use a placeholder comment node that stays in the DOM, and listen for the
    // value transitioning to a CurriedComponent to perform a manual DOM swap.
    if (componentValue == null) {
      const nullPlaceholder = document.createComment('dc-null');
      let _nullDestroyed = false;
      let _nullLastKey = '__empty__';
      const _dcCapturedOwner = getAmbientOwner();
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
          const newResult = renderSwappedValue(
            newVal,
            componentGetter,
            gxtArgs,
            ctx,
            _dcCapturedOwner
          );
          if (newResult instanceof Node) {
            _insertedNodes = renderedNodesOf(newResult);
            parent.insertBefore(newResult, nullPlaceholder);
          }
        }
      };

      const _nullListener = (): boolean => {
        if (_nullDestroyed) return false;
        _nullSwap();
        return true;
      };

      // `_gxtSyncAllWrappers` in manager.ts dispatches the dynamic-component
      // change listeners after each sync; `addDynamicComponentListener` returns
      // an off-fn (called from `_nullCleanup` below).
      const _offNullListener =
        getGxtRenderer()?.compilePipeline.addDynamicComponentListener?.(_nullListener);

      const _nullCleanup = () => {
        _nullDestroyed = true;
        _offNullListener?.();
      };
      if (ctx) {
        try {
          gxtModule.registerDestructor(ctx, _nullCleanup);
        } catch {
          /* ignore */
        }
      }

      return nullPlaceholder;
    }

    // Handle CurriedComponent — render once initially, and register a listener
    // (dispatched by `_gxtSyncAllWrappers`) that performs a manual DOM swap when
    // the underlying component identity changes (e.g., compName switches between
    // 'my-comp' and 'your-comp'). GXT's $_dc is avoided for CurriedComponents
    // because its factory mechanism does not work with Ember's component manager.
    if (componentValue && componentValue.__isCurriedComponent) {
      // --- Initial one-shot render ---
      let initialResult: any = null;
      if (componentValue && componentValue.__isCurriedComponent) {
        const prev = getDcComponentGetter();
        setDcComponentGetter(componentGetter);
        try {
          const hasCurriedPositionals = (componentValue.__curriedPositionals || []).length > 0;
          initialResult = renderComponent(componentValue, gxtArgs, ctx, !hasCurriedPositionals);
        } finally {
          setDcComponentGetter(prev);
        }
      }

      // --- Reactive swap tracking ---
      let _lastIdentityKey = dcIdentityKey(componentValue);
      let _dcDestroyed = false;
      const _dcCapturedOwner = getAmbientOwner();

      // Collect initial rendered nodes for later removal during swaps.
      let currentNodes: Node[] = renderedNodesOf(initialResult);

      // Perform DOM swap when the component identity changes.
      const performSwap = () => {
        if (_dcDestroyed) return;

        let newVal: any;
        try {
          newVal = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
        } catch {
          return;
        }

        const newKey = dcIdentityKey(newVal);
        if (newKey === _lastIdentityKey) return;
        _lastIdentityKey = newKey;

        // Find insertion reference from current nodes
        const lastNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
        const parent = lastNode?.parentNode;
        if (!parent) return;
        // If the managed node has been detached from the live DOM, its DOM was
        // replaced by a newer render that registered its own listener. Mark this
        // listener as orphaned and skip; otherwise the stale listener would still
        // call performSwap and create duplicate component instances (double init on
        // compName changes — GH#13982).
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
          const newResult = renderSwappedValue(
            newVal,
            componentGetter,
            gxtArgs,
            ctx,
            _dcCapturedOwner
          );
          // Insert new nodes at the position of the old nodes
          currentNodes = renderedNodesOf(newResult);
          if (newResult instanceof Node) {
            parent.insertBefore(newResult, insertBefore);
          } else {
            for (const n of currentNodes) {
              parent.insertBefore(n, insertBefore);
            }
          }
        }
        // If newVal is null/undefined, currentNodes stays empty (component removed)
      };

      // Change listener dispatched by `_gxtSyncAllWrappers`.
      const _dcChangeListener = (): boolean => {
        if (_dcDestroyed) return false;
        performSwap();
        return true;
      };

      // Add the listener to the registry shared with the null/string paths; the
      // returned off-fn is used for cleanup.
      const _offDcListener =
        getGxtRenderer()?.compilePipeline.addDynamicComponentListener?.(_dcChangeListener);

      // Cleanup destructor
      const _cleanupDcListener = () => {
        _dcDestroyed = true;
        _offDcListener?.();
      };
      if (ctx) {
        try {
          gxtModule.registerDestructor(ctx, _cleanupDcListener);
        } catch {
          /* ignore */
        }
      }

      // Return the initial result; performSwap uses currentNodes to find the
      // insertion point for later swaps.
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
        const captureErr = getGxtRenderer()?.compilePipeline.captureRenderError;
        if (typeof captureErr === 'function') {
          captureErr(err);
        }
        throw err;
      }

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
          getGxtRenderer()?.destruction.destroyEmberComponentInstance(inst);
        } catch {
          /* ignore */
        }
      };

      // --- Initial one-shot render ---
      let initialResult: any = null;
      {
        const _prevDcGetter = getDcComponentGetter();
        setDcComponentGetter(componentGetter);
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
          setDcComponentGetter(_prevDcGetter);
          try {
            delete (gxtArgs as any).__gxtDcCapture;
          } catch {
            /* configurable: true above ensures delete succeeds for our own writes */
          }
        }
      }

      // --- Reactive swap tracking ---
      let _lastIdentityKey = dcIdentityKey(componentValue);
      let _dcDestroyed = false;
      const _dcCapturedOwner = getAmbientOwner();

      // Collect initial rendered nodes for later removal during swaps.
      let currentNodes: Node[] = renderedNodesOf(initialResult);
      // Track the placeholder comment that holds our position when all nodes
      // are removed (so we can find parent/insertBefore on subsequent swaps).
      let anchor: Comment | null = null;

      // Perform DOM swap when the component identity changes.
      const performSwap = () => {
        if (_dcDestroyed) return;

        let newVal: any;
        try {
          newVal = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
        } catch {
          return;
        }

        const newKey = dcIdentityKey(newVal);
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

        // Render the new component (the capture callback is re-stashed for
        // the swap render, see the initial render above).
        if (newVal && (newVal.__isCurriedComponent || typeof newVal === 'string')) {
          const newResult = renderSwappedValue(
            newVal,
            componentGetter,
            gxtArgs,
            ctx,
            _dcCapturedOwner,
            captureInstance
          );
          currentNodes = renderedNodesOf(newResult);
          if (newResult instanceof Node) {
            parent.insertBefore(newResult, insertBefore);
          } else {
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

      // Change listener dispatched by `_gxtSyncAllWrappers`.
      const _dcChangeListener = (): boolean => {
        if (_dcDestroyed) return false;
        performSwap();
        return true;
      };

      // Add the listener to the registry shared with the null/curried paths. The
      // `stringPath: true` option also bumps a counter that `_gxtSyncDomNow` reads
      // via `hasStringDynamicComponentListeners`; the returned off-fn removes the
      // listener and decrements the counter together.
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
      if (ctx) {
        try {
          gxtModule.registerDestructor(ctx, _cleanupDcListener);
        } catch {
          /* ignore */
        }
      }

      // Return the initial result, as the curried path does. performSwap uses
      // currentNodes to find the insertion point.
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
        getGxtRenderer()?.registries.internalModifierManagers &&
        (() => {
          let p: any = componentValue;
          const v = new Set();
          while (p && !v.has(p)) {
            v.add(p);
            if (getGxtRenderer()?.registries.internalModifierManagers.has(p)) return true;
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
        const captureFn = getGxtRenderer()?.compilePipeline.captureRenderError;
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
      !getGxtRenderer()?.registries.internalModifierManagers?.has(rawFirst)
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
        const capture = getGxtRenderer()?.compilePipeline.captureRenderError;
        const err = new Error(`Assertion Failed: ${msg}`);
        if (typeof capture === 'function') {
          capture(err);
        }
        throw err;
      }
    }

    // String — resolve modifier by name from the owner registry
    if (typeof resolved === 'string') {
      const owner = getAmbientOwner();

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
        const modOwner = getAmbientOwner() || owner;
        if (!modOwner) return undefined;
        const factory = modOwner.factoryFor?.(`modifier:${resolved}`);
        if (!factory) return undefined;
        const ModifierClass = factory.class;

        let managerFactory: any = null;
        let pointer = ModifierClass;
        const visited = new Set();
        while (pointer && !visited.has(pointer)) {
          visited.add(pointer);
          const mgr = getGxtRenderer()?.registries.internalModifierManagers?.get(pointer);
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

        return () => {
          if (manager.destroyModifier) manager.destroyModifier(instance);
        };
      }

      // Mark as curried modifier so $_maybeModifier and canHandle recognize it
      (curriedModifier as any).__isCurriedModifier = true;

      // Register with INTERNAL_MODIFIER_MANAGERS so canHandle() finds it
      if (getGxtRenderer()?.registries.internalModifierManagers) {
        // Use a simple pass-through manager for curried modifiers
        getGxtRenderer()?.registries.internalModifierManagers.set(curriedModifier, {
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
      let hasModifierManager = false;
      if (getGxtRenderer()?.registries.internalModifierManagers) {
        let ptr = resolved;
        const visited = new Set();
        while (ptr && !visited.has(ptr)) {
          visited.add(ptr);
          if (getGxtRenderer()?.registries.internalModifierManagers.has(ptr)) {
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
        if (getGxtRenderer()?.registries.internalModifierManagers) {
          getGxtRenderer()?.registries.internalModifierManagers.set(curriedManagedModifier, {
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

// Dedup latch so repeated retries of `_patchGxtEntriesOf` collapse into a
// single pending microtask.
let _entriesOfPatchScheduled = false;
function _patchGxtEntriesOf(): void {
  const BUILTIN = getGxtRenderer()?.compilePipeline.getBuiltinHelpers?.();
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
        const sub = getGxtRenderer()?.compilePipeline.subscribeCell;
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
    // Subscribe the each-in source formula to the object's key-set revision
    // so `set(obj,'NewKey')` re-iterates. Applies to arrays too —
    // `{{#each-in arr}}` enumerates a custom non-index prop added via
    // `set(arr,'zomg',...)`, which is a key-set addition (the `[]` index path
    // stays orthogonal: a bump there just re-iterates, producing the same
    // output). Regular `{{#each}}` over arrays does not route through
    // gxtEntriesOf, so it is unaffected. gxt owns the key-set revision cell:
    // this records the observed keys and subscribes the active source formula.
    gxtModule.entangleObjectKeys(resolved, keys);
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
// Several bundled chunks may each define their own `HTMLBrowserDOMApi`
// class, so patching the one imported here wouldn't intercept the runtime
// that actually rendered the element. Instead we patch the intrinsic
// `HTMLInputElement.prototype.value` (etc.) setter — a single chokepoint
// shared by every chunk. The override only rewrites undefined and null
// values; everything else passes through untouched.
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

// Selective UpdatingVM.alwaysRevalidate for tracked state on dynamic components.
//
// In jit-mode tests, Glimmer VM's `UpdatingVM.execute` runs with
// `alwaysRevalidate=false` by default. When a tracked setter fires outside the
// normal VM update cycle (e.g. `instance.captured.x = 'LOCAL';
// this.rerender()`), the combined track-tag validation via our
// `validateTag`/`currentTagRevision` can report "valid" for some nested
// childRef paths, so `valueForRef` returns a cached stale value even though the
// outer JumpIfNotModifiedOpcode signals invalidation. Forcing
// `alwaysRevalidate=true` makes valueForRef recompute every childRef.
//
// To keep this narrow, `alwaysRevalidate` is flipped only for a VM.execute
// call that follows a tracked set. The flag lives in compile.ts
// (`_gxtFlags.trackedSetSinceRerender`, via the
// `compilePipeline.markTrackedSetSinceRerender()` /
// `consumeTrackedSetSinceRerender()` bridge pair); it is set by a hook on the
// trigger-re-render path (reached from metal's `@tracked` setter through
// `notifyPropertyChange`) and consumed on the next `UpdatingVM.execute`. The
// `{{#each}}` list iterator and other stable-rerender paths are unaffected on
// rerenders where no tracked set occurred, preserving DOM node identity.
Promise.resolve().then(async () => {
  try {
    const rt: any = await import('@glimmer/runtime');
    const UVM = rt.UpdatingVM;
    if (UVM && !UVM.prototype.__gxtEmberPatchedAlwaysRevalidate) {
      const origExecute = UVM.prototype.execute;
      UVM.prototype.execute = function (this: any, ...args: any[]) {
        // Only force revalidate if a tracked setter has fired since the last
        // execute. This limits the perf cost and preserves DOM node identity
        // for untouched subtrees. Before the bridge is installed, `?? false`
        // means "never force revalidate".
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

// The tracked-set detector: a BEFORE-chain host hook on
// `compilePipeline.addBeforeTriggerReRender` that marks the flag consumed by
// the UpdatingVM `alwaysRevalidate` flip above. If the bridge method is not
// installed yet (compile.ts hasn't finished module init), registration is
// retried in a microtask.
(function _gxtInstallTrackedSetDetectorHostHook() {
  // Classic builds: the bridge reader is hard-gated to null, so the retry
  // below would re-queue itself forever and starve the event loop. Bail out.
  if (!__GXT_MODE__) {
    return;
  }
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
