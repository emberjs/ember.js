// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/runtime') ;
require('sproutcore-runtime/ext/function');

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

    This method will be call repeatedly during enumeration.  The index value
    will always begin with 0 and increment monotonically.  You don't have to
    rely on the index value to determine what object to return, but you should
    always check the value and start from the beginning when you see the
    requested index is 0.

    The previousObject is the object that was returned from the last call
    to nextObject for the current iteration.  This is a useful way to
    manage iteration if you are tracing a linked list, for example.

    Finally the context paramter will always contain a hash you can use as
    a "scratchpad" to maintain any other state you need in order to iterate
    properly.  The context object is reused and is not reset between
    iterations so make sure you setup the context with a fresh state whenever
    the index parameter is 0.

    Generally iterators will continue to call nextObject until the index
    reaches the your current length-1.  If you run out of data before this
    time for some reason, you should simply return undefined.

    The default impementation of this method simply looks up the index.
    This works great on any Array-like objects.

    @param {Number} index the current index of the iteration
    @param {Object} previousObject the value returned by the last call to nextObject.
    @param {Object} context a context object you can use to maintain state.
    @returns {Object} the next object in the iteration or undefined
  */
  nextObject: function(index, previousObject, context) {
    return this.objectAt ? this.objectAt(index) : this[index] ;
  },

  /**
    This property will trigger anytime the enumerable's content changes.
    You can observe this property to be notified of changes to the enumerables
    content.

    For plain enumerables, this property is read only.  SC.Array overrides
    this method.

    @property {SC.Array}
  */
  '[]': SC.Function.property(function(key, value) { return this ; }),

  /**
    Invoke this method when the contents of your enumerable has changed.
    This will notify any observers watching for content changes.  If your are
    implementing an ordered enumerable (such as an array), also pass the
    start and end values where the content changed so that it can be used to
    notify range observers.

    @param {Number} start optional start offset for the content change
    @param {Number} length optional length of change
    @param {Number} delta if you added or removed objects, the delta change
    @param {Array} addedObjects the objects that were added
    @param {Array} removedObjects the objects that were removed
    @returns {Object} receiver
  */
  enumerableContentDidChange: function(start, length, deltas) {
    this.notifyPropertyChange('[]') ;
  },

  /**
    Helper method returns the first object from a collection.  This is usually
    used by bindings and other parts of the framework to extract a single
    object if the enumerable contains only one item.

    If you override this method, you should implement it so that it will
    always return the same value each time it is called.  If your enumerable
    contains only one object, this method should always return that object.
    If your enumerable is empty, this method should return undefined.

    @returns {Object} the object or undefined
  */
  firstObject: SC.Function.property(function() {
    if (this.get('length')===0) { return undefined ; }
    if (this.objectAt) { return this.objectAt(0); } // support arrays out of box

    // handle generic enumerables
    ret = this.nextObject(0, null, context);
    return ret ;
  }),

  /**
    Helper method returns the last object from a collection.

    @returns {Object} the object or undefined
  */
  lastObject: SC.Function.property(function() {
    var len = this.get('length');
    if (len===0) { return undefined ; }
    if (this.objectAt) { return this.objectAt(len-1); } // support arrays out of box
  }),

  /**
    Iterates through the enumerable, calling the passed function on each
    item.  This method corresponds to the forEach() method defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function(item, index, enumerable) ;

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
  forEach: function(callback, target) {
    if (typeof callback !== "function") { throw new TypeError() ; }
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) { target = null; }

    var last = null, next, result, context = {} ;
    for(var idx=0;idx<len;idx++) {
      next = this.nextObject(idx, last, context) ;
      result = callback.call(target, next, idx, this);

      // If the callback returns false, break from the loop
      if (result === false) { break; }

      last = next ;
    }

    return this ;
  },

  /**
    Retrieves the named value on each member object.  This is more efficient
    than using one of the wrapper methods defined here.  Objects that
    implement SC.Observable will use the get() method, otherwise the property
    will be accessed directly.

    @param {String} key the key to retrieve
    @returns {Array} extracted values
  */
  getEach: function(key) {
    return this.map(function(item) {
      return SC.get(item, key);
    });
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
  setEach: function(key, value) {
    return this.forEach(function(item) {
      SC.set(item, key, value);
    });
  },

  /**
    Maps all of the items in the enumeration to another value, returning
    a new array.  This method corresponds to map() defined in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

        function(item, index, enumerable) ;

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
  map: function(callback, target) {
    if (typeof callback !== "function") { throw new TypeError() ; }
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) { target = null; }

    var ret  = [];

    this.forEach(function(item, i) {
      ret[i] = callback.call(target, item, i, this);
    }, this);

    return ret ;
  },

  /**
    Similar to map, this specialized function returns the value of the named
    property on all items in the enumeration.

    @param {String} key name of the property
    @returns {Array} The mapped array.
  */
  mapProperty: function(key) {
    return this.map(function(item) {
      return SC.get(item, key);
    });
  },

  /**
    Returns an array with all of the items in the enumeration that the passed
    function returns YES for. This method corresponds to filter() defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function(item, index, enumerable) ;

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
  filter: function(callback, target) {
    if (typeof callback !== "function") { throw new TypeError() ; }
    var len = this.get ? this.get('length') : this.length ;
    if (target === undefined) { target = null; }

    var ret  = [];

    this.forEach(function(item, i) {
      if(callback.call(target, item, i, this)) { ret.push(item); }
    }, this);

    return ret ;
  },

  /**
    Returns an array sorted by the value of the passed key parameters.
    null objects will be sorted first.  You can pass either an array of keys
    or multiple parameters which will act as key names

    @param {String} key one or more key names
    @returns {Array}
  */
  sortProperty: function(key) {
    var keys = (typeof key === SC.T_STRING) ? arguments : key,
        len  = keys.length,
        src;

    // get the src array to sort
    if (this instanceof Array) {
      src = this;
    } else {
      src = this.toArray();
    }

    return src.sort(function(a,b) {
      var idx, key, aValue, bValue, ret = 0;

      for(idx=0; ret===0 && idx<len; idx++) {
        key = keys[idx];
        aValue = SC.get(a, key);
        bValue = SC.get(b, key);
        ret = SC.compare(aValue, bValue);
      }
      return ret ;
    });
  },


  /**
    Returns an array with just the items with the matched property.  You
    can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to true.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Array} filtered array
  */
  filterProperty: function(key, value) {
    return this.filter(function(item) {
      var cur = SC.get(item, key);
      return value === undefined ? !!cur : SC.isEqual(cur, value);
    }, this);
  },

  /**
    Returns the first item in the array for which the callback returns YES.
    This method works similar to the filter() method defined in JavaScript 1.6
    except that it will stop working on the array once a match is found.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function(item, index, enumerable) ;

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
  find: function(callback, target) {
    var result = null, found;

    this.breakableEach(function(item, i) {
      found = callback.call(target, item, i, this);
      if (found) { result = item; return false; }
    }, this);

    return result ;
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
  findProperty: function(key, value) {
    return this.find(function(item) {
      var cur = SC.get(item, key);
      return value === undefined ? !!cur : SC.isEqual(cur, value);
    }, this);
  },

  /**
    Returns YES if the passed function returns YES for every item in the
    enumeration.  This corresponds with the every() method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function(item, index, enumerable) ;

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
  every: function(callback, target) {
    var every = true, result ;

    this.breakableEach(function(item, i) {
      result = callback.call(target, item, i, this);
      if (!result) { every = false; return false; }
    }, this);

    return every ;
  },

  /**
    Returns YES if the passed property resolves to true for all items in the
    enumerable.  This method is often simpler/faster than using a callback.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Array} filtered array
  */
  everyProperty: function(key, value) {
    return this.every(function(item) {
      var cur = SC.get(item, key);
      return value === undefined ? !!cur : SC.isEqual(cur, value);
    }, this);
  },

  /**
    Returns YES if the passed function returns true for any item in the
    enumeration. This corresponds with the every() method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function(item, index, enumerable) ;

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
    @returns {Array} A filtered array.
  */
  some: function(callback, target) {
    var some = false, result ;

    this.breakableEach(function(item, i) {
      result = callback.call(target, item, i, this);
      if (result) { some = true; return false; }
    }, this);

    return some;
  },

  /**
    Returns YES if the passed property resolves to true for any item in the
    enumerable.  This method is often simpler/faster than using a callback.

    @param {String} key the property to test
    @param {String} value optional value to test against.
    @returns {Boolean} YES
  */
  someProperty: function(key, value) {
    return this.some(function(item) {
      var cur = SC.get(item, key);
      return value === undefined ? !!cur : SC.isEqual(cur, value);
    }, this);
  },

  /**
    This will combine the values of the enumerator into a single value. It
    is a useful way to collect a summary value from an enumeration.  This
    corresponds to the reduce() method defined in JavaScript 1.8.

    The callback method you provide should have the following signature (all
    parameters are optional):

          function(previousValue, item, index, enumerable) ;

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
  reduce: function(callback, initialValue, reducerProperty) {
    if (typeof callback !== "function") { throw new TypeError() ; }

    var ret = initialValue;

    this.forEach(function(item, i) {
      ret = callback.call(null, ret, item, i, this, reducerProperty);
    }, this);

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
  invoke: function(methodName) {
    var len = SC.get(this, 'length');

    // collect the arguments
    var args = Array.prototype.slice.call(arguments, 1);

    // call invoke
    var ret = [], method ;

    this.forEach(function(item) {
      if (!item) { return; }

      method = item[methodName];
      if (method) { ret.push(method.apply(item, args)); }
    }, this);

    return ret ;
  },

  /**
    Simply converts the enumerable into a genuine array.  The order, of
    course, is not guaranteed.  Corresponds to the method implemented by
    Prototype.

    @returns {Array} the enumerable as an array.
  */
  toArray: function() {
    return this.map(function(item) { return item; });
  }

} ;

// Our forEach allows the callback to return false to break, and we
// use this functionality in methods like find. Because the native
// forEach does not have this functionality, alias it to breakableEach
// for internal use.
SC.Enumerable.breakableEach = SC.Enumerable.forEach ;

Array.prototype.isEnumerable = YES ;

