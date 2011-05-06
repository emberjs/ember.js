// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// SC.Observable also enhances array. Make sure we are called after
// SC.Observable so our version of unknownProperty wins.

require('sproutcore-runtime/runtime');
require('sproutcore-runtime/system/function');
require('sproutcore-runtime/mixins/observable');
require('sproutcore-runtime/mixins/enumerable');
require('sproutcore-runtime/system/set');

SC.CoreArray =
/** @lends SC.Array.prototype */ {

  /**
    Walk like a duck - use isSCArray to avoid conflicts

    @type Boolean
    @default YES
    @constant
  */
  isSCArray: YES,

  /**
    @field {Number} length

    Your array must support the length property.  Your replace methods should
    set this property whenever it changes.
  */
  // length: 0,

  /**
    This is one of the primitves you must implement to support SC.Array. You
    should replace amt objects started at idx with the objects in the passed
    array.

    Before mutating the underlying data structure, you must call
    this.arrayContentWillChange(). After the mutation is complete, you must
    call arrayContentDidChange() and enumerableContentDidChange().

    NOTE: JavaScript arrays already implement SC.Array and automatically call
    the correct callbacks.

    @param {Number} idx
      Starting index in the array to replace.  If idx >= length, then append to
      the end of the array.

    @param {Number} amt
      Number of elements that should be removed from the array, starting at
      *idx*.

    @param {Array} objects
      An array of zero or more objects that should be inserted into the array at
      *idx*
  */
  replace: function(idx, amt, objects) {
    throw new SC.Error("replace() must be implemented to support SC.Array");
  },

  /**
    Returns the index for a particular object in the index.

    @param {Object} object The item to search for.
    @param {NUmber} [startAt] Starting location to search, default 0.
    @returns {Number} Index of object, -1 if not found.
  */
  indexOf: function(object, startAt) {
    var idx, len = this.get('length');

    if (startAt === undefined) startAt = 0;

    if (startAt < 0) { startAt += len; }

    for (idx = startAt; idx < len; idx++) {
      if (this.objectAt(idx) === object) { return idx; }
    }

    return -1;
  },

  /**
    Returns the last index for a particular object in the index.

    @param {Object} object The item to search for.
    @param {NUmber} [startAt] starting location to search, default 0.
    @returns {Number} Index of object, -1 if not found.
  */
  lastIndexOf: function(object, startAt) {
    var idx, len = this.get('length');

    if (startAt === undefined) { startAt = len - 1; }

    if (startAt < 0) { startAt += len; }

    for(idx = startAt; idx >= 0; idx--) {
      if (this.objectAt(idx) === object) { return idx; }
    }

    return -1;
  },

  /**
    This is one of the primitives you must implement to support SC.Array.
    Returns the object at the named index. If your object supports retrieving
    the value of an array item using get() (i.e. myArray.get(0)), then you do
    not need to implement this method yourself. If idx exceeds the current
    length, return null.

    @param {Number} idx The index of the item to return
    @returns {Object}
  */
  objectAt: function(idx) {
    if (idx < 0) { return undefined; }
    if (idx >= this.get('length')) { return undefined; }
    return this.get(idx);
  },

  /**
    @field []

    This is the handler for the special array content property. If you get
    this property, it will return this. If you set this property it a new
    array, it will replace the current content.

    This property overrides the default property defined in SC.Enumerable.
  */
  '[]': SC.Function.property(function(key, value) {
    if (value !== undefined) {
      this.replace(0, this.get('length'), value);
    }

    return this;
  }),

  /**
    This will use the primitive replace() method to insert an object at the
    specified index.

    @param {Number} idx Index of insert the object at.
    @param {Object} object Object to insert
    @returns {Object} receiver
  */
  insertAt: function(idx, object) {
    if (idx > this.get('length')) { throw new SC.Error("Index out of range"); }
    this.replace(idx, 0, [object]);
    return this;
  },

  /**
    Remove an object at the specified index using the replace() primitive
    method. You can pass either a single index, a start and a length or an
    index set.

    If you pass a single index or a start and length that is beyond the
    length this method will throw an out of range error.

    @param {Number|SC.IndexSet} start Index, start of range, or index set
    @param {Number} length length of passing range
    @returns {Object} receiver
  */
  removeAt: function(start, length) {
    if (start < 0 || start >= this.get('length')) { throw new SC.Error("Index out of range"); }

    this.replace(start, length || 1, []);
    return this;
  },

  /**
    Search the array of this object, removing any occurrences of it.
    @param {object} obj object to remove
  */
  removeObject: function(obj) {
    var idx = this.get('length') || 0;

    while(--idx >= 0) {
      var curObject = this.objectAt(idx);
      if (curObject === obj) { this.removeAt(idx); }
    }

    return this;
  },

  /**
    Search the array for the passed set of objects and remove any occurrences
    of the objects.

    @param {SC.Enumerable} objects The objects to remove
    @returns {SC.Array} receiver
  */
  removeObjects: function(objects) {
    this.beginPropertyChanges();
    objects.forEach(function(obj) { this.removeObject(obj); }, this);
    this.endPropertyChanges();

    return this;
  },

  /**
    Returns a new array that is a slice of the receiver. This implementation
    uses the observable array methods to retrieve the objects for the new
    slice.

    If you don't pass in beginIndex and endIndex, it will act as a copy of the
    array.

    @param {Integer} [beginIndex] Index to begin slicing from.
    @param {Integer} [endIndex] Index to end the slice at.
    @returns {Array} New array with specified slice
  */
  slice: function(beginIndex, endIndex) {
    var ret = [], length = this.get('length');

    beginIndex = beginIndex || 0;

    if (endIndex === undefined || endIndex > length) {
      endIndex = length;
    }

    while(beginIndex < endIndex) {
      ret[ret.length] = this.objectAt(beginIndex++);
    }

    return ret;
  },

  /**
    Push the object onto the end of the array. Works just like push() but it
    is KVO-compliant.

    @param {Object} object The objects to push
    @return {Object} The passed object
  */
  pushObject: function(obj) {
    this.insertAt(this.get('length'), obj);
    return obj;
  },

  /**
    Add the objects in the passed numerable to the end of the array. Defers
    notifying observers of the change until all objects are added.

    @param {SC.Enumerable} objects The objects to add
    @returns {SC.Array} receiver
  */
  pushObjects: function(objects) {
    this.beginPropertyChanges();
    objects.forEach(function(obj) { this.pushObject(obj); }, this);
    this.endPropertyChanges();

    return this;
  },

  /**
    Pop object from array or nil if none are left. Works just like pop() but
    it is KVO-compliant.

    @return {Object} The popped object
  */
  popObject: function() {
    return this._removeAt(this.get('length') - 1);
  },

  /**
    Shift an object from start of array or nil if none are left. Works just
    like shift() but it is KVO-compliant.

    @return {Object} The shifted object
  */
  shiftObject: function() {
    return this._removeAt(0);
  },

  /**
    Remove an object at a particular index and return the object removed.

    @return {Object} The removed object
  */
  _removeAt: function(idx) {
    if (this.get('length') === 0) { return undefined; }

    var ret = this.objectAt(idx);
    this.removeAt(idx);

    return ret;
  },

  /**
    Unshift an object to start of array. Works just like unshift() but it is
    KVO-compliant.

    @param {Object} obj the object to add
    @return {Object} The passed object
  */
  unshiftObject: function(obj) {
    this.insertAt(0, obj);
    return obj;
  },

  /**
    Adds the named objects to the beginning of the array. Defers notifying
    observers until all objects have been added.

    @param {SC.Enumerable} objects The objects to add
    @returns {SC.Array} receiver
  */
  unshiftObjects: function(objects) {
    this.beginPropertyChanges();
    objects.forEach(function(obj) { this.unshiftObject(obj); }, this);
    this.endPropertyChanges();

    return this;
  },

  /**
    Compares each item in the passed array to this one.

    @param {Array} array The array you want to compare to
    @returns {Boolean} true if they are equal.
  */
  isEqual: function(array) {
    if (!array) { return false; }
    if (array === this) { return true; }

    var idx = array.get('length');
    if (idx != this.get('length')) { return false; }

    var a, b;

    while(--idx) {
      a = array.objectAt(idx);
      b = this.objectAt(idx);

      if (!SC.isEqual(a, b)) { return false; }
    }

    return true;
  },

  /**
    Generates a new array with the contents of the old array, sans any null
    values.

    @returns {Array} The new, compact array
  */
  compact: function() {
    return this.without(null);
  },

  /**
    Generates a new array with the contents of the old array, sans the passed
    value.

    @param {Object} value The value you want to be removed
    @returns {Array} The new, filtered array
  */
  without: function(value) {
    var ret = [];
    this.forEach(function(k) {
      if (k !== value) { ret.push(k); }
    });
    return ret;
  },

  /**
    Generates a new array with only unique values from the contents of the
    old array.

    @returns {Array}
  */
  uniq: function() {
    var set = SC.Set.create(this),
        ret = [];

    this.forEach(function(item){
      if (!set.contains(item)) {
        ret.push(item); set.add(item);
      }
    });
    return ret;
  },

  /**
    Returns the largest Number in an array of Numbers. Make sure the array
    only contains values of type Number to get expected result.

    Note: This only works for dense arrays.

    @returns {Number}
  */
  max: function() {
    return Math.max.apply(Math, this);
  },

  /**
    Returns the smallest Number in an array of Numbers. Make sure the array
    only contains values of type Number to get expected result.

    Note: This only works for dense arrays.

    @returns {Number}
  */
  min: function() {
    return Math.min.apply(Math, this);
  },

  /**
    Returns YES if object is in the array

    @param {Object} obj object to look for
    @returns {Boolean}
  */
  contains: function(obj){
    return this.indexOf(obj) !== -1;
  },

  /**
    The options parameter is a hash containing the following:

      - target: Object
      - willChange: String|Function, optional. Default: 'arrayWillChange'
      - didChange: String|Function, optional. Default: 'arrayDidChange'
      - context

    @param {Object} options
  */
  addArrayObservers: function(options) {
    this._modifyObserverSet('add', options);
  },

  /**
    The options parameter is a hash containing the following:

      - target: Object
      - willChange: String|Function, optional. Default: 'arrayWillChange'
      - didChange: String|Function, optional. Default: 'arrayDidChange'
      - context

    @param {Object} options
  */
  removeArrayObservers: function(options) {
    this._modifyObserverSet('remove', options);
  },

  /** @private */
  _modifyObserverSet: function(method, options) {
    var willChangeObservers, didChangeObservers,
        target = options.target || this,
        willChange = options.willChange || 'arrayWillChange',
        didChange = options.didChange || 'arrayDidChange',
        context = options.context;

    if (typeof willChange === "string") {
      willChange = target[willChange];
    }

    if (typeof didChange === "string") {
      didChange = target[didChange];
    }

    willChangeObservers = this._kvo_for('_kvo_array_will_change', SC.ObserverSet);
    didChangeObservers  = this._kvo_for('_kvo_array_did_change', SC.ObserverSet);

    willChangeObservers[method](target, willChange, context);
    didChangeObservers[method](target, didChange, context);
  },

  /** @private */
  arrayContentWillChange: function(start, removedCount, addedCount) {
    this._teardownContentObservers(start, removedCount);
    var willChangeObservers = this._kvo_array_will_change;
    this._notifyArrayObservers(willChangeObservers, start, removedCount, addedCount);
    this.teardownEnumerablePropertyChains(start, removedCount);
  },

  /** @private */
  arrayContentDidChange: function(start, removedCount, addedCount) {
    this.beginPropertyChanges();
    this.notifyPropertyChange('length'); // flush caches

    this._setupContentObservers(start, addedCount);
    var didChangeObservers = this._kvo_array_did_change;
    this._notifyArrayObservers(didChangeObservers, start, removedCount, addedCount);

    this.setupEnumerablePropertyChains(start, addedCount);

    this.notifyPropertyChange('[]');
    this.endPropertyChanges();

    return this;
  },

  /** @private */
  _notifyArrayObservers: function(observers, start, removed, added) {
    var member, members, membersLen, target, action, idx;

    if (observers) {
      members = observers.members;
      membersLen = members.length;

      for (idx = 0; idx < membersLen; idx++) {
        member = members[idx];
        target = member[0];
        action = member[1];
        action.call(target, start, removed, added, this);
      }
    }
  },

  /**
    @private

    When enumerable content has changed, remove enumerable observers from
    items that are no longer in the enumerable, and add observers to newly
    added items.

    @param {Array} addedObjects the array of objects that have been added
    @param {Array} removedObjects the array of objects that have been removed
  */
  _setupContentObservers: function(start, addedCount) {
    var self = this;

    this._modifyContentObservers(start, addedCount, function(kvoKey, addedObjects) {
      self._kvo_for(kvoKey).forEach(function(observer) {
        addedObjects.forEach(function(item) {
          self._resumeChainObservingForItemWithChainObserver(item, observer);
        });
      });
    });
  },

  /** @private */
  _teardownContentObservers: function(start, removedCount) {
    this._modifyContentObservers(start, removedCount, function(kvoKey, removedObjects) {
      removedObjects.forEach(function(item) {
        item._kvo_for(kvoKey).forEach(function(observer) {
          observer.destroyChain();
        });
      });
    });
  },

  /** @private */
  _modifyContentObservers: function(start, count, fn) {
    var observedKeys = this._kvo_for('_kvo_content_observed_keys', SC.CoreSet),
        objects, kvoKey;

    if (observedKeys.get('length') > 0) {
      objects = this.slice(start, start + count);

      observedKeys.forEach(function(key) {
        kvoKey = SC.keyFor('_kvo_content_observers', key);
        fn(kvoKey, objects);
      });
    }
  },

  /** @private */
  teardownEnumerablePropertyChains: function(start, removed) {
    var chains = this._kvo_enumerable_property_chains;
    var removedObjects;

    if (chains) {
      removedObjects = this.slice(start, start+removed);

      chains.forEach(function(chain) {
        var idx, len = removedObjects.get('length'),
            chainGuid = SC.guidFor(chain),
            clonedChain, item, kvoChainList = '_kvo_enumerable_property_clones';

        chain.notifyPropertyDidChange();

        for (idx = 0; idx < len; idx++) {
          item = removedObjects[idx];
          clonedChain = item[kvoChainList][chainGuid];
          clonedChain.deactivate();
          delete item[kvoChainList][chainGuid];
        }
      }, this);
    }
    return this;
  },

  /**
    For all registered property chains on this object, removed them from objects
    being removed from the enumerable, and clone them onto newly added objects.

    @param {Object[]} addedObjects The objects being added to the enumerable
    @param {Object[]} removedObjects The objected being removed from the enumerable
    @returns {Object} receiver
  */
  setupEnumerablePropertyChains: function(start, added) {
    var chains = this._kvo_enumerable_property_chains;

    if (chains) {
      var addedObjects = this.slice(start, start+added);
      chains.forEach(function(chain) {
        var idx, len = addedObjects.get('length');

        chain.notifyPropertyDidChange();

        len = addedObjects.get('length');
        for (idx = 0; idx < len; idx++) {
          this._clonePropertyChainToItem(chain, addedObjects[idx]);
        }
      }, this);
    }
    return this;
  },

  /**
    Register a property chain to propagate to enumerable content.

    This will clone the property chain to each item in the enumerable,
    then save it so that it is automatically set up and torn down when
    the enumerable content changes.

    @param {String} property The property being listened for on this object
    @param {SC._PropertyChain} chain the chain to clone to items
  */
  registerDependentKeyWithChain: function(property, chain) {
    if (property === '@each') {
      chain = chain.next;

      // Get the set of all existing property chains that should
      // be propagated to enumerable contents. If that set doesn't
      // exist yet, _kvo_for() will create it.
      var kvoChainList = '_kvo_enumerable_property_chains',
          chains, item, clone, cloneList;

      chains = this._kvo_for(kvoChainList, SC.CoreSet);

      // Save a reference to the chain on this object. If new objects
      // are added to the enumerable, we will clone this chain and add
      // it to the new object.
      chains.add(chain);

      this.forEach(function(item) {
        this._clonePropertyChainToItem(chain, item);
      }, this);
    } else {
      SC.Observable.registerDependentKeyWithChain.call(this, property, chain);
    }
  },

  /**
    Clones an SC._PropertyChain to a content item.

    @param {SC._PropertyChain} chain
    @param {Object} item
  */
  _clonePropertyChainToItem: function(chain, item) {
    var clone = SC.clone(chain),
        kvoCloneList = '_kvo_enumerable_property_clones',
        cloneList;

    clone.object = item;

    cloneList = item[kvoCloneList] = item[kvoCloneList] || {};
    cloneList[SC.guidFor(chain)] = clone;

    clone.activate(item);
  },

  /**
    Removes a dependent key from the enumerable, and tears it down on
    all content objects.

    @param {String} property
    @param {SC._PropertyChain} chain
  */
  removeDependentKeyWithChain: function(property, chain) {
    var kvoChainList = '_kvo_enumerable_property_chains',
        kvoCloneList = '_kvo_enumerable_property_clones',
        chains, item, clone, cloneList;

    this.forEach(function(item) {
      item.removeDependentKeyWithChain(property, chain);

      cloneList = item[kvoCloneList];
      clone = cloneList[SC.guidFor(chain)];

      clone.deactivate(item);
    }, this);
  },

  /**
    @private

    Clones a segment of an observer chain and applies it
    to an element of this Enumerable.

    @param {Object} item The element
    @param {SC._ChainObserver} chainObserver the chain segment to begin from
  */
  _resumeChainObservingForItemWithChainObserver: function(item, chainObserver) {
    var observer = chainObserver.next.copy(),
        key = observer.property;

    // The chain observer should create new observers on the child object
    observer.object = item;
    item.addObserver(key, observer, observer.propertyDidChange);

    // if we're in the initial chained observer setup phase, add the tail
    // of the current observer segment to the list of tracked tails.
    if (chainObserver.root.tails) {
      chainObserver.root.tails.pushObject(observer.tail());
    }

    observer.propertyDidChange();

    // Maintain a list of observers on the item so we can remove them
    // if it is removed from the enumerable.
    item._kvo_for(SC.keyFor('_kvo_content_observers', key)).push(observer);
  },

  /**
    @private

    Adds a content observer. Content observers are able to
    propagate chain observers to each member item in the enumerable,
    so that the observer is fired whenever a single item changes.

    You should never call this method directly. Instead, you should
    call addObserver() with the special '@each' property in the path.

    For example, if you wanted to observe changes to each item's isDone
    property, you could call:

        arrayController.addObserver('@each.isDone');

    @param {SC._ChainObserver} chainObserver the chain observer to propagate
  */
  _addContentObserver: function(chainObserver) {
    var key = chainObserver.next.property, kvoKey;

    // Add the key to a set so we know what we are observing
    this._kvo_for('_kvo_content_observed_keys', SC.CoreSet).push(key);

    // Add the passed ChainObserver to an ObserverSet for that key
    kvoKey = SC.keyFor('_kvo_content_observers', key);
    this._kvo_for(kvoKey).push(chainObserver);

    // set up chained observers on the initial content
    this._setupContentObservers(0, chainObserver.object.get('length'));
  },

  /**
    @private

    Removes a content observer. Pass the same chain observer
    that was used to add the content observer.

    @param {SC._ChainObserver} chainObserver the chain observer to propagate
  */
  _removeContentObserver: function(chainObserver) {
    var observers, kvoKey,
        observedKeys = this._kvo_content_observed_keys,
        key = chainObserver.next.property;

    if (observedKeys.contains(key)) {
      kvoKey = SC.keyFor('_kvo_content_observers', key);
      observers = this._kvo_for(kvoKey);

      observers.removeObject(chainObserver);

      this._teardownContentObservers(0, chainObserver.object.get('length'));

      if (observers.length === 0) {
        this._kvo_for('_kvo_content_observed_keys').remove(key);
      }
    }
  }

};

SC.mixin(SC.CoreArray, SC.Enumerable);

/**
  @namespace

  This module implements Observer-friendly Array-like behavior.  This mixin is
  picked up by the Array class as well as other controllers, etc. that want to
  appear to be arrays.

  Unlike SC.Enumerable, this mixin defines methods specifically for
  collections that provide index-ordered access to their contents.  When you
  are designing code that needs to accept any kind of Array-like object, you
  should use these methods instead of Array primitives because these will
  properly notify observers of changes to the array.

  Although these methods are efficient, they do add a layer of indirection to
  your application so it is a good idea to use them only when you need the
  flexibility of using both true JavaScript arrays and "virtual" arrays such
  as controllers and collections.

  You can use the methods defined in this module to access and modify array
  contents in a KVO-friendly way.  You can also be notified whenever the
  membership if an array changes by changing the syntax of the property to
  .observes('*myProperty.[]') .

  To support SC.Array in your own class, you must override two
  primitives to use it: replace() and objectAt().

  Note that the SC.Array mixin also incorporates the SC.Enumerable mixin.  All
  SC.Array-like objects are also enumerable.

  @extends SC.Enumerable
  @since SproutCore 0.9.0
*/
SC.Array = SC.mixin({}, SC.Enumerable, SC.CoreArray);
