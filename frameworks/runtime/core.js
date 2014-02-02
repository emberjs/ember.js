// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global jQuery, require, console */

// These commands are used by the build tools to control load order.  On the
// client side these are a no-op.
if (!window.require) { window.require = function require() {}; }
if (!window.sc_require) { window.sc_require = require; }
if (!window.sc_resource) { window.sc_resource = function sc_resource() {}; }
sc_require('license');

// ........................................
// GLOBAL CONSTANTS
//
// Most global constants should be defined inside of the SC namespace.
// However the following two are useful enough and generally benign enough
// to put into the global object.
window.YES = true;
window.NO = false;

// prevent a console.log from blowing things up if we are on a browser that
// does not support it
if (typeof console === 'undefined') {
  window.console = {};
  console.log = console.info = console.warn = console.error = function () {};
}

window.SC = window.SC || {};
window.SproutCore = window.SproutCore || SC;

// ........................................
// BOOTSTRAP
//
// The root namespace and some common utility methods are defined here. The
// rest of the methods go into the mixin defined below.

/**
  @version Edge
  @namespace

  All SproutCore methods and functions are defined
  inside of this namespace.  You generally should not add new properties to
  this namespace as it may be overwritten by future versions of SproutCore.

  You can also use the shorthand "SC" instead of "SproutCore".

  SproutCore-Base is a framework that provides core functions for SproutCore
  including cross-platform functions, support for property observing and
  objects.  It's focus is on small size and performance.  You can use this
  in place of or along-side other cross-platform libraries such as jQuery or
  Prototype.

  The core Base framework is based on the jQuery API with a number of
  performance optimizations.
*/
SC = window.SC; // This is dumb but necessary for jsdoc to get it right

SC.VERSION = 'Edge';

/**
  @private

  Adds properties to a target object. You must specify whether
  to overwrite a value for a property or not.

  Used as a base function for the wrapper functions SC.mixin and SC.supplement.

  @param {Boolean} overwrite if a target has a value for a property, this specifies
                  whether or not to overwrite that value with the copyied object's
                  property value.
  @param {Object} target the target object to extend
  @param {Object} properties one or more objects with properties to copy.
  @returns {Object} the target object.
  @static
*/
SC._baseMixin = function (override) {
  var args = Array.prototype.slice.call(arguments, 1),
  // copy reference to target object
      target = args[0] || {},
      idx = 1,
      length = args.length,
      options, copy, key;

  // Handle case where we have only one item...extend SC
  if (length === 1) {
    target = this || {};
    idx = 0;
  }

  for (; idx < length; idx++) {
    if (!(options = args[idx])) continue;
    for (key in options) {
      if (!options.hasOwnProperty(key)) continue;
      copy = options[key];
      if (target === copy) continue; // prevent never-ending loop
      if (copy !== undefined && (override || (target[key] === undefined))) target[key] = copy;
    }
    // Manually copy toString() because some JS engines do not enumerate it
    // (such as IE8)
    if (options.hasOwnProperty('toString')) target.toString = options.toString;
  }

  return target;
};

/**
  Adds properties to a target object.

  Takes the root object and adds the attributes for any additional
  arguments passed.

  @param {Object} target the target object to extend
  @param {Object} properties one or more objects with properties to copy.
  @returns {Object} the target object.
  @static
*/
SC.mixin = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(true);
  return SC._baseMixin.apply(this, args);
};

/**
  Adds properties to a target object.  Unlike SC.mixin, however, if the target
  already has a value for a property, it will not be overwritten.

  Takes the root object and adds the attributes for any additional
  arguments passed.

  @param {Object} target the target object to extend
  @param {Object} properties one or more objects with properties to copy.
  @returns {Object} the target object.
  @static
*/
SC.supplement = function () {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(false);
  return SC._baseMixin.apply(this, args);
};

/**
  Alternative to mixin.  Provided for compatibility with jQuery.
  @function
*/
SC.extend = SC.mixin;

// ..........................................................
// CORE FUNCTIONS
//
// Enough with the bootstrap code.  Let's define some core functions

SC.mixin(/** @scope window.SC.prototype */ {

  // ........................................
  // GLOBAL CONSTANTS
  //
  T_ERROR:     'error',
  T_OBJECT:    'object',
  T_NULL:      'null',
  T_CLASS:     'class',
  T_HASH:      'hash',
  T_FUNCTION:  'function',
  T_UNDEFINED: 'undefined',
  T_NUMBER:    'number',
  T_BOOL:      'boolean',
  T_ARRAY:     'array',
  T_STRING:    'string',
  T_DATE:      'date',
  T_REGEXP:    'regexp',

  // ........................................
  // TYPING & ARRAY MESSAGING
  //

  /**
    Returns a consistent type for the passed item.

    Use this instead of the built-in typeOf() to get the type of an item.
    It will return the same result across all browsers and includes a bit
    more detail.

    @param {Object} item the item to check
    @returns {String} One of the following, depending on the type of the item<br>
            SC.T_STRING: String primitive,<br>
            SC.T_NUMBER: Number primitive,<br>
            SC.T_BOOLEAN: Boolean primitive,<br>
            SC.T_NULL: Null value,<br>
            SC.T_UNDEFINED: Undefined value,<br>
            SC.T_FUNCTION: A function,<br>
            SC.T_DATE: Date primitive,<br>
            SC.T_REGEXP: RegExp primitive,<br>
            SC.T_ARRAY: An instance of Array,<br>
            SC.T_CLASS: A SproutCore class (created using SC.Object.extend()),<br>
            SC.T_OBJECT: A SproutCore object instance,<br>
            SC.T_HASH: A JavaScript object not inheriting from SC.Object, <br>
            SC.T_ERROR: A SproutCore SC.Error object <br>
  */
  typeOf: function (item) {
    if (item === undefined) return SC.T_UNDEFINED;
    if (item === null) return SC.T_NULL;

    var nativeType = jQuery.type(item);

    if (nativeType === "function") {
      return item.isClass ? SC.T_CLASS : SC.T_FUNCTION;
    } else if (nativeType === "object") {

      // Note: typeOf() may be called before SC.Error has had a chance to load
      // so this code checks for the presence of SC.Error first just to make
      // sure.  No error instance can exist before the class loads anyway so
      // this is safe.
      if (SC.Error && (item instanceof SC.Error)) {
        return SC.T_ERROR;
      } else if (item instanceof SC.Object) {
        return SC.T_OBJECT;
      } else {
        return SC.T_HASH;
      }
    }

    return nativeType;
  },

  /**
    Returns YES if the passed value is null or undefined.  This avoids errors
    from JSLint complaining about use of ==, which can be technically
    confusing.

    @param {Object} obj value to test
    @returns {Boolean}
  */
  none: function (obj) {
    /*jshint eqnull:true */
    return obj == null;
  },

  /**
    Verifies that a value is either null or an empty string. Return false if
    the object is not a string.

    @param {Object} obj value to test
    @returns {Boolean}
  */
  empty: function (obj) {
    return obj === null || obj === undefined || obj === '';
  },

  /**
    Returns YES if the passed object is an array or Array-like.

    SproutCore Array Protocol:
    * the object has an objectAt property; or
    * the object is a native Array; or
    * the object is an Object, and has a length property

    Unlike SC.typeOf this method returns true even if the passed object is
    not formally array but appears to be array-like (i.e. has a length
    property, responds to .objectAt, etc.)

    @param {Object} obj the object to test
    @returns {Boolean}
  */
  isArray: function (obj) {
    if (!obj || obj.setInterval) { return false; }
    if (Array.isArray && Array.isArray(obj)) { return true; }
    if (obj.objectAt) { return true; }
    if (obj.length !== undefined && jQuery.type(obj) === "object") { return true; }

    return false;
  },

  /**
    Makes an object into an Array if it is not array or array-like already.
    Unlike SC.A(), this method will not clone the object if it is already
    an array.

    @param {Object} obj object to convert
    @returns {Array} Actual array
  */
  makeArray: function (obj) {
    return SC.isArray(obj) ? obj : SC.A(obj);
  },

  /**
    Converts the passed object to an Array.  If the object appears to be
    array-like, a new array will be cloned from it.  Otherwise, a new array
    will be created with the item itself as the only item in the array.

    @param {Object} object any enumerable or array-like object.
    @returns {Array} Array of items
  */
  A: function (obj) {
    // null or undefined -- fast path
    if (obj === null || obj === undefined) return [];

    // primitive -- fast path
    if (obj.slice instanceof Function) {
      // do we have a string?
      if (typeof(obj) === 'string') return [obj];
      else return obj.slice();
    }

    // enumerable -- fast path
    if (obj.toArray) return obj.toArray();

    // if not array-like, then just wrap in array.
    if (!SC.isArray(obj)) return [obj];

    // when all else fails, do a manual convert...
    var ret = [], len = obj.length;
    while (--len >= 0) ret[len] = obj[len];
    return ret;
  },

  //
  // GUIDS & HASHES
  //

  // Like jQuery.expando but without any risk of conflict
  guidKey: "SproutCore" + (SC.VERSION + Math.random()).replace(/\D/g, ""),

  // Used for guid generation...
  _guidPrefixes: {"number": "nu", "string": "st"},
  _guidCaches:   {"number": {},   "string": {}},
  _numberGuids: [],
  _stringGuids: {},
  _keyCache: {},

  /**"
    Returns a unique GUID for the object.  If the object does not yet have
    a guid, one will be assigned to it.  You can call this on any object,
    SC.Object-based or not, but be aware that it will add a _guid property.

    You can also use this method on DOM Element objects.

    @param {Object} obj any object, string, number, Element, or primitive
    @returns {String} the unique guid for this instance.
  */
  guidFor: function (obj) {
    var cache, ret,
        type = typeof obj;

    // special cases where we don't want to add a key to object
    if (obj === undefined) return "(undefined)";
    if (obj === null) return "(null)";

    // Don't allow prototype changes to String etc. to change the guidFor
    if (type === SC.T_NUMBER || type === SC.T_STRING) {
      cache = this._guidCaches[type];
      ret   = cache[obj];
      if (!ret) {
        ret        = "st" + (jQuery.uuid++);
        cache[obj] = ret;
      }
      return ret;
    } else if (type === SC.T_BOOL) {
      return (obj) ? "(true)" : "(false)";
    }

    var guidKey = this.guidKey;
    if (obj[guidKey]) return obj[guidKey];

    // More special cases; not as common, so we check for them after the cache
    // lookup
    if (obj === Object) return '(Object)';
    if (obj === Array) return '(Array)';

    return SC.generateGuid(obj, "sc");
  },

  /**
    Returns a key name that combines the named key + prefix.  This is more
    efficient than simply combining strings because it uses a cache
    internally for performance.

    @param {String} prefix the prefix to attach to the key
    @param {String} key The key
    @returns {String} result
  */
  keyFor: function (prefix, key) {
    var ret, pcache = this._keyCache[prefix];
    if (!pcache) pcache = this._keyCache[prefix] = {}; // get cache for prefix
    ret = pcache[key];
    if (!ret) ret = pcache[key] = prefix + '_' + key;
    return ret;
  },

  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in.  You will rarely need to use this method.  Instead you should
    call SC.guidFor(obj), which return an existing guid if available.

    @param {Object} obj the object to assign the guid to
    @param {String} prefix prefixes the generated guid
    @returns {String} the guid
  */
  generateGuid: function (obj, prefix) {
    var ret = (prefix + (jQuery.uuid++));
    if (obj) obj[this.guidKey] = ret;
    return ret;
  },

  /**
    Returns a unique hash code for the object. If the object implements
    a hash() method, the value of that method will be returned. Otherwise,
    this will return the same value as guidFor().

    If you pass multiple arguments, hashFor returns a string obtained by
    concatenating the hash code of each argument.

    Unlike guidFor(), this method allows you to implement logic in your
    code to cause two separate instances of the same object to be treated as
    if they were equal for comparisons and other functions.

    <b>IMPORTANT</b>: If you implement a hash() method, it MUST NOT return a
    number or a string that contains only a number. Typically hash codes
    are strings that begin with a "%".

    @param {Object...} objects the object(s)
    @returns {String} the hash code for this instance.
  */
  hashFor: function () {
    var l = arguments.length,
      h = '',
      obj, f, i;

    for (i = 0; i < l; ++i) {
      obj = arguments[i];
      h += (obj && (f = obj.hash) && (typeof f === SC.T_FUNCTION)) ? f.call(obj) : this.guidFor(obj);
    }

    return h === '' ? null : h;
  },

  /**
    This will compare the two object values using their hash codes.

    @param {Object} a first value to compare
    @param {Object} b the second value to compare
    @returns {Boolean} YES if the two have equal hash code values.

  */
  isEqual: function (a, b) {
    // QUESTION: is there a compelling performance reason to special-case
    // undefined here?
    return this.hashFor(a) === this.hashFor(b);
  },

  /**
   This will compare two javascript values of possibly different types.
   It will tell you which one is greater than the other by returning
   -1 if the first is smaller than the second,
    0 if both are equal,
    1 if the first is greater than the second.

   The order is calculated based on SC.ORDER_DEFINITION , if types are different.
   In case they have the same type an appropriate comparison for this type is made.

   @param {Object} v first value to compare
   @param {Object} w the second value to compare
   @returns {NUMBER} -1 if v < w, 0 if v = w and 1 if v > w.

  */
  compare: function (v, w) {
    // Doing a '===' check is very cheap, so in the case of equality, checking
    // this up-front is a big win.
    if (v === w) return 0;

    var type1 = SC.typeOf(v);
    var type2 = SC.typeOf(w);

    // If we haven't yet generated a reverse-mapping of SC.ORDER_DEFINITION,
    // do so now.
    var mapping = SC.ORDER_DEFINITION_MAPPING;
    if (!mapping) {
      var order = SC.ORDER_DEFINITION;
      mapping = SC.ORDER_DEFINITION_MAPPING = {};
      var idx, len;
      for (idx = 0, len = order.length;  idx < len;  ++idx) {
        mapping[order[idx]] = idx;
      }

      // We no longer need SC.ORDER_DEFINITION.
      delete SC.ORDER_DEFINITION;
    }

    var type1Index = mapping[type1];
    var type2Index = mapping[type2];

    if (type1Index < type2Index) return -1;
    if (type1Index > type2Index) return 1;

    // ok - types are equal - so we have to check values now
    switch (type1) {
    case SC.T_BOOL:
    case SC.T_NUMBER:
      if (v < w) return -1;
      if (v > w) return 1;
      return 0;

    case SC.T_STRING:
      var comp = v.localeCompare(w);
      if (comp < 0) return -1;
      if (comp > 0) return 1;
      return 0;

    case SC.T_ARRAY:
      var vLen = v.length;
      var wLen = w.length;
      var l = Math.min(vLen, wLen);
      var r = 0;
      var i = 0;
      var thisFunc = arguments.callee;
      while (r === 0 && i < l) {
        r = thisFunc(v[i], w[i]);
        i++;
      }
      if (r !== 0) return r;

      // all elements are equal now
      // shorter array should be ordered first
      if (vLen < wLen) return -1;
      if (vLen > wLen) return 1;
      // arrays are equal now
      return 0;

    case SC.T_OBJECT:
      if (v.constructor.isComparable === YES) return v.constructor.compare(v, w);
      return 0;

    default:
      return 0;
    }
  },

  // ..........................................................
  // OBJECT MANAGEMENT
  //

  /**
    Empty function.  Useful for some operations.

    @returns {Object}
  */
  K: function () { return this; },

  /**
    Empty array.  Useful for some optimizations.

    @type Array
  */
  EMPTY_ARRAY: [],

  /**
    Empty hash.  Useful for some optimizations.

    @type Hash
  */
  EMPTY_HASH: {},

  /**
    Empty range. Useful for some optimizations.

    @type Range
  */
  EMPTY_RANGE: {start: 0, length: 0},

  /**
    Creates a new object with the passed object as its prototype.

    This method uses JavaScript's native inheritance method to create a new
    object.

    You cannot use beget() to create new SC.Object-based objects, but you
    can use it to beget Arrays, Hashes, Sets and objects you build yourself.
    Note that when you beget() a new object, this method will also call the
    didBeget() method on the object you passed in if it is defined.  You can
    use this method to perform any other setup needed.

    In general, you will not use beget() often as SC.Object is much more
    useful, but for certain rare algorithms, this method can be very useful.

    For more information on using beget(), see the section on beget() in
    Crockford's JavaScript: The Good Parts.

    @param {Object} obj the object to beget
    @returns {Object} the new object.
  */
  beget: function (obj) {
    if (obj === null || obj === undefined) return null;
    var K = SC.K;
    K.prototype = obj;
    var ret = new K();
    K.prototype = null; // avoid leaks
    if (typeof obj.didBeget === "function") ret = obj.didBeget(ret);
    return ret;
  },

  /**
    Creates a clone of the passed object.  This function can take just about
    any type of object and create a clone of it, including primitive values
    (which are not actually cloned because they are immutable).

    If the passed object implements the clone() method, then this function
    will simply call that method and return the result.

    @param {Object} object the object to clone
    @param {Boolean} deep if true, a deep copy of the object is made
    @returns {Object} the cloned object
  */
  copy: function (object, deep) {
    var ret = object, idx;

    // fast paths
    if (object) {
      if (object.isCopyable) return object.copy(deep);
      if (object.clone)      return object.clone();
    }

    switch (jQuery.type(object)) {
    case "array":
      ret = object.slice();

      if (deep) {
        idx = ret.length;
        while (idx--) { ret[idx] = SC.copy(ret[idx], true); }
      }
      break;

    case "object":
      ret = {};
      for (var key in object) { ret[key] = deep ? SC.copy(object[key], true) : object[key]; }
    }

    return ret;
  },

  /**
    Returns a new object combining the values of all passed hashes.

    @param {Object...} object one or more objects
    @returns {Object} new Object
  */
  merge: function () {
    var ret = {}, len = arguments.length, idx;
    for (idx = 0; idx < len; idx++) SC.mixin(ret, arguments[idx]);
    return ret;
  },

  /**
    Returns all of the keys defined on an object or hash.  This is useful
    when inspecting objects for debugging.

    @param {Object} obj The Object
    @returns {Array} array of keys
  */
  keys: function (obj) {
    var ret = [];
    for (var key in obj) ret.push(key);
    return ret;
  },

  /**
    Convenience method to inspect an object.  This method will attempt to
    convert the object into a useful string description.

    @param {Object} obj The object you want to inspect.

    @returns {String} A description of the object
  */
  inspect: function (obj) {
    var v, ret = [];
    for (var key in obj) {
      v = obj[key];
      if (v === 'toString') continue; // ignore useless items
      if (SC.typeOf(v) === SC.T_FUNCTION) v = "function () { ... }";
      ret.push(key + ": " + v);
    }
    return "{ " + ret.join(", ") + " }";
  },

  /**
    Returns a tuple containing the object and key for the specified property
    path.  If no object could be found to match the property path, then
    returns null.

    This is the standard method used throughout SproutCore to resolve property
    paths.

    @param {String} path the property path
    @param {Object} root optional parameter specifying the place to start
    @returns {Array} array with [object, property] if found or null
  */
  tupleForPropertyPath: function (path, root) {
    // if passed nothing, return nothing.
    if (path == null) return null;

    // if the passed path is itself a tuple, return it
    if (typeof path === "object" && (path instanceof Array)) return path;

    // find the key.  It is the last . or first *
    var key;
    var stopAt = path.indexOf('*');
    if (stopAt < 0) stopAt = path.lastIndexOf('.');
    key = (stopAt >= 0) ? path.slice(stopAt + 1) : path;

    // convert path to object.
    var obj = this.objectForPropertyPath(path, root, stopAt);
    return (obj && key) ? [obj, key] : null;
  },

  /**
    Finds the object for the passed path or array of path components.  This is
    the standard method used in SproutCore to traverse object paths.

    @param {String} path the path
    @param {Object} root optional root object.  window is used otherwise
    @param {Integer} stopAt optional point to stop searching the path.
    @returns {Object} the found object or undefined.
  */
  objectForPropertyPath: function (path, root, stopAt) {

    var loc, nextDotAt, key, max;

    if (!root) root = window;

    // faster method for strings
    if (typeof path === "string") {
      if (stopAt === undefined) stopAt = path.length;
      loc = 0;
      while ((root) && (loc < stopAt)) {
        nextDotAt = path.indexOf('.', loc);
        if ((nextDotAt < 0) || (nextDotAt > stopAt)) nextDotAt = stopAt;
        key = path.slice(loc, nextDotAt);
        root = root.get ? root.get(key) : root[key];
        loc = nextDotAt + 1;
      }
      if (loc < stopAt) root = undefined; // hit a dead end. :(

    // older method using an array
    } else {
      loc = 0;
      max = path.length;
      key = null;

      while ((loc < max) && root) {
        key = path[loc++];
        if (key) root = (root.get) ? root.get(key) : root[key];
      }
      if (loc < max) root = undefined;
    }

    return root;
  },

  /**
   Acts very similar to SC.objectForPropertyPath(), the only difference is
   that it will throw an error when object can't be found.

    @param {String} path the path
    @param {Object} root optional root object.  window is used otherwise
    @param {Integer} stopAt optional point to stop searching the path.
    @returns {Object} the found object or throws an error.
  */
  requiredObjectForPropertyPath: function (path, root, stopAt) {
    var o = SC.objectForPropertyPath(path, root, stopAt);
    if (!o) {
      throw path + " could not be found";
    }
    return o;
  }

}); // end mixin

/** @private Alias for SC.clone() */
SC.clone = SC.copy;

/** @private Alias for SC.A() */
SC.$A = SC.A;

/** @private Provided for compatibility with old HTML templates. */
SC.didLoad = SC.K;

/** @private Used by SC.compare */
SC.ORDER_DEFINITION = [ SC.T_ERROR,
                        SC.T_UNDEFINED,
                        SC.T_NULL,
                        SC.T_BOOL,
                        SC.T_NUMBER,
                        SC.T_STRING,
                        SC.T_ARRAY,
                        SC.T_HASH,
                        SC.T_OBJECT,
                        SC.T_FUNCTION,
                        SC.T_CLASS ];
