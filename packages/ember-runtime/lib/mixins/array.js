require('ember-runtime/mixins/enumerable');

/**
@module ember
@submodule ember-runtime
*/

// ..........................................................
// HELPERS
//

var get = Ember.get, set = Ember.set, meta = Ember.meta, map = Ember.EnumerableUtils.map, cacheFor = Ember.cacheFor;

function none(obj) { return obj===null || obj===undefined; }

// ..........................................................
// ARRAY
//
/**
  This module implements Observer-friendly Array-like behavior. This mixin is
  picked up by the Array class as well as other controllers, etc. that want to
  appear to be arrays.

  Unlike `Ember.Enumerable,` this mixin defines methods specifically for
  collections that provide index-ordered access to their contents. When you
  are designing code that needs to accept any kind of Array-like object, you
  should use these methods instead of Array primitives because these will
  properly notify observers of changes to the array.

  Although these methods are efficient, they do add a layer of indirection to
  your application so it is a good idea to use them only when you need the
  flexibility of using both true JavaScript arrays and "virtual" arrays such
  as controllers and collections.

  You can use the methods defined in this module to access and modify array
  contents in a KVO-friendly way. You can also be notified whenever the
  membership if an array changes by changing the syntax of the property to
  `.observes('*myProperty.[]')`.

  To support `Ember.Array` in your own class, you must override two
  primitives to use it: `replace()` and `objectAt()`.

  Note that the Ember.Array mixin also incorporates the `Ember.Enumerable`
  mixin. All `Ember.Array`-like objects are also enumerable.

  @class Array
  @namespace Ember
  @extends Ember.Mixin
  @uses Ember.Enumerable
  @since Ember 0.9.0
*/
Ember.Array = Ember.Mixin.create(Ember.Enumerable, /** @scope Ember.Array.prototype */ {

  // compatibility
  isSCArray: true,

  /**
    Your array must support the `length` property. Your replace methods should
    set this property whenever it changes.

    @property {Number} length
  */
  length: Ember.required(),

  /**
    Returns the object at the given `index`. If the given `index` is negative
    or is greater or equal than the array length, returns `undefined`.

    This is one of the primitives you must implement to support `Ember.Array`.
    If your object supports retrieving the value of an array item using `get()`
    (i.e. `myArray.get(0)`), then you do not need to implement this method
    yourself.

    ```javascript
    var arr = ['a', 'b', 'c', 'd'];
    arr.objectAt(0);   // "a"
    arr.objectAt(3);   // "d"
    arr.objectAt(-1);  // undefined
    arr.objectAt(4);   // undefined
    arr.objectAt(5);   // undefined
    ```

    @method objectAt
    @param {Number} idx The index of the item to return.
  */
  objectAt: function(idx) {
    if ((idx < 0) || (idx>=get(this, 'length'))) return undefined ;
    return get(this, idx);
  },

  /**
    This returns the objects at the specified indexes, using `objectAt`.

    ```javascript
    var arr = ['a', 'b', 'c', 'd'];
    arr.objectsAt([0, 1, 2]);  // ["a", "b", "c"]
    arr.objectsAt([2, 3, 4]);  // ["c", "d", undefined]
    ```

    @method objectsAt
    @param {Array} indexes An array of indexes of items to return.
   */
  objectsAt: function(indexes) {
    var self = this;
    return map(indexes, function(idx){ return self.objectAt(idx); });
  },

  // overrides Ember.Enumerable version
  nextObject: function(idx) {
    return this.objectAt(idx);
  },

  /**
    This is the handler for the special array content property. If you get
    this property, it will return this. If you set this property it a new
    array, it will replace the current content.

    This property overrides the default property defined in `Ember.Enumerable`.

    @property []
  */
  '[]': Ember.computed(function(key, value) {
    if (value !== undefined) this.replace(0, get(this, 'length'), value) ;
    return this ;
  }),

  firstObject: Ember.computed(function() {
    return this.objectAt(0);
  }),

  lastObject: Ember.computed(function() {
    return this.objectAt(get(this, 'length')-1);
  }),

  // optimized version from Enumerable
  contains: function(obj){
    return this.indexOf(obj) >= 0;
  },

  // Add any extra methods to Ember.Array that are native to the built-in Array.
  /**
    Returns a new array that is a slice of the receiver. This implementation
    uses the observable array methods to retrieve the objects for the new
    slice.

    ```javascript
    var arr = ['red', 'green', 'blue'];
    arr.slice(0);       // ['red', 'green', 'blue']
    arr.slice(0, 2);    // ['red', 'green']
    arr.slice(1, 100);  // ['green', 'blue']
    ```

    @method slice
    @param beginIndex {Integer} (Optional) index to begin slicing from.
    @param endIndex {Integer} (Optional) index to end the slice at.
    @return {Array} New array with specified slice
  */
  slice: function(beginIndex, endIndex) {
    var ret = [];
    var length = get(this, 'length') ;
    if (none(beginIndex)) beginIndex = 0 ;
    if (none(endIndex) || (endIndex > length)) endIndex = length ;
    while(beginIndex < endIndex) {
      ret[ret.length] = this.objectAt(beginIndex++) ;
    }
    return ret ;
  },

  /**
    Returns the index of the given object's first occurrence.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, will count backward from
    the end of the array. Returns -1 if no match is found.

    ```javascript
    var arr = ["a", "b", "c", "d", "a"];
    arr.indexOf("a");       //  0
    arr.indexOf("z");       // -1
    arr.indexOf("a", 2);    //  4
    arr.indexOf("a", -1);   //  4
    arr.indexOf("b", 3);    // -1
    arr.indexOf("a", 100);  // -1
    ```

    @method indexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
  */
  indexOf: function(object, startAt) {
    var idx, len = get(this, 'length');

    if (startAt === undefined) startAt = 0;
    if (startAt < 0) startAt += len;

    for(idx=startAt;idx<len;idx++) {
      if (this.objectAt(idx, true) === object) return idx ;
    }
    return -1;
  },

  /**
    Returns the index of the given object's last occurrence.
    If no `startAt` argument is given, the search starts from
    the last position. If it's negative, will count backward
    from the end of the array. Returns -1 if no match is found.

    ```javascript
    var arr = ["a", "b", "c", "d", "a"];
    arr.lastIndexOf("a");       //  4
    arr.lastIndexOf("z");       // -1
    arr.lastIndexOf("a", 2);    //  0
    arr.lastIndexOf("a", -1);   //  4
    arr.lastIndexOf("b", 3);    //  1
    arr.lastIndexOf("a", 100);  //  4
    ```

    @method lastIndexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
  */
  lastIndexOf: function(object, startAt) {
    var idx, len = get(this, 'length');

    if (startAt === undefined || startAt >= len) startAt = len-1;
    if (startAt < 0) startAt += len;

    for(idx=startAt;idx>=0;idx--) {
      if (this.objectAt(idx) === object) return idx ;
    }
    return -1;
  },

  // ..........................................................
  // ARRAY OBSERVERS
  //

  /**
    Adds an array observer to the receiving array. The array observer object
    normally must implement two methods:

    * `arrayWillChange(start, removeCount, addCount)` - This method will be
      called just before the array is modified.
    * `arrayDidChange(start, removeCount, addCount)` - This method will be
      called just after the array is modified.

    Both callbacks will be passed the starting index of the change as well a
    a count of the items to be removed and added. You can use these callbacks
    to optionally inspect the array during the change, clear caches, or do
    any other bookkeeping necessary.

    In addition to passing a target, you can also include an options hash
    which you can use to override the method names that will be invoked on the
    target.

    @method addArrayObserver
    @param {Object} target The observer object.
    @param {Hash} opts Optional hash of configuration options including
      `willChange`, `didChange`, and a `context` option.
    @return {Ember.Array} receiver
  */
  addArrayObserver: function(target, opts) {
    var willChange = (opts && opts.willChange) || 'arrayWillChange',
        didChange  = (opts && opts.didChange) || 'arrayDidChange';

    var hasObservers = get(this, 'hasArrayObservers');
    if (!hasObservers) Ember.propertyWillChange(this, 'hasArrayObservers');
    Ember.addListener(this, '@array:before', target, willChange);
    Ember.addListener(this, '@array:change', target, didChange);
    if (!hasObservers) Ember.propertyDidChange(this, 'hasArrayObservers');
    return this;
  },

  /**
    Removes an array observer from the object if the observer is current
    registered. Calling this method multiple times with the same object will
    have no effect.

    @method removeArrayObserver
    @param {Object} target The object observing the array.
    @return {Ember.Array} receiver
  */
  removeArrayObserver: function(target, opts) {
    var willChange = (opts && opts.willChange) || 'arrayWillChange',
        didChange  = (opts && opts.didChange) || 'arrayDidChange';

    var hasObservers = get(this, 'hasArrayObservers');
    if (hasObservers) Ember.propertyWillChange(this, 'hasArrayObservers');
    Ember.removeListener(this, '@array:before', target, willChange);
    Ember.removeListener(this, '@array:change', target, didChange);
    if (hasObservers) Ember.propertyDidChange(this, 'hasArrayObservers');
    return this;
  },

  /**
    Becomes true whenever the array currently has observers watching changes
    on the array.

    @property Boolean
  */
  hasArrayObservers: Ember.computed(function() {
    return Ember.hasListeners(this, '@array:change') || Ember.hasListeners(this, '@array:before');
  }),

  /**
    If you are implementing an object that supports `Ember.Array`, call this
    method just before the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentWillChange
    @param {Number} startIdx The starting index in the array that will change.
    @param {Number} removeAmt The number of items that will be removed. If you 
      pass `null` assumes 0
    @param {Number} addAmt The number of items that will be added  If you 
      pass `null` assumes 0.
    @return {Ember.Array} receiver
  */
  arrayContentWillChange: function(startIdx, removeAmt, addAmt) {

    // if no args are passed assume everything changes
    if (startIdx===undefined) {
      startIdx = 0;
      removeAmt = addAmt = -1;
    } else {
      if (removeAmt === undefined) removeAmt=-1;
      if (addAmt    === undefined) addAmt=-1;
    }

    // Make sure the @each proxy is set up if anyone is observing @each
    if (Ember.isWatching(this, '@each')) { get(this, '@each'); }

    Ember.sendEvent(this, '@array:before', [this, startIdx, removeAmt, addAmt]);

    var removing, lim;
    if (startIdx>=0 && removeAmt>=0 && get(this, 'hasEnumerableObservers')) {
      removing = [];
      lim = startIdx+removeAmt;
      for(var idx=startIdx;idx<lim;idx++) removing.push(this.objectAt(idx));
    } else {
      removing = removeAmt;
    }

    this.enumerableContentWillChange(removing, addAmt);

    return this;
  },

  arrayContentDidChange: function(startIdx, removeAmt, addAmt) {

    // if no args are passed assume everything changes
    if (startIdx===undefined) {
      startIdx = 0;
      removeAmt = addAmt = -1;
    } else {
      if (removeAmt === undefined) removeAmt=-1;
      if (addAmt    === undefined) addAmt=-1;
    }

    var adding, lim;
    if (startIdx>=0 && addAmt>=0 && get(this, 'hasEnumerableObservers')) {
      adding = [];
      lim = startIdx+addAmt;
      for(var idx=startIdx;idx<lim;idx++) adding.push(this.objectAt(idx));
    } else {
      adding = addAmt;
    }

    this.enumerableContentDidChange(removeAmt, adding);
    Ember.sendEvent(this, '@array:change', [this, startIdx, removeAmt, addAmt]);

    var length      = get(this, 'length'),
        cachedFirst = cacheFor(this, 'firstObject'),
        cachedLast  = cacheFor(this, 'lastObject');
    if (this.objectAt(0) !== cachedFirst) {
      Ember.propertyWillChange(this, 'firstObject');
      Ember.propertyDidChange(this, 'firstObject');
    }
    if (this.objectAt(length-1) !== cachedLast) {
      Ember.propertyWillChange(this, 'lastObject');
      Ember.propertyDidChange(this, 'lastObject');
    }

    return this;
  },

  // ..........................................................
  // ENUMERATED PROPERTIES
  //

  /**
    Returns a special object that can be used to observe individual properties
    on the array. Just get an equivalent property on this object and it will
    return an enumerable that maps automatically to the named key on the
    member objects.

    @property @each
  */
  '@each': Ember.computed(function() {
    if (!this.__each) this.__each = new Ember.EachProxy(this);
    return this.__each;
  })

}) ;
