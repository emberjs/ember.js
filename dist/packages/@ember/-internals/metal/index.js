import { meta, peekMeta } from '@ember/-internals/meta';
import { setListeners, symbol, setupMandatorySetter, isObject, toString, setWithMandatorySetter, Cache, setProxy, lookupDescriptor, getName, setName } from '@ember/-internals/utils';
import { assert, inspect, deprecate, warn, debug } from '@ember/debug';
import { registerDestructor, isDestroyed } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import { tagMetaFor, valueForTag, CURRENT_TAG, validateTag, tagFor, CONSTANT_TAG, dirtyTagFor, combine, createUpdatableTag, updateTag, untrack, ALLOW_CYCLES, consumeTag, track, isTracking, trackedData, createCache, getValue } from '@glimmer/validator';
export { createCache, getValue, isConst } from '@glimmer/validator';
import { ENV, context } from '@ember/-internals/environment';
import { schedule } from '@ember/runloop';
import { getCustomTagFor } from '@glimmer/manager';
import { isEmberArray } from '@ember/array/-internals';
import VERSION from 'ember/version';
import { getOwner } from '@ember/-internals/owner';

/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:change": [ // variable name: `actions`
            target, method, once
          ]
        }
      }

*/
/**
  Add an event listener

  @method addListener
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Boolean} once A flag whether a function should only be called once
  @public
*/
function addListener(obj, eventName, target, method, once, sync = true) {
  assert('You must pass at least an object and event name to addListener', Boolean(obj) && Boolean(eventName));
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }
  meta(obj).addToListeners(eventName, target, method, once === true, sync);
}
/**
  Remove an event listener

  Arguments should match those passed to `addListener`.

  @method removeListener
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @param {Object|Function} target A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @public
*/
function removeListener(obj, eventName, targetOrFunction, functionOrName) {
  assert('You must pass at least an object, event name, and method or target and method/method name to removeListener', Boolean(obj) && Boolean(eventName) && (typeof targetOrFunction === 'function' || typeof targetOrFunction === 'object' && Boolean(functionOrName)));
  let target, method;
  if (typeof targetOrFunction === 'object') {
    target = targetOrFunction;
    method = functionOrName;
  } else {
    target = null;
    method = targetOrFunction;
  }
  let m = meta(obj);
  m.removeFromListeners(eventName, target, method);
}
/**
  Send an event. The execution of suspended listeners
  is skipped, and once listeners are removed. A listener without
  a target is executed on the passed object. If an array of actions
  is not passed, the actions stored on the passed object are invoked.

  @method sendEvent
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @param {Array} params Optional parameters for each listener.
  @return {Boolean} if the event was delivered to one or more actions
  @public
*/
function sendEvent(obj, eventName, params, actions, _meta) {
  if (actions === undefined) {
    let meta = _meta === undefined ? peekMeta(obj) : _meta;
    actions = meta !== null ? meta.matchingListeners(eventName) : undefined;
  }
  if (actions === undefined || actions.length === 0) {
    return false;
  }
  for (let i = actions.length - 3; i >= 0; i -= 3) {
    // looping in reverse for once listeners
    let target = actions[i];
    let method = actions[i + 1];
    let once = actions[i + 2];
    if (!method) {
      continue;
    }
    if (once) {
      removeListener(obj, eventName, target, method);
    }
    if (!target) {
      target = obj;
    }
    let type = typeof method;
    if (type === 'string' || type === 'symbol') {
      method = target[method];
    }
    method.apply(target, params);
  }
  return true;
}
/**
  @public
  @method hasListeners
  @static
  @for @ember/object/events
  @param obj
  @param {String} eventName
  @return {Boolean} if `obj` has listeners for event `eventName`
*/
function hasListeners(obj, eventName) {
  let meta = peekMeta(obj);
  if (meta === null) {
    return false;
  }
  let matched = meta.matchingListeners(eventName);
  return matched !== undefined && matched.length > 0;
}
/**
  Define a property as a function that should be executed when
  a specified event or events are triggered.

  ``` javascript
  import EmberObject from '@ember/object';
  import { on } from '@ember/object/evented';
  import { sendEvent } from '@ember/object/events';

  let Job = EmberObject.extend({
    logCompleted: on('completed', function() {
      console.log('Job completed!');
    })
  });

  let job = Job.create();

  sendEvent(job, 'completed'); // Logs 'Job completed!'
 ```

  @method on
  @static
  @for @ember/object/evented
  @param {String} eventNames*
  @param {Function} func
  @return {Function} the listener function, passed as last argument to on(...)
  @public
*/
function on(...args) {
  let func = args.pop();
  let events = args;
  assert('on expects function as last argument', typeof func === 'function');
  assert('on called without valid event names', events.length > 0 && events.every(p => typeof p === 'string' && p.length > 0));
  setListeners(func, events);
  return func;
}

const AFTER_OBSERVERS = ':change';
function changeEvent(keyName) {
  return keyName + AFTER_OBSERVERS;
}

const SYNC_DEFAULT = !ENV._DEFAULT_ASYNC_OBSERVERS;
const SYNC_OBSERVERS = new Map();
const ASYNC_OBSERVERS = new Map();
/**
@module @ember/object
*/
/**
  @method addObserver
  @static
  @for @ember/object/observers
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
function addObserver(obj, path, target, method, sync = SYNC_DEFAULT) {
  let eventName = changeEvent(path);
  addListener(obj, eventName, target, method, false, sync);
  let meta = peekMeta(obj);
  if (meta === null || !(meta.isPrototypeMeta(obj) || meta.isInitializing())) {
    activateObserver(obj, eventName, sync);
  }
}
/**
  @method removeObserver
  @static
  @for @ember/object/observers
  @param obj
  @param {String} path
  @param {Object|Function} target
  @param {Function|String} [method]
  @public
*/
function removeObserver(obj, path, target, method, sync = SYNC_DEFAULT) {
  let eventName = changeEvent(path);
  let meta = peekMeta(obj);
  if (meta === null || !(meta.isPrototypeMeta(obj) || meta.isInitializing())) {
    deactivateObserver(obj, eventName, sync);
  }
  removeListener(obj, eventName, target, method);
}
function getOrCreateActiveObserversFor(target, sync) {
  let observerMap = sync === true ? SYNC_OBSERVERS : ASYNC_OBSERVERS;
  if (!observerMap.has(target)) {
    observerMap.set(target, new Map());
    registerDestructor(target, () => destroyObservers(target), true);
  }
  return observerMap.get(target);
}
function activateObserver(target, eventName, sync = false) {
  let activeObservers = getOrCreateActiveObserversFor(target, sync);
  if (activeObservers.has(eventName)) {
    activeObservers.get(eventName).count++;
  } else {
    let path = eventName.substring(0, eventName.lastIndexOf(':'));
    let tag = getChainTagsForKey(target, path, tagMetaFor(target), peekMeta(target));
    activeObservers.set(eventName, {
      count: 1,
      path,
      tag,
      lastRevision: valueForTag(tag),
      suspended: false
    });
  }
}
let DEACTIVATE_SUSPENDED = false;
let SCHEDULED_DEACTIVATE = [];
function deactivateObserver(target, eventName, sync = false) {
  if (DEACTIVATE_SUSPENDED === true) {
    SCHEDULED_DEACTIVATE.push([target, eventName, sync]);
    return;
  }
  let observerMap = sync === true ? SYNC_OBSERVERS : ASYNC_OBSERVERS;
  let activeObservers = observerMap.get(target);
  if (activeObservers !== undefined) {
    let observer = activeObservers.get(eventName);
    observer.count--;
    if (observer.count === 0) {
      activeObservers.delete(eventName);
      if (activeObservers.size === 0) {
        observerMap.delete(target);
      }
    }
  }
}
function suspendedObserverDeactivation() {
  DEACTIVATE_SUSPENDED = true;
}
function resumeObserverDeactivation() {
  DEACTIVATE_SUSPENDED = false;
  for (let [target, eventName, sync] of SCHEDULED_DEACTIVATE) {
    deactivateObserver(target, eventName, sync);
  }
  SCHEDULED_DEACTIVATE = [];
}
/**
 * Primarily used for cases where we are redefining a class, e.g. mixins/reopen
 * being applied later. Revalidates all the observers, resetting their tags.
 *
 * @private
 * @param target
 */
function revalidateObservers(target) {
  if (ASYNC_OBSERVERS.has(target)) {
    ASYNC_OBSERVERS.get(target).forEach(observer => {
      observer.tag = getChainTagsForKey(target, observer.path, tagMetaFor(target), peekMeta(target));
      observer.lastRevision = valueForTag(observer.tag);
    });
  }
  if (SYNC_OBSERVERS.has(target)) {
    SYNC_OBSERVERS.get(target).forEach(observer => {
      observer.tag = getChainTagsForKey(target, observer.path, tagMetaFor(target), peekMeta(target));
      observer.lastRevision = valueForTag(observer.tag);
    });
  }
}
let lastKnownRevision = 0;
function flushAsyncObservers(shouldSchedule = true) {
  let currentRevision = valueForTag(CURRENT_TAG);
  if (lastKnownRevision === currentRevision) {
    return;
  }
  lastKnownRevision = currentRevision;
  ASYNC_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);
    activeObservers.forEach((observer, eventName) => {
      if (!validateTag(observer.tag, observer.lastRevision)) {
        let sendObserver = () => {
          try {
            sendEvent(target, eventName, [target, observer.path], undefined, meta);
          } finally {
            observer.tag = getChainTagsForKey(target, observer.path, tagMetaFor(target), peekMeta(target));
            observer.lastRevision = valueForTag(observer.tag);
          }
        };
        if (shouldSchedule) {
          schedule('actions', sendObserver);
        } else {
          sendObserver();
        }
      }
    });
  });
}
function flushSyncObservers() {
  // When flushing synchronous observers, we know that something has changed (we
  // only do this during a notifyPropertyChange), so there's no reason to check
  // a global revision.
  SYNC_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);
    activeObservers.forEach((observer, eventName) => {
      if (!observer.suspended && !validateTag(observer.tag, observer.lastRevision)) {
        try {
          observer.suspended = true;
          sendEvent(target, eventName, [target, observer.path], undefined, meta);
        } finally {
          observer.tag = getChainTagsForKey(target, observer.path, tagMetaFor(target), peekMeta(target));
          observer.lastRevision = valueForTag(observer.tag);
          observer.suspended = false;
        }
      }
    });
  });
}
function setObserverSuspended(target, property, suspended) {
  let activeObservers = SYNC_OBSERVERS.get(target);
  if (!activeObservers) {
    return;
  }
  let observer = activeObservers.get(changeEvent(property));
  if (observer) {
    observer.suspended = suspended;
  }
}
function destroyObservers(target) {
  if (SYNC_OBSERVERS.size > 0) SYNC_OBSERVERS.delete(target);
  if (ASYNC_OBSERVERS.size > 0) ASYNC_OBSERVERS.delete(target);
}

// This is exported for `@tracked`, but should otherwise be avoided. Use `tagForObject`.
const SELF_TAG = symbol('SELF_TAG');
function tagForProperty(obj, propertyKey, addMandatorySetter = false, meta) {
  let customTagFor = getCustomTagFor(obj);
  if (customTagFor !== undefined) {
    return customTagFor(obj, propertyKey, addMandatorySetter);
  }
  let tag = tagFor(obj, propertyKey, meta);
  if (DEBUG && addMandatorySetter) {
    setupMandatorySetter(tag, obj, propertyKey);
  }
  return tag;
}
function tagForObject(obj) {
  if (isObject(obj)) {
    if (DEBUG) {
      assert(isDestroyed(obj) ? `Cannot create a new tag for \`${toString(obj)}\` after it has been destroyed.` : '', !isDestroyed(obj));
    }
    return tagFor(obj, SELF_TAG);
  }
  return CONSTANT_TAG;
}
function markObjectAsDirty(obj, propertyKey) {
  dirtyTagFor(obj, propertyKey);
  dirtyTagFor(obj, SELF_TAG);
}

/**
 @module ember
 @private
 */
const PROPERTY_DID_CHANGE = Symbol('PROPERTY_DID_CHANGE');
function hasPropertyDidChange(obj) {
  return obj != null && typeof obj === 'object' && typeof obj[PROPERTY_DID_CHANGE] === 'function';
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
function notifyPropertyChange(obj, keyName, _meta, value) {
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
function beginPropertyChanges() {
  deferred++;
  suspendedObserverDeactivation();
}
/**
  @method endPropertyChanges
  @private
*/
function endPropertyChanges() {
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
function changeProperties(callback) {
  beginPropertyChanges();
  try {
    callback();
  } finally {
    endPropertyChanges();
  }
}

function arrayContentWillChange(array, startIdx, removeAmt, addAmt) {
  // if no args are passed assume everything changes
  if (startIdx === undefined) {
    startIdx = 0;
    removeAmt = addAmt = -1;
  } else {
    if (removeAmt === undefined) {
      removeAmt = -1;
    }
    if (addAmt === undefined) {
      addAmt = -1;
    }
  }
  sendEvent(array, '@array:before', [array, startIdx, removeAmt, addAmt]);
  return array;
}
function arrayContentDidChange(array, startIdx, removeAmt, addAmt, notify = true) {
  // if no args are passed assume everything changes
  if (startIdx === undefined) {
    startIdx = 0;
    removeAmt = addAmt = -1;
  } else {
    if (removeAmt === undefined) {
      removeAmt = -1;
    }
    if (addAmt === undefined) {
      addAmt = -1;
    }
  }
  let meta = peekMeta(array);
  if (notify) {
    if (addAmt < 0 || removeAmt < 0 || addAmt - removeAmt !== 0) {
      notifyPropertyChange(array, 'length', meta);
    }
    notifyPropertyChange(array, '[]', meta);
  }
  sendEvent(array, '@array:change', [array, startIdx, removeAmt, addAmt]);
  if (meta !== null) {
    let length = array.length;
    let addedAmount = addAmt === -1 ? 0 : addAmt;
    let removedAmount = removeAmt === -1 ? 0 : removeAmt;
    let delta = addedAmount - removedAmount;
    let previousLength = length - delta;
    let normalStartIdx = startIdx < 0 ? previousLength + startIdx : startIdx;
    if (meta.revisionFor('firstObject') !== undefined && normalStartIdx === 0) {
      notifyPropertyChange(array, 'firstObject', meta);
    }
    if (meta.revisionFor('lastObject') !== undefined) {
      let previousLastIndex = previousLength - 1;
      let lastAffectedIndex = normalStartIdx + removedAmount;
      if (previousLastIndex < lastAffectedIndex) {
        notifyPropertyChange(array, 'lastObject', meta);
      }
    }
  }
  return array;
}

const EMPTY_ARRAY = Object.freeze([]);
function objectAt(array, index) {
  if (Array.isArray(array)) {
    return array[index];
  } else {
    return array.objectAt(index);
  }
}
// Ideally, we'd use MutableArray.detect but for unknown reasons this causes
// the node tests to fail strangely.
function isMutableArray(obj) {
  return obj != null && typeof obj.replace === 'function';
}
function replace(array, start, deleteCount, items = EMPTY_ARRAY) {
  if (isMutableArray(array)) {
    array.replace(start, deleteCount, items);
  } else {
    assert('Can only replace content of a native array or MutableArray', Array.isArray(array));
    replaceInNativeArray(array, start, deleteCount, items);
  }
}
const CHUNK_SIZE = 60000;
// To avoid overflowing the stack, we splice up to CHUNK_SIZE items at a time.
// See https://code.google.com/p/chromium/issues/detail?id=56588 for more details.
function replaceInNativeArray(array, start, deleteCount, items) {
  arrayContentWillChange(array, start, deleteCount, items.length);
  if (items.length <= CHUNK_SIZE) {
    array.splice(start, deleteCount, ...items);
  } else {
    array.splice(start, deleteCount);
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      let chunk = items.slice(i, i + CHUNK_SIZE);
      array.splice(start + i, 0, ...chunk);
    }
  }
  arrayContentDidChange(array, start, deleteCount, items.length);
}
function arrayObserversHelper(obj, target, opts, operation) {
  let {
    willChange,
    didChange
  } = opts;
  operation(obj, '@array:before', target, willChange);
  operation(obj, '@array:change', target, didChange);
  /*
   * Array proxies have a `_revalidate` method which must be called to set
   * up their internal array observation systems.
   */
  obj._revalidate?.();
  return obj;
}
function addArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, addListener);
}
function removeArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, removeListener);
}

const CHAIN_PASS_THROUGH = new WeakSet();
function finishLazyChains(meta, key, value) {
  let lazyTags = meta.readableLazyChainsFor(key);
  if (lazyTags === undefined) {
    return;
  }
  if (isObject(value)) {
    for (let [tag, deps] of lazyTags) {
      updateTag(tag, getChainTagsForKey(value, deps, tagMetaFor(value), peekMeta(value)));
    }
  }
  lazyTags.length = 0;
}
function getChainTagsForKeys(obj, keys, tagMeta, meta) {
  let tags = [];
  for (let key of keys) {
    getChainTags(tags, obj, key, tagMeta, meta);
  }
  return combine(tags);
}
function getChainTagsForKey(obj, key, tagMeta, meta) {
  return combine(getChainTags([], obj, key, tagMeta, meta));
}
function getChainTags(chainTags, obj, path, tagMeta, meta$1) {
  let current = obj;
  let currentTagMeta = tagMeta;
  let currentMeta = meta$1;
  let pathLength = path.length;
  let segmentEnd = -1;
  // prevent closures
  let segment, descriptor;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let lastSegmentEnd = segmentEnd + 1;
    segmentEnd = path.indexOf('.', lastSegmentEnd);
    if (segmentEnd === -1) {
      segmentEnd = pathLength;
    }
    segment = path.slice(lastSegmentEnd, segmentEnd);
    // If the segment is an @each, we can process it and then break
    if (segment === '@each' && segmentEnd !== pathLength) {
      lastSegmentEnd = segmentEnd + 1;
      segmentEnd = path.indexOf('.', lastSegmentEnd);
      let arrLength = current.length;
      if (typeof arrLength !== 'number' ||
      // TODO: should the second test be `isEmberArray` instead?
      !(Array.isArray(current) || 'objectAt' in current)) {
        // If the current object isn't an array, there's nothing else to do,
        // we don't watch individual properties. Break out of the loop.
        break;
      } else if (arrLength === 0) {
        // Fast path for empty arrays
        chainTags.push(tagForProperty(current, '[]'));
        break;
      }
      if (segmentEnd === -1) {
        segment = path.slice(lastSegmentEnd);
      } else {
        // Deprecated, remove once we turn the deprecation into an assertion
        segment = path.slice(lastSegmentEnd, segmentEnd);
      }
      // Push the tags for each item's property
      for (let i = 0; i < arrLength; i++) {
        let item = objectAt(current, i);
        if (item) {
          assert(`When using @each to observe the array \`${current.toString()}\`, the items in the array must be objects`, typeof item === 'object');
          chainTags.push(tagForProperty(item, segment, true));
          currentMeta = peekMeta(item);
          descriptor = currentMeta !== null ? currentMeta.peekDescriptors(segment) : undefined;
          // If the key is an alias, we need to bootstrap it
          if (descriptor !== undefined && typeof descriptor.altKey === 'string') {
            item[segment];
          }
        }
      }
      // Push the tag for the array length itself
      chainTags.push(tagForProperty(current, '[]', true, currentTagMeta));
      break;
    }
    let propertyTag = tagForProperty(current, segment, true, currentTagMeta);
    descriptor = currentMeta !== null ? currentMeta.peekDescriptors(segment) : undefined;
    chainTags.push(propertyTag);
    // If we're at the end of the path, processing the last segment, and it's
    // not an alias, we should _not_ get the last value, since we already have
    // its tag. There's no reason to access it and do more work.
    if (segmentEnd === pathLength) {
      // If the key was an alias, we should always get the next value in order to
      // bootstrap the alias. This is because aliases, unlike other CPs, should
      // always be in sync with the aliased value.
      if (CHAIN_PASS_THROUGH.has(descriptor)) {
        current[segment];
      }
      break;
    }
    if (descriptor === undefined) {
      // If the descriptor is undefined, then its a normal property, so we should
      // lookup the value to chain off of like normal.
      if (!(segment in current) && typeof current.unknownProperty === 'function') {
        current = current.unknownProperty(segment);
      } else {
        current = current[segment];
      }
    } else if (CHAIN_PASS_THROUGH.has(descriptor)) {
      current = current[segment];
    } else {
      // If the descriptor is defined, then its a normal CP (not an alias, which
      // would have been handled earlier). We get the last revision to check if
      // the CP is still valid, and if so we use the cached value. If not, then
      // we create a lazy chain lookup, and the next time the CP is calculated,
      // it will update that lazy chain.
      let instanceMeta = currentMeta.source === current ? currentMeta : meta(current);
      let lastRevision = instanceMeta.revisionFor(segment);
      if (lastRevision !== undefined && validateTag(propertyTag, lastRevision)) {
        current = instanceMeta.valueFor(segment);
      } else {
        // use metaFor here to ensure we have the meta for the instance
        let lazyChains = instanceMeta.writableLazyChainsFor(segment);
        let rest = path.substring(segmentEnd + 1);
        let placeholderTag = createUpdatableTag();
        lazyChains.push([placeholderTag, rest]);
        chainTags.push(placeholderTag);
        break;
      }
    }
    if (!isObject(current)) {
      // we've hit the end of the chain for now, break out
      break;
    }
    currentTagMeta = tagMetaFor(current);
    currentMeta = peekMeta(current);
  }
  return chainTags;
}

function isElementDescriptor(args) {
  let [maybeTarget, maybeKey, maybeDesc] = args;
  return (
    // Ensure we have the right number of args
    args.length === 3 && (
    // Make sure the target is a class or object (prototype)
    typeof maybeTarget === 'function' || typeof maybeTarget === 'object' && maybeTarget !== null) &&
    // Make sure the key is a string
    typeof maybeKey === 'string' && (
    // Make sure the descriptor is the right shape
    typeof maybeDesc === 'object' && maybeDesc !== null || maybeDesc === undefined)
  );
}
function nativeDescDecorator(propertyDesc) {
  let decorator = function () {
    return propertyDesc;
  };
  setClassicDecorator(decorator);
  return decorator;
}
/**
  Objects of this type can implement an interface to respond to requests to
  get and set. The default implementation handles simple properties.

  @class Descriptor
  @private
*/
class ComputedDescriptor {
  constructor() {
    this.enumerable = true;
    this.configurable = true;
    this._dependentKeys = undefined;
    this._meta = undefined;
  }
  setup(_obj, keyName, _propertyDesc, meta) {
    meta.writeDescriptors(keyName, this);
  }
  teardown(_obj, keyName, meta) {
    meta.removeDescriptors(keyName);
  }
}
let COMPUTED_GETTERS;
if (DEBUG) {
  COMPUTED_GETTERS = new WeakSet();
}
function DESCRIPTOR_GETTER_FUNCTION(name, descriptor) {
  function getter() {
    return descriptor.get(this, name);
  }
  if (DEBUG) {
    COMPUTED_GETTERS.add(getter);
  }
  return getter;
}
function DESCRIPTOR_SETTER_FUNCTION(name, descriptor) {
  let set = function CPSETTER_FUNCTION(value) {
    return descriptor.set(this, name, value);
  };
  COMPUTED_SETTERS.add(set);
  return set;
}
const COMPUTED_SETTERS = new WeakSet();
function makeComputedDecorator(desc, DecoratorClass) {
  let decorator = function COMPUTED_DECORATOR(target, key, propertyDesc, maybeMeta, isClassicDecorator) {
    assert(`Only one computed property decorator can be applied to a class field or accessor, but '${key}' was decorated twice. You may have added the decorator to both a getter and setter, which is unnecessary.`, isClassicDecorator || !propertyDesc || !propertyDesc.get || !COMPUTED_GETTERS.has(propertyDesc.get));
    let meta$1 = arguments.length === 3 ? meta(target) : maybeMeta;
    desc.setup(target, key, propertyDesc, meta$1);
    let computedDesc = {
      enumerable: desc.enumerable,
      configurable: desc.configurable,
      get: DESCRIPTOR_GETTER_FUNCTION(key, desc),
      set: DESCRIPTOR_SETTER_FUNCTION(key, desc)
    };
    return computedDesc;
  };
  setClassicDecorator(decorator, desc);
  Object.setPrototypeOf(decorator, DecoratorClass.prototype);
  return decorator;
}
/////////////
const DECORATOR_DESCRIPTOR_MAP = new WeakMap();
/**
  Returns the CP descriptor associated with `obj` and `keyName`, if any.

  @method descriptorForProperty
  @param {Object} obj the object to check
  @param {String} keyName the key to check
  @return {Descriptor}
  @private
*/
function descriptorForProperty(obj, keyName, _meta) {
  assert('Cannot call `descriptorForProperty` on null', obj !== null);
  assert('Cannot call `descriptorForProperty` on undefined', obj !== undefined);
  assert(`Cannot call \`descriptorForProperty\` on ${typeof obj}`, typeof obj === 'object' || typeof obj === 'function');
  let meta = _meta === undefined ? peekMeta(obj) : _meta;
  if (meta !== null) {
    return meta.peekDescriptors(keyName);
  }
}
function descriptorForDecorator(dec) {
  return DECORATOR_DESCRIPTOR_MAP.get(dec);
}
/**
  Check whether a value is a decorator

  @method isClassicDecorator
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
function isClassicDecorator(dec) {
  return typeof dec === 'function' && DECORATOR_DESCRIPTOR_MAP.has(dec);
}
/**
  Set a value as a decorator

  @method setClassicDecorator
  @param {function} decorator the value to mark as a decorator
  @private
*/
function setClassicDecorator(dec, value = true) {
  DECORATOR_DESCRIPTOR_MAP.set(dec, value);
}

/**
@module @ember/object
*/
const END_WITH_EACH_REGEX = /\.@each$/;
/**
  Expands `pattern`, invoking `callback` for each expansion.

  The only pattern supported is brace-expansion, anything else will be passed
  once to `callback` directly.

  Example

  ```js
  import { expandProperties } from '@ember/object/computed';

  function echo(arg){ console.log(arg); }

  expandProperties('foo.bar', echo);              //=> 'foo.bar'
  expandProperties('{foo,bar}', echo);            //=> 'foo', 'bar'
  expandProperties('foo.{bar,baz}', echo);        //=> 'foo.bar', 'foo.baz'
  expandProperties('{foo,bar}.baz', echo);        //=> 'foo.baz', 'bar.baz'
  expandProperties('foo.{bar,baz}.[]', echo)      //=> 'foo.bar.[]', 'foo.baz.[]'
  expandProperties('{foo,bar}.{spam,eggs}', echo) //=> 'foo.spam', 'foo.eggs', 'bar.spam', 'bar.eggs'
  expandProperties('{foo}.bar.{baz}')             //=> 'foo.bar.baz'
  ```

  @method expandProperties
  @static
  @for @ember/object/computed
  @public
  @param {String} pattern The property pattern to expand.
  @param {Function} callback The callback to invoke.  It is invoked once per
  expansion, and is passed the expansion.
*/
function expandProperties(pattern, callback) {
  assert(`A computed property key must be a string, you passed ${typeof pattern} ${pattern}`, typeof pattern === 'string');
  assert('Brace expanded properties cannot contain spaces, e.g. "user.{firstName, lastName}" should be "user.{firstName,lastName}"', pattern.indexOf(' ') === -1);
  // regex to look for double open, double close, or unclosed braces
  assert(`Brace expanded properties have to be balanced and cannot be nested, pattern: ${pattern}`, pattern.match(/\{[^}{]*\{|\}[^}{]*\}|\{[^}]*$/g) === null);
  let start = pattern.indexOf('{');
  if (start < 0) {
    callback(pattern.replace(END_WITH_EACH_REGEX, '.[]'));
  } else {
    dive('', pattern, start, callback);
  }
}
function dive(prefix, pattern, start, callback) {
  let end = pattern.indexOf('}'),
    i = 0,
    newStart,
    arrayLength;
  let tempArr = pattern.substring(start + 1, end).split(',');
  let after = pattern.substring(end + 1);
  prefix = prefix + pattern.substring(0, start);
  arrayLength = tempArr.length;
  while (i < arrayLength) {
    newStart = after.indexOf('{');
    if (newStart < 0) {
      callback((prefix + tempArr[i++] + after).replace(END_WITH_EACH_REGEX, '.[]'));
    } else {
      dive(prefix + tempArr[i++], after, newStart, callback);
    }
  }
}

/**
@module @ember/object
*/
const DEEP_EACH_REGEX = /\.@each\.[^.]+\./;
function noop() {}
/**
  `@computed` is a decorator that turns a JavaScript getter and setter into a
  computed property, which is a _cached, trackable value_. By default the getter
  will only be called once and the result will be cached. You can specify
  various properties that your computed property depends on. This will force the
  cached result to be cleared if the dependencies are modified, and lazily recomputed the next time something asks for it.

  In the following example we decorate a getter - `fullName` -  by calling
  `computed` with the property dependencies (`firstName` and `lastName`) as
  arguments. The `fullName` getter will be called once (regardless of how many
  times it is accessed) as long as its dependencies do not change. Once
  `firstName` or `lastName` are updated any future calls to `fullName` will
  incorporate the new values, and any watchers of the value such as templates
  will be updated:

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  });

  let tom = new Person('Tom', 'Dale');

  tom.fullName; // 'Tom Dale'
  ```

  You can also provide a setter, which will be used when updating the computed
  property. Ember's `set` function must be used to update the property
  since it will also notify observers of the property:

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }

    set fullName(value) {
      let [firstName, lastName] = value.split(' ');

      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }
  });

  let person = new Person();

  set(person, 'fullName', 'Peter Wagenet');
  person.firstName; // 'Peter'
  person.lastName;  // 'Wagenet'
  ```

  You can also pass a getter function or object with `get` and `set` functions
  as the last argument to the computed decorator. This allows you to define
  computed property _macros_:

  ```js
  import { computed } from '@ember/object';

  function join(...keys) {
    return computed(...keys, function() {
      return keys.map(key => this[key]).join(' ');
    });
  }

  class Person {
    @join('firstName', 'lastName')
    fullName;
  }
  ```

  Note that when defined this way, getters and setters receive the _key_ of the
  property they are decorating as the first argument. Setters receive the value
  they are setting to as the second argument instead. Additionally, setters must
  _return_ the value that should be cached:

  ```javascript
  import { computed, set } from '@ember/object';

  function fullNameMacro(firstNameKey, lastNameKey) {
    return computed(firstNameKey, lastNameKey, {
      get() {
        return `${this[firstNameKey]} ${this[lastNameKey]}`;
      }

      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        set(this, firstNameKey, firstName);
        set(this, lastNameKey, lastName);

        return value;
      }
    });
  }

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @fullNameMacro('firstName', 'lastName') fullName;
  });

  let person = new Person();

  set(person, 'fullName', 'Peter Wagenet');
  person.firstName; // 'Peter'
  person.lastName;  // 'Wagenet'
  ```

  Computed properties can also be used in classic classes. To do this, we
  provide the getter and setter as the last argument like we would for a macro,
  and we assign it to a property on the class definition. This is an _anonymous_
  computed macro:

  ```javascript
  import EmberObject, { computed, set } from '@ember/object';

  let Person = EmberObject.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', {
      get() {
        return `${this.firstName} ${this.lastName}`;
      }

      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        set(this, 'firstName', firstName);
        set(this, 'lastName', lastName);

        return value;
      }
    })
  });

  let tom = Person.create({
    firstName: 'Tom',
    lastName: 'Dale'
  });

  tom.get('fullName') // 'Tom Dale'
  ```

  You can overwrite computed property without setters with a normal property (no
  longer computed) that won't change if dependencies change. You can also mark
  computed property as `.readOnly()` and block all attempts to set it.

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName').readOnly()
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  });

  let person = new Person();
  person.set('fullName', 'Peter Wagenet'); // Uncaught Error: Cannot set read-only property "fullName" on object: <(...):emberXXX>
  ```

  Additional resources:
  - [Decorators RFC](https://github.com/emberjs/rfcs/blob/master/text/0408-decorators.md)
  - [New CP syntax RFC](https://github.com/emberjs/rfcs/blob/master/text/0011-improved-cp-syntax.md)
  - [New computed syntax explained in "Ember 1.12 released" ](https://emberjs.com/blog/2015/05/13/ember-1-12-released.html#toc_new-computed-syntax)

  @class ComputedProperty
  @public
*/
class ComputedProperty extends ComputedDescriptor {
  constructor(args) {
    super();
    this._readOnly = false;
    this._hasConfig = false;
    this._getter = undefined;
    this._setter = undefined;
    let maybeConfig = args[args.length - 1];
    if (typeof maybeConfig === 'function' || maybeConfig !== null && typeof maybeConfig === 'object') {
      this._hasConfig = true;
      let config = args.pop();
      if (typeof config === 'function') {
        assert(`You attempted to pass a computed property instance to computed(). Computed property instances are decorator functions, and cannot be passed to computed() because they cannot be turned into decorators twice`, !isClassicDecorator(config));
        this._getter = config;
      } else {
        const objectConfig = config;
        assert('computed expects a function or an object as last argument.', typeof objectConfig === 'object' && !Array.isArray(objectConfig));
        assert('Config object passed to computed can only contain `get` and `set` keys.', Object.keys(objectConfig).every(key => key === 'get' || key === 'set'));
        assert('Computed properties must receive a getter or a setter, you passed none.', Boolean(objectConfig.get) || Boolean(objectConfig.set));
        this._getter = objectConfig.get || noop;
        this._setter = objectConfig.set;
      }
    }
    if (args.length > 0) {
      this._property(...args);
    }
  }
  setup(obj, keyName, propertyDesc, meta) {
    super.setup(obj, keyName, propertyDesc, meta);
    assert(`@computed can only be used on accessors or fields, attempted to use it with ${keyName} but that was a method. Try converting it to a getter (e.g. \`get ${keyName}() {}\`)`, !(propertyDesc && typeof propertyDesc.value === 'function'));
    assert(`@computed can only be used on empty fields. ${keyName} has an initial value (e.g. \`${keyName} = someValue\`)`, !propertyDesc || !propertyDesc.initializer);
    assert(`Attempted to apply a computed property that already has a getter/setter to a ${keyName}, but it is a method or an accessor. If you passed @computed a function or getter/setter (e.g. \`@computed({ get() { ... } })\`), then it must be applied to a field`, !(this._hasConfig && propertyDesc && (typeof propertyDesc.get === 'function' || typeof propertyDesc.set === 'function')));
    if (this._hasConfig === false) {
      assert(`Attempted to use @computed on ${keyName}, but it did not have a getter or a setter. You must either pass a get a function or getter/setter to @computed directly (e.g. \`@computed({ get() { ... } })\`) or apply @computed directly to a getter/setter`, propertyDesc && (typeof propertyDesc.get === 'function' || typeof propertyDesc.set === 'function'));
      let {
        get,
        set
      } = propertyDesc;
      if (get !== undefined) {
        this._getter = get;
      }
      if (set !== undefined) {
        this._setter = function setterWrapper(_key, value) {
          let ret = set.call(this, value);
          if (get !== undefined) {
            return typeof ret === 'undefined' ? get.call(this) : ret;
          }
          return ret;
        };
      }
    }
  }
  _property(...passedArgs) {
    let args = [];
    function addArg(property) {
      assert(`Dependent keys containing @each only work one level deep. ` + `You used the key "${property}" which is invalid. ` + `Please create an intermediary computed property or ` + `switch to using tracked properties.`, DEEP_EACH_REGEX.test(property) === false);
      args.push(property);
    }
    for (let arg of passedArgs) {
      expandProperties(arg, addArg);
    }
    this._dependentKeys = args;
  }
  get(obj, keyName) {
    let meta$1 = meta(obj);
    let tagMeta = tagMetaFor(obj);
    let propertyTag = tagFor(obj, keyName, tagMeta);
    let ret;
    let revision = meta$1.revisionFor(keyName);
    if (revision !== undefined && validateTag(propertyTag, revision)) {
      ret = meta$1.valueFor(keyName);
    } else {
      // For backwards compatibility, we only throw if the CP has any dependencies. CPs without dependencies
      // should be allowed, even after the object has been destroyed, which is why we check _dependentKeys.
      assert(`Attempted to access the computed ${obj}.${keyName} on a destroyed object, which is not allowed`, this._dependentKeys === undefined || !isDestroyed(obj));
      let {
        _getter,
        _dependentKeys
      } = this;
      // Create a tracker that absorbs any trackable actions inside the CP
      untrack(() => {
        ret = _getter.call(obj, keyName);
      });
      if (_dependentKeys !== undefined) {
        updateTag(propertyTag, getChainTagsForKeys(obj, _dependentKeys, tagMeta, meta$1));
        if (DEBUG) {
          ALLOW_CYCLES.set(propertyTag, true);
        }
      }
      meta$1.setValueFor(keyName, ret);
      meta$1.setRevisionFor(keyName, valueForTag(propertyTag));
      finishLazyChains(meta$1, keyName, ret);
    }
    consumeTag(propertyTag);
    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(ret)) {
      consumeTag(tagFor(ret, '[]'));
    }
    return ret;
  }
  set(obj, keyName, value) {
    if (this._readOnly) {
      this._throwReadOnlyError(obj, keyName);
    }
    assert(`Cannot override the computed property \`${keyName}\` on ${toString(obj)}.`, this._setter !== undefined);
    let meta$1 = meta(obj);
    // ensure two way binding works when the component has defined a computed
    // property with both a setter and dependent keys, in that scenario without
    // the sync observer added below the caller's value will never be updated
    //
    // See GH#18147 / GH#19028 for details.
    if (
    // ensure that we only run this once, while the component is being instantiated
    meta$1.isInitializing() && this._dependentKeys !== undefined && this._dependentKeys.length > 0 && typeof obj[PROPERTY_DID_CHANGE] === 'function' && obj.isComponent) {
      // It's redundant to do this here, but we don't want to check above so we can avoid an extra function call in prod.
      assert('property did change hook is invalid', hasPropertyDidChange(obj));
      addObserver(obj, keyName, () => {
        obj[PROPERTY_DID_CHANGE](keyName);
      }, undefined, true);
    }
    let ret;
    try {
      beginPropertyChanges();
      ret = this._set(obj, keyName, value, meta$1);
      finishLazyChains(meta$1, keyName, ret);
      let tagMeta = tagMetaFor(obj);
      let propertyTag = tagFor(obj, keyName, tagMeta);
      let {
        _dependentKeys
      } = this;
      if (_dependentKeys !== undefined) {
        updateTag(propertyTag, getChainTagsForKeys(obj, _dependentKeys, tagMeta, meta$1));
        if (DEBUG) {
          ALLOW_CYCLES.set(propertyTag, true);
        }
      }
      meta$1.setRevisionFor(keyName, valueForTag(propertyTag));
    } finally {
      endPropertyChanges();
    }
    return ret;
  }
  _throwReadOnlyError(obj, keyName) {
    throw new Error(`Cannot set read-only property "${keyName}" on object: ${inspect(obj)}`);
  }
  _set(obj, keyName, value, meta) {
    let hadCachedValue = meta.revisionFor(keyName) !== undefined;
    let cachedValue = meta.valueFor(keyName);
    let ret;
    let {
      _setter
    } = this;
    setObserverSuspended(obj, keyName, true);
    try {
      ret = _setter.call(obj, keyName, value, cachedValue);
    } finally {
      setObserverSuspended(obj, keyName, false);
    }
    // allows setter to return the same value that is cached already
    if (hadCachedValue && cachedValue === ret) {
      return ret;
    }
    meta.setValueFor(keyName, ret);
    notifyPropertyChange(obj, keyName, meta, value);
    return ret;
  }
  /* called before property is overridden */
  teardown(obj, keyName, meta) {
    if (meta.revisionFor(keyName) !== undefined) {
      meta.setRevisionFor(keyName, undefined);
      meta.setValueFor(keyName, undefined);
    }
    super.teardown(obj, keyName, meta);
  }
}
class AutoComputedProperty extends ComputedProperty {
  get(obj, keyName) {
    let meta$1 = meta(obj);
    let tagMeta = tagMetaFor(obj);
    let propertyTag = tagFor(obj, keyName, tagMeta);
    let ret;
    let revision = meta$1.revisionFor(keyName);
    if (revision !== undefined && validateTag(propertyTag, revision)) {
      ret = meta$1.valueFor(keyName);
    } else {
      assert(`Attempted to access the computed ${obj}.${keyName} on a destroyed object, which is not allowed`, !isDestroyed(obj));
      let {
        _getter
      } = this;
      // Create a tracker that absorbs any trackable actions inside the CP
      let tag = track(() => {
        ret = _getter.call(obj, keyName);
      });
      updateTag(propertyTag, tag);
      meta$1.setValueFor(keyName, ret);
      meta$1.setRevisionFor(keyName, valueForTag(propertyTag));
      finishLazyChains(meta$1, keyName, ret);
    }
    consumeTag(propertyTag);
    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(ret)) {
      consumeTag(tagFor(ret, '[]', tagMeta));
    }
    return ret;
  }
}
// TODO: This class can be svelted once `meta` has been deprecated
class ComputedDecoratorImpl extends Function {
  /**
    Call on a computed property to set it into read-only mode. When in this
    mode the computed property will throw an error when set.
       Example:
       ```javascript
    import { computed, set } from '@ember/object';
       class Person {
      @computed().readOnly()
      get guid() {
        return 'guid-guid-guid';
      }
    }
       let person = new Person();
    set(person, 'guid', 'new-guid'); // will throw an exception
    ```
       Classic Class Example:
       ```javascript
    import EmberObject, { computed } from '@ember/object';
       let Person = EmberObject.extend({
      guid: computed(function() {
        return 'guid-guid-guid';
      }).readOnly()
    });
       let person = Person.create();
    person.set('guid', 'new-guid'); // will throw an exception
    ```
       @method readOnly
    @return {ComputedProperty} this
    @chainable
    @public
  */
  readOnly() {
    let desc = descriptorForDecorator(this);
    assert('Computed properties that define a setter using the new syntax cannot be read-only', !(desc._setter && desc._setter !== desc._getter));
    desc._readOnly = true;
    return this;
  }
  meta(meta) {
    let prop = descriptorForDecorator(this);
    if (arguments.length === 0) {
      return prop._meta || {};
    } else {
      prop._meta = meta;
      return this;
    }
  }
  // TODO: Remove this when we can provide alternatives in the ecosystem to
  // addons such as ember-macro-helpers that use it.
  /** @internal */
  get _getter() {
    return descriptorForDecorator(this)._getter;
  }
  // TODO: Refactor this, this is an internal API only
  /** @internal */
  set enumerable(value) {
    descriptorForDecorator(this).enumerable = value;
  }
}
function computed(...args) {
  assert(`@computed can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: computed()`, !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true));
  if (isElementDescriptor(args)) {
    // SAFETY: We passed in the impl for this class
    let decorator = makeComputedDecorator(new ComputedProperty([]), ComputedDecoratorImpl);
    return decorator(args[0], args[1], args[2]);
  }
  // SAFETY: We passed in the impl for this class
  return makeComputedDecorator(new ComputedProperty(args), ComputedDecoratorImpl);
}
function autoComputed(...config) {
  // SAFETY: We passed in the impl for this class
  return makeComputedDecorator(new AutoComputedProperty(config), ComputedDecoratorImpl);
}
/**
  Allows checking if a given property on an object is a computed property. For the most part,
  this doesn't matter (you would normally just access the property directly and use its value),
  but for some tooling specific scenarios (e.g. the ember-inspector) it is important to
  differentiate if a property is a computed property or a "normal" property.

  This will work on either a class's prototype or an instance itself.

  @static
  @method isComputed
  @for @ember/debug
  @private
 */
function isComputed(obj, key) {
  return Boolean(descriptorForProperty(obj, key));
}

function getCachedValueFor(obj, key) {
  let meta = peekMeta(obj);
  if (meta) {
    return meta.valueFor(key);
  } else {
    return undefined;
  }
}

/**
@module @ember/object
*/
/**
  NOTE: This is a low-level method used by other parts of the API. You almost
  never want to call this method directly. Instead you should use
  `mixin()` to define new properties.

  Defines a property on an object. This method works much like the ES5
  `Object.defineProperty()` method except that it can also accept computed
  properties and other special descriptors.

  Normally this method takes only three parameters. However if you pass an
  instance of `Descriptor` as the third param then you can pass an
  optional value as the fourth parameter. This is often more efficient than
  creating new descriptor hashes for each property.

  ## Examples

  ```javascript
  import { defineProperty, computed } from '@ember/object';

  // ES5 compatible mode
  defineProperty(contact, 'firstName', {
    writable: true,
    configurable: false,
    enumerable: true,
    value: 'Charles'
  });

  // define a simple property
  defineProperty(contact, 'lastName', undefined, 'Jolley');

  // define a computed property
  defineProperty(contact, 'fullName', computed('firstName', 'lastName', function() {
    return this.firstName+' '+this.lastName;
  }));
  ```

  @public
  @method defineProperty
  @static
  @for @ember/object
  @param {Object} obj the object to define this property on. This may be a prototype.
  @param {String} keyName the name of the property
  @param {Descriptor} [desc] an instance of `Descriptor` (typically a
    computed property) or an ES5 descriptor.
    You must provide this or `data` but not both.
  @param {*} [data] something other than a descriptor, that will
    become the explicit value of this property.
*/
function defineProperty(obj, keyName, desc, data, _meta) {
  let meta$1 = _meta === undefined ? meta(obj) : _meta;
  let previousDesc = descriptorForProperty(obj, keyName, meta$1);
  let wasDescriptor = previousDesc !== undefined;
  if (wasDescriptor) {
    previousDesc.teardown(obj, keyName, meta$1);
  }
  if (isClassicDecorator(desc)) {
    defineDecorator(obj, keyName, desc, meta$1);
  } else if (desc === null || desc === undefined) {
    defineValue(obj, keyName, data, wasDescriptor, true);
  } else {
    // fallback to ES5
    Object.defineProperty(obj, keyName, desc);
  }
  // if key is being watched, override chains that
  // were initialized with the prototype
  if (!meta$1.isPrototypeMeta(obj)) {
    revalidateObservers(obj);
  }
}
function defineDecorator(obj, keyName, desc, meta) {
  let propertyDesc;
  if (DEBUG) {
    propertyDesc = desc(obj, keyName, undefined, meta, true);
  } else {
    propertyDesc = desc(obj, keyName, undefined, meta);
  }
  Object.defineProperty(obj, keyName, propertyDesc);
  // pass the decorator function forward for backwards compat
  return desc;
}
function defineValue(obj, keyName, value, wasDescriptor, enumerable = true) {
  if (wasDescriptor === true || enumerable === false) {
    Object.defineProperty(obj, keyName, {
      configurable: true,
      enumerable,
      writable: true,
      value
    });
  } else {
    if (DEBUG) {
      setWithMandatorySetter(obj, keyName, value);
    } else {
      obj[keyName] = value;
    }
  }
  return value;
}

const firstDotIndexCache = new Cache(1000, key => key.indexOf('.'));
function isPath(path) {
  return typeof path === 'string' && firstDotIndexCache.get(path) !== -1;
}

const PROXY_CONTENT = symbol('PROXY_CONTENT');
let getPossibleMandatoryProxyValue;
if (DEBUG) {
  getPossibleMandatoryProxyValue = function getPossibleMandatoryProxyValue(obj, keyName) {
    let content = obj[PROXY_CONTENT];
    if (content === undefined) {
      return obj[keyName];
    } else {
      /* global Reflect */
      return Reflect.get(content, keyName, obj);
    }
  };
}
function hasUnknownProperty(val) {
  return typeof val === 'object' && val !== null && typeof val.unknownProperty === 'function';
}
function get(obj, keyName) {
  assert(`Get must be called with two arguments; an object and a property key`, arguments.length === 2);
  assert(`Cannot call get with '${keyName}' on an undefined object.`, obj !== undefined && obj !== null);
  assert(`The key provided to get must be a string or number, you passed ${keyName}`, typeof keyName === 'string' || typeof keyName === 'number' && !isNaN(keyName));
  assert(`'this' in paths is not supported`, typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0);
  return isPath(keyName) ? _getPath(obj, keyName) : _getProp(obj, keyName);
}
function _getProp(obj, keyName) {
  if (obj == null) {
    return;
  }
  let value;
  if (typeof obj === 'object' || typeof obj === 'function') {
    if (DEBUG) {
      value = getPossibleMandatoryProxyValue(obj, keyName);
    } else {
      value = obj[keyName];
    }
    if (value === undefined && typeof obj === 'object' && !(keyName in obj) && hasUnknownProperty(obj)) {
      value = obj.unknownProperty(keyName);
    }
    if (isTracking()) {
      consumeTag(tagFor(obj, keyName));
      if (Array.isArray(value) || isEmberArray(value)) {
        // Add the tag of the returned value if it is an array, since arrays
        // should always cause updates if they are consumed and then changed
        consumeTag(tagFor(value, '[]'));
      }
    }
  } else {
    // SAFETY: It should be ok to access properties on any non-nullish value
    value = obj[keyName];
  }
  return value;
}
function _getPath(obj, path, forSet) {
  let parts = typeof path === 'string' ? path.split('.') : path;
  for (let part of parts) {
    if (obj === undefined || obj === null || obj.isDestroyed) {
      return undefined;
    }
    if (forSet && (part === '__proto__' || part === 'constructor')) {
      return;
    }
    obj = _getProp(obj, part);
  }
  return obj;
}
// Warm it up
_getProp('foo', 'a');
_getProp('foo', 1);
_getProp({}, 'a');
_getProp({}, 1);
_getProp({
  unknownProperty() {}
}, 'a');
_getProp({
  unknownProperty() {}
}, 1);
get({}, 'foo');
get({}, 'foo.bar');
let fakeProxy = {};
setProxy(fakeProxy);
track(() => _getProp({}, 'a'));
track(() => _getProp({}, 1));
track(() => _getProp({
  a: []
}, 'a'));
track(() => _getProp({
  a: fakeProxy
}, 'a'));

/**
 @module @ember/object
*/
/**
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change.
  If the specified property is not defined on the object and the object
  implements the `setUnknownProperty` method, then instead of setting the
  value of the property on the object, its `setUnknownProperty` handler
  will be invoked with the two parameters `keyName` and `value`.

  ```javascript
  import { set } from '@ember/object';
  set(obj, "name", value);
  ```

  @method set
  @static
  @for @ember/object
  @param {Object} obj The object to modify.
  @param {String} keyName The property key to set
  @param {Object} value The value to set
  @return {Object} the passed value.
  @public
*/
function set(obj, keyName, value, tolerant) {
  assert(`Set must be called with three or four arguments; an object, a property key, a value and tolerant true/false`, arguments.length === 3 || arguments.length === 4);
  assert(`Cannot call set with '${keyName}' on an undefined object.`, obj && typeof obj === 'object' || typeof obj === 'function');
  assert(`The key provided to set must be a string or number, you passed ${keyName}`, typeof keyName === 'string' || typeof keyName === 'number' && !isNaN(keyName));
  assert(`'this' in paths is not supported`, typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0);
  if (obj.isDestroyed) {
    assert(`calling set on destroyed object: ${toString(obj)}.${keyName} = ${toString(value)}`, tolerant);
    return value;
  }
  return isPath(keyName) ? _setPath(obj, keyName, value, tolerant) : _setProp(obj, keyName, value);
}
function _setProp(obj, keyName, value) {
  let descriptor = lookupDescriptor(obj, keyName);
  if (descriptor !== null && COMPUTED_SETTERS.has(descriptor.set)) {
    obj[keyName] = value;
    return value;
  }
  let currentValue;
  if (DEBUG) {
    currentValue = getPossibleMandatoryProxyValue(obj, keyName);
  } else {
    currentValue = obj[keyName];
  }
  if (currentValue === undefined && 'object' === typeof obj && !(keyName in obj) && typeof obj.setUnknownProperty === 'function') {
    /* unknown property */
    obj.setUnknownProperty(keyName, value);
  } else {
    if (DEBUG) {
      setWithMandatorySetter(obj, keyName, value);
    } else {
      obj[keyName] = value;
    }
    if (currentValue !== value) {
      notifyPropertyChange(obj, keyName);
    }
  }
  return value;
}
function _setPath(root, path, value, tolerant) {
  let parts = path.split('.');
  let keyName = parts.pop();
  assert('Property set failed: You passed an empty path', keyName.trim().length > 0);
  let newRoot = _getPath(root, parts, true);
  if (newRoot !== null && newRoot !== undefined) {
    return set(newRoot, keyName, value);
  } else if (!tolerant) {
    throw new Error(`Property set failed: object in path "${parts.join('.')}" could not be found.`);
  }
}
/**
  Error-tolerant form of `set`. Will not blow up if any part of the
  chain is `undefined`, `null`, or destroyed.

  This is primarily used when syncing bindings, which may try to update after
  an object has been destroyed.

  ```javascript
  import { trySet } from '@ember/object';

  let obj = { name: "Zoey" };
  trySet(obj, "contacts.twitter", "@emberjs");
  ```

  @method trySet
  @static
  @for @ember/object
  @param {Object} root The object to modify.
  @param {String} path The property path to set
  @param {Object} value The value to set
  @public
*/
function trySet(root, path, value) {
  return set(root, path, value, true);
}

function alias(altKey) {
  assert('You attempted to use @alias as a decorator directly, but it requires a `altKey` parameter', !isElementDescriptor(Array.prototype.slice.call(arguments)));
  // SAFETY: We passed in the impl for this class
  return makeComputedDecorator(new AliasedProperty(altKey), AliasDecoratorImpl);
}
// TODO: This class can be svelted once `meta` has been deprecated
class AliasDecoratorImpl extends Function {
  readOnly() {
    descriptorForDecorator(this).readOnly();
    return this;
  }
  oneWay() {
    descriptorForDecorator(this).oneWay();
    return this;
  }
  meta(meta) {
    let prop = descriptorForDecorator(this);
    if (arguments.length === 0) {
      return prop._meta || {};
    } else {
      prop._meta = meta;
    }
  }
}
class AliasedProperty extends ComputedDescriptor {
  constructor(altKey) {
    super();
    this.altKey = altKey;
  }
  setup(obj, keyName, propertyDesc, meta) {
    assert(`Setting alias '${keyName}' on self`, this.altKey !== keyName);
    super.setup(obj, keyName, propertyDesc, meta);
    CHAIN_PASS_THROUGH.add(this);
  }
  get(obj, keyName) {
    let ret;
    let meta$1 = meta(obj);
    let tagMeta = tagMetaFor(obj);
    let propertyTag = tagFor(obj, keyName, tagMeta);
    // We don't use the tag since CPs are not automatic, we just want to avoid
    // anything tracking while we get the altKey
    untrack(() => {
      ret = get(obj, this.altKey);
    });
    let lastRevision = meta$1.revisionFor(keyName);
    if (lastRevision === undefined || !validateTag(propertyTag, lastRevision)) {
      updateTag(propertyTag, getChainTagsForKey(obj, this.altKey, tagMeta, meta$1));
      meta$1.setRevisionFor(keyName, valueForTag(propertyTag));
      finishLazyChains(meta$1, keyName, ret);
    }
    consumeTag(propertyTag);
    return ret;
  }
  set(obj, _keyName, value) {
    return set(obj, this.altKey, value);
  }
  readOnly() {
    this.set = AliasedProperty_readOnlySet;
  }
  oneWay() {
    this.set = AliasedProperty_oneWaySet;
  }
}
function AliasedProperty_readOnlySet(obj, keyName) {
  throw new Error(`Cannot set read-only property '${keyName}' on object: ${inspect(obj)}`);
}
function AliasedProperty_oneWaySet(obj, keyName, value) {
  defineProperty(obj, keyName, null);
  return set(obj, keyName, value);
}

/**
@module ember
*/
/**
  Used internally to allow changing properties in a backwards compatible way, and print a helpful
  deprecation warning.

  @method deprecateProperty
  @param {Object} object The object to add the deprecated property to.
  @param {String} deprecatedKey The property to add (and print deprecation warnings upon accessing).
  @param {String} newKey The property that will be aliased.
  @private
  @since 1.7.0
*/
function deprecateProperty(object, deprecatedKey, newKey, options) {
  function _deprecate() {
    deprecate(`Usage of \`${deprecatedKey}\` is deprecated, use \`${newKey}\` instead.`, false, options);
  }
  Object.defineProperty(object, deprecatedKey, {
    configurable: true,
    enumerable: false,
    set(value) {
      _deprecate();
      set(this, newKey, value);
    },
    get() {
      _deprecate();
      return get(this, newKey);
    }
  });
}

const EACH_PROXIES = new WeakMap();
function eachProxyArrayWillChange(array, idx, removedCnt, addedCnt) {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy !== undefined) {
    eachProxy.arrayWillChange(array, idx, removedCnt, addedCnt);
  }
}
function eachProxyArrayDidChange(array, idx, removedCnt, addedCnt) {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy !== undefined) {
    eachProxy.arrayDidChange(array, idx, removedCnt, addedCnt);
  }
}

/**
 @module ember
*/
/**
  Helper class that allows you to register your library with Ember.

  Singleton created at `Ember.libraries`.

  @class Libraries
  @constructor
  @private
*/
class Libraries {
  constructor() {
    this._registry = [];
    this._coreLibIndex = 0;
  }
  _getLibraryByName(name) {
    let libs = this._registry;
    for (let lib of libs) {
      if (lib.name === name) {
        return lib;
      }
    }
    return undefined;
  }
  register(name, version, isCoreLibrary) {
    let index = this._registry.length;
    if (!this._getLibraryByName(name)) {
      if (isCoreLibrary) {
        index = this._coreLibIndex++;
      }
      this._registry.splice(index, 0, {
        name,
        version
      });
    } else {
      warn(`Library "${name}" is already registered with Ember.`, false, {
        id: 'ember-metal.libraries-register'
      });
    }
  }
  registerCoreLibrary(name, version) {
    this.register(name, version, true);
  }
  deRegister(name) {
    let lib = this._getLibraryByName(name);
    let index;
    if (lib) {
      index = this._registry.indexOf(lib);
      this._registry.splice(index, 1);
    }
  }
}
if (DEBUG) {
  Libraries.prototype.logVersions = function () {
    let libs = this._registry;
    let nameLengths = libs.map(item => get(item, 'name.length'));
    assert('nameLengths is number array', nameLengths instanceof Array && nameLengths.every(n => typeof n === 'number'));
    let maxNameLength = Math.max.apply(null, nameLengths);
    debug('-------------------------------');
    for (let lib of libs) {
      let spaces = new Array(maxNameLength - lib.name.length + 1).join(' ');
      debug([lib.name, spaces, ' : ', lib.version].join(''));
    }
    debug('-------------------------------');
  };
}
const LIBRARIES = new Libraries();
LIBRARIES.registerCoreLibrary('Ember', VERSION);

function getProperties(obj, keys) {
  let ret = {};
  let propertyNames;
  let i = 1;
  if (arguments.length === 2 && Array.isArray(keys)) {
    i = 0;
    propertyNames = arguments[1];
  } else {
    propertyNames = Array.from(arguments);
  }
  for (; i < propertyNames.length; i++) {
    // SAFETY: we are just walking the list of property names, so we know the
    // index access never produces `undefined`.
    let name = propertyNames[i];
    ret[name] = get(obj, name);
  }
  return ret;
}

function setProperties(obj, properties) {
  if (properties === null || typeof properties !== 'object') {
    return properties;
  }
  changeProperties(() => {
    let props = Object.keys(properties);
    for (let propertyName of props) {
      // SAFETY: casting `properties` this way is safe because any object in JS
      // can be indexed this way, and the result will be `unknown`, making it
      // safe for callers.
      set(obj, propertyName, properties[propertyName]);
    }
  });
  return properties;
}

let DEBUG_INJECTION_FUNCTIONS;
if (DEBUG) {
  DEBUG_INJECTION_FUNCTIONS = new WeakMap();
}
function inject(type, ...args) {
  assert('a string type must be provided to inject', typeof type === 'string');
  let elementDescriptor;
  let name;
  if (isElementDescriptor(args)) {
    elementDescriptor = args;
  } else if (typeof args[0] === 'string') {
    name = args[0];
  }
  let getInjection = function (propertyName) {
    let owner = getOwner(this) || this.container; // fallback to `container` for backwards compat
    assert(`Attempting to lookup an injected property on an object without a container, ensure that the object was instantiated via a container.`, Boolean(owner));
    return owner.lookup(`${type}:${name || propertyName}`);
  };
  if (DEBUG) {
    DEBUG_INJECTION_FUNCTIONS.set(getInjection, {
      type,
      name
    });
  }
  let decorator = computed({
    get: getInjection,
    set(keyName, value) {
      defineProperty(this, keyName, null, value);
    }
  });
  if (elementDescriptor) {
    return decorator(elementDescriptor[0], elementDescriptor[1], elementDescriptor[2]);
  } else {
    return decorator;
  }
}

function tracked(...args) {
  assert(`@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()`, !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true));
  if (!isElementDescriptor(args)) {
    let propertyDesc = args[0];
    assert(`tracked() may only receive an options object containing 'value' or 'initializer', received ${propertyDesc}`, args.length === 0 || typeof propertyDesc === 'object' && propertyDesc !== null);
    if (DEBUG && propertyDesc) {
      let keys = Object.keys(propertyDesc);
      assert(`The options object passed to tracked() may only contain a 'value' or 'initializer' property, not both. Received: [${keys}]`, keys.length <= 1 && (keys[0] === undefined || keys[0] === 'value' || keys[0] === 'initializer'));
      assert(`The initializer passed to tracked must be a function. Received ${propertyDesc.initializer}`, !('initializer' in propertyDesc) || typeof propertyDesc.initializer === 'function');
    }
    let initializer = propertyDesc ? propertyDesc.initializer : undefined;
    let value = propertyDesc ? propertyDesc.value : undefined;
    let decorator = function (target, key, _desc, _meta, isClassicDecorator) {
      assert(`You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`, isClassicDecorator);
      let fieldDesc = {
        initializer: initializer || (() => value)
      };
      return descriptorForField([target, key, fieldDesc]);
    };
    setClassicDecorator(decorator);
    return decorator;
  }
  return descriptorForField(args);
}
if (DEBUG) {
  // Normally this isn't a classic decorator, but we want to throw a helpful
  // error in development so we need it to treat it like one
  setClassicDecorator(tracked);
}
function descriptorForField([target, key, desc]) {
  assert(`You attempted to use @tracked on ${key}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`, !desc || !desc.value && !desc.get && !desc.set);
  let {
    getter,
    setter
  } = trackedData(key, desc ? desc.initializer : undefined);
  function get() {
    let value = getter(this);
    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(value) || isEmberArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }
    return value;
  }
  function set(newValue) {
    setter(this, newValue);
    dirtyTagFor(this, SELF_TAG);
  }
  let newDesc = {
    enumerable: true,
    configurable: true,
    isTracked: true,
    get,
    set
  };
  COMPUTED_SETTERS.add(set);
  meta(target).writeDescriptors(key, new TrackedDescriptor(get, set));
  return newDesc;
}
class TrackedDescriptor {
  constructor(_get, _set) {
    this._get = _get;
    this._set = _set;
    CHAIN_PASS_THROUGH.add(this);
  }
  get(obj) {
    return this._get.call(obj);
  }
  set(obj, _key, value) {
    this._set.call(obj, value);
  }
}

// NOTE: copied from: https://github.com/glimmerjs/glimmer.js/pull/358
// Both glimmerjs/glimmer.js and emberjs/ember.js have the exact same implementation
// of @cached, so any changes made to one should also be made to the other
/**
 * @decorator
 *
  Gives the getter a caching behavior. The return value of the getter
  will be cached until any of the properties it is entangled with
  are invalidated. This is useful when a getter is expensive and
  used very often.

  For instance, in this `GuestList` class, we have the `sortedGuests`
  getter that sorts the guests alphabetically:

  ```javascript
    import { tracked } from '@glimmer/tracking';

    class GuestList {
      @tracked guests = ['Zoey', 'Tomster'];

      get sortedGuests() {
        return this.guests.slice().sort()
      }
    }
  ```

  Every time `sortedGuests` is accessed, a new array will be created and sorted,
  because JavaScript getters do not cache by default. When the guest list
  is small, like the one in the example, this is not a problem. However, if
  the guest list were to grow very large, it would mean that we would be doing
  a large amount of work each time we accessed `sortedGuests`. With `@cached`,
  we can cache the value instead:

  ```javascript
    import { tracked, cached } from '@glimmer/tracking';

    class GuestList {
      @tracked guests = ['Zoey', 'Tomster'];

      @cached
      get sortedGuests() {
        return this.guests.slice().sort()
      }
    }
  ```

  Now the `sortedGuests` getter will be cached based on autotracking.
  It will only rerun and create a new sorted array when the guests tracked
  property is updated.


  ### Tradeoffs

  Overuse is discouraged.

  In general, you should avoid using `@cached` unless you have confirmed that
  the getter you are decorating is computationally expensive, since `@cached`
  adds a small amount of overhead to the getter.
  While the individual costs are small, a systematic use of the `@cached`
  decorator can add up to a large impact overall in your app.
  Many getters and tracked properties are only accessed once during rendering,
  and then never rerendered, so adding `@cached` when unnecessary can
  negatively impact performance.

  Also, `@cached` may rerun even if the values themselves have not changed,
  since tracked properties will always invalidate.
  For example updating an integer value from `5` to an other `5` will trigger
  a rerun of the cached properties building from this integer.

  Avoiding a cache invalidation in this case is not something that can
  be achieved on the `@cached` decorator itself, but rather when updating
  the underlying tracked values, by applying some diff checking mechanisms:

  ```javascript
  if (nextValue !== this.trackedProp) {
    this.trackedProp = nextValue;
  }
  ```

  Here equal values won't update the property, therefore not triggering
  the subsequent cache invalidations of the `@cached` properties who were
  using this `trackedProp`.

  Remember that setting tracked data should only be done during initialization,
  or as the result of a user action. Setting tracked data during render
  (such as in a getter), is not supported.

  @method cached
  @static
  @for @glimmer/tracking
  @public
 */
const cached = (...args) => {
  const [target, key, descriptor] = args;
  // Error on `@cached()`, `@cached(...args)`, and `@cached propName = value;`
  if (DEBUG && target === undefined) throwCachedExtraneousParens();
  if (DEBUG && (typeof target !== 'object' || typeof key !== 'string' || typeof descriptor !== 'object' || args.length !== 3)) {
    throwCachedInvalidArgsError(args);
  }
  if (DEBUG && (!('get' in descriptor) || typeof descriptor.get !== 'function')) {
    throwCachedGetterOnlyError(key);
  }
  const caches = new WeakMap();
  const getter = descriptor.get;
  descriptor.get = function () {
    if (!caches.has(this)) {
      caches.set(this, createCache(getter.bind(this)));
    }
    return getValue(caches.get(this));
  };
};
function throwCachedExtraneousParens() {
  throw new Error('You attempted to use @cached(), which is not necessary nor supported. Remove the parentheses and you will be good to go!');
}
function throwCachedGetterOnlyError(key) {
  throw new Error(`The @cached decorator must be applied to getters. '${key}' is not a getter.`);
}
function throwCachedInvalidArgsError(args = []) {
  throw new Error(`You attempted to use @cached on with ${args.length > 1 ? 'arguments' : 'an argument'} ( @cached(${args.map(d => `'${d}'`).join(', ')}), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@cached`'}`);
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
let searchDisabled = false;
const flags = {
  _set: 0,
  _unprocessedNamespaces: false,
  get unprocessedNamespaces() {
    return this._unprocessedNamespaces;
  },
  set unprocessedNamespaces(v) {
    this._set++;
    this._unprocessedNamespaces = v;
  }
};
let unprocessedMixins = false;
const NAMESPACES = [];
const NAMESPACES_BY_ID = Object.create(null);
function addNamespace(namespace) {
  flags.unprocessedNamespaces = true;
  NAMESPACES.push(namespace);
}
function removeNamespace(namespace) {
  let name = getName(namespace);
  delete NAMESPACES_BY_ID[name];
  NAMESPACES.splice(NAMESPACES.indexOf(namespace), 1);
  if (name in context.lookup && namespace === context.lookup[name]) {
    context.lookup[name] = undefined;
  }
}
function findNamespaces() {
  if (!flags.unprocessedNamespaces) {
    return;
  }
  let lookup = context.lookup;
  let keys = Object.keys(lookup);
  for (let key of keys) {
    // Only process entities that start with uppercase A-Z
    if (!isUppercase(key.charCodeAt(0))) {
      continue;
    }
    let obj = tryIsNamespace(lookup, key);
    if (obj) {
      setName(obj, key);
    }
  }
}
function findNamespace(name) {
  if (!searchDisabled) {
    processAllNamespaces();
  }
  return NAMESPACES_BY_ID[name];
}
function processNamespace(namespace) {
  _processNamespace([namespace.toString()], namespace, new Set());
}
function processAllNamespaces() {
  let unprocessedNamespaces = flags.unprocessedNamespaces;
  if (unprocessedNamespaces) {
    findNamespaces();
    flags.unprocessedNamespaces = false;
  }
  if (unprocessedNamespaces || unprocessedMixins) {
    let namespaces = NAMESPACES;
    for (let namespace of namespaces) {
      processNamespace(namespace);
    }
    unprocessedMixins = false;
  }
}
function isSearchDisabled() {
  return searchDisabled;
}
function setSearchDisabled(flag) {
  searchDisabled = Boolean(flag);
}
function setUnprocessedMixins() {
  unprocessedMixins = true;
}
function _processNamespace(paths, root, seen) {
  let idx = paths.length;
  let id = paths.join('.');
  NAMESPACES_BY_ID[id] = root;
  setName(root, id);
  // Loop over all of the keys in the namespace, looking for classes
  for (let key in root) {
    if (!hasOwnProperty.call(root, key)) {
      continue;
    }
    let obj = root[key];
    // If we are processing the `Ember` namespace, for example, the
    // `paths` will start with `["Ember"]`. Every iteration through
    // the loop will update the **second** element of this list with
    // the key, so processing `Ember.View` will make the Array
    // `['Ember', 'View']`.
    paths[idx] = key;
    // If we have found an unprocessed class
    if (obj && getName(obj) === void 0) {
      // Replace the class' `toString` with the dot-separated path
      setName(obj, paths.join('.'));
      // Support nested namespaces
    } else if (obj && isNamespace(obj)) {
      // Skip aliased namespaces
      if (seen.has(obj)) {
        continue;
      }
      seen.add(obj);
      // Process the child namespace
      _processNamespace(paths, obj, seen);
    }
  }
  paths.length = idx; // cut out last item
}

function isNamespace(obj) {
  return obj != null && typeof obj === 'object' && obj.isNamespace;
}
function isUppercase(code) {
  return code >= 65 && code <= 90 // A
  ; // Z
}

function tryIsNamespace(lookup, prop) {
  try {
    let obj = lookup[prop];
    return (obj !== null && typeof obj === 'object' || typeof obj === 'function') && obj.isNamespace && obj;
  } catch (e) {
    // continue
  }
}

export { ASYNC_OBSERVERS, ComputedDescriptor, ComputedProperty, DEBUG_INJECTION_FUNCTIONS, Libraries, NAMESPACES, NAMESPACES_BY_ID, PROPERTY_DID_CHANGE, PROXY_CONTENT, SYNC_OBSERVERS, TrackedDescriptor, _getPath, _getProp, _setProp, activateObserver, addArrayObserver, addListener, addNamespace, addObserver, alias, arrayContentDidChange, arrayContentWillChange, autoComputed, beginPropertyChanges, cached, changeProperties, computed, defineDecorator, defineProperty, defineValue, deprecateProperty, descriptorForDecorator, descriptorForProperty, eachProxyArrayDidChange, eachProxyArrayWillChange, endPropertyChanges, expandProperties, findNamespace, findNamespaces, flushAsyncObservers, get, getCachedValueFor, getProperties, hasListeners, hasUnknownProperty, inject, isClassicDecorator, isComputed, isElementDescriptor, isSearchDisabled as isNamespaceSearchDisabled, LIBRARIES as libraries, makeComputedDecorator, markObjectAsDirty, nativeDescDecorator, notifyPropertyChange, objectAt, on, processAllNamespaces, processNamespace, removeArrayObserver, removeListener, removeNamespace, removeObserver, replace, replaceInNativeArray, revalidateObservers, sendEvent, set, setClassicDecorator, setSearchDisabled as setNamespaceSearchDisabled, setProperties, setUnprocessedMixins, tagForObject, tagForProperty, tracked, trySet };
