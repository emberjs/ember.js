import { guidFor, symbol } from 'ember-utils';
import {
  descriptorFor,
  peekMeta
} from './meta';
import {
  sendEvent
} from './events';
import {
  markObjectAsDirty
} from './tags';
import ObserverSet from './observer_set';
import {
  EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER,
} from 'ember/features';
import { deprecate } from 'ember-debug';
import { assertNotRendered } from './transaction';
import { changeEvent } from './observer';

/**
 @module ember
 @private
 */

export const PROPERTY_DID_CHANGE = symbol('PROPERTY_DID_CHANGE');

const observerSet = new ObserverSet();
let deferred = 0;

// ..........................................................
// PROPERTY CHANGES
//

/**
  @method propertyWillChange
  @for Ember
  @private
*/
function propertyWillChange() {
  deprecate(
    `'propertyWillChange' is deprecated and has no effect. It is safe to remove this call.`,
    false,
    {
      id: 'ember-metal.deprecate-propertyWillChange',
      until: '3.5.0',
      url: 'https://emberjs.com/deprecations/v3.x/#toc_ember-metal-deprecate-propertyWillChange-and-propertyDidChange'
    }
  );
}

/**
  This function is called just after an object property has changed.
  It will notify any observers and clear caches among other things.

  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method
  manually.

  @method propertyDidChange
  @for Ember
  @param {Object} obj The object with the property that will change
  @param {String} keyName The property key (or path) that will change.
  @param {Meta} meta The objects meta.
  @return {void}
  @private
*/
function propertyDidChange(obj, keyName, _meta) {
  let meta = _meta === undefined ? peekMeta(obj) : _meta;
  let hasMeta = meta !== undefined;

  if (hasMeta && !meta.isInitialized(obj)) { return; }

  let possibleDesc = descriptorFor(obj, keyName, meta);

  // shouldn't this mean that we're watching this key?
  if (possibleDesc !== undefined && possibleDesc.didChange) {
    possibleDesc.didChange(obj, keyName);
  }

  if (hasMeta && meta.peekWatching(keyName) > 0) {
    dependentKeysDidChange(obj, keyName, meta);
    chainsDidChange(obj, keyName, meta);
    notifyObservers(obj, keyName, meta);
  }

  if (PROPERTY_DID_CHANGE in obj) {
    obj[PROPERTY_DID_CHANGE](keyName);
  }

  if (hasMeta) {
    if (meta.isSourceDestroying()) { return; }
    markObjectAsDirty(meta, keyName);
  }

  if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER) {
    assertNotRendered(obj, keyName, meta);
  }
}

let DID_SEEN;

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey, meta) {
  if (meta.isSourceDestroying() || !meta.hasDeps(depKey)) { return; }
  let seen = DID_SEEN;
  let top = !seen;

  if (top) {
    seen = DID_SEEN = {};
  }

  iterDeps(propertyDidChange, obj, depKey, seen, meta);

  if (top) {
    DID_SEEN = null;
  }
}

function iterDeps(method, obj, depKey, seen, meta) {
  let possibleDesc;
  let guid = guidFor(obj);
  let current = seen[guid];

  if (!current) {
    current = seen[guid] = {};
  }

  if (current[depKey]) {
    return;
  }

  current[depKey] = true;

  meta.forEachInDeps(depKey, (key, value) => {
    if (!value) { return; }

    possibleDesc = descriptorFor(obj, key, meta);

    if (possibleDesc !== undefined && possibleDesc._suspended === obj) {
      return;
    }

    method(obj, key, meta);
  });
}

function chainsDidChange(obj, keyName, meta) {
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers !== undefined) {
    chainWatchers.notify(keyName, true, propertyDidChange);
  }
}

function overrideChains(obj, keyName, meta) {
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers !== undefined) {
    chainWatchers.revalidate(keyName);
  }
}

/**
  @method beginPropertyChanges
  @chainable
  @private
*/
function beginPropertyChanges() {
  deferred++;
}

/**
  @method endPropertyChanges
  @private
*/
function endPropertyChanges() {
  deferred--;
  if (deferred <= 0) {
    observerSet.flush();
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
function changeProperties(callback) {
  beginPropertyChanges();
  try {
    callback();
  } finally {
    endPropertyChanges();
  }
}

function indexOf(array, target, method) {
  let index = -1;
  // hashes are added to the end of the event array
  // so it makes sense to start searching at the end
  // of the array and search in reverse
  for (let i = array.length - 3; i >= 0; i -= 3) {
    if (target === array[i] && method === array[i + 1]) {
      index = i;
      break;
    }
  }
  return index;
}

function accumulateListeners(obj, eventName, otherActions, meta) {
  let actions = meta.matchingListeners(eventName);
  if (actions === undefined) { return; }
  let newActions = [];

  for (let i = actions.length - 3; i >= 0; i -= 3) {
    let target = actions[i];
    let method = actions[i + 1];
    let actionIndex = indexOf(otherActions, target, method);

    if (actionIndex === -1) {
      let flags = actions[i + 2];
      otherActions.push(target, method, flags);
      newActions.push(target, method, flags);
    }
  }

  return newActions;
}

function notifyObservers(obj, keyName, meta) {
  if (meta.isSourceDestroying()) { return; }

  let eventName = changeEvent(keyName);
  if (deferred > 0) {
    let listeners = observerSet.add(obj, keyName, eventName);
    accumulateListeners(obj, eventName, listeners, meta);
  } else {
    sendEvent(obj, eventName, [obj, keyName]);
  }
}

export {
  propertyWillChange,
  propertyDidChange,
  overrideChains,
  beginPropertyChanges,
  endPropertyChanges,
  changeProperties
};
