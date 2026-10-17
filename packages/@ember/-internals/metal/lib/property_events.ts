import type { Meta } from '@ember/-internals/meta/lib/meta';
import { peekMeta } from '@ember/-internals/meta/lib/meta';
import { assert, warn } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import {
  getGxtRenderer,
  installCompilePipelinePart,
} from '@ember/-internals/gxt-backend/gxt-bridge';
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

// GXT: per-(obj, keyName) markers for properties whose `notifyPropertyChange`
// is in flight. `notifyPropertyChange` adds a marker and removes it in its
// `finally`; `CP.get` in computed.ts reads it via `_gxtCPIsInvalidating`.
const _gxtCPInvalidationSet: WeakMap<object, Set<string>> = new WeakMap();
function _gxtCPMarkInvalidating(obj: object, keyName: string): boolean {
  // Returns whether the marker was already present, so the caller only clears
  // markers it added.
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
  if (__GXT_MODE__) {
    _gxtNotifyPropertyChange(obj, keyName, _meta, value, arguments.length === 4);
    return;
  }

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (meta !== null && (meta.isInitializing() || meta.isPrototypeMeta(obj))) {
    return;
  }

  markObjectAsDirty(obj, keyName);

  if (deferred <= 0) {
    flushSyncObservers();
  }

  if (PROPERTY_DID_CHANGE in obj) {
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
}

// GXT: `notifyPropertyChange` with the GXT re-render trigger and the CP
// invalidation marker. `hasValueArg` is whether the public call passed `value`
// (its `arguments.length === 4`).
function _gxtNotifyPropertyChange(
  obj: object,
  keyName: string,
  _meta: Meta | null | undefined,
  value: unknown,
  hasValueArg: boolean
): void {
  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  // GXT integration: mark (obj, keyName) as invalidating for the whole
  // notification, covering both the GXT re-render trigger and the
  // `markObjectAsDirty` -> `dirtyTagFor` cascade below. GXT cells for
  // CP-backed properties re-run their formulas synchronously on either path,
  // which would invoke the user's getter (classic Ember never does that); the
  // marker makes `CP.get` return the cached value for this key instead while
  // unrelated CPs read normally.
  const wasPresent = _gxtCPMarkInvalidating(obj, keyName);

  try {
    // GXT integration: Trigger synchronous re-render to keep GXT components updated.
    // Skip during initialization — reading properties at this stage can trigger
    // computed-property getters whose cache revision hasn't been set yet (e.g. PromiseProxy).
    // Still fire for prototype meta objects so GXT stays in sync.
    if (meta === null || !meta.isInitializing()) {
      const _cp = getGxtRenderer()?.compilePipeline;
      const _triggerReRender = _cp?.triggerReRender;
      if (typeof _triggerReRender === 'function') {
        // Mark the trigger scope (`withInTriggerReRender`) so CP.get can
        // preserve classic "don't eagerly evaluate never-consumed CPs during a
        // change notification" semantics. (core.ts's lazy wrapper is only
        // installed for proxied CoreObjects, which misses plain
        // `class Foo { @computed ... }` cases.) If the helper is unavailable,
        // the trigger still marks the scope for its own body.
        //
        // Forward `value` when the caller passed it (see `PROPERTY_DID_CHANGE`
        // below) so the trigger can update the cell without re-reading
        // `obj[keyName]`.
        const _hasValueArg = hasValueArg;
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
      if (!meta.isInitializing()) {
        // Fall through — allow markObjectAsDirty for GXT prototype-meta objects,
        // but remember this is a prototype notification so `PROPERTY_DID_CHANGE`
        // below is skipped (matching classic behavior).
        isProtoNotify = true;
      } else {
        return;
      }
    }

    // GXT test-harness loop guard (runs on the notifyPropertyChange update hot
    // path; gate on DEBUG so it tree-shakes out of the production dist).
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

      // Component's `PROPERTY_DID_CHANGE` checks its arguments length, so do
      // not pass `value` if it was not passed to `notifyPropertyChange`.
      if (hasValueArg) {
        obj[PROPERTY_DID_CHANGE](keyName, value);
      } else {
        obj[PROPERTY_DID_CHANGE](keyName);
      }
    }
  } finally {
    // Clear the CP invalidation marker only if it was added here.
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

// GXT integration: recompute the computed properties whose dependent keys
// include `changedKey` and return `{ key, value }` pairs. The GXT re-render
// trigger calls this (as `compilePipeline.recomputeDependents`) after updating
// the primary cell, so derived computed properties are refreshed too. It
// lives here because it must respect the `deferred` batch counter.
function _gxtRecomputeDependents(
  obj: object,
  changedKey: string
): Array<{ key: string; value: unknown }> {
  const results: Array<{ key: string; value: unknown }> = [];
  // Inside a `beginPropertyChanges`/`endPropertyChanges` batch, classic
  // Ember never evaluates dependent computed properties — it defers all
  // re-evaluation until the batch closes and observers flush. Mirror that
  // here: returning an empty results array tells the re-render trigger not
  // to eagerly update the dependent CPs' cells. GXT's own cell invalidation
  // still happens via `dirtyTagFor`,
  // so the next genuine read (observer callback, `get()`, render) will
  // lazily recompute through the CP descriptor with a fresh value.
  if (deferred > 0) return results;
  const meta = peekMeta(obj);
  if (!meta) return results;
  // Aliases (`@alias`/`@readOnly`/`@oneWay`) declare their dependency via
  // `altKey` (chain-tags), NOT `_dependentKeys`, so the classic
  // `_dependentKeys` match below never fires for them — when the alias target
  // changes, the alias cell is never re-dirtied. The alias is therefore
  // recomputed here. Aliases have no user-getter side effects (they just read
  // the target), so eager re-evaluation is safe and the
  // `revisionFor === undefined` guard is bypassed for them.
  meta.forEachDescriptors((propKey: string, descriptor: any) => {
    if (!descriptor) return;
    let isAlias = false;
    let matches = false;
    const _altKey: string | undefined =
      typeof descriptor.altKey === 'string' ? descriptor.altKey : undefined;
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
    } catch (error) {
      // An eager recompute Glimmer does not do (it reads a computed property
      // when something consumes it): the change dirties the property's tag,
      // so its next read recomputes it and throws to its reader. Reported in
      // DEBUG; the property's cell keeps its value.
      if (DEBUG) {
        warn(`recomputing \`${propKey}\` threw: ${String(error)}`, false, {
          id: 'ember-gxt.dropped-read',
        });
      }
    }
  });
  return results;
}
if (__GXT_MODE__) {
  installCompilePipelinePart({ recomputeDependents: _gxtRecomputeDependents });
}

// Expose `notifyPropertyChange` to gxt-backend through the bridge; importing
// it from metal directly would create an import cycle.
if (__GXT_MODE__) {
  installCompilePipelinePart({ notifyPropertyChange });
}

export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
