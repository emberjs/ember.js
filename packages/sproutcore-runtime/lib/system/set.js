// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/core');
require('sproutcore-runtime/system/core_object');
require('sproutcore-runtime/mixins/mutable_enumerable');
require('sproutcore-runtime/mixins/copyable');
require('sproutcore-runtime/mixins/freezable');



var get = SC.get, set = SC.set, guidFor = SC.guidFor, none = SC.none;

/**
  @class

  An unordered collection of objects.

  A Set works a bit like an array except that its items are not ordered.
  You can create a set to efficiently test for membership for an object. You
  can also iterate through a set just like an array, even accessing objects
  by index, however there is no gaurantee as to their order.

  Starting with SproutCore 2.0 all Sets are now observable since there is no
  added cost to providing this support.  Sets also do away with the more
  specialized Set Observer API in favor of the more generic Enumerable 
  Observer API - which works on any enumerable object including both Sets and
  Arrays.

  ## Creating a Set

  You can create a set like you would most objects using 
  `new SC.Set()`.  Most new sets you create will be empty, but you can 
  also initialize the set with some content by passing an array or other 
  enumerable of objects to the constructor.

  Finally, you can pass in an existing set and the set will be copied. You
  can also create a copy of a set by calling `SC.Set#copy()`.

      #js
      // creates a new empty set
      var foundNames = new SC.Set();

      // creates a set with four names in it.
      var names = new SC.Set(["Charles", "Tom", "Juan", "Alex"]); // :P

      // creates a copy of the names set.
      var namesCopy = new SC.Set(names);

      // same as above.
      var anotherNamesCopy = names.copy();

  ## Adding/Removing Objects

  You generally add or remove objects from a set using `add()` or 
  `remove()`. You can add any type of object including primitives such as 
  numbers, strings, and booleans.

  Unlike arrays, objects can only exist one time in a set. If you call `add()` 
  on a set with the same object multiple times, the object will only be added
  once. Likewise, calling `remove()` with the same object multiple times will
  remove the object the first time and have no effect on future calls until
  you add the object to the set again.

  NOTE: You cannot add/remove null or undefined to a set. Any attempt to do so 
  will be ignored.

  In addition to add/remove you can also call `push()`/`pop()`. Push behaves 
  just like `add()` but `pop()`, unlike `remove()` will pick an arbitrary 
  object, remove it and return it. This is a good way to use a set as a job 
  queue when you don't care which order the jobs are executed in.

  ## Testing for an Object

  To test for an object's presence in a set you simply call 
  `SC.Set#contains()`.

  ## Observing changes

  When using `SC.Set`, you can observe the `"[]"` property to be 
  alerted whenever the content changes.  You can also add an enumerable 
  observer to the set to be notified of specific objects that are added and
  removed from the set.  See `SC.Enumerable` for more information on 
  enumerables.

  This is often unhelpful. If you are filtering sets of objects, for instance,
  it is very inefficient to re-filter all of the items each time the set 
  changes. It would be better if you could just adjust the filtered set based 
  on what was changed on the original set. The same issue applies to merging 
  sets, as well.

  ## Other Methods

  `SC.Set` primary implements other mixin APIs.  For a complete reference
  on the methods you will use with `SC.Set`, please consult these mixins.
  The most useful ones will be `SC.Enumerable` and 
  `SC.MutableEnumerable` which implement most of the common iterator 
  methods you are used to on Array.

  Note that you can also use the `SC.Copyable` and `SC.Freezable`
  APIs on `SC.Set` as well.  Once a set is frozen it can no longer be 
  modified.  The benefit of this is that when you call frozenCopy() on it,
  SproutCore will avoid making copies of the set.  This allows you to write
  code that can know with certainty when the underlying set data will or 
  will not be modified.

  @extends SC.Enumerable
  @extends SC.MutableEnumerable
  @extends SC.Copyable
  @extends SC.Freezable

  @since SproutCore 1.0
*/
SC.Set = SC.CoreObject.extend(SC.MutableEnumerable, SC.Copyable, SC.Freezable,
  /** @scope SC.Set.prototype */ {

  // ..........................................................
  // IMPLEMENT ENUMERABLE APIS
  //

  /**
    This property will change as the number of objects in the set changes.

    @property Number
    @default 0
  */
  length: 0,

  /**
    Clears the set.  This is useful if you want to reuse an existing set
    without having to recreate it.

    @returns {SC.Set}
  */
  clear: function() {
    if (this.isFrozen) { throw new Error(SC.FROZEN_ERROR); }
    var len = get(this, 'length');
    this.enumerableContentWillChange(len, 0);
    set(this, 'length', 0);
    this.enumerableContentDidChange(len, 0);
    return this;
  },

  /**
    Returns true if the passed object is also an enumerable that contains the 
    same objects as the receiver.

    @param {SC.Set} obj the other object
    @returns {Boolean}
  */
  isEqual: function(obj) {
    // fail fast
    if (!SC.Enumerable.detect(obj)) return false;
    
    var loc = get(this, 'length');
    if (get(obj, 'length') !== loc) return false;

    while(--loc >= 0) {
      if (!obj.contains(this[loc])) return false;
    }

    return true;
  },
  
  /**
    Adds an object to the set.  Only non-null objects can be added to a set 
    and those can only be added once. If the object is already in the set or
    the passed value is null this method will have no effect.

    This is an alias for `SC.MutableEnumerable.addObject()`.

    @function
    @param {Object} obj The object to add
    @returns {SC.Set} receiver
  */
  add: SC.alias('addObject'),

  /**
    Removes the object from the set if it is found.  If you pass a null value
    or an object that is already not in the set, this method will have no
    effect. This is an alias for `SC.MutableEnumerable.removeObject()`.

    @function
    @param {Object} obj The object to remove
    @returns {SC.Set} receiver
  */
  remove: SC.alias('removeObject'),
  
  /**
    Removes an arbitrary object from the set and returns it.

    @returns {Object} An object from the set or null
  */
  pop: function() {
    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);
    var obj = this.length > 0 ? this[this.length-1] : null;
    this.remove(obj);
    return obj;
  },

  /**
    This is an alias for `SC.MutableEnumerable.addObject()`.

    @function
  */
  push: SC.alias('addObject'),
  
  /**
    This is an alias for `SC.Set.pop()`.
    @function
  */
  shift: SC.alias('pop'),

  /**
    This is an alias of `SC.Set.push()`
    @function
  */
  unshift: SC.alias('push'),

  /**
    This is an alias of `SC.MutableEnumerable.addObjects()`
    @function
  */
  addEach: SC.alias('addObjects'),

  /**
    This is an alias of `SC.MutableEnumerable.removeObjects()`
    @function
  */
  removeEach: SC.alias('removeObjects'),

  // ..........................................................
  // PRIVATE ENUMERABLE SUPPORT
  //

  /** @private */
  init: function(items) {
    this._super();
    if (items) this.addObjects(items);
  },

  /** @private (nodoc) - implement SC.Enumerable */
  nextObject: function(idx) {
    return this[idx];
  },

  /** @private - more optimized version */
  firstObject: SC.computed(function() {
    return this.length > 0 ? this[0] : undefined;  
  }).property('[]').cacheable(),

  /** @private - more optimized version */
  lastObject: SC.computed(function() {
    return this.length > 0 ? this[this.length-1] : undefined;
  }).property('[]').cacheable(),

  /** @private (nodoc) - implements SC.MutableEnumerable */
  addObject: function(obj) {
    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);
    if (none(obj)) return this; // nothing to do
    
    var guid = guidFor(obj),
        idx  = this[guid],
        len  = get(this, 'length'),
        added ;
        
    if (idx>=0 && idx<len && (this[idx] === obj)) return this; // added
    
    added = [obj];
    this.enumerableContentWillChange(null, added);
    len = get(this, 'length');
    this[guid] = len;
    this[len] = obj;
    set(this, 'length', len+1);
    this.enumerableContentDidChange(null, added);

    return this;
  },
  
  /** @private (nodoc) - implements SC.MutableEnumerable */
  removeObject: function(obj) {
    if (get(this, 'isFrozen')) throw new Error(SC.FROZEN_ERROR);
    if (none(obj)) return this; // nothing to do
    
    var guid = guidFor(obj),
        idx  = this[guid],
        len = get(this, 'length'),
        last, removed;
        
    
    if (idx>=0 && idx<len && (this[idx] === obj)) {
      removed = [obj];

      this.enumerableContentWillChange(removed, null);
      
      // swap items - basically move the item to the end so it can be removed
      if (idx < len-1) {
        last = this[len-1];
        this[idx] = last;
        this[guidFor(last)] = idx;
      }

      delete this[guid];
      delete this[len-1];
      set(this, 'length', len-1);

      this.enumerableContentDidChange(removed, null);
    }
    
    return this;
  },

  /** @private (nodoc) - optimized version */
  contains: function(obj) {
    return this[guidFor(obj)]>=0;
  },
  
  /** @private (nodoc) */
  copy: function() {
    var C = this.constructor, ret = new C(), loc = get(this, 'length');
    set(ret, 'length', loc);
    while(--loc>=0) {
      ret[loc] = this[loc];
      ret[guidFor(this[loc])] = loc;
    }
    return ret;
  },
  
  /** @private */
  toString: function() {
    var len = this.length, idx, array = [];
    for(idx = 0; idx < len; idx++) {
      array[idx] = this[idx];
    }
    return "SC.Set<%@>".fmt(array.join(','));
  },
  
  // ..........................................................
  // DEPRECATED
  // 

  /** @deprecated

    This property is often used to determine that a given object is a set.
    Instead you should use instanceof:

        #js:
        // SproutCore 1.x:
        isSet = myobject && myobject.isSet;

        // SproutCore 2.0 and later:
        isSet = myobject instanceof SC.Set

    @type Boolean
    @default true
  */
  isSet: true
    
});

// Support the older API 
var o_create = SC.Set.create;
SC.Set.create = function(items) {
  if (items && SC.Enumerable.detect(items)) {
    SC.Logger.warn('Passing an enumerable to SC.Set.create() is deprecated and will be removed in a future version of SproutCore.  Use new SC.Set(items) instead');
    return new SC.Set(items);
  } else {
    return o_create.apply(this, arguments);
  }
};


