import { guidFor, symbol } from 'ember-utils';
import {
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
  EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER
} from 'ember/features';
import { assertNotRendered } from './transaction';

export let PROPERTY_DID_CHANGE = symbol('PROPERTY_DID_CHANGE');

const beforeObserverSet = new ObserverSet();
const observerSet = new ObserverSet();
let deferred = 0;

// ..........................................................
// PROPERTY CHANGES
//

/**
  This function is called just before an object property is about to change.
  It will notify any before observers and prepare caches among other things.

  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method
  manually along with `Ember.propertyDidChange()` which you should call just
  after the property value changes.

  @method propertyWillChange
  @for Ember
  @param {Object} obj The object with the property that will change
  @param {String} keyName The property key (or path) that will change.
  @return {void}
  @private
*/
function propertyWillChange(obj, keyName, _meta) {
  let meta = _meta || peekMeta(obj);

  if (meta && !meta.isInitialized(obj)) {
    return;
  }

  let watching = meta && meta.peekWatching(keyName) > 0;
  let possibleDesc = obj[keyName];
  let isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

  if (isDescriptor && possibleDesc.willChange) {
    possibleDesc.willChange(obj, keyName);
  }

  if (watching) {
    dependentKeysWillChange(obj, keyName, meta);
    chainsWillChange(obj, keyName, meta);
    notifyBeforeObservers(obj, keyName, meta);
  }
}

/**
  This function is called just after an object property has changed.
  It will notify any observers and clear caches among other things.

  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method
  manually along with `Ember.propertyWillChange()` which you should call just
  before the property value changes.

  @method propertyDidChange
  @for Ember
  @param {Object} obj The object with the property that will change
  @param {String} keyName The property key (or path) that will change.
  @param {Meta} meta The objects meta.
  @return {void}
  @private
*/
function propertyDidChange(obj, keyName, _meta) {
  let meta = _meta || peekMeta(obj);
  let hasMeta = !!meta;

  if (hasMeta && !meta.isInitialized(obj)) {
    return;
  }

  let possibleDesc = obj[keyName];
  let isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

  // shouldn't this mean that we're watching this key?
  if (isDescriptor && possibleDesc.didChange) {
    possibleDesc.didChange(obj, keyName);
  }

  if (hasMeta && meta.peekWatching(keyName) > 0) {
    if (meta.hasDeps(keyName) && !meta.isSourceDestroying()) {
      dependentKeysDidChange(obj, keyName, meta);
    }

    chainsDidChange(obj, keyName, meta, false);
    notifyObservers(obj, keyName, meta);
  }

  if (obj[PROPERTY_DID_CHANGE]) {
    obj[PROPERTY_DID_CHANGE](keyName);
  }

  if (hasMeta) {
    if (meta.isSourceDestroying()) { return; }
    markObjectAsDirty(meta, keyName);
  }

  if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER || EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
    assertNotRendered(obj, keyName, meta);
  }
}

let WILL_SEEN, DID_SEEN;
// called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
function dependentKeysWillChange(obj, depKey, meta) {
  if (meta.isSourceDestroying()) { return; }
  if (meta.hasDeps(depKey)) {
    let seen = WILL_SEEN;
    let top = !seen;

    if (top) {
      seen = WILL_SEEN = {};
    }

    iterDeps(propertyWillChange, obj, depKey, seen, meta);

    if (top) {
      WILL_SEEN = null;
    }
  }
}

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey, meta) {
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
  let possibleDesc, isDescriptor;
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

    possibleDesc = obj[key];
    isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

    if (isDescriptor && possibleDesc._suspended === obj) {
      return;
    }

    method(obj, key, meta);
  });
}

function chainsWillChange(obj, keyName, meta) {
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers) {
    chainWatchers.notify(keyName, false, propertyWillChange);
  }
}

function chainsDidChange(obj, keyName, meta) {
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers) {
    chainWatchers.notify(keyName, true, propertyDidChange);
  }
}

function overrideChains(obj, keyName, meta) {
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers) {
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
    beforeObserverSet.clear();
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
  @param [binding]
  @private
*/
function changeProperties(callback, binding) {
  beginPropertyChanges();
  try {
    callback.call(binding);
  } finally {
    endPropertyChanges.call(binding);
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
    let flags = actions[i + 2];
    let actionIndex = indexOf(otherActions, target, method);

    if (actionIndex === -1) {
      otherActions.push(target, method, flags);
      newActions.push(target, method, flags);
    }
  }

  return newActions;
}

function notifyBeforeObservers(obj, keyName, meta) {
  if (meta.isSourceDestroying()) { return; }

  let eventName = `${keyName}:before`;
  let listeners, added;
  if (deferred) {
    listeners = beforeObserverSet.add(obj, keyName, eventName);
    added = accumulateListeners(obj, eventName, listeners, meta);
    sendEvent(obj, eventName, [obj, keyName], added);
  } else {
    sendEvent(obj, eventName, [obj, keyName]);
  }
}

function notifyObservers(obj, keyName, meta) {
  if (meta.isSourceDestroying()) { return; }

  let eventName = `${keyName}:change`;
  let listeners;
  if (deferred) {
    listeners = observerSet.add(obj, keyName, eventName);
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
