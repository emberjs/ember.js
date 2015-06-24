/**
@module ember
@submodule ember-runtime
*/

// ..........................................................
// HELPERS
//
import Ember from 'ember-metal/core'; // ES6TODO: Ember.A

import { get } from 'ember-metal/property_get';
import {
  computed,
  cacheFor
} from 'ember-metal/computed';
import isNone from 'ember-metal/is_none';
import Enumerable from 'ember-runtime/mixins/enumerable';
import { Mixin } from 'ember-metal/mixin';
import {
  propertyWillChange,
  propertyDidChange
} from 'ember-metal/property_events';
import {
  addListener,
  removeListener,
  sendEvent,
  hasListeners
} from 'ember-metal/events';
import { isWatching } from 'ember-metal/watching';

export function arrayContentDidChange(array, startIdx, removeAmt, addAmt) {
  var adding, lim;

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

  if (startIdx >= 0 && addAmt >= 0 && get(array, 'hasEnumerableObservers')) {
    adding = [];
    lim = startIdx + addAmt;

    for (var idx = startIdx; idx < lim; idx++) {
      adding.push(objectAt(idx));
    }
  } else {
    adding = addAmt;
  }

  // TODO: something something
  // array.enumerableContentDidChange(removeAmt, adding);
  sendEvent(array, '@array:change', [array, startIdx, removeAmt, addAmt]);

  var length = get(array, 'length');
  var cachedFirst = cacheFor(array, 'firstObject');
  var cachedLast = cacheFor(array, 'lastObject');

  if (objectAt(array, 0) !== cachedFirst) {
    propertyWillChange(array, 'firstObject');
    propertyDidChange(array, 'firstObject');
  }

  if (objectAt(array, length-1) !== cachedLast) {
    propertyWillChange(array, 'lastObject');
    propertyDidChange(array, 'lastObject');
  }
}

export function arrayContentWillChange(array, startIdx, removeAmt, addAmt) {
  var removing, lim;

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

  // Make sure the @each proxy is set up if anyone is observing @each
  if (isWatching(array, '@each')) {
    get(array, '@each');
  }

  sendEvent(array, '@array:before', [array, startIdx, removeAmt, addAmt]);

  if (startIdx >= 0 && removeAmt >= 0 && get(array, 'hasEnumerableObservers')) {
    removing = [];
    lim = startIdx + removeAmt;

    for (var idx = startIdx; idx < lim; idx++) {
      removing.push(objectAt(array, idx));
    }
  } else {
    removing = removeAmt;
  }

  // TODO: can we kill these?
  //enumerableContentWillChange(array, removing, addAmt);
}

function arrayObserversHelper(obj, target, opts, operation, notify) {
  var willChange = (opts && opts.willChange) || 'arrayWillChange';
  var didChange  = (opts && opts.didChange) || 'arrayDidChange';
  var hasObservers = get(obj, 'hasArrayObservers');

  if (hasObservers === notify) {
    propertyWillChange(obj, 'hasArrayObservers');
  }

  operation(obj, '@array:before', target, willChange);
  operation(obj, '@array:change', target, didChange);

  if (hasObservers === notify) {
    propertyDidChange(obj, 'hasArrayObservers');
  }

  return obj;
}

export function addArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, addListener, false);
}

export function removeArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, removeListener, true);
}

export function objectAt(content, idx) {
  if (content.objectAt) { return content.objectAt(idx); }
  return content[idx];
}


// ..........................................................
// ARRAY
//
/**
  This mixin implements Observer-friendly Array-like behavior. It is not a
  concrete implementation, but it can be used up by other classes that want
  to appear like arrays.

  For example, ArrayProxy and ArrayController are both concrete classes that can
  be instantiated to implement array-like behavior. Both of these classes use
  the Array Mixin by way of the MutableArray mixin, which allows observable
  changes to be made to the underlying array.

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
  membership of an array changes by using `.observes('myArray.[]')`.

  To support `Ember.Array` in your own class, you must override two
  primitives to use it: `replace()` and `objectAt()`.

  Note that the Ember.Array mixin also incorporates the `Ember.Enumerable`
  mixin. All `Ember.Array`-like objects are also enumerable.

  @class Array
  @namespace Ember
  @uses Ember.Enumerable
  @since Ember 0.9.0
  @public
*/
export default Mixin.create(Enumerable, {

  /**
    __Required.__ You must implement this method to apply this mixin.

    Your array must support the `length` property. Your replace methods should
    set this property whenever it changes.

    @property {Number} length
    @public
  */
  length: null,

  /**
    Returns the object at the given `index`. If the given `index` is negative
    or is greater or equal than the array length, returns `undefined`.

    This is one of the primitives you must implement to support `Ember.Array`.
    If your object supports retrieving the value of an array item using `get()`
    (i.e. `myArray.get(0)`), then you do not need to implement this method
    yourself.

    ```javascript
    var arr = ['a', 'b', 'c', 'd'];

    arr.objectAt(0);   // 'a'
    arr.objectAt(3);   // 'd'
    arr.objectAt(-1);  // undefined
    arr.objectAt(4);   // undefined
    arr.objectAt(5);   // undefined
    ```

    @method objectAt
    @param {Number} idx The index of the item to return.
    @return {*} item at index or undefined
    @public
  */
  objectAt(idx) {
    if (idx < 0 || idx >= get(this, 'length')) {
      return undefined;
    }

    return get(this, idx);
  },

  /**
    This returns the objects at the specified indexes, using `objectAt`.

    ```javascript
    var arr = ['a', 'b', 'c', 'd'];

    arr.objectsAt([0, 1, 2]);  // ['a', 'b', 'c']
    arr.objectsAt([2, 3, 4]);  // ['c', 'd', undefined]
    ```

    @method objectsAt
    @param {Array} indexes An array of indexes of items to return.
    @return {Array}
    @public
   */
  objectsAt(indexes) {
    return indexes.map(idx => objectAt(this, idx));
  },

  // overrides Ember.Enumerable version
  nextObject(idx) {
    return objectAt(this, idx);
  },

  /**
    This is the handler for the special array content property. If you get
    this property, it will return this. If you set this property to a new
    array, it will replace the current content.

    This property overrides the default property defined in `Ember.Enumerable`.

    @property []
    @return this
    @public
  */
  '[]': computed({
    get(key) {
      return this;
    },
    set(key, value) {
      this.replace(0, get(this, 'length'), value);
      return this;
    }
  }),

  firstObject: computed(function() {
    return this.objectAt(0);
  }),

  lastObject: computed(function() {
    return this.objectAt(get(this, 'length') - 1);
  }),

  // optimized version from Enumerable
  contains(obj) {
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
    @param {Number} beginIndex (Optional) index to begin slicing from.
    @param {Number} endIndex (Optional) index to end the slice at (but not included).
    @return {Array} New array with specified slice
    @public
  */
  slice(beginIndex, endIndex) {
    var ret = Ember.A();
    var length = get(this, 'length');

    if (isNone(beginIndex)) {
      beginIndex = 0;
    }

    if (isNone(endIndex) || (endIndex > length)) {
      endIndex = length;
    }

    if (beginIndex < 0) {
      beginIndex = length + beginIndex;
    }

    if (endIndex < 0) {
      endIndex = length + endIndex;
    }

    while (beginIndex < endIndex) {
      ret[ret.length] = this.objectAt(beginIndex++);
    }

    return ret;
  },

  /**
    Returns the index of the given object's first occurrence.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, will count backward from
    the end of the array. Returns -1 if no match is found.

    ```javascript
    var arr = ['a', 'b', 'c', 'd', 'a'];

    arr.indexOf('a');       //  0
    arr.indexOf('z');       // -1
    arr.indexOf('a', 2);    //  4
    arr.indexOf('a', -1);   //  4
    arr.indexOf('b', 3);    // -1
    arr.indexOf('a', 100);  // -1
    ```

    @method indexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
    @public
  */
  indexOf(object, startAt) {
    var len = get(this, 'length');
    var idx;

    if (startAt === undefined) {
      startAt = 0;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (idx = startAt; idx < len; idx++) {
      if (this.objectAt(idx) === object) {
        return idx;
      }
    }

    return -1;
  },

  /**
    Returns the index of the given object's last occurrence.
    If no `startAt` argument is given, the search starts from
    the last position. If it's negative, will count backward
    from the end of the array. Returns -1 if no match is found.

    ```javascript
    var arr = ['a', 'b', 'c', 'd', 'a'];

    arr.lastIndexOf('a');       //  4
    arr.lastIndexOf('z');       // -1
    arr.lastIndexOf('a', 2);    //  0
    arr.lastIndexOf('a', -1);   //  4
    arr.lastIndexOf('b', 3);    //  1
    arr.lastIndexOf('a', 100);  //  4
    ```

    @method lastIndexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
    @public
  */
  lastIndexOf(object, startAt) {
    var len = get(this, 'length');
    var idx;

    if (startAt === undefined || startAt >= len) {
      startAt = len-1;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (idx = startAt; idx >= 0; idx--) {
      if (this.objectAt(idx) === object) {
        return idx;
      }
    }

    return -1;
  },

  // ..........................................................
  // ARRAY OBSERVERS
  //

  /**
    Adds an array observer to the receiving array. The array observer object
    normally must implement two methods:

    * `arrayWillChange(observedObj, start, removeCount, addCount)` - This method will be
      called just before the array is modified.
    * `arrayDidChange(observedObj, start, removeCount, addCount)` - This method will be
      called just after the array is modified.

    Both callbacks will be passed the observed object, starting index of the
    change as well a a count of the items to be removed and added. You can use
    these callbacks to optionally inspect the array during the change, clear
    caches, or do any other bookkeeping necessary.

    In addition to passing a target, you can also include an options hash
    which you can use to override the method names that will be invoked on the
    target.

    @method addArrayObserver
    @param {Object} target The observer object.
    @param {Object} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {Ember.Array} receiver
    @public
  */

  addArrayObserver(target, opts) {
    return arrayObserversHelper(this, target, opts, addListener, false);
  },

  /**
    Removes an array observer from the object if the observer is current
    registered. Calling this method multiple times with the same object will
    have no effect.

    @method removeArrayObserver
    @param {Object} target The object observing the array.
    @param {Object} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {Ember.Array} receiver
    @public
  */
  removeArrayObserver(target, opts) {
    return arrayObserversHelper(this, target, opts, removeListener, true);
  },

  /**
    Becomes true whenever the array currently has observers watching changes
    on the array.

    @property {Boolean} hasArrayObservers
    @public
  */
  hasArrayObservers: computed(function() {
    return hasListeners(this, '@array:change') || hasListeners(this, '@array:before');
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
    @param {Number} addAmt The number of items that will be added. If you
      pass `null` assumes 0.
    @return {Ember.Array} receiver
    @public
  */
  arrayContentWillChange(startIdx, removeAmt, addAmt) {
    arrayContentWillChange(this, startIdx, removeAmt, addAmt);
    return this;
  },

  /**
    If you are implementing an object that supports `Ember.Array`, call this
    method just after the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentDidChange
    @param {Number} startIdx The starting index in the array that did change.
    @param {Number} removeAmt The number of items that were removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that were added. If you
      pass `null` assumes 0.
    @return {Ember.Array} receiver
    @public
  */
  arrayContentDidChange(startIdx, removeAmt, addAmt) {
    arrayContentDidChange(this, startIdx, removeAmt, addAmt);
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

    If you merely want to watch for any items being added or removed to the array,
    use the `[]` property instead of `@each`.

    @property @each
    @public
  */
  '@each': computed(function() {
    if (!this.__each) {
      // ES6TODO: GRRRRR
      var EachProxy = requireModule('ember-runtime/system/each_proxy')['EachProxy'];

      this.__each = new EachProxy(this);
    }

    return this.__each;
  })
});
