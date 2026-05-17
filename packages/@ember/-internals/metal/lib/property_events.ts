import type { Meta } from '@ember/-internals/meta';
import { peekMeta } from '@ember/-internals/meta';
import { assert } from '@ember/debug';
// Slice-18 (Cluster B): `notifyPropertyChange` routes its
// `__gxtInTriggerReRender` save-restore writer through the typed
// `compilePipeline.withInTriggerReRender(fn)` bridge helper.
//
// Slice-23 (Cluster B): the inline globalThis save-restore fallback is
// DROPPED — the bridge is the sole writer surface. If the bridge has not
// been installed yet (only reachable before compile.ts's module-init
// `installCompilePipelinePart` call has fired, which is unreachable from
// any known `notifyPropertyChange` entry point), the wrap is skipped and
// `gxtTrigger` is called directly. The canonical body itself wraps via
// `_gxtWithInTriggerReRender` so the CP.get re-entrance guard still
// observes the flag for the body's duration regardless. See
// `withInTriggerReRender` doc in gxt-bridge.ts.
import { getGxtRenderer, installCompilePipelinePart } from '@ember/-internals/gxt-backend/gxt-bridge';
import {
  flushSyncObservers,
  resumeObserverDeactivation,
  suspendedObserverDeactivation,
} from './observer';
import { markObjectAsDirty } from './tags';

/**
 @module ember
 @private
 */

export const PROPERTY_DID_CHANGE = Symbol('PROPERTY_DID_CHANGE');

export interface PropertyDidChange {
  [PROPERTY_DID_CHANGE]: (keyName: string, value?: unknown) => void;
}

export function hasPropertyDidChange(obj: unknown): obj is PropertyDidChange {
  return (
    obj != null &&
    typeof obj === 'object' &&
    typeof (obj as PropertyDidChange)[PROPERTY_DID_CHANGE] === 'function'
  );
}

let deferred = 0;

// Slice-122 (Cluster B): `__gxtCPInvalidationSet` globalThis WeakMap graduated
// to a module-local `WeakMap<object, Set<string>>` plus a typed
// `_gxtCPIsInvalidating(obj, keyName)` predicate exposed to its sole sibling
// reader in `metal/lib/computed.ts`. Pre-slice-122 audit confirmed all five
// sites (init + set + clear in `property_events.ts`, one read in
// `property_events.ts`, one read in `computed.ts`) lived inside the same
// `@ember/-internals/metal` package with no cross-package readers (zero refs
// across `node_modules/.pnpm/` GXT runtime versions, zero refs across the rest
// of `packages/`). Pattern mirrors the sibling `_cpSetInFlight` /
// `_inCPSetFor` module-local declared at the head of `computed.ts` (same
// `WeakMap<object, Set<string>>` shape, same per-(obj, keyName) granularity,
// same boolean predicate read shape). State ownership: `property_events.ts`
// owns the WeakMap because `notifyPropertyChange` is the canonical writer of
// the invalidation lifecycle (the marker is added in the `try` head and
// removed in the `finally`, scoped to one notify call). `computed.ts`'s read
// only checks membership during CP.get re-entrance and never mutates. Net -1
// globalThis slot, 0 bridge methods (zero-bridge graduation — intra-package
// import, no `compilePipeline` involvement). 122 cluster-B slices landed
// cumulatively.
const _gxtCPInvalidationSet: WeakMap<object, Set<string>> = new WeakMap();
function _gxtCPMarkInvalidating(obj: object, keyName: string): boolean {
  // Returns whether the (obj, keyName) marker was already present (so the
  // caller knows whether to remove it on the way out — preserves the
  // pre-slice-122 `wasPresent` clear-only-if-added semantics).
  let perObj = _gxtCPInvalidationSet.get(obj);
  if (!perObj) {
    perObj = new Set();
    _gxtCPInvalidationSet.set(obj, perObj);
  }
  const wasPresent = perObj.has(keyName);
  if (!wasPresent) perObj.add(keyName);
  return wasPresent;
}
function _gxtCPClearInvalidating(obj: object, keyName: string): void {
  const perObj = _gxtCPInvalidationSet.get(obj);
  if (perObj) perObj.delete(keyName);
}
/**
 * Returns whether (obj, keyName) is currently mid-flight inside a
 * `notifyPropertyChange` invalidation cascade. Used by `CP.get` in
 * `computed.ts` to short-circuit a re-entrant read (originating from
 * `dirtyTagFor` → GXT formula re-evaluation) and return the last cached value
 * without re-invoking the user getter — preserving classic Ember's invariant
 * that "dirtying a tag does not itself evaluate the CP".
 */
export function _gxtCPIsInvalidating(obj: object, keyName: string): boolean {
  const perObj = _gxtCPInvalidationSet.get(obj);
  return perObj !== undefined && perObj.has(keyName);
}

/**
  This function is called just after an object property has changed.
  It will notify any observers and clear caches among other things.

  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method
  manually.

  @method notifyPropertyChange
  @for @ember/object
  @param {Object} obj The object with the property that will change
  @param {String} keyName The property key (or path) that will change.
  @param {Meta} [_meta] The objects meta.
  @param {unknown} [value] The new value to set for the property
  @return {void}
  @since 3.1.0
  @public
*/
// Re-entrancy depth counter for notifyPropertyChange
let _notifyDepth = 0;
const MAX_NOTIFY_DEPTH = 100;

function notifyPropertyChange(
  obj: object,
  keyName: string,
  _meta?: Meta | null,
  value?: unknown
): void {
  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  // GXT integration: Mark (obj, keyName) as "actively invalidating" for the
  // entire notify lifecycle — both the `__gxtTriggerReRender` side-effect
  // reads AND the subsequent `markObjectAsDirty → dirtyTagFor` cascade.
  // GXT cells installed by `cellFor` for CP-backed properties re-fire
  // their formulas synchronously during either path, which would invoke
  // the user's getter and mimic classic behavior forbids. The narrow
  // per-(obj, keyName) marker tells `CP.get` to short-circuit to the
  // cached value for this exact key while the cascade is in flight, and
  // lets unrelated CPs read normally. Classic mode neither installs
  // formulas nor reads this marker, so skip the per-call WeakMap/Set
  // bookkeeping there — `clearItems4` issues thousands of notifies.
  let wasPresent = true;
  if (__GXT_MODE__) {
    // Slice-122 (Cluster B): graduated from `(globalThis as any).__gxtCPInvalidationSet`
    // lazy-init WeakMap writer to the module-local `_gxtCPMarkInvalidating(obj, keyName)`
    // helper at the head of this file. The helper returns whether the marker was
    // already present, preserving the pre-slice-122 `wasPresent` semantics
    // (clear-only-if-added in the `finally` block below). See the
    // `_gxtCPInvalidationSet` doc block above for the intra-package
    // zero-bridge migration rationale.
    wasPresent = _gxtCPMarkInvalidating(obj, keyName);
  }

  try {
    // GXT integration: Trigger synchronous re-render to keep GXT components updated.
    // Skip during initialization — reading properties at this stage can trigger
    // computed-property getters whose cache revision hasn't been set yet (e.g. PromiseProxy).
    // Still fire for prototype meta objects so GXT stays in sync.
    if (meta === null || !meta.isInitializing()) {
      // Slice-26 (Cluster B): migrated `(globalThis as any).__gxtTriggerReRender`
      // raw-globalThis read to `compilePipeline.triggerReRender(obj, keyName)`
      // bridge method (third cross-package reader migrated; mirrors slice 25's
      // metal/tracked.ts and glimmer-tracking.ts shape). The bridge method is
      // optional (load-order independence — classic builds never publish it);
      // when not installed (`_cp?.triggerReRender === undefined`) the call is
      // skipped, matching the pre-slice-26 `typeof === 'function'` guard.
      // Suppression semantics (the `withTriggerSuppressed(fn)` frame) are
      // preserved by the module-local `_gxtTriggerSuppressedFlag` short-circuit
      // at the entry of `_gxtTriggerReRender` in compile.ts. See `triggerReRender`
      // doc in `@ember/-internals/gxt-backend/gxt-bridge`.
      const _cp = getGxtRenderer()?.compilePipeline;
      const _triggerReRender = _cp?.triggerReRender;
      if (typeof _triggerReRender === 'function') {
        // Mark the trigger scope so CP.get can preserve classic "don't eagerly
        // evaluate never-consumed CPs during a change notification" semantics.
        // (core.ts's lazy wrapper is only installed for proxied CoreObjects,
        // which misses plain `class Foo { @computed ... }` cases.)
        //
        // Slice-18 (Cluster B): the `__gxtInTriggerReRender` save-restore
        // toggle that wraps the trigger call is routed through the typed
        // `compilePipeline.withInTriggerReRender(fn)` bridge helper.
        //
        // Slice-23 (Cluster B): the inline globalThis save-restore fallback
        // is DROPPED — the bridge is the sole writer surface. If the bridge
        // is unavailable (module-init window only — unreachable from any
        // known `notifyPropertyChange` entry point), call the trigger
        // directly; the canonical body's internal `_gxtWithInTriggerReRender`
        // wrap still sets the flag for the body's duration, which is what
        // the CP.get re-entrance guard cares about. See `withInTriggerReRender`
        // doc in gxt-bridge.ts.
        // Cluster A Phase 1.7a: forward the optional `value` parameter through
        // the trigger when the caller passed it (uses the existing
        // `arguments.length === 4` discriminator pattern — see L246 below for
        // the same pattern around `PROPERTY_DID_CHANGE`). This unlocks the
        // Phase 1.7b enqueue-site `cellFor(...).update(value)` which removes
        // the body's dependency on the synchronous `obj[keyName]` getter
        // read for the ~85% of write traffic that already passes value
        // (set() at property_set.ts:118 + @tracked setter at tracked.ts:309).
        // Capture `arguments.length` to a const so the arrow closure observes
        // the outer notifyPropertyChange's call-shape (arrows don't have their
        // own `arguments`, but capturing avoids any TS/transform ambiguity).
        const _hasValueArg = arguments.length === 4;
        const _withIn = _cp?.withInTriggerReRender;
        if (_withIn) {
          _withIn(() => {
            if (_hasValueArg) {
              _triggerReRender(obj, keyName, value);
            } else {
              _triggerReRender(obj, keyName);
            }
          });
        } else {
          if (_hasValueArg) {
            _triggerReRender(obj, keyName, value);
          } else {
            _triggerReRender(obj, keyName);
          }
        }
      }
    }

    // Track whether we are currently notifying on a prototype-meta object.
    // When true, classic Ember skips the entire notification — including
    // `PROPERTY_DID_CHANGE`. In GXT mode we sometimes still need
    // `markObjectAsDirty` to fire so async QP observers on controller
    // instances (where `meta.proto === meta.source === obj` is a false
    // positive) detect changes. However, true class prototypes should
    // NEVER have their `PROPERTY_DID_CHANGE` hook invoked.
    let isProtoNotify = false;
    if (meta !== null && (meta.isInitializing() || meta.isPrototypeMeta(obj))) {
      if (!meta.isInitializing() && __GXT_MODE__) {
        // Fall through — allow markObjectAsDirty for GXT prototype-meta objects,
        // but remember we are in a prototype notification so we skip
        // `PROPERTY_DID_CHANGE` below (matching classic behavior).
        isProtoNotify = true;
      } else {
        return;
      }
    }

    // Guard against infinite re-entrant notifyPropertyChange calls
    // This can happen when GXT rendering triggers property changes that
    // trigger more rendering in a cycle
    if (_notifyDepth >= MAX_NOTIFY_DEPTH) {
      return;
    }
    _notifyDepth++;

    // GXT infinite loop detection
    if (typeof (globalThis as any).__gxtOpCheck === 'function') {
      (globalThis as any).__gxtOpCheck();
    }
    try {
      markObjectAsDirty(obj, keyName);

      if (deferred <= 0) {
        flushSyncObservers();
      }

      // Skip `PROPERTY_DID_CHANGE` when notifying on a prototype-meta object:
      // classic Ember returns early before reaching this hook (see the guard
      // above), and the `notifyPropertyChange` contract tests assert that
      // prototypes never fire the hook.
      if (!isProtoNotify && PROPERTY_DID_CHANGE in obj) {
        // It's redundant to do this here, but we don't want to check above so we can avoid an extra function call in prod.
        assert('property did change hook is invalid', hasPropertyDidChange(obj));

        // we need to check the arguments length here; there's a check in Component's `PROPERTY_DID_CHANGE`
        // that checks its arguments length, so we have to explicitly not call this with `value`
        // if it is not passed to `notifyPropertyChange`
        if (arguments.length === 4) {
          obj[PROPERTY_DID_CHANGE](keyName, value);
        } else {
          obj[PROPERTY_DID_CHANGE](keyName);
        }
      }
    } finally {
      _notifyDepth--;
    }
  } finally {
    // Clear the narrow CP invalidation marker only if we added it here.
    // Slice-122 (Cluster B): graduated from `(globalThis as any).__gxtCPInvalidationSet`
    // raw-globalThis read+delete to the module-local
    // `_gxtCPClearInvalidating(obj, keyName)` helper. See the
    // `_gxtCPInvalidationSet` doc block above for the intra-package
    // zero-bridge migration rationale.
    if (!wasPresent) {
      _gxtCPClearInvalidating(obj, keyName);
    }
  }
}

/**
  @method beginPropertyChanges
  @chainable
  @private
*/
function beginPropertyChanges(): void {
  deferred++;
  suspendedObserverDeactivation();
}

/**
  @method endPropertyChanges
  @private
*/
function endPropertyChanges(): void {
  deferred--;
  if (deferred <= 0) {
    flushSyncObservers();
    resumeObserverDeactivation();
  }
}

/**
  Make a series of property changes together in an
  exception-safe way.

  ```javascript
  Ember.changeProperties(function() {
    obj1.set('foo', mayBlowUpWhenSet);
    obj2.set('bar', baz);
  });
  ```

  @method changeProperties
  @param {Function} callback
  @private
*/
function changeProperties(callback: () => void): void {
  beginPropertyChanges();
  try {
    callback();
  } finally {
    endPropertyChanges();
  }
}

// GXT integration: expose a function that recomputes computed properties
// whose dependentKeys include the changed key. Returns an array of
// { key, value } pairs for each recomputed property.
// This is called from compile.ts __gxtTriggerReRender after the primary
// cell is updated, so that derived computed properties are also refreshed.
//
// Slice-106 (Cluster B): graduated from the pre-slice-106 globalThis writer
// `(globalThis as any).__gxtRecomputeDependents = function (obj, changedKey)
// { ... };` to a plain module-local `function _gxtRecomputeDependents(obj,
// changedKey)` declaration exposed through the
// `compilePipeline.recomputeDependents` typed-bridge method. Pattern mirrors
// slice-96's `forceEmberRerender` (same shape: cross-package
// function-pointer pair, writer in metal/glimmer canonical-state owner,
// reader in gxt-backend, install via `installCompilePipelinePart` from the
// writer's file — slice-9 / slice-95 / slice-96 reverse-flow install
// precedent). The single cross-package reader at `compile.ts:4459` (the
// post-`cellFor(obj, keyName).update(newValue)` derived-CP propagation
// loop inside `__gxtTriggerReRender`) routes through
// `getGxtRenderer()?.compilePipeline.recomputeDependents?.(obj, keyName)`,
// the optional-chain providing the same null-tolerant guard as the
// pre-slice-106 `typeof === 'function'` check. State home: this file owns
// the `deferred` batch counter from `beginPropertyChanges` /
// `endPropertyChanges` (which the function MUST early-return inside), the
// `peekMeta` import, and the classic CP descriptor knowledge — so the
// function stays here and is registered via `installCompilePipelinePart`.
// See `recomputeDependents` doc in gxt-bridge.ts. Net -1 globalThis slot,
// +1 new bridge method on `compilePipeline`.
function _gxtRecomputeDependents(
  obj: object,
  changedKey: string
): Array<{ key: string; value: unknown }> {
  const results: Array<{ key: string; value: unknown }> = [];
  // Inside a `beginPropertyChanges`/`endPropertyChanges` batch, classic
  // Ember never evaluates dependent computed properties — it defers all
  // re-evaluation until the batch closes and observers flush. Mirror that
  // here: returning an empty results array tells compile.ts's
  // __gxtTriggerReRender loop not to eagerly update the dependent CPs'
  // cells. GXT's own cell invalidation still happens via `dirtyTagFor`,
  // so the next genuine read (observer callback, `get()`, render) will
  // lazily recompute through the CP descriptor with a fresh value.
  if (deferred > 0) return results;
  try {
    const meta = peekMeta(obj);
    if (!meta) return results;
    meta.forEachDescriptors((propKey: string, descriptor: any) => {
      if (!descriptor || !descriptor._dependentKeys) return;
      const deps: string[] = descriptor._dependentKeys;
      // Check if changedKey matches any dependent key (including path prefixes)
      let matches = false;
      for (const dep of deps) {
        if (dep === changedKey || dep.startsWith(changedKey + '.')) {
          matches = true;
          break;
        }
      }
      if (!matches) return;
      // Classic Ember semantics: a CP that has never been consumed
      // (no cached revision) should NOT be eagerly evaluated here.
      // Eager evaluation would (a) invoke user getters with side
      // effects prematurely and (b) propagate change events to async
      // observers that were registered on CPs the caller never read.
      // Wait for the next lazy read to recompute through the descriptor.
      if (meta.revisionFor(propKey) === undefined) return;
      // Recompute using the descriptor's cache-aware `get(obj, keyName)`
      // method when available. Calling `_getter` directly bypasses the CP
      // cache path, which for user-defined getters with side effects (e.g.
      // `this.incCallCount++`) means the computed runs an extra time —
      // once here during notifyPropertyChange, and once more when the
      // caller later reads the property through the descriptor. Routing
      // through `descriptor.get` updates meta.valueFor/revisionFor so the
      // subsequent read is a cache hit with the freshly-computed value.
      try {
        let newValue: unknown;
        if (typeof descriptor.get === 'function' && descriptor.get.length >= 2) {
          newValue = descriptor.get(obj, propKey);
        } else if (typeof descriptor._getter === 'function') {
          newValue = descriptor._getter.call(obj, propKey);
        } else if (typeof descriptor.get === 'function') {
          newValue = descriptor.get(obj, propKey);
        }
        results.push({ key: propKey, value: newValue });
      } catch {
        /* skip if getter throws */
      }
    });
  } catch {
    /* skip if meta access fails */
  }
  return results;
}
installCompilePipelinePart({ recomputeDependents: _gxtRecomputeDependents });

// Slice-123 (Cluster B): graduated from the pre-slice-123 globalThis writer
// `(globalThis as any).__emberNotifyPropertyChange = notifyPropertyChange;`
// to a typed `compilePipeline.notifyPropertyChange(obj, keyName, _meta, value)`
// bridge method. Pre-slice-123 topology was 1 writer here + 2 readers
// (intra-metal `tracked.ts:287` raw-globalThis guard; cross-package
// `gxt-backend/manager.ts:4461` raw-globalThis guard). Pattern mirrors
// slice-106 `__gxtRecomputeDependents` — a cross-package function-pointer
// pair where canonical state lives in the writer's own file. The
// intra-metal reader graduates to a direct sibling import of the locally-
// declared `notifyPropertyChange` (drops the globalThis hop entirely —
// matches the slice-122 intra-package zero-bridge precedent: `tracked.ts`
// already imports peers like `dirtyTagFor`, `SELF_TAG` from `./tags` and
// `CHAIN_PASS_THROUGH` from `./chain-tags`). Only the cross-package
// `gxt-backend/manager.ts` reader routes through the bridge — that file
// cannot directly import from `@ember/-internals/metal/lib/property_events`
// (the dependency direction is metal→gxt-backend via `gxt-bridge`, and a
// reverse direct edge would loop). See `notifyPropertyChange` doc in
// gxt-bridge.ts. Net -1 globalThis slot, +1 new bridge method on
// `compilePipeline`.
installCompilePipelinePart({ notifyPropertyChange });

export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
