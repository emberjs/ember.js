import type { Meta } from '@ember/-internals/meta/lib/meta';
import { peekMeta } from '@ember/-internals/meta/lib/meta';
import { assert } from '@ember/debug';
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
      // gxt-backend's property-events.ts runs the trigger.
      getGxtRenderer()?.compilePipeline.triggerPropertyChange?.(obj, keyName, value, hasValueArg);
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

// Whether a `beginPropertyChanges` batch is open: gxt-backend's
// `recomputeDependents` (property-events.ts) recomputes nothing inside one.
if (__GXT_MODE__) {
  installCompilePipelinePart({ propertyChangesDeferred: () => deferred > 0 });
}

// Expose `notifyPropertyChange` to gxt-backend through the bridge; importing
// it from metal directly would create an import cycle.
if (__GXT_MODE__) {
  installCompilePipelinePart({ notifyPropertyChange });
}

export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
