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
function notifyPropertyChange(
  obj: object,
  keyName: string,
  _meta?: Meta | null,
  value?: unknown
): void {
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

export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
