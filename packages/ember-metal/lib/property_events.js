require('ember-metal/utils');
require('ember-metal/events');
require('ember-metal/observer_set');

var metaFor = Ember.meta,
    guidFor = Ember.guidFor,
    tryFinally = Ember.tryFinally,
    sendEvent = Ember.sendEvent,
    listenersUnion = Ember.listenersUnion,
    listenersDiff = Ember.listenersDiff,
    ObserverSet = Ember._ObserverSet,
    beforeObserverSet = new ObserverSet(),
    observerSet = new ObserverSet(),
    deferred = 0;

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
var propertyWillChange = Ember.propertyWillChange = function(obj, keyName) {
  var m = metaFor(obj, false),
      watching = m.watching[keyName] > 0 || keyName === 'length',
      proto = m.proto,
      desc = m.descs[keyName];

  if (!watching) { return; }
  if (proto === obj) { return; }
  if (desc && desc.willChange) { desc.willChange(obj, keyName); }
  dependentKeysWillChange(obj, keyName, m);
  chainsWillChange(obj, keyName, m);
  notifyBeforeObservers(obj, keyName);
};

/**
  This function is called just after an object property has changed.
  It will notify any observers and clear caches among other things.

  Normally you will not need to call this method directly but if for some
  reason you can't directly watch a property you can invoke this method
  manually along with `Ember.propertyWilLChange()` which you should call just
  before the property value changes.

  @method propertyDidChange
  @for Ember
  @param {Object} obj The object with the property that will change
  @param {String} keyName The property key (or path) that will change.
  @return {void}
*/
var propertyDidChange = Ember.propertyDidChange = function(obj, keyName) {
  var m = metaFor(obj, false),
      watching = m.watching[keyName] > 0 || keyName === 'length',
      proto = m.proto,
      desc = m.descs[keyName];

  if (proto === obj) { return; }

  // shouldn't this mean that we're watching this key?
  if (desc && desc.didChange) { desc.didChange(obj, keyName); }
  if (!watching && keyName !== 'length') { return; }

  dependentKeysDidChange(obj, keyName, m);
  chainsDidChange(obj, keyName, m);
  notifyObservers(obj, keyName);
};

var WILL_SEEN, DID_SEEN;

// called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
function dependentKeysWillChange(obj, depKey, meta) {
  if (obj.isDestroying) { return; }

  var seen = WILL_SEEN, top = !seen;
  if (top) { seen = WILL_SEEN = {}; }
  iterDeps(propertyWillChange, obj, depKey, seen, meta);
  if (top) { WILL_SEEN = null; }
}

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey, meta) {
  if (obj.isDestroying) { return; }

  var seen = DID_SEEN, top = !seen;
  if (top) { seen = DID_SEEN = {}; }
  iterDeps(propertyDidChange, obj, depKey, seen, meta);
  if (top) { DID_SEEN = null; }
}

function iterDeps(method, obj, depKey, seen, meta) {
  var guid = guidFor(obj);
  if (!seen[guid]) seen[guid] = {};
  if (seen[guid][depKey]) return;
  seen[guid][depKey] = true;

  var deps = meta.deps;
  deps = deps && deps[depKey];
  if (deps) {
    for(var key in deps) {
      var desc = meta.descs[key];
      if (desc && desc._suspended === obj) continue;
      method(obj, key);
    }
  }
}

var chainsWillChange = function(obj, keyName, m, arg) {
  if (!m.hasOwnProperty('chainWatchers')) { return; } // nothing to do

  var nodes = m.chainWatchers;

  nodes = nodes[keyName];
  if (!nodes) { return; }

  for(var i = 0, l = nodes.length; i < l; i++) {
    nodes[i].willChange(arg);
  }
};

var chainsDidChange = function(obj, keyName, m, arg) {
  if (!m.hasOwnProperty('chainWatchers')) { return; } // nothing to do

  var nodes = m.chainWatchers;

  nodes = nodes[keyName];
  if (!nodes) { return; }

  // looping in reverse because the chainWatchers array can be modified inside didChange
  for (var i = nodes.length - 1; i >= 0; i--) {
    nodes[i].didChange(arg);
  }
};

Ember.overrideChains = function(obj, keyName, m) {
  chainsDidChange(obj, keyName, m, true);
};

/**
  @method beginPropertyChanges
  @chainable
*/
var beginPropertyChanges = Ember.beginPropertyChanges = function() {
  deferred++;
};

/**
  @method endPropertyChanges
*/
var endPropertyChanges = Ember.endPropertyChanges = function() {
  deferred--;
  if (deferred<=0) {
    beforeObserverSet.clear();
    observerSet.flush();
  }
};

/**
  Make a series of property changes together in an
  exception-safe way.

  ```javascript
  Ember.changeProperties(function() {
    obj1.set('foo', mayBlowUpWhenSet);
    obj2.set('bar', baz);
  });
  ```

  @method changePropertiess
  @param {Function} callback
  @param [binding]
*/
var changeProperties = Ember.changeProperties = function(cb, binding){
  beginPropertyChanges();
  tryFinally(cb, endPropertyChanges, binding);
};

var notifyBeforeObservers = function(obj, keyName) {
  if (obj.isDestroying) { return; }

  var eventName = keyName + ':before', listeners, diff;
  if (deferred) {
    listeners = beforeObserverSet.add(obj, keyName, eventName);
    diff = listenersDiff(obj, eventName, listeners);
    sendEvent(obj, eventName, [obj, keyName], diff);
  } else {
    sendEvent(obj, eventName, [obj, keyName]);
  }
};

var notifyObservers = function(obj, keyName) {
  if (obj.isDestroying) { return; }

  var eventName = keyName + ':change', listeners;
  if (deferred) {
    listeners = observerSet.add(obj, keyName, eventName);
    listenersUnion(obj, eventName, listeners);
  } else {
    sendEvent(obj, eventName, [obj, keyName]);
  }
};