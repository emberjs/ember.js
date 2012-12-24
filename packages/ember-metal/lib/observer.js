require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils'); // Ember.tryFinally
require('ember-metal/accessors');
require('ember-metal/array');

/**
@module ember-metal
*/

var AFTER_OBSERVERS = ':change';
var BEFORE_OBSERVERS = ':before';

var guidFor = Ember.guidFor;

var deferred = 0;

/*
  this.observerSet = {
    [senderGuid]: { // variable name: `keySet`
      [keyName]: listIndex
    }
  },
  this.observers = [
    {
      sender: obj,
      keyName: keyName,
      eventName: eventName,
      listeners: [
        [target, method, onceFlag, suspendedFlag]
      ]
    },
    ...
  ]
*/
function ObserverSet() {
  this.clear();
}

ObserverSet.prototype.add = function(sender, keyName, eventName) {
  var observerSet = this.observerSet,
      observers = this.observers,
      senderGuid = Ember.guidFor(sender),
      keySet = observerSet[senderGuid],
      index;

  if (!keySet) {
    observerSet[senderGuid] = keySet = {};
  }
  index = keySet[keyName];
  if (index === undefined) {
    index = observers.push({
      sender: sender,
      keyName: keyName,
      eventName: eventName,
      listeners: []
    }) - 1;
    keySet[keyName] = index;
  }
  return observers[index].listeners;
};

ObserverSet.prototype.flush = function() {
  var observers = this.observers, i, len, observer, sender;
  this.clear();
  for (i=0, len=observers.length; i < len; ++i) {
    observer = observers[i];
    sender = observer.sender;
    if (sender.isDestroyed) { continue; }
    Ember.sendEvent(sender, observer.eventName, [sender, observer.keyName], observer.listeners);
  }
};

ObserverSet.prototype.clear = function() {
  this.observerSet = {};
  this.observers = [];
};

var beforeObserverSet = new ObserverSet(), observerSet = new ObserverSet();

/**
  @method beginPropertyChanges
  @chainable
*/
Ember.beginPropertyChanges = function() {
  deferred++;
};

/**
  @method endPropertyChanges
*/
Ember.endPropertyChanges = function() {
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

  @method changeProperties
  @param {Function} callback
  @param [binding]
*/
Ember.changeProperties = function(cb, binding){
  Ember.beginPropertyChanges();
  Ember.tryFinally(cb, Ember.endPropertyChanges, binding);
};

/**
  Set a list of properties on an object. These properties are set inside
  a single `beginPropertyChanges` and `endPropertyChanges` batch, so
  observers will be buffered.

  @method setProperties
  @param target
  @param {Hash} properties
  @return target
*/
Ember.setProperties = function(self, hash) {
  Ember.changeProperties(function(){
    for(var prop in hash) {
      if (hash.hasOwnProperty(prop)) Ember.set(self, prop, hash[prop]);
    }
  });
  return self;
};


function changeEvent(keyName) {
  return keyName+AFTER_OBSERVERS;
}

function beforeEvent(keyName) {
  return keyName+BEFORE_OBSERVERS;
}

/**
  @method addObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.addObserver = function(obj, path, target, method) {
  Ember.addListener(obj, changeEvent(path), target, method);
  Ember.watch(obj, path);
  return this;
};

Ember.observersFor = function(obj, path) {
  return Ember.listenersFor(obj, changeEvent(path));
};

/**
  @method removeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.removeObserver = function(obj, path, target, method) {
  Ember.unwatch(obj, path);
  Ember.removeListener(obj, changeEvent(path), target, method);
  return this;
};

/**
  @method addBeforeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.addBeforeObserver = function(obj, path, target, method) {
  Ember.addListener(obj, beforeEvent(path), target, method);
  Ember.watch(obj, path);
  return this;
};

// Suspend observer during callback.
//
// This should only be used by the target of the observer
// while it is setting the observed path.
Ember._suspendBeforeObserver = function(obj, path, target, method, callback) {
  return Ember._suspendListener(obj, beforeEvent(path), target, method, callback);
};

Ember._suspendObserver = function(obj, path, target, method, callback) {
  return Ember._suspendListener(obj, changeEvent(path), target, method, callback);
};

var map = Ember.ArrayPolyfills.map;

Ember._suspendBeforeObservers = function(obj, paths, target, method, callback) {
  var events = map.call(paths, beforeEvent);
  return Ember._suspendListeners(obj, events, target, method, callback);
};

Ember._suspendObservers = function(obj, paths, target, method, callback) {
  var events = map.call(paths, changeEvent);
  return Ember._suspendListeners(obj, events, target, method, callback);
};

Ember.beforeObserversFor = function(obj, path) {
  return Ember.listenersFor(obj, beforeEvent(path));
};

/**
  @method removeBeforeObserver
  @param obj
  @param {String} path
  @param {Object|Function} targetOrMethod
  @param {Function|String} [method]
*/
Ember.removeBeforeObserver = function(obj, path, target, method) {
  Ember.unwatch(obj, path);
  Ember.removeListener(obj, beforeEvent(path), target, method);
  return this;
};

Ember.notifyBeforeObservers = function(obj, keyName) {
  if (obj.isDestroying) { return; }

  var eventName = beforeEvent(keyName), listeners, listenersDiff;
  if (deferred) {
    listeners = beforeObserverSet.add(obj, keyName, eventName);
    listenersDiff = Ember.listenersDiff(obj, eventName, listeners);
    Ember.sendEvent(obj, eventName, [obj, keyName], listenersDiff);
  } else {
    Ember.sendEvent(obj, eventName, [obj, keyName]);
  }
};

Ember.notifyObservers = function(obj, keyName) {
  if (obj.isDestroying) { return; }

  var eventName = changeEvent(keyName), listeners;
  if (deferred) {
    listeners = observerSet.add(obj, keyName, eventName);
    Ember.listenersUnion(obj, eventName, listeners);
  } else {
    Ember.sendEvent(obj, eventName, [obj, keyName]);
  }
};
