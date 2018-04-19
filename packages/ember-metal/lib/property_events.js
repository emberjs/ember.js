import { symbol } from 'ember-utils';
import { descriptorFor, peekMeta } from './meta';
import { sendEvent } from './events';
import { markObjectAsDirty } from './tags';
import ObserverSet from './observer_set';
import { DEBUG } from '@glimmer/env';
import { deprecate } from '@ember/debug';
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
      url:
        'https://emberjs.com/deprecations/v3.x/#toc_use-notifypropertychange-instead-of-propertywillchange-and-propertydidchange',
    }
  );
}

/**
  @method propertyDidChange
  @for Ember
  @private
*/
function propertyDidChange(obj, keyName, _meta) {
  deprecate(
    `'propertyDidChange' is deprecated in favor of 'notifyPropertyChange'. It is safe to change this call to 'notifyPropertyChange'.`,
    false,
    {
      id: 'ember-metal.deprecate-propertyDidChange',
      until: '3.5.0',
      url:
        'https://emberjs.com/deprecations/v3.x/#toc_use-notifypropertychange-instead-of-propertywillchange-and-propertydidchange',
    }
  );

  notifyPropertyChange(obj, keyName, _meta);
}

/**
  This function is called just after an object property has changed.
  It will notify any observers and clear caches among other things.

  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method
  manually.

  @method notifyPropertyChange
  @for Ember
  @param {Object} obj The object with the property that will change
  @param {String} keyName The property key (or path) that will change.
  @param {Meta} meta The objects meta.
  @return {void}
  @private
*/
function notifyPropertyChange(obj, keyName, _meta) {
  let meta = _meta === undefined ? peekMeta(obj) : _meta;
  let hasMeta = meta !== undefined;

  if (hasMeta && !meta.isInitialized(obj)) {
    return;
  }

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
    if (meta.isSourceDestroying()) {
      return;
    }
    markObjectAsDirty(obj, keyName, meta);
  }

  if (DEBUG) {
    assertNotRendered(obj, keyName, meta);
  }
}

const SEEN_MAP = new Map();
let IS_TOP_SEEN_MAP = true;

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey, meta) {
  if (meta.isSourceDestroying() || !meta.hasDeps(depKey)) {
    return;
  }
  let seen = SEEN_MAP;
  let isTop = IS_TOP_SEEN_MAP;

  if (isTop) {
    IS_TOP_SEEN_MAP = false;
  }

  iterDeps(notifyPropertyChange, obj, depKey, seen, meta);

  if (isTop) {
    SEEN_MAP.clear();
    IS_TOP_SEEN_MAP = true;
  }
}

function iterDeps(method, obj, depKey, seen, meta) {
  let current = seen.get(obj);

  if (current === undefined) {
    current = new Set();
    seen.set(obj, current);
  }

  if (current.has(depKey)) {
    return;
  }

  let possibleDesc;
  meta.forEachInDeps(depKey, (key, value) => {
    if (!value) {
      return;
    }

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
    chainWatchers.notify(keyName, true, notifyPropertyChange);
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

function notifyObservers(obj, keyName, meta) {
  if (meta.isSourceDestroying()) {
    return;
  }

  let eventName = changeEvent(keyName);
  if (deferred > 0) {
    observerSet.add(obj, keyName, eventName);
  } else {
    sendEvent(obj, eventName, [obj, keyName]);
  }
}

export {
  propertyWillChange,
  propertyDidChange,
  notifyPropertyChange,
  overrideChains,
  beginPropertyChanges,
  endPropertyChanges,
  changeProperties,
};
