import {
  guidFor,
  tryFinally
} from "ember-metal/utils";
import {
  sendEvent,
  listenersUnion,
  listenersDiff
} from "ember-metal/events";
import ObserverSet from "ember-metal/observer_set";

var beforeObserverSet = new ObserverSet();
var observerSet = new ObserverSet();
var deferred = 0;

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
*/
function propertyWillChange(obj, keyName) {
  var m = obj['__ember_meta__'];
  var watching = (m && m.watching[keyName] > 0) || keyName === 'length';
  var proto = m && m.proto;
  var desc = m && m.descs[keyName];

  if (!watching) {
    return;
  }

  if (proto === obj) {
    return;
  }

  if (desc && desc.willChange) {
    desc.willChange(obj, keyName);
  }

  dependentKeysWillChange(obj, keyName, m);
  chainsWillChange(obj, keyName, m);
  notifyBeforeObservers(obj, keyName);
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
  @return {void}
*/
function propertyDidChange(obj, keyName) {
  var m = obj['__ember_meta__'];
  var watching = (m && m.watching[keyName] > 0) || keyName === 'length';
  var proto = m && m.proto;
  var desc = m && m.descs[keyName];

  if (proto === obj) {
    return;
  }

  // shouldn't this mean that we're watching this key?
  if (desc && desc.didChange) {
    desc.didChange(obj, keyName);
  }

  if (!watching && keyName !== 'length') {
    return;
  }

  if (m && m.deps && m.deps[keyName]) {
    dependentKeysDidChange(obj, keyName, m);
  }

  chainsDidChange(obj, keyName, m, false);
  notifyObservers(obj, keyName);
}

var WILL_SEEN, DID_SEEN;
// called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
function dependentKeysWillChange(obj, depKey, meta) {
  if (obj.isDestroying) { return; }

  var deps;
  if (meta && meta.deps && (deps = meta.deps[depKey])) {
    var seen = WILL_SEEN;
    var top = !seen;

    if (top) {
      seen = WILL_SEEN = {};
    }

    iterDeps(propertyWillChange, obj, deps, depKey, seen, meta);

    if (top) {
      WILL_SEEN = null;
    }
  }
}

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey, meta) {
  if (obj.isDestroying) { return; }

  var deps;
  if (meta && meta.deps && (deps = meta.deps[depKey])) {
    var seen = DID_SEEN;
    var top = !seen;

    if (top) {
      seen = DID_SEEN = {};
    }

    iterDeps(propertyDidChange, obj, deps, depKey, seen, meta);

    if (top) {
      DID_SEEN = null;
    }
  }
}

function keysOf(obj) {
  var keys = [];

  for (var key in obj) {
    keys.push(key);
  }

  return keys;
}

function iterDeps(method, obj, deps, depKey, seen, meta) {
  var keys, key, i, desc;
  var guid = guidFor(obj);
  var current = seen[guid];

  if (!current) {
    current = seen[guid] = {};
  }

  if (current[depKey]) {
    return;
  }

  current[depKey] = true;

  if (deps) {
    keys = keysOf(deps);
    var descs = meta.descs;
    for (i=0; i<keys.length; i++) {
      key = keys[i];
      desc = descs[key];

      if (desc && desc._suspended === obj) {
        continue;
      }

      method(obj, key);
    }
  }
}

function chainsWillChange(obj, keyName, m) {
  if (!(m.hasOwnProperty('chainWatchers') &&
        m.chainWatchers[keyName])) {
    return;
  }

  var nodes = m.chainWatchers[keyName];
  var events = [];
  var i, l;

  for(i = 0, l = nodes.length; i < l; i++) {
    nodes[i].willChange(events);
  }

  for (i = 0, l = events.length; i < l; i += 2) {
    propertyWillChange(events[i], events[i+1]);
  }
}

function chainsDidChange(obj, keyName, m, suppressEvents) {
  if (!(m && m.hasOwnProperty('chainWatchers') &&
        m.chainWatchers[keyName])) {
    return;
  }

  var nodes = m.chainWatchers[keyName];
  var events = suppressEvents ? null : [];
  var i, l;

  for(i = 0, l = nodes.length; i < l; i++) {
    nodes[i].didChange(events);
  }

  if (suppressEvents) {
    return;
  }

  for (i = 0, l = events.length; i < l; i += 2) {
    propertyDidChange(events[i], events[i+1]);
  }
}

function overrideChains(obj, keyName, m) {
  chainsDidChange(obj, keyName, m, true);
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
  if (deferred<=0) {
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
*/
function changeProperties(cb, binding) {
  beginPropertyChanges();
  tryFinally(cb, endPropertyChanges, binding);
}

function notifyBeforeObservers(obj, keyName) {
  if (obj.isDestroying) { return; }

  var eventName = keyName + ':before';
  var listeners, diff;
  if (deferred) {
    listeners = beforeObserverSet.add(obj, keyName, eventName);
    diff = listenersDiff(obj, eventName, listeners);
    sendEvent(obj, eventName, [obj, keyName], diff);
  } else {
    sendEvent(obj, eventName, [obj, keyName]);
  }
}

function notifyObservers(obj, keyName) {
  if (obj.isDestroying) { return; }

  var eventName = keyName + ':change';
  var listeners;
  if (deferred) {
    listeners = observerSet.add(obj, keyName, eventName);
    listenersUnion(obj, eventName, listeners);
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
