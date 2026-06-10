import type { Meta } from '@ember/-internals/meta/lib/meta';
import { peekMeta } from '@ember/-internals/meta/lib/meta';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
// `notifyPropertyChange` routes its `__gxtInTriggerReRender` save-restore
// writer through the typed `compilePipeline.withInTriggerReRender(fn)` bridge
// helper, which is the sole writer surface. If the bridge has not been
// installed yet (only reachable before compile.ts's module-init
// `installCompilePipelinePart` call has fired, which is unreachable from any
// known `notifyPropertyChange` entry point), the wrap is skipped and
// `gxtTrigger` is called directly. The canonical body itself wraps via
// `_gxtWithInTriggerReRender` so the CP.get re-entrance guard still observes
// the flag for the body's duration regardless. See `withInTriggerReRender` doc
// in gxt-bridge.ts.
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

// CP invalidation tracking: a module-local `WeakMap<object, Set<string>>` plus
// a typed `_gxtCPIsInvalidating(obj, keyName)` predicate exposed to its sole
// sibling reader in `metal/lib/computed.ts`. All sites live inside the
// `@ember/-internals/metal` package, so no bridge / globalThis slot is needed.
// The shape mirrors the sibling `_cpSetInFlight` / `_inCPSetFor` module-local
// at the head of `computed.ts` (same `WeakMap<object, Set<string>>`,
// per-(obj, keyName) granularity, boolean predicate read).
//
// Ownership: `property_events.ts` owns the WeakMap because
// `notifyPropertyChange` is the canonical writer of the invalidation lifecycle
// — the marker is added in the `try` head and removed in the `finally`, scoped
// to one notify call. `computed.ts`'s read only checks membership during CP.get
// re-entrance and never mutates.
const _gxtCPInvalidationSet: WeakMap<object, Set<string>> = new WeakMap();
function _gxtCPMarkInvalidating(obj: object, keyName: string): boolean {
  // Returns whether the (obj, keyName) marker was already present (so the
  // caller knows whether to remove it on the way out — clear-only-if-added
  // semantics).
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
  // the user's getter — something classic behavior forbids. The narrow
  // per-(obj, keyName) marker tells `CP.get` to short-circuit to the
  // cached value for this exact key while the cascade is in flight, and
  // lets unrelated CPs read normally. Classic mode neither installs
  // formulas nor reads this marker, so skip the per-call WeakMap/Set
  // bookkeeping there — `clearItems4` issues thousands of notifies.
  let wasPresent = true;
  if (__GXT_MODE__) {
    // Mark via the module-local `_gxtCPMarkInvalidating(obj, keyName)` helper
    // at the head of this file. It returns whether the marker was already
    // present, which the `finally` block uses to clear only if it was added
    // here. See the `_gxtCPInvalidationSet` doc block above.
    wasPresent = _gxtCPMarkInvalidating(obj, keyName);
  }

  try {
    // GXT integration: Trigger synchronous re-render to keep GXT components updated.
    // Skip during initialization — reading properties at this stage can trigger
    // computed-property getters whose cache revision hasn't been set yet (e.g. PromiseProxy).
    // Still fire for prototype meta objects so GXT stays in sync.
    if (meta === null || !meta.isInitializing()) {
      // The re-render trigger is the `compilePipeline.triggerReRender(obj,
      // keyName)` bridge method. It is optional (load-order independence —
      // classic builds never publish it); when not installed
      // (`_cp?.triggerReRender === undefined`) the call is skipped.
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
        // The `__gxtInTriggerReRender` save-restore toggle that wraps the
        // trigger call is routed through the typed
        // `compilePipeline.withInTriggerReRender(fn)` bridge helper, which is
        // the sole writer surface. If the bridge is unavailable (module-init
        // window only — unreachable from any known `notifyPropertyChange` entry
        // point), call the trigger directly; the canonical body's internal
        // `_gxtWithInTriggerReRender` wrap still sets the flag for the body's
        // duration, which is what the CP.get re-entrance guard cares about. See
        // `withInTriggerReRender` doc in gxt-bridge.ts.
        //
        // Forward the optional `value` parameter through the trigger when the
        // caller passed it (using the existing `arguments.length === 4`
        // discriminator — the same pattern used around `PROPERTY_DID_CHANGE`
        // below). This lets the enqueue site call `cellFor(...).update(value)`,
        // which removes the body's dependency on the synchronous `obj[keyName]`
        // getter read for the write traffic that already passes a value (set()
        // and the @tracked setter). Capture `arguments.length` to a const so
        // the arrow closure observes the outer notifyPropertyChange's
        // call-shape (arrows don't have their own `arguments`, and capturing
        // avoids any TS/transform ambiguity).
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

    // Track whether the current notification is on a prototype-meta object.
    // When true, classic Ember skips the entire notification — including
    // `PROPERTY_DID_CHANGE`. In GXT mode `markObjectAsDirty` sometimes still
    // needs to fire so async QP observers on controller instances (where
    // `meta.proto === meta.source === obj` is a false positive) detect changes.
    // However, true class prototypes should NEVER have their
    // `PROPERTY_DID_CHANGE` hook invoked.
    let isProtoNotify = false;
    if (meta !== null && (meta.isInitializing() || meta.isPrototypeMeta(obj))) {
      if (!meta.isInitializing() && __GXT_MODE__) {
        // Fall through — allow markObjectAsDirty for GXT prototype-meta objects,
        // but remember this is a prototype notification so `PROPERTY_DID_CHANGE`
        // below is skipped (matching classic behavior).
        isProtoNotify = true;
      } else {
        return;
      }
    }

    // GXT infinite loop detection (test-harness loop-guard only — runs on the
    // notifyPropertyChange update hot path; gate on DEBUG so it tree-shakes out
    // of the production dist).
    if (DEBUG && typeof (globalThis as any).__gxtOpCheck === 'function') {
      (globalThis as any).__gxtOpCheck();
    }
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
    // Clear the narrow CP invalidation marker only if it was added here,
    // via the module-local `_gxtCPClearInvalidating(obj, keyName)` helper. See
    // the `_gxtCPInvalidationSet` doc block above.
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
// This is called from compile.ts's __gxtTriggerReRender after the primary
// cell is updated, so that derived computed properties are also refreshed.
//
// The function is a module-local declaration exposed through the
// `compilePipeline.recomputeDependents` typed-bridge method. The single
// cross-package reader (the post-`cellFor(obj, keyName).update(newValue)`
// derived-CP propagation loop inside `__gxtTriggerReRender`) routes through
// `getGxtRenderer()?.compilePipeline.recomputeDependents?.(obj, keyName)`; the
// optional chain provides a null-tolerant guard. The function stays in this
// file because it owns the `deferred` batch counter from `beginPropertyChanges`
// / `endPropertyChanges` (which it MUST early-return inside), the `peekMeta`
// import, and the classic CP descriptor knowledge; it is registered via
// `installCompilePipelinePart`. See `recomputeDependents` doc in gxt-bridge.ts.
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
    // Aliases (`@alias`/`@readOnly`/`@oneWay`) declare their dependency via
    // `altKey` (chain-tags), NOT `_dependentKeys`, so the classic
    // `_dependentKeys` match below never fires for them — when the alias target
    // changes, the alias cell is never re-dirtied. The alias is therefore
    // recomputed here. Aliases have no user-getter side effects (they just read
    // the target), so eager re-evaluation is safe and the
    // `revisionFor === undefined` guard is bypassed for them.
    const _fineGrained = true;
    meta.forEachDescriptors((propKey: string, descriptor: any) => {
      if (!descriptor) return;
      let isAlias = false;
      let matches = false;
      const _altKey: string | undefined =
        _fineGrained && typeof descriptor.altKey === 'string' ? descriptor.altKey : undefined;
      if (_altKey !== undefined) {
        // Alias: dependency is `altKey`. Match changedKey against it including
        // path-prefix relationships in either direction (set(obj,'a.b.c')
        // notifies 'a.b.c'; an alias on 'a.b.c' or any prefix should refire).
        if (
          _altKey === changedKey ||
          _altKey.startsWith(changedKey + '.') ||
          changedKey.startsWith(_altKey + '.')
        ) {
          matches = true;
          isAlias = true;
        }
      } else if (descriptor._dependentKeys) {
        const deps: string[] = descriptor._dependentKeys;
        // Check if changedKey matches any dependent key (including path prefixes)
        for (const dep of deps) {
          if (dep === changedKey || dep.startsWith(changedKey + '.')) {
            matches = true;
            break;
          }
        }
      }
      if (!matches) return;
      // Classic Ember semantics: a CP that has never been consumed
      // (no cached revision) should NOT be eagerly evaluated here.
      // Eager evaluation would (a) invoke user getters with side
      // effects prematurely and (b) propagate change events to async
      // observers that were registered on CPs the caller never read.
      // Wait for the next lazy read to recompute through the descriptor.
      // Aliases are exempt — they have no side-effecting user getter and
      // GXT reads them through cellFor (never through the descriptor's
      // revision tracking), so revisionFor is legitimately undefined.
      if (!isAlias && meta.revisionFor(propKey) === undefined) return;
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

// `notifyPropertyChange` is exposed as a typed
// `compilePipeline.notifyPropertyChange(obj, keyName, _meta, value)` bridge
// method. The intra-metal reader (`tracked.ts`) imports the locally-declared
// `notifyPropertyChange` directly. Only the cross-package
// `gxt-backend/manager.ts` reader routes through the bridge — that file cannot
// directly import from `@ember/-internals/metal/lib/property_events` because
// the dependency direction is metal→gxt-backend via `gxt-bridge`, and a reverse
// direct edge would loop. See `notifyPropertyChange` doc in gxt-bridge.ts.
installCompilePipelinePart({ notifyPropertyChange });

export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
