/**
@module @ember/array
*/

// ..........................................................
// HELPERS
//
import { symbol, toString } from 'ember-utils';
import Ember, { // ES6TODO: Ember.A
  get,
  computed,
  cacheFor,
  isNone,
  Mixin,
  propertyWillChange,
  propertyDidChange,
  addListener,
  removeListener,
  sendEvent,
  hasListeners,
  _addBeforeObserver,
  _removeBeforeObserver,
  addObserver,
  removeObserver,
  meta,
  peekMeta
} from 'ember-metal';
import { deprecate, assert } from 'ember-debug';
import Enumerable from './enumerable';

function arrayObserversHelper(obj, target, opts, operation, notify) {
  let willChange = (opts && opts.willChange) || 'arrayWillChange';
  let didChange  = (opts && opts.didChange) || 'arrayDidChange';
  let hasObservers = get(obj, 'hasArrayObservers');

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
  return typeof content.objectAt === 'function' ? content.objectAt(idx) : content[idx];
}

export function arrayContentWillChange(array, startIdx, removeAmt, addAmt) {
  let removing, lim;

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

  if (array.__each) {
    array.__each.arrayWillChange(array, startIdx, removeAmt, addAmt);
  }

  sendEvent(array, '@array:before', [array, startIdx, removeAmt, addAmt]);

  if (startIdx >= 0 && removeAmt >= 0 && get(array, 'hasEnumerableObservers')) {
    removing = [];
    lim = startIdx + removeAmt;

    for (let idx = startIdx; idx < lim; idx++) {
      removing.push(objectAt(array, idx));
    }
  } else {
    removing = removeAmt;
  }

  array.enumerableContentWillChange(removing, addAmt);

  return array;
}

export function arrayContentDidChange(array, startIdx, removeAmt, addAmt) {
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

  let adding;
  if (startIdx >= 0 && addAmt >= 0 && get(array, 'hasEnumerableObservers')) {
    adding = [];
    let lim = startIdx + addAmt;

    for (let idx = startIdx; idx < lim; idx++) {
      adding.push(objectAt(array, idx));
    }
  } else {
    adding = addAmt;
  }

  array.enumerableContentDidChange(removeAmt, adding);

  if (array.__each) {
    array.__each.arrayDidChange(array, startIdx, removeAmt, addAmt);
  }

  sendEvent(array, '@array:change', [array, startIdx, removeAmt, addAmt]);

  let meta = peekMeta(array);
  let cache = meta !== undefined ? meta.readableCache() : undefined;
  if (cache !== undefined) {
    let length = get(array, 'length');
    let addedAmount = (addAmt === -1 ? 0 : addAmt);
    let removedAmount = (removeAmt === -1 ? 0 : removeAmt);
    let delta = addedAmount - removedAmount;
    let previousLength = length - delta;

    let normalStartIdx = startIdx < 0 ? previousLength + startIdx : startIdx;
    if (cache.firstObject !== undefined && normalStartIdx === 0) {
      propertyWillChange(array, 'firstObject', meta);
      propertyDidChange(array, 'firstObject', meta);
    }

    if (cache.lastObject !== undefined) {
      let previousLastIndex = previousLength - 1;
      let lastAffectedIndex = normalStartIdx + removedAmount;
      if (previousLastIndex < lastAffectedIndex) {
        propertyWillChange(array, 'lastObject', meta);
        propertyDidChange(array, 'lastObject', meta);
      }
   }
  }

  return array;
}

const EMBER_ARRAY = symbol('EMBER_ARRAY');

export function isEmberArray(obj) {
  return obj && obj[EMBER_ARRAY];
}

// ..........................................................
// ARRAY
//
/**
  This mixin implements Observer-friendly Array-like behavior. It is not a
  concrete implementation, but it can be used up by other classes that want
  to appear like arrays.

  For example, ArrayProxy is a concrete classes that can
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

  To support `@ember/array` in your own class, you must override two
  primitives to use it: `length()` and `objectAt()`.

  Note that the @ember/array mixin also incorporates the `Ember.Enumerable`
  mixin. All `@ember/array`-like objects are also enumerable.

  @class EmberArray
  @uses Enumerable
  @since Ember 0.9.0
  @public
*/
const ArrayMixin = Mixin.create(Enumerable, {

  [EMBER_ARRAY]: true,

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

    This is one of the primitives you must implement to support `@ember/array`.
    If your object supports retrieving the value of an array item using `get()`
    (i.e. `myArray.get(0)`), then you do not need to implement this method
    yourself.

    ```javascript
    let arr = ['a', 'b', 'c', 'd'];

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
    let arr = ['a', 'b', 'c', 'd'];

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
    return objectAt(this, 0);
  }).readOnly(),

  lastObject: computed(function() {
    return objectAt(this, get(this, 'length') - 1);
  }).readOnly(),

  // optimized version from Enumerable
  contains(obj) {
    deprecate(
      '`Enumerable#contains` is deprecated, use `Enumerable#includes` instead.',
      false,
      { id: 'ember-runtime.enumerable-contains', until: '3.0.0', url: 'https://emberjs.com/deprecations/v2.x#toc_enumerable-contains' }
    );

    return this.indexOf(obj) >= 0;
  },

  // Add any extra methods to @ember/array that are native to the built-in Array.
  /**
    Returns a new array that is a slice of the receiver. This implementation
    uses the observable array methods to retrieve the objects for the new
    slice.

    ```javascript
    let arr = ['red', 'green', 'blue'];

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
    let ret = Ember.A();
    let length = get(this, 'length');

    if (isNone(beginIndex)) {
      beginIndex = 0;
    } else if (beginIndex < 0) {
      beginIndex = length + beginIndex;
    }

    if (isNone(endIndex) || (endIndex > length)) {
      endIndex = length;
    } else if (endIndex < 0) {
      endIndex = length + endIndex;
    }

    while (beginIndex < endIndex) {
      ret[ret.length] = objectAt(this, beginIndex++);
    }

    return ret;
  },

  /**
    Returns the index of the given object's first occurrence.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, will count backward from
    the end of the array. Returns -1 if no match is found.

    ```javascript
    let arr = ['a', 'b', 'c', 'd', 'a'];

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
    let len = get(this, 'length');

    if (startAt === undefined) {
      startAt = 0;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (let idx = startAt; idx < len; idx++) {
      if (objectAt(this, idx) === object) {
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
    let arr = ['a', 'b', 'c', 'd', 'a'];

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
    let len = get(this, 'length');

    if (startAt === undefined || startAt >= len) {
      startAt = len - 1;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (let idx = startAt; idx >= 0; idx--) {
      if (objectAt(this, idx) === object) {
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
    change as well as a count of the items to be removed and added. You can use
    these callbacks to optionally inspect the array during the change, clear
    caches, or do any other bookkeeping necessary.

    In addition to passing a target, you can also include an options hash
    which you can use to override the method names that will be invoked on the
    target.

    @method addArrayObserver
    @param {Object} target The observer object.
    @param {Object} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {EmberArray} receiver
    @public
  */

  addArrayObserver(target, opts) {
    return addArrayObserver(this, target, opts);
  },

  /**
    Removes an array observer from the object if the observer is current
    registered. Calling this method multiple times with the same object will
    have no effect.

    @method removeArrayObserver
    @param {Object} target The object observing the array.
    @param {Object} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {EmberArray} receiver
    @public
  */
  removeArrayObserver(target, opts) {
    return removeArrayObserver(this, target, opts);
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
    If you are implementing an object that supports `@ember/array`, call this
    method just before the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentWillChange
    @param {Number} startIdx The starting index in the array that will change.
    @param {Number} removeAmt The number of items that will be removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that will be added. If you
      pass `null` assumes 0.
    @return {EmberArray} receiver
    @public
  */
  arrayContentWillChange(startIdx, removeAmt, addAmt) {
    return arrayContentWillChange(this, startIdx, removeAmt, addAmt);
  },

  /**
    If you are implementing an object that supports `@ember/array`, call this
    method just after the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentDidChange
    @param {Number} startIdx The starting index in the array that did change.
    @param {Number} removeAmt The number of items that were removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that were added. If you
      pass `null` assumes 0.
    @return {EmberArray} receiver
    @public
  */
  arrayContentDidChange(startIdx, removeAmt, addAmt) {
    return arrayContentDidChange(this, startIdx, removeAmt, addAmt);
  },

  /**
    Returns `true` if the passed object can be found in the array.
    This method is a Polyfill for ES 2016 Array.includes.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, searches from the index of
    `this.length + startAt` by asc.

    ```javascript
    [1, 2, 3].includes(2);     // true
    [1, 2, 3].includes(4);     // false
    [1, 2, 3].includes(3, 2);  // true
    [1, 2, 3].includes(3, 3);  // false
    [1, 2, 3].includes(3, -1); // true
    [1, 2, 3].includes(1, -1); // false
    [1, 2, 3].includes(1, -4); // true
    [1, 2, NaN].includes(NaN); // true
    ```

    @method includes
    @param {Object} obj The object to search for.
    @param {Number} startAt optional starting location to search, default 0
    @return {Boolean} `true` if object is found in the array.
    @public
  */
  includes(obj, startAt) {
    let len = get(this, 'length');

    if (startAt === undefined) {
      startAt = 0;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (let idx = startAt; idx < len; idx++) {
      let currentObj = objectAt(this, idx);

      // SameValueZero comparison (NaN !== NaN)
      if (obj === currentObj || (obj !== obj && currentObj !== currentObj)) {
        return true;
      }
    }

    return false;
  },

  /**
    Returns a special object that can be used to observe individual properties
    on the array. Just get an equivalent property on this object and it will
    return an enumerable that maps automatically to the named key on the
    member objects.

    `@each` should only be used in a non-terminal context. Example:

    ```javascript
    myMethod: computed('posts.@each.author', function(){
      ...
    });
    ```

    If you merely want to watch for the array being changed, like an object being
    replaced, added or removed, use `[]` instead of `@each`.

    ```javascript
    myMethod: computed('posts.[]', function(){
      ...
    });
    ```

    @property @each
    @public
  */
  '@each': computed(function() {
    // TODO use Symbol or add to meta
    if (!this.__each) {
      this.__each = new EachProxy(this);
    }

    return this.__each;
  }).volatile().readOnly()
});

/**
  This is the object instance returned when you get the `@each` property on an
  array. It uses the unknownProperty handler to automatically create
  EachArray instances for property names.
  @class EachProxy
  @private
*/
function EachProxy(content) {
  this._content = content;
  this._keys = undefined;
  meta(this);
}

EachProxy.prototype = {
  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange(content, idx, removedCnt, addedCnt) {
    let keys = this._keys;
    let lim = removedCnt > 0 ? idx + removedCnt : -1;
    let meta = peekMeta(this);
    for (let key in keys) {
      if (lim > 0) {
        removeObserverForContentKey(content, key, this, idx, lim);
      }
      propertyWillChange(this, key, meta);
    }
  },

  arrayDidChange(content, idx, removedCnt, addedCnt) {
    let keys = this._keys;
    let lim = addedCnt > 0 ? idx + addedCnt : -1;
    let meta = peekMeta(this);
    for (let key in keys) {
      if (lim > 0) {
        addObserverForContentKey(content, key, this, idx, lim);
      }
      propertyDidChange(this, key, meta);
    }
  },

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  willWatchProperty(property) {
    this.beginObservingContentKey(property);
  },

  didUnwatchProperty(property) {
    this.stopObservingContentKey(property);
  },

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey(keyName) {
    let keys = this._keys;
    if (!keys) {
      keys = this._keys = Object.create(null);
    }

    if (!keys[keyName]) {
      keys[keyName] = 1;
      let content = this._content;
      let len = get(content, 'length');

      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  },

  stopObservingContentKey(keyName) {
    let keys = this._keys;
    if (keys && (keys[keyName] > 0) && (--keys[keyName] <= 0)) {
      let content = this._content;
      let len     = get(content, 'length');

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange(obj, keyName) {
    propertyWillChange(this, keyName);
  },

  contentKeyDidChange(obj, keyName) {
    propertyDidChange(this, keyName);
  }
};

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      assert(`When using @each to observe the array \`${toString(content)}\`, the array must return an object`, typeof item === 'object');
      _addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      addObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      _removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

export default ArrayMixin;
