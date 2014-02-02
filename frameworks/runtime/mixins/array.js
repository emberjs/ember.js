// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// note: SC.Observable also enhances array.  make sure we are called after
// SC.Observable so our version of unknownProperty wins.
sc_require('ext/function');
sc_require('mixins/observable');
sc_require('mixins/enumerable');
sc_require('system/range_observer');

SC.OUT_OF_RANGE_EXCEPTION = "Index out of range";

SC.CoreArray = /** @lends SC.Array.prototype */ {

  /**
    Walk like a duck - use isSCArray to avoid conflicts
    @type Boolean
  */
  isSCArray: YES,

  /**
    @field {Number} length

    Your array must support the length property.  Your replace methods should
    set this property whenever it changes.
  */
  // length: 0,

  /**
    This is one of the primitives you must implement to support SC.Array.  You
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
  replace: function (idx, amt, objects) {
    throw new Error("replace() must be implemented to support SC.Array");
  },

  /**
    Returns the index for a particular object in the index.

    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @returns {Number} index of -1 if not found
  */
  indexOf: function (object, startAt) {
    var idx, len = this.get('length');

    if (startAt === undefined) startAt = 0;
    else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
    if (startAt < 0) startAt += len;

    for (idx = startAt; idx < len; idx++) {
      if (this.objectAt(idx, YES) === object) return idx;
    }
    return -1;
  },

  /**
    Returns the last index for a particular object in the index.

    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @returns {Number} index of -1 if not found
  */
  lastIndexOf: function (object, startAt) {
    var idx, len = this.get('length');

    if (startAt === undefined) startAt = len - 1;
    else startAt = (startAt < 0) ? Math.ceil(startAt) : Math.floor(startAt);
    if (startAt < 0) startAt += len;

    for (idx = startAt; idx >= 0; idx--) {
      if (this.objectAt(idx) === object) return idx;
    }
    return -1;
  },

  /**
    This is one of the primitives you must implement to support SC.Array.
    Returns the object at the named index.  If your object supports retrieving
    the value of an array item using get() (i.e. myArray.get(0)), then you do
    not need to implement this method yourself.

    @param {Number} idx
      The index of the item to return.  If idx exceeds the current length,
      return null.
  */
  objectAt: function (idx) {
    if (idx < 0) return undefined;
    if (idx >= this.get('length')) return undefined;
    return this.get(idx);
  },

  /**
    @field []

    This is the handler for the special array content property.  If you get
    this property, it will return this.  If you set this property it a new
    array, it will replace the current content.

    This property overrides the default property defined in SC.Enumerable.
  */
  '[]': function (key, value) {
    if (value !== undefined) {
      this.replace(0, this.get('length'), value);
    }
    return this;
  }.property(),

  /**
    This will use the primitive replace() method to insert an object at the
    specified index.

    @param {Number} idx index of insert the object at.
    @param {Object} object object to insert
  */
  insertAt: function (idx, object) {
    if (idx > this.get('length')) throw SC.OUT_OF_RANGE_EXCEPTION;
    this.replace(idx, 0, [object]);
    return this;
  },

  /**
    Remove an object at the specified index using the replace() primitive
    method.  You can pass either a single index, a start and a length or an
    index set.

    If you pass a single index or a start and length that is beyond the
    length this method will throw an SC.OUT_OF_RANGE_EXCEPTION

    @param {Number|SC.IndexSet} start index, start of range, or index set
    @param {Number} length length of passing range
    @returns {Object} receiver
  */
  removeAt: function (start, length) {
    var delta = 0, // used to shift range
        empty = [];

    if (typeof start === SC.T_NUMBER) {

      if ((start < 0) || (start >= this.get('length'))) {
        throw SC.OUT_OF_RANGE_EXCEPTION;
      }

      // fast case
      if (length === undefined) {
        this.replace(start, 1, empty);
        return this;
      } else {
        start = SC.IndexSet.create(start, length);
      }
    }

    this.beginPropertyChanges();
    start.forEachRange(function (start, length) {
      start -= delta;
      delta += length;
      this.replace(start, length, empty); // remove!
    }, this);
    this.endPropertyChanges();

    return this;
  },

  /**
    Search the array of this object, removing any occurrences of it.
    @param {object} obj object to remove
  */
  removeObject: function (obj) {
    var loc = this.get('length') || 0;
    while (--loc >= 0) {
      var curObject = this.objectAt(loc);
      if (curObject === obj) this.removeAt(loc);
    }
    return this;
  },

  /**
    Search the array for the passed set of objects and remove any occurrences
    of the.

    @param {SC.Enumerable} objects the objects to remove
    @returns {SC.Array} receiver
  */
  removeObjects: function (objects) {
    this.beginPropertyChanges();
    objects.forEach(function (obj) { this.removeObject(obj); }, this);
    this.endPropertyChanges();
    return this;
  },

  /**
    Returns a new array that is a slice of the receiver.  This implementation
    uses the observable array methods to retrieve the objects for the new
    slice.

    If you don't pass in beginIndex and endIndex, it will act as a copy of the
    array.

    @param beginIndex {Integer} (Optional) index to begin slicing from.
    @param endIndex {Integer} (Optional) index to end the slice at.
    @returns {Array} New array with specified slice
  */
  slice: function (beginIndex, endIndex) {
    var ret = [];
    var length = this.get('length');
    if (SC.none(beginIndex)) beginIndex = 0;
    if (SC.none(endIndex) || (endIndex > length)) endIndex = length;
    while (beginIndex < endIndex) ret[ret.length] = this.objectAt(beginIndex++);
    return ret;
  },

  /**
    Push the object onto the end of the array.  Works just like push() but it
    is KVO-compliant.

    @param {Object} object the objects to push

    @return {Object} The passed object
  */
  pushObject: function (obj) {
    this.insertAt(this.get('length'), obj);
    return obj;
  },


  /**
    Add the objects in the passed numerable to the end of the array.  Defers
    notifying observers of the change until all objects are added.

    @param {SC.Enumerable} objects the objects to add
    @returns {SC.Array} receiver
  */
  pushObjects: function (objects) {
    this.beginPropertyChanges();
    objects.forEach(function (obj) { this.pushObject(obj); }, this);
    this.endPropertyChanges();
    return this;
  },

  /**
    Pop object from array or nil if none are left.  Works just like pop() but
    it is KVO-compliant.

    @return {Object} The popped object
  */
  popObject: function () {
    var len = this.get('length');
    if (len === 0) return null;

    var ret = this.objectAt(len - 1);
    this.removeAt(len - 1);
    return ret;
  },

  /**
    Shift an object from start of array or nil if none are left.  Works just
    like shift() but it is KVO-compliant.

    @return {Object} The shifted object
  */
  shiftObject: function () {
    if (this.get('length') === 0) return null;
    var ret = this.objectAt(0);
    this.removeAt(0);
    return ret;
  },

  /**
    Unshift an object to start of array.  Works just like unshift() but it is
    KVO-compliant.

    @param {Object} obj the object to add
    @return {Object} The passed object
  */
  unshiftObject: function (obj) {
    this.insertAt(0, obj);
    return obj;
  },

  /**
    Adds the named objects to the beginning of the array.  Defers notifying
    observers until all objects have been added.

    @param {SC.Enumerable} objects the objects to add
    @returns {SC.Array} receiver
  */
  unshiftObjects: function (objects) {
    this.beginPropertyChanges();
    objects.forEach(function (obj) { this.unshiftObject(obj); }, this);
    this.endPropertyChanges();
    return this;
  },

  /**
    Compares each item in the passed array to this one.

    @param {Array} ary The array you want to compare to
    @returns {Boolean} true if they are equal.
  */
  isEqual: function (ary) {
    if (!ary) return false;
    if (ary == this) return true;

    var loc = ary.get('length');
    if (loc != this.get('length')) return false;

    while (--loc >= 0) {
      if (!SC.isEqual(ary.objectAt(loc), this.objectAt(loc))) return false;
    }
    return true;
  },

  /**
    Generates a new array with the contents of the old array, sans any null
    values.

    @returns {Array} The new, compact array
  */
  compact: function () { return this.without(null); },

  /**
    Generates a new array with the contents of the old array, sans the passed
    value.

    @param {Object} value The value you want to be removed
    @returns {Array} The new, filtered array
  */
  without: function (value) {
    if (this.indexOf(value) < 0) return this; // value not present.
    var ret = [];
    this.forEach(function (k) {
      if (k !== value) ret[ret.length] = k;
    });
    return ret;
  },

  /**
    Generates a new array with only unique values from the contents of the
    old array.

    @returns {Array} The new, de-duped array
  */
  uniq: function () {
    var ret = [];
    this.forEach(function (k) {
      if (ret.indexOf(k) < 0) ret[ret.length] = k;
    });
    return ret;
  },

  /**
    Returns a new array that is a one-dimensional flattening of this array,
    i.e. for every element of this array extract that and it's elements into
    a new array.

    @returns {Array}
   */
  flatten: function () {
    var ret = [];
    this.forEach(function (k) {
      if (k && k.isEnumerable) {
        ret = ret.pushObjects(k.flatten());
      } else {
        ret.pushObject(k);
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
  max: function () {
    return Math.max.apply(Math, this);
  },

  /**
    Returns the smallest Number in an array of Numbers. Make sure the array
    only contains values of type Number to get expected result.

    Note: This only works for dense arrays.

    @returns {Number}
  */
  min: function () {
    return Math.min.apply(Math, this);
  },

  rangeObserverClass: SC.RangeObserver,

  /**
    Returns YES if object is in the array

    @param {Object} object to look for
    @returns {Boolean}
  */
  contains: function (obj) {
    return this.indexOf(obj) >= 0;
  },

  /**
    Creates a new range observer on the receiver.  The target/method callback
    you provide will be invoked anytime any property on the objects in the
    specified range changes.  It will also be invoked if the objects in the
    range itself changes also.

    The callback for a range observer should have the signature:

          function rangePropertyDidChange(array, objects, key, indexes, context)

    If the passed key is '[]' it means that the object itself changed.

    The return value from this method is an opaque reference to the
    range observer object.  You can use this reference to destroy the
    range observer when you are done with it or to update its range.

    @param {SC.IndexSet} indexes indexes to observe
    @param {Object} target object to invoke on change
    @param {String|Function} method the method to invoke
    @param {Object} context optional context
    @returns {SC.RangeObserver} range observer
  */
  addRangeObserver: function (indexes, target, method, context) {
    var rangeob = this._array_rangeObservers;
    if (!rangeob) rangeob = this._array_rangeObservers = SC.CoreSet.create();

    // The first time a range observer is added, cache the current length so
    // we can properly notify observers the first time through
    if (this._array_oldLength === undefined) {
      this._array_oldLength = this.get('length');
    }

    var C = this.rangeObserverClass;
    var isDeep = NO; //disable this feature for now
    var ret = C.create(this, indexes, target, method, context, isDeep);
    rangeob.add(ret);

    // first time a range observer is added, begin observing the [] property
    if (!this._array_isNotifyingRangeObservers) {
      this._array_isNotifyingRangeObservers = YES;
      this.addObserver('[]', this, this._array_notifyRangeObservers);
    }

    return ret;
  },

  /**
    Moves a range observer so that it observes a new range of objects on the
    array.  You must have an existing range observer object from a call to
    addRangeObserver().

    The return value should replace the old range observer object that you
    pass in.

    @param {SC.RangeObserver} rangeObserver the range observer
    @param {SC.IndexSet} indexes new indexes to observe
    @returns {SC.RangeObserver} the range observer (or a new one)
  */
  updateRangeObserver: function (rangeObserver, indexes) {
    return rangeObserver.update(this, indexes);
  },

  /**
    Removes a range observer from the receiver.  The range observer must
    already be active on the array.

    The return value should replace the old range observer object.  It will
    usually be null.

    @param {SC.RangeObserver} rangeObserver the range observer
    @returns {SC.RangeObserver} updated range observer or null
  */
  removeRangeObserver: function (rangeObserver) {
    var ret = rangeObserver.destroy(this);
    var rangeob = this._array_rangeObservers;
    if (rangeob) rangeob.remove(rangeObserver); // clear
    return ret;
  },

  addArrayObservers: function (options) {
    this._modifyObserverSet('add', options);
  },

  removeArrayObservers: function (options) {
    this._modifyObserverSet('remove', options);
  },

  _modifyObserverSet: function (method, options) {
    var willChangeObservers, didChangeObservers;

    var target     = options.target || this;
    var willChange = options.willChange || 'arrayWillChange';
    var didChange  = options.didChange || 'arrayDidChange';
    var context    = options.context;

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

  arrayContentWillChange: function (start, removedCount, addedCount) {
    this._teardownContentObservers(start, removedCount);

    var member, members, membersLen, idx;
    var target, action;
    var willChangeObservers = this._kvo_array_will_change;
    if (willChangeObservers) {
      members = willChangeObservers.members;
      membersLen = members.length;

      for (idx = 0; idx < membersLen; idx++) {
        member = members[idx];
        target = member[0];
        action = member[1];
        action.call(target, start, removedCount, addedCount, this);
      }
    }
  },

  arrayContentDidChange: function (start, removedCount, addedCount) {
    var rangeob = this._array_rangeObservers,
      length, changes;

    this.beginPropertyChanges();
    this.notifyPropertyChange('length'); // flush caches

    // schedule info for range observers
    if (rangeob && rangeob.length > 0) {
      changes = this._array_rangeChanges;
      if (!changes) { changes = this._array_rangeChanges = SC.IndexSet.create(); }
      if (removedCount === addedCount) {
        length = removedCount;
      } else {
        length = this.get('length') - start;

        if (removedCount > addedCount) {
          length += (removedCount - addedCount);
        }
      }
      changes.add(start, length);
    }

    this._setupContentObservers(start, addedCount);

    var member, members, membersLen, idx;
    var target, action;
    var didChangeObservers = this._kvo_array_did_change;
    if (didChangeObservers) {
      // If arrayContentDidChange is called with no parameters, assume the
      // entire array has changed.
      if (start === undefined) {
        start = 0;
        removedCount = this.get('length');
        addedCount = 0;
      }

      members = didChangeObservers.members;
      membersLen = members.length;

      for (idx = 0; idx < membersLen; idx++) {
        member = members[idx];
        target = member[0];
        action = member[1];
        action.call(target, start, removedCount, addedCount, this);
      }
    }

    this.notifyPropertyChange('[]');
    this.endPropertyChanges();

    return this;
  },

  /**
    @private

    When enumerable content has changed, remove enumerable observers from
    items that are no longer in the enumerable, and add observers to newly
    added items.

    @param {Array} addedObjects the array of objects that have been added
    @param {Array} removedObjects the array of objects that have been removed
  */
  _setupContentObservers: function (start, addedCount) {
    var observedKeys = this._kvo_for('_kvo_content_observed_keys', SC.CoreSet);
    var addedObjects;
    var kvoKey;

    // Only setup and teardown enumerable observers if we have keys to observe
    if (observedKeys.get('length') > 0) {
      addedObjects = this.slice(start, start + addedCount);

      var self = this;
      // added and resume the chain observer.
      observedKeys.forEach(function (key) {
        kvoKey = SC.keyFor('_kvo_content_observers', key);

        // Get all original ChainObservers associated with the key
        self._kvo_for(kvoKey).forEach(function (observer) {
          addedObjects.forEach(function (item) {
            self._resumeChainObservingForItemWithChainObserver(item, observer);
          });
        });
      });
    }
  },

  _teardownContentObservers: function (start, removedCount) {
    var observedKeys = this._kvo_for('_kvo_content_observed_keys', SC.CoreSet);
    var removedObjects;
    var kvoKey;

    // Only setup and teardown enumerable observers if we have keys to observe
    if (observedKeys.get('length') > 0) {
      removedObjects = this.slice(start, start + removedCount);

      // added and resume the chain observer.
      observedKeys.forEach(function (key) {
        kvoKey = SC.keyFor('_kvo_content_observers', key);

        // Loop through removed objects and remove any enumerable observers that
        // belong to them.
        removedObjects.forEach(function (item) {
          item._kvo_for(kvoKey).forEach(function (observer) {
            observer.destroyChain();
          });
        });
      });
    }
  },

  teardownEnumerablePropertyChains: function (removedObjects) {
    var chains = this._kvo_enumerable_property_chains;

    if (chains) {
      chains.forEach(function (chain) {
        var idx, len = removedObjects.get('length'),
            chainGuid = SC.guidFor(chain),
            clonedChain, item, kvoChainList = '_kvo_enumerable_property_clones';

        chain.notifyPropertyDidChange();

        for (idx = 0; idx < len; idx++) {
          item = removedObjects.objectAt(idx);
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

    @param {Object[]} addedObjects the objects being added to the enumerable
    @param {Object[]} removedObjects the objected being removed from the enumerable
    @returns {Object} receiver
  */
  setupEnumerablePropertyChains: function (addedObjects) {
    var chains = this._kvo_enumerable_property_chains;

    if (chains) {
      chains.forEach(function (chain) {
        var idx, len = addedObjects.get('length');

        chain.notifyPropertyDidChange();

        len = addedObjects.get('length');
        for (idx = 0; idx < len; idx++) {
          this._clonePropertyChainToItem(chain, addedObjects.objectAt(idx));
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

    @param {String} property the property being listened for on this object
    @param {SC._PropertyChain} chain the chain to clone to items
  */
  registerDependentKeyWithChain: function (property, chain) {
    // Get the set of all existing property chains that should
    // be propagated to enumerable contents. If that set doesn't
    // exist yet, _kvo_for() will create it.
    var kvoChainList = '_kvo_enumerable_property_chains',
        chains;

    chains = this._kvo_for(kvoChainList, SC.CoreSet);

    // Save a reference to the chain on this object. If new objects
    // are added to the enumerable, we will clone this chain and add
    // it to the new object.
    chains.add(chain);

    this.forEach(function (item) {
      this._clonePropertyChainToItem(chain, item);
    }, this);
  },

  /**
    Clones an SC._PropertyChain to a content item.

    @param {SC._PropertyChain} chain
    @param {Object} item
  */
  _clonePropertyChainToItem: function (chain, item) {
    var clone        = SC.clone(chain),
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
  removeDependentKeyWithChain: function (property, chain) {
    var kvoCloneList = '_kvo_enumerable_property_clones',
        clone, cloneList;

    this.forEach(function (item) {
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
  _resumeChainObservingForItemWithChainObserver: function (item, chainObserver) {
    var observer = SC.clone(chainObserver.next);
    var key = observer.property;

    // The chain observer should create new observers on the child object
    observer.object = item;
    item.addObserver(key, observer, observer.propertyDidChange);

    // if we're in the initial chained observer setup phase, add the tail
    // of the current observer segment to the list of tracked tails.
    if (chainObserver.root.tails) {
      chainObserver.root.tails.pushObject(observer.tail());
    }


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
  _addContentObserver: function (chainObserver) {
    var key = chainObserver.next.property;

    // Add the key to a set so we know what we are observing
    this._kvo_for('_kvo_content_observed_keys', SC.CoreSet).push(key);

    // Add the passed ChainObserver to an ObserverSet for that key
    var kvoKey = SC.keyFor('_kvo_content_observers', key);
    this._kvo_for(kvoKey).push(chainObserver);

    // Add an observer on the '[]' property of this array.
    var observer = chainObserver.tail();
    this.addObserver('[]', observer, observer.propertyDidChange);

    // Set up chained observers on the initial content
    this._setupContentObservers(0, chainObserver.object.get('length'));
  },

  /**
    @private

    Removes a content observer. Pass the same chain observer
    that was used to add the content observer.

    @param {SC._ChainObserver} chainObserver the chain observer to propagate
  */

  _removeContentObserver: function (chainObserver) {
    var observers, kvoKey;
    var observedKeys = this._kvo_content_observed_keys;
    var key = chainObserver.next.property;

    // Clean up the observer on the '[]' property of this array.
    var observer = chainObserver.tail();
    this.removeObserver('[]', observer, observer.propertyDidChange);

    if (observedKeys.contains(key)) {

      kvoKey = SC.keyFor('_kvo_content_observers', key);
      observers = this._kvo_for(kvoKey);

      observers.removeObject(chainObserver);

      this._teardownContentObservers(0, chainObserver.object.get('length'));

      if (observers.length === 0) {
        this._kvo_for('_kvo_content_observed_keys').remove(key);
      }
    }
  },

  /**  @private
    Observer fires whenever the '[]' property changes.  If there are
    range observers, will notify observers of change.
  */
  _array_notifyRangeObservers: function () {
    var rangeob = this._array_rangeObservers,
        changes = this._array_rangeChanges,
        len     = rangeob ? rangeob.length : 0,
        idx;

    if (len > 0 && changes && changes.length > 0) {
      for (idx = 0; idx < len; idx++) rangeob[idx].rangeDidChange(changes);
      changes.clear(); // reset for later notifications
    }
  }

};

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
