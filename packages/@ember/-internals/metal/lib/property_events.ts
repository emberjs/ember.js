import type { Meta } from '@ember/-internals/meta';
import { peekMeta } from '@ember/-internals/meta';
import { assert } from '@ember/debug';
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
const MAX_NOTIFY_DEPTH = 10;

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
  // lets unrelated CPs read normally.
  const g: any = globalThis as any;
  if (!g.__gxtCPInvalidationSet) g.__gxtCPInvalidationSet = new WeakMap();
  const perObj: Set<string> = g.__gxtCPInvalidationSet.get(obj) || new Set();
  if (!g.__gxtCPInvalidationSet.has(obj)) g.__gxtCPInvalidationSet.set(obj, perObj);
  const wasPresent = perObj.has(keyName);
  if (!wasPresent) perObj.add(keyName);

  try {

  // GXT integration: Trigger synchronous re-render to keep GXT components updated.
  // Skip during initialization — reading properties at this stage can trigger
  // computed-property getters whose cache revision hasn't been set yet (e.g. PromiseProxy).
  // Still fire for prototype meta objects so GXT stays in sync.
  if (meta === null || !meta.isInitializing()) {
    const gxtTrigger = (globalThis as any).__gxtTriggerReRender;
    if (typeof gxtTrigger === 'function') {
      gxtTrigger(obj, keyName);
    }
  }

  if (meta !== null && (meta.isInitializing() || meta.isPrototypeMeta(obj))) {
    return;
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

  } finally {
    _notifyDepth--;
  }

  } finally {
    // Clear the narrow CP invalidation marker only if we added it here.
    if (!wasPresent) {
      const g2: any = globalThis as any;
      const inv: WeakMap<object, Set<string>> | undefined = g2.__gxtCPInvalidationSet;
      if (inv) {
        const s = inv.get(obj);
        if (s) s.delete(keyName);
      }
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
if (typeof (globalThis as any).__gxtTriggerReRender === 'function' || true) {
  (globalThis as any).__gxtRecomputeDependents = function(obj: object, changedKey: string): Array<{ key: string; value: unknown }> {
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
        } catch { /* skip if getter throws */ }
      });
    } catch { /* skip if meta access fails */ }
    return results;
  };
}

// Expose notifyPropertyChange on globalThis so @tracked setters can call it
// without circular imports. Always set (not gated on __GXT_MODE__) because
// the GXT flag is set in compile.ts which loads after core modules.
(globalThis as any).__emberNotifyPropertyChange = notifyPropertyChange;

export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
