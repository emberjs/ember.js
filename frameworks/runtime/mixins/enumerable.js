// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('core');
sc_require('ext/function');
sc_require('system/enumerator');

/*global Prototype */

/**
  @class

  This mixin defines the common interface implemented by enumerable objects
  in SproutCore.  Most of these methods follow the standard Array iteration
  API defined up to JavaScript 1.8 (excluding language-specific features that
  cannot be emulated in older versions of JavaScript).

  This mixin is applied automatically to the Array class on page load, so you
  can use any of these methods on simple arrays.  If Array already implements
  one of these methods, the mixin will not override them.

  Writing Your Own Enumerable
  -----

  To make your own custom class enumerable, you need two items:

  1. You must have a length property.  This property should change whenever
     the number of items in your enumerable object changes.  If you using this
     with an SC.Object subclass, you should be sure to change the length
     property using set().

  2. You must implement nextObject().  See documentation.

  Once you have these two methods implemented, apply the SC.Enumerable mixin
  to your class and you will be able to enumerate the contents of your object
  like any other collection.

  Using SproutCore Enumeration with Other Libraries
  -----

  Many other libraries provide some kind of iterator or enumeration like
  facility.  This is often where the most common API conflicts occur.
  SproutCore's API is designed to be as friendly as possible with other
  libraries by implementing only methods that mostly correspond to the
  JavaScript 1.8 API.

  @since SproutCore 1.0
*/
SC.Enumerable = /** @scope SC.Enumerable.prototype */{

  /**
    Walk like a duck.

    @type Boolean
  */
  isEnumerable: YES,

  /**
    Implement this method to make your class enumerable.

    This method will be called repeatedly during enumeration.  The index value
    will always begin with 0 and increment monotonically.  You don't have to
    rely on the index value to determine what object to return, but you should
    always check the value and start from the beginning when you see the
    requested index is 0.

    The previousObject is the object that was returned from the last call
    to nextObject for the current iteration.  This is a useful way to
    manage iteration if you are tracing a linked list, for example.

    Finally the context parameter will always contain a hash you can use as
    a "scratchpad" to maintain any other state you need in order to iterate
    properly.  The context object is reused and is not reset between
    iterations so make sure you setup the context with a fresh state whenever
    the index parameter is 0.

    Generally iterators will continue to call nextObject until the index
    reaches the your current length-1.  If you run out of data before this
    time for some reason, you should simply return undefined.

    The default implementation of this method simply looks up the index.
    This works great on any Array-like objects.

    @param {Number} index the current index of the iteration
    @param {Object} previousObject the value returned by the last call to nextObject.
    @param {Object} context a context object you can use to maintain state.
    @returns {Object} the next object in the iteration or undefined
  */
  nextObject: function (index, previousObject, context) {
    return this.objectAt ? this.objectAt(index) : this[index];
  },

  /**
    Helper method returns the first object from a collection.  This is usually
    used by bindings and other parts of the framework to extract a single
    object if the enumerable contains only one item.

    If you override this method, you should implement it so that it will
    always return the same value each time it is called.  If your enumerable
    contains only one object, this method should always return that object.
    If your enumerable is empty, this method should return undefined.

    This property is observable if the enumerable supports it.  Examples
    of enumerables where firstObject is observable include SC.Array,
    SC.ManyArray and SC.SparseArray.  To implement a custom enumerable where
    firstObject is observable, see {@link #enumerableContentDidChange}.

    @see #enumerableContentDidChange

    @returns {Object} the object or undefined
  */
  firstObject: function () {
    if (this.get('length') === 0) return undefined;
    if (this.objectAt) return this.objectAt(0); // support arrays out of box

    // handle generic enumerables
    var context = SC.Enumerator._popContext(), ret;
    ret = this.nextObject(0, null, context);
    context = SC.Enumerator._pushContext(context);
    return ret;
  }.property().cacheable(),

  /**
    Helper method returns the last object from a collection.

    This property is observable if the enumerable supports it.  Examples
    of enumerables where lastObject is observable include SC.Array,
    SC.ManyArray and SC.SparseArray.  To implement a custom enumerable where
    lastObject is observable, see {@link #enumerableContentDidChange}.

    @see #enumerableContentDidChange

    @returns {Object} the object or undefined
  */
  lastObject: function () {
    var len = this.get('length');
    if (len === 0) return undefined;
    if (this.objectAt) return this.objectAt(len - 1); // support arrays out of box
  }.property().cacheable(),

  /**
    Returns a new enumerator for this object.  See SC.Enumerator for
    documentation on how to use this object.  Enumeration is an alternative
    to using one of the other iterators described here.

    @returns {SC.Enumerator} an enumerator for the receiver
  */
  enumerator: function () { return SC.Enumerator.create(this); },

  /**
    Iterates through the enumerable, calling the passed function on each
    item.  This method corresponds to the forEach() method defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function (item, index, enumerable);

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    @param {Function} callback the callback to execute
    @param {Object} target the target object to use
    @returns {Object} this
  */
  forEach: function (callback, target) {
    if (typeof callback !== "function") throw new TypeError();
    var len = this.get ? this.get('length') : this.length;
    if (target === undefined) target = null;

    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; idx < len;idx++) {
      var next = this.nextObject(idx, last, context);
      callback.call(target, next, idx, this);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return this;
  },

  /**
    Retrieves the named value on each member object.  This is more efficient
    than using one of the wrapper methods defined here.  Objects that
    implement SC.Observable will use the get() method, otherwise the property
    will be accessed directly.

    @param {String} key the key to retrieve
    @returns {Array} extracted values
  */
  getEach: function (key) {
    return this.map(function (next) {
      return next ? (next.get ? next.get(key) : next[key]) : null;
    }, this);
  },

  /**
    Sets the value on the named property for each member.  This is more
    efficient than using other methods defined on this helper.  If the object
    implements SC.Observable, the value will be changed to set(), otherwise
    it will be set directly.  null objects are skipped.

    @param {String} key the key to set
    @param {Object} value the object to set
    @returns {Object} receiver
  */
  setEach: function (key, value) {
    this.forEach(function (next) {
      if (next) {
        if (next.set) next.set(key, value);
        else next[key] = value;
      }
    }, this);
    return this;
  },

  /**
    Maps all of the items in the enumeration to another value, returning
    a new array.  This method corresponds to map() defined in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

        function (item, index, enumerable);

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return the mapped value.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    @param {Function} callback the callback to execute
    @param {Object} target the target object to use
    @returns {Array} The mapped array.
  */
  map: function (callback, target) {
    if (typeof callback !== "function") throw new TypeError();
    var len = this.get ? this.get('length') : this.length;
    if (target === undefined) target = null;

    var ret  = [];
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; idx < len;idx++) {
      var next = this.nextObject(idx, last, context);
      ret[idx] = callback.call(target, next, idx, this);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Similar to map, this specialized function returns the value of the named
    property on all items in the enumeration.

    @param {String} key name of the property
    @returns {Array} The mapped array.
  */
  mapProperty: function (key) {
    return this.map(function (next) {
      return next ? (next.get ? next.get(key) : next[key]) : null;
    });
  },

  /**
    Returns an array with all of the items in the enumeration that the passed
    function returns YES for. This method corresponds to filter() defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function (item, index, enumerable);

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return the YES to include the item in the results, NO otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    @param {Function} callback the callback to execute
    @param {Object} target the target object to use
    @returns {Array} A filtered array.
  */
  filter: function (callback, target) {
    if (typeof callback !== "function") throw new TypeError();
    var len = this.get ? this.get('length') : this.length;
    if (target === undefined) target = null;

    var ret  = [];
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; idx < len;idx++) {
      var next = this.nextObject(idx, last, context);
      if (callback.call(target, next, idx, this)) ret.push(next);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Returns an array sorted by the value of the passed key parameters.
    null objects will be sorted first.  You can pass either an array of keys
    or multiple parameters which will act as key names

    @param {String} key one or more key names
    @returns {Array}
  */
  sortProperty: function (key) {
    var keys = (typeof key === SC.T_STRING) ? arguments : key,
        len  = keys.length,
        src;

    // get the src array to sort
    if (this instanceof Array) src = this;
    else {
      src = [];
      this.forEach(function (i) { src.push(i); });
    }

    if (!src) return [];
    return src.sort(function (a, b) {
      var idx, key, aValue, bValue, ret = 0;

      for (idx = 0; ret === 0 && idx < len; idx++) {
        key = keys[idx];
        aValue = a ? (a.get ? a.get(key) : a[key]) : null;
        bValue = b ? (b.get ? b.get(key) : b[key]) : null;
        ret = SC.compare(aValue, bValue);
      }
      return ret;
    });
  },


  /**
    Returns an array with just the items with the matched property.  You
    can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to true.

    Note: null, undefined, false and the empty string all evaulate to false.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Array} filtered array
  */
  filterProperty: function (key, value) {
    var len = this.get ? this.get('length') : this.length,
        ret = [],
        last = null,
        context = SC.Enumerator._popContext(),
        idx, item, cur;
    // Although the code for value and no value are almost identical, we want to make as many decisions outside
    // the loop as possible.
    if (value === undefined) {
      for (idx = 0; idx < len; idx++) {
        item = this.nextObject(idx, last, context);
        cur = item ? (item.get ? item.get(key) : item[key]) : null;
        if (!!cur) ret.push(item);
        last = item;
      }
    } else {
      for (idx = 0; idx < len; idx++) {
        item = this.nextObject(idx, last, context);
        cur = item ? (item.get ? item.get(key) : item[key]) : null;
        if (SC.isEqual(cur, value)) ret.push(item);
        last = item;
      }
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Returns the first item in the array for which the callback returns YES.
    This method works similar to the filter() method defined in JavaScript 1.6
    except that it will stop working on the array once a match is found.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function (item, index, enumerable);

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return the YES to include the item in the results, NO otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    @param {Function} callback the callback to execute
    @param {Object} target the target object to use
    @returns {Object} Found item or null.
  */
  find: function (callback, target) {
    var len = this.get ? this.get('length') : this.length;
    if (target === undefined) target = null;

    var last = null, next, found = NO, ret = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; idx < len && !found;idx++) {
      next = this.nextObject(idx, last, context);
      if (found = callback.call(target, next, idx, this)) ret = next;
      last = next;
    }
    next = last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Returns an the first item with a property matching the passed value.  You
    can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to true.

    This method works much like the more generic find() method.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Object} found item or null
  */
  findProperty: function (key, value) {
    var len = this.get ? this.get('length') : this.length;
    var found = NO, ret = null, last = null, next, cur;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; idx < len && !found;idx++) {
      next = this.nextObject(idx, last, context);
      cur = next ? (next.get ? next.get(key) : next[key]) : null;
      found = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      if (found) ret = next;
      last = next;
    }
    last = next = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Returns YES if the passed function returns YES for every item in the
    enumeration.  This corresponds with the every() method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function (item, index, enumerable);

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return the YES or NO.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    Example Usage:

          if (people.every(isEngineer)) { Paychecks.addBigBonus(); }

    @param {Function} callback the callback to execute
    @param {Object} target the target object to use
    @returns {Boolean}
  */
  every: function (callback, target) {
    if (typeof callback !== "function") throw new TypeError();
    var len = this.get ? this.get('length') : this.length;
    if (target === undefined) target = null;

    var ret  = YES;
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0;ret && (idx < len);idx++) {
      var next = this.nextObject(idx, last, context);
      if (!callback.call(target, next, idx, this)) ret = NO;
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Returns YES if the passed property resolves to true for all items in the
    enumerable.  This method is often simpler/faster than using a callback.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Array} filtered array
  */
  everyProperty: function (key, value) {
    var len = this.get ? this.get('length') : this.length;
    var ret  = YES;
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0;ret && (idx < len);idx++) {
      var next = this.nextObject(idx, last, context);
      var cur = next ? (next.get ? next.get(key) : next[key]) : null;
      ret = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },


  /**
    Returns YES if the passed function returns true for any item in the
    enumeration. This corresponds with the every() method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function (item, index, enumerable);

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    It should return the YES to include the item in the results, NO otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context.  This is a good way
    to give your iterator function access to the current object.

    Usage Example:

          if (people.some(isManager)) { Paychecks.addBiggerBonus(); }

    @param {Function} callback the callback to execute
    @param {Object} target the target object to use
    @returns {Boolean} YES
  */
  some: function (callback, target) {
    if (typeof callback !== "function") throw new TypeError();
    var len = this.get ? this.get('length') : this.length;
    if (target === undefined) target = null;

    var ret  = NO;
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0;(!ret) && (idx < len);idx++) {
      var next = this.nextObject(idx, last, context);
      if (callback.call(target, next, idx, this)) ret = YES;
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Returns YES if the passed property resolves to true for any item in the
    enumerable.  This method is often simpler/faster than using a callback.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Boolean} YES
  */
  someProperty: function (key, value) {
    var len = this.get ? this.get('length') : this.length;
    var ret  = NO;
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; !ret && (idx < len); idx++) {
      var next = this.nextObject(idx, last, context);
      var cur = next ? (next.get ? next.get(key) : next[key]) : null;
      ret = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;  // return the invert
  },

  /**
    This will combine the values of the enumerator into a single value. It
    is a useful way to collect a summary value from an enumeration.  This
    corresponds to the reduce() method defined in JavaScript 1.8.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function (previousValue, item, index, enumerable);

    - *previousValue* is the value returned by the last call to the iterator.
    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

    Return the new cumulative value.

    In addition to the callback you can also pass an initialValue.  An error
    will be raised if you do not pass an initial value and the enumerator is
    empty.

    Note that unlike the other methods, this method does not allow you to
    pass a target object to set as this for the callback.  It's part of the
    spec. Sorry.

    @param {Function} callback the callback to execute
    @param {Object} initialValue initial value for the reduce
    @param {String} reducerProperty internal use only.  May not be available.
    @returns {Object} The reduced value.
  */
  reduce: function (callback, initialValue, reducerProperty) {
    if (typeof callback !== "function") throw new TypeError();
    var len = this.get ? this.get('length') : this.length;

    // no value to return if no initial value & empty
    if (len === 0 && initialValue === undefined) throw new TypeError();

    var ret  = initialValue;
    var last = null;
    var context = SC.Enumerator._popContext();
    for (var idx = 0; idx < len;idx++) {
      var next = this.nextObject(idx, last, context);

      // while ret is still undefined, just set the first value we get as ret.
      // this is not the ideal behavior actually but it matches the FireFox
      // implementation... :(
      if (next !== null) {
        if (ret === undefined) {
          ret = next;
        } else {
          ret = callback.call(null, ret, next, idx, this, reducerProperty);
        }
      }
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);

    // uh oh...we never found a value!
    if (ret === undefined) throw new TypeError();
    return ret;
  },

  /**
    Invokes the named method on every object in the receiver that
    implements it.  This method corresponds to the implementation in
    Prototype 1.6.

    @param {String} methodName the name of the method
    @param {Object...} args optional arguments to pass as well.
    @returns {Array} return values from calling invoke.
  */
  invoke: function (methodName) {
    var len = this.get ? this.get('length') : this.length;
    if (len <= 0) return []; // nothing to invoke....

    var idx;

    // collect the arguments
    var args = [];
    var alen = arguments.length;
    if (alen > 1) {
      for (idx = 1; idx < alen; idx++) args.push(arguments[idx]);
    }

    // call invoke
    var ret = [];
    var last = null;
    var context = SC.Enumerator._popContext();
    for (idx = 0; idx < len; idx++) {
      var next = this.nextObject(idx, last, context);
      var method = next ? next[methodName] : null;
      if (method) ret[idx] = method.apply(next, args);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Invokes the passed method and optional arguments on the receiver elements
    as long as the methods return value matches the target value.  This is
    a useful way to attempt to apply changes to a collection of objects unless
    or until one fails.

    @param {Object} targetValue the target return value
    @param {String} methodName the name of the method
    @param {Object...} args optional arguments to pass as well.
    @returns {Array} return values from calling invoke.
  */
  invokeWhile: function (targetValue, methodName) {
    var len = this.get ? this.get('length') : this.length;
    if (len <= 0) return null; // nothing to invoke....

    var idx;

    // collect the arguments
    var args = [];
    var alen = arguments.length;
    if (alen > 2) {
      for (idx = 2; idx < alen; idx++) args.push(arguments[idx]);
    }

    // call invoke
    var ret = targetValue;
    var last = null;
    var context = SC.Enumerator._popContext();
    for (idx = 0; (ret === targetValue) && (idx < len); idx++) {
      var next = this.nextObject(idx, last, context);
      var method = next ? next[methodName] : null;
      if (method) ret = method.apply(next, args);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);
    return ret;
  },

  /**
    Simply converts the enumerable into a genuine array.  The order, of
    course, is not gauranteed.  Corresponds to the method implemented by
    Prototype.

    @returns {Array} the enumerable as an array.
  */
  toArray: function () {
    var ret = [];
    this.forEach(function (o) { ret.push(o); }, this);
    return ret;
  },

  /**
    Converts an enumerable into a matrix, with inner arrays grouped based
    on a particular property of the elements of the enumerable.

    @param {String} key the property to test
    @returns {Array} matrix of arrays
  */
  groupBy: function (key) {
    var len = this.get ? this.get('length') : this.length,
        ret = [],
        last = null,
        context = SC.Enumerator._popContext(),
        grouped = [],
        keyValues = [],
        idx, next, cur;

    for (idx = 0; idx < len;idx++) {
      next = this.nextObject(idx, last, context);
      cur = next ? (next.get ? next.get(key) : next[key]) : null;
      if (SC.none(grouped[cur])) {
        grouped[cur] = [];
        keyValues.push(cur);
      }
      grouped[cur].push(next);
      last = next;
    }
    last = null;
    context = SC.Enumerator._pushContext(context);

    for (idx = 0, len = keyValues.length; idx < len; idx++) {
      ret.push(grouped[keyValues[idx]]);
    }
    return ret;
  }

};

// Build in a separate function to avoid unintentional leaks through closures...
SC._buildReducerFor = function (reducerKey, reducerProperty) {
  return function (key, value) {
    var reducer = this[reducerKey];
    if (SC.typeOf(reducer) !== SC.T_FUNCTION) {
      return this.unknownProperty ? this.unknownProperty(key, value) : null;
    } else {
      // Invoke the reduce method defined in enumerable instead of using the
      // one implemented in the receiver.  The receiver might be a native
      // implementation that does not support reducerProperty.
      var ret = SC.Enumerable.reduce.call(this, reducer, null, reducerProperty);
      return ret;
    }
  }.property('[]');
};

/** @class */
SC.Reducers = /** @scope SC.Reducers.prototype */ {
  /**
    This property will trigger anytime the enumerable's content changes.
    You can observe this property to be notified of changes to the enumerables
    content.

    For plain enumerables, this property is read only.  SC.Array overrides
    this method.

    @type SC.Array
  */
  '[]': function (key, value) { return this; }.property(),

  /**
    Invoke this method when the contents of your enumerable has changed.
    This will notify any observers watching for content changes.  If you are
    implementing an ordered enumerable (such as an Array), also pass the
    start and length values so that it can be used to notify range observers.
    Passing start and length values will also ensure that the computed
    properties `firstObject` and `lastObject` are updated.

    @param {Number} [start] start offset for the content change
    @param {Number} [length] length of change
    @param {Number} [deltas] if you added or removed objects, the delta change
    @returns {Object} receiver
  */
  enumerableContentDidChange: function (start, length, deltas) {
    // If the start & length are provided, we can also indicate if the firstObject
    // or lastObject properties changed, thus making them independently observable.
    if (!SC.none(start)) {
      if (start === 0) this.notifyPropertyChange('firstObject');
      if (!SC.none(length) && start + length >= this.get('length') - 1) this.notifyPropertyChange('lastObject');
    }

    this.notifyPropertyChange('[]');
  },

  /**
    Call this method from your unknownProperty() handler to implement
    automatic reduced properties.  A reduced property is a property that
    collects its contents dynamically from your array contents.  Reduced
    properties always begin with "@".  Getting this property will call
    reduce() on your array with the function matching the key name as the
    processor.

    The return value of this will be either the return value from the
    reduced property or undefined, which means this key is not a reduced
    property.  You can call this at the top of your unknownProperty handler
    like so:

      unknownProperty: function (key, value) {
        var ret = this.handleReduceProperty(key, value);
        if (ret === undefined) {
          // process like normal
        }
      }

    @param {String} key the reduce property key

    @param {Object} value a value or undefined.

    @param {Boolean} generateProperty only set to false if you do not want
      an optimized computed property handler generated for this.  Not common.

    @returns {Object} the reduced property or undefined
  */
  reducedProperty: function (key, value, generateProperty) {

    if (!key || typeof key !== SC.T_STRING || key.charAt(0) !== '@') return undefined; // not a reduced property

    // get the reducer key and the reducer
    var matches = key.match(/^@([^(]*)(\(([^)]*)\))?$/);
    if (!matches || matches.length < 2) return undefined; // no match

    var reducerKey = matches[1]; // = 'max' if key = '@max(balance)'
    var reducerProperty = matches[3]; // = 'balance' if key = '@max(balance)'
    reducerKey = "reduce" + reducerKey.slice(0, 1).toUpperCase() + reducerKey.slice(1);
    var reducer = this[reducerKey];

    // if there is no reduce function defined for this key, then we can't
    // build a reducer for it.
    if (SC.typeOf(reducer) !== SC.T_FUNCTION) return undefined;

    // if we can't generate the property, just run reduce
    if (generateProperty === NO) {
      return SC.Enumerable.reduce.call(this, reducer, null, reducerProperty);
    }

    // ok, found the reducer.  Let's build the computed property and install
    var func = SC._buildReducerFor(reducerKey, reducerProperty);
    var p = this.constructor.prototype;

    if (p) {
      p[key] = func;

      // add the function to the properties array so that new instances
      // will have their dependent key registered.
      var props = p._properties || [];
      props.push(key);
      p._properties = props;
      this.registerDependentKey(key, '[]');
    }

    // and reduce anyway...
    return SC.Enumerable.reduce.call(this, reducer, null, reducerProperty);
  },

  /**
    Reducer for @max reduced property.

    @param {Object} previousValue The previous value in the enumerable
    @param {Object} item The current value in the enumerable
    @param {Number} index The index of the current item in the enumerable
    @param {String} reducerProperty (Optional) The property in the enumerable being reduced

    @returns {Object} reduced value
  */
  reduceMax: function (previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    if (previousValue === null) return item;
    return (item > previousValue) ? item : previousValue;
  },

  /**
    Reduces an enumerable to the max of the items in the enumerable. If
    reducerProperty is passed, it will reduce that property. Otherwise, it will
    reduce the item itself.

    @param {Object} previousValue The previous value in the enumerable
    @param {Object} item The current value in the enumerable
    @param {Number} index The index of the current item in the enumerable
    @param {String} reducerProperty (Optional) The property in the enumerable being reduced

    @returns {Object} reduced value
  */
  reduceMaxObject: function (previousItem, item, index, e, reducerProperty) {

    // get the value for both the previous and current item.  If no
    // reducerProperty was supplied, use the items themselves.
    var previousValue = previousItem, itemValue = item;
    if (reducerProperty) {
      if (item) {
        itemValue = item.get ? item.get(reducerProperty) : item[reducerProperty];
      }

      if (previousItem) {
        previousValue = previousItem.get ? previousItem.get(reducerProperty) : previousItem[reducerProperty];
      }
    }
    if (previousValue === null) return item;
    return (itemValue > previousValue) ? item : previousItem;
  },

  /**
    Reduces an enumerable to the min of the items in the enumerable. If
    reducerProperty is passed, it will reduce that property. Otherwise, it will
    reduce the item itself.

    @param {Object} previousValue The previous value in the enumerable
    @param {Object} item The current value in the enumerable
    @param {Number} index The index of the current item in the enumerable
    @param {String} reducerProperty (Optional) The property in the enumerable being reduced

    @returns {Object} reduced value
  */
  reduceMin: function (previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    if (previousValue === null) return item;
    return (item < previousValue) ? item : previousValue;
  },

  /**
    Reduces an enumerable to the max of the items in the enumerable. If
    reducerProperty is passed, it will reduce that property. Otherwise, it will
    reduce the item itself.

    @param {Object} previousValue The previous value in the enumerable
    @param {Object} item The current value in the enumerable
    @param {Number} index The index of the current item in the enumerable
    @param {String} reducerProperty (Optional) The property in the enumerable being reduced

    @returns {Object} reduced value
  */
  reduceMinObject: function (previousItem, item, index, e, reducerProperty) {

    // get the value for both the previous and current item.  If no
    // reducerProperty was supplied, use the items themselves.
    var previousValue = previousItem, itemValue = item;
    if (reducerProperty) {
      if (item) {
        itemValue = item.get ? item.get(reducerProperty) : item[reducerProperty];
      }

      if (previousItem) {
        previousValue = previousItem.get ? previousItem.get(reducerProperty) : previousItem[reducerProperty];
      }
    }
    if (previousValue === null) return item;
    return (itemValue < previousValue) ? item : previousItem;
  },

  /**
    Reduces an enumerable to the average of the items in the enumerable. If
    reducerProperty is passed, it will reduce that property. Otherwise, it will
    reduce the item itself.

    @param {Object} previousValue The previous value in the enumerable
    @param {Object} item The current value in the enumerable
    @param {Number} index The index of the current item in the enumerable
    @param {String} reducerProperty (Optional) The property in the enumerable being reduced

    @returns {Object} reduced value
  */
  reduceAverage: function (previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    var ret = (previousValue || 0) + item;
    var len = e.get ? e.get('length') : e.length;
    if (index >= len - 1) ret = ret / len; //avg after last item.
    return ret;
  },

  /**
    Reduces an enumerable to the sum of the items in the enumerable. If
    reducerProperty is passed, it will reduce that property. Otherwise, it will
    reduce the item itself.

    @param {Object} previousValue The previous value in the enumerable
    @param {Object} item The current value in the enumerable
    @param {Number} index The index of the current item in the enumerable
    @param {String} reducerProperty (Optional) The property in the enumerable being reduced

    @returns {Object} reduced value
  */
  reduceSum: function (previousValue, item, index, e, reducerProperty) {
    if (reducerProperty && item) {
      item = item.get ? item.get(reducerProperty) : item[reducerProperty];
    }
    return (previousValue === null) ? item : previousValue + item;
  }
};

// Apply reducers...
SC.mixin(SC.Enumerable, SC.Reducers);
SC.mixin(Array.prototype, SC.Reducers);
Array.prototype.isEnumerable = YES;

// ......................................................
// ARRAY SUPPORT
//

// Implement the same enhancements on Array.  We use specialized methods
// because working with arrays are so common.
(function () {

  // These methods will be applied even if they already exist b/c we do it
  // better.
  var alwaysMixin = {

    // this is supported so you can get an enumerator.  The rest of the
    // methods do not use this just to squeeze every last ounce of perf as
    // possible.
    nextObject: SC.Enumerable.nextObject,
    enumerator: SC.Enumerable.enumerator,
    firstObject: SC.Enumerable.firstObject,
    lastObject: SC.Enumerable.lastObject,
    sortProperty: SC.Enumerable.sortProperty,

    // see above...
    mapProperty: function (key) {
      var len = this.length;
      var ret  = [];
      for (var idx = 0; idx < len; idx++) {
        var next = this[idx];
        ret[idx] = next ? (next.get ? next.get(key) : next[key]) : null;
      }
      return ret;
    },

    filterProperty: function (key, value) {
      var len = this.length,
          ret = [],
          idx, item, cur;
      // Although the code for value and no value are almost identical, we want to make as many decisions outside
      // the loop as possible.
      if (value === undefined) {
        for (idx = 0; idx < len; idx++) {
          item = this[idx];
          cur = item ? (item.get ? item.get(key) : item[key]) : null;
          if (!!cur) ret.push(item);
        }
      } else {
        for (idx = 0; idx < len; idx++) {
          item = this[idx];
          cur = item ? (item.get ? item.get(key) : item[key]) : null;
          if (SC.isEqual(cur, value)) ret.push(item);
        }
      }
      return ret;
    },
    //returns a matrix
    groupBy: function (key) {
      var len = this.length,
          ret = [],
          grouped = [],
          keyValues = [],
          idx, next, cur;

      for (idx = 0; idx < len; idx++) {
        next = this[idx];
        cur = next ? (next.get ? next.get(key) : next[key]) : null;
        if (SC.none(grouped[cur])) { grouped[cur] = []; keyValues.push(cur); }
        grouped[cur].push(next);
      }

      for (idx = 0, len = keyValues.length; idx < len; idx++) {
        ret.push(grouped[keyValues[idx]]);
      }
      return ret;
    },

    find: function (callback, target) {
      if (typeof callback !== "function") throw new TypeError();
      var len = this.length;
      if (target === undefined) target = null;

      var next, ret = null, found = NO;
      for (var idx = 0; idx < len && !found; idx++) {
        next = this[idx];
        if (found = callback.call(target, next, idx, this)) ret = next;
      }
      next = null;
      return ret;
    },

    findProperty: function (key, value) {
      var len = this.length;
      var next, cur, found = NO, ret = null;
      for (var idx = 0; idx < len && !found; idx++) {
        cur = (next = this[idx]) ? (next.get ? next.get(key): next[key]):null;
        found = (value === undefined) ? !!cur : SC.isEqual(cur, value);
        if (found) ret = next;
      }
      next = null;
      return ret;
    },

    everyProperty: function (key, value) {
      var len = this.length;
      var ret  = YES;
      for (var idx = 0; ret && (idx < len); idx++) {
        var next = this[idx];
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        ret = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      }
      return ret;
    },

    someProperty: function (key, value) {
      var len = this.length;
      var ret  = NO;
      for (var idx = 0; !ret && (idx < len); idx++) {
        var next = this[idx];
        var cur = next ? (next.get ? next.get(key) : next[key]) : null;
        ret = (value === undefined) ? !!cur : SC.isEqual(cur, value);
      }
      return ret;  // return the invert
    },

    invoke: function (methodName) {
      var len = this.length;
      if (len <= 0) return []; // nothing to invoke....

      var idx;

      // collect the arguments
      var args = [];
      var alen = arguments.length;
      if (alen > 1) {
        for (idx = 1; idx < alen; idx++) args.push(arguments[idx]);
      }

      // call invoke
      var ret = [];
      for (idx = 0; idx < len; idx++) {
        var next = this[idx];
        var method = next ? next[methodName] : null;
        if (method) ret[idx] = method.apply(next, args);
      }
      return ret;
    },

    invokeWhile: function (targetValue, methodName) {
      var len = this.length;
      if (len <= 0) return null; // nothing to invoke....

      var idx;

      // collect the arguments
      var args = [];
      var alen = arguments.length;
      if (alen > 2) {
        for (idx = 2; idx < alen; idx++) args.push(arguments[idx]);
      }

      // call invoke
      var ret = targetValue;
      for (idx = 0; (ret === targetValue) && (idx < len); idx++) {
        var next = this[idx];
        var method = next ? next[methodName] : null;
        if (method) ret = method.apply(next, args);
      }
      return ret;
    },

    toArray: function () {
      var len = this.length;
      if (len <= 0) return []; // nothing to invoke....

      // call invoke
      var ret = [];
      for (var idx = 0; idx < len; idx++) {
        var next = this[idx];
        ret.push(next);
      }
      return ret;
    },

    getEach: function (key) {
      var ret = [];
      var len = this.length;
      for (var idx = 0; idx < len; idx++) {
        var obj = this[idx];
        ret[idx] = obj ? (obj.get ? obj.get(key) : obj[key]) : null;
      }
      return ret;
    },

    setEach: function (key, value) {
      var len = this.length;
      for (var idx = 0; idx < len; idx++) {
        var obj = this[idx];
        if (obj) {
          if (obj.set) {
            obj.set(key, value);
          } else obj[key] = value;
        }
      }
      return this;
    }

  };

  // These methods will only be applied if they are not already defined b/c
  // the browser is probably getting it.
  var mixinIfMissing = {

    // QUESTION: The lack of DRY is burning my eyes [YK]
    forEach: function (callback, target) {
      if (typeof callback !== "function") throw new TypeError();

      // QUESTION: Is this necessary?
      if (target === undefined) target = null;

      for (var i = 0, l = this.length; i < l; i++) {
        var next = this[i];
        callback.call(target, next, i, this);
      }
      return this;
    },

    map: function (callback, target) {
      if (typeof callback !== "function") throw new TypeError();

      if (target === undefined) target = null;

      var ret = [];
      for (var i = 0, l = this.length; i < l; i++) {
        var next = this[i];
        ret[i] = callback.call(target, next, i, this);
      }
      return ret;
    },

    filter: function (callback, target) {
      if (typeof callback !== "function") throw new TypeError();

      if (target === undefined) target = null;

      var ret = [];
      for (var i = 0, l = this.length; i < l; i++) {
        var next = this[i];
        if (callback.call(target, next, i, this)) ret.push(next);
      }
      return ret;
    },

    every: function (callback, target) {
      if (typeof callback !== "function") throw new TypeError();
      var len = this.length;
      if (target === undefined) target = null;

      var ret  = YES;
      for (var idx = 0; ret && (idx < len); idx++) {
        var next = this[idx];
        if (!callback.call(target, next, idx, this)) ret = NO;
      }
      return ret;
    },

    some: function (callback, target) {
      if (typeof callback !== "function") throw new TypeError();
      var len = this.length;
      if (target === undefined) target = null;

      var ret  = NO;
      for (var idx = 0; (!ret) && (idx < len); idx++) {
        var next = this[idx];
        if (callback.call(target, next, idx, this)) ret = YES;
      }
      return ret;
    },

    reduce: function (callback, initialValue, reducerProperty) {
      if (typeof callback !== "function") throw new TypeError();
      var len = this.length;

      // no value to return if no initial value & empty
      if (len === 0 && initialValue === undefined) throw new TypeError();

      var ret  = initialValue;
      for (var idx = 0; idx < len; idx++) {
        var next = this[idx];

        // while ret is still undefined, just set the first value we get as
        // ret. this is not the ideal behavior actually but it matches the
        // FireFox implementation... :(
        if (next !== null) {
          if (ret === undefined) {
            ret = next;
          } else {
            ret = callback.call(null, ret, next, idx, this, reducerProperty);
          }
        }
      }

      // uh oh...we never found a value!
      if (ret === undefined) throw new TypeError();
      return ret;
    }
  };

  // Apply methods if missing...
  for (var key in mixinIfMissing) {
    if (!mixinIfMissing.hasOwnProperty(key)) continue;

    // The mixinIfMissing methods should be applied if they are not defined.
    // If Prototype 1.6 is included, some of these methods will be defined
    // already, but we want to override them anyway in this special case
    // because our version is faster and functionally identical.
    if (!Array.prototype[key] || ((typeof Prototype === 'object') && Prototype.Version.match(/^1\.6/))) {
      Array.prototype[key] = mixinIfMissing[key];
    }
  }

  // Apply other methods...
  SC.mixin(Array.prototype, alwaysMixin);

})();

