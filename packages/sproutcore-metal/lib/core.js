// ==========================================================================
// Project:   SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals ENV sc_assert */

// ........................................
// GLOBAL CONSTANTS
//

/**
  @name YES
  @static
  @type Boolean
  @default true
  @constant
*/
YES = true;

/**
  @name NO
  @static
  @type Boolean
  @default NO
  @constant
*/
NO = false;

//@if (legacy)
// ensure no undefined errors in browsers where console doesn't exist
if (typeof console === 'undefined') {
  window.console = {};
  console.log = console.info = console.warn = console.error = function() {};
}
//@endif

// ..........................................................
// BOOTSTRAP
// 

if ('undefined' === typeof SC) {
/**
  @namespace
  @name SC
  @version 2.0.alpha

  All SproutCore methods and functions are defined inside of this namespace.
  You generally should not add new properties to this namespace as it may be
  overwritten by future versions of SproutCore.

  You can also use the shorthand "SC" instead of "SproutCore".

  SproutCore-Runtime is a framework that provides core functions for 
  SproutCore including cross-platform functions, support for property 
  observing and objects. Its focus is on small size and performance. You can 
  use this in place of or along-side other cross-platform libraries such as 
  jQuery.

  The core Runtime framework is based on the jQuery API with a number of
  performance optimizations.
*/
window.SC = {};
window.SproutCore = SC;
}



/**
  @static
  @type String
  @default '2.0.alpha'
  @constant
*/
SC.VERSION = '2.0.alpha';

/**
  @static
  @type Hash
  @constant
  
  Standard environmental variables.  You can define these in a global `ENV`
  variable before loading SproutCore to control various configuration 
  settings.
*/
SC.ENV = 'undefined' === typeof ENV ? {} : ENV;

/**
  @static
  @type Boolean
  @default YES
  @constant
  
  Determines whether SproutCore should enhances some built-in object 
  prototypes to provide a more friendly API.  If enabled, a few methods 
  will be added to Function, String, and Array.  Object.prototype will not be
  enhanced, which is the one that causes most troubles for people.
  
  In general we recommend leaving this option set to true since it rarely
  conflicts with other code.  If you need to turn it off however, you can
  define an ENV.ENHANCE_PROTOTYPES config to disable it.
*/  
SC.EXTEND_PROTOTYPES = (SC.ENV.EXTEND_PROTOTYPES !== false);

// ..........................................................
// GUIDS
// 

// Used for guid generation...
var GUID_KEY = '__sc'+Date.now();
var uuid, numberCache, stringCache;

uuid         = 0;
numberCache  = [];
stringCache  = {};

var GUID_DESC = {
  configurable: true,
  writable: true,
  enumerable: false
};

/**
  @static
  @type String
  @constant
  
  A unique key used to assign guids and other private metadata to objects.
  If you inspect an object in your browser debugger you will often see these.
  They can be safely ignored.
  
  On browsers that support it, these properties are added with enumeration 
  disabled so they won't show up when you iterate over your properties.
*/
SC.GUID_KEY = GUID_KEY;

try {
  var div = document.createElement('div');
  Object.defineProperty(div, 'test', GUID_DESC);

  var setNonEnumerableProperty = function(obj, key, desc) {
    Object.defineProperty(obj, key, desc);
  };
} catch(e) {
  var setNonEnumerableProperty = function(obj, key, desc) {
    obj[key] = desc.value;
  };
}

/**
  Generates a new guid, optionally saving the guid to the object that you
  pass in.  You will rarely need to use this method.  Instead you should
  call SC.guidFor(obj), which return an existing guid if available.

  @param {Object} obj
    Optional object the guid will be used for.  If passed in, the guid will
    be saved on the object and reused whenever you pass the same object 
    again.
    
    If no object is passed, just generate a new guid.

  @param {String} prefix
    Optional prefix to place in front of the guid.  Useful when you want to
    separate the guid into separate namespaces.
    
  @returns {String} the guid
*/
SC.generateGuid = function(obj, prefix) {
  if (!prefix) prefix = 'sc';
  var ret = (prefix + (uuid++));
  if (obj) {
    GUID_DESC.value = ret;
    setNonEnumerableProperty(obj, GUID_KEY, GUID_DESC);
    GUID_DESC.value = null;
  }

  return ret ;
};

/**
  Returns a unique id for the object.  If the object does not yet have
  a guid, one will be assigned to it.  You can call this on any object,
  SC.Object-based or not, but be aware that it will add a _guid property.

  You can also use this method on DOM Element objects.

  @method
  @param obj {Object} any object, string, number, Element, or primitive
  @returns {String} the unique guid for this instance.
*/
SC.guidFor = function(obj) {

  // special cases where we don't want to add a key to object
  if (obj === undefined) return "(undefined)";
  if (obj === null) return "(null)";

  var cache, ret;
  var type = typeof obj;

  // Don't allow prototype changes to String etc. to change the guidFor
  switch(type) {
    case 'number':
      ret = numberCache[obj];
      if (!ret) ret = numberCache[obj] = 'nu'+obj;
      return ret;

    case 'string':
      ret = stringCache[obj];
      if (!ret) ret = stringCache[obj] = 'st'+(uuid++);
      return ret;
      
    case 'boolean':
      return obj ? '(true)' : '(false)';
      
    default:
      if (obj[GUID_KEY]) return obj[GUID_KEY];
      if (obj === Object) return '(Object)';
      if (obj === Array)  return '(Array)';
      return SC.generateGuid(obj, 'sc');
  }
};

// ........................................
// TYPING & ARRAY MESSAGING
//

var TYPE_MAP = {};
var t ="Boolean Number String Function Array Date RegExp Object".split(" ");
t.forEach(function(name) {
	TYPE_MAP[ "[object " + name + "]" ] = name.toLowerCase();
});

var toString = Object.prototype.toString;

/**
  Returns a consistant type for the passed item.

  Use this instead of the built-in SC.typeOf() to get the type of an item.
  It will return the same result across all browsers and includes a bit
  more detail.  Here is what will be returned:

  | Return Value Constant | Meaning |
  | 'string' | String primitive |
  | 'number' | Number primitive |
  | 'boolean' | Boolean primitive |
  | 'null' | Null value |
  | 'undefined' | Undefined value |
  | 'function' | A function |
  | 'array' | An instance of Array |
  | 'class' | A SproutCore class (created using SC.Object.extend()) |
  | 'object' | A SproutCore object instance |
  | 'error' | An instance of the Error object |
  | 'hash' | A JavaScript object not inheriting from SC.Object |

  @param item {Object} the item to check
  @returns {String} the type
*/
SC.typeOf = function(item) {
  var ret;
  
  ret = item==null ? String(item) : TYPE_MAP[toString.call(item)]||'object';

  if (ret === 'function') {
    if (SC.Object && SC.Object.detect(item)) ret = 'class';
  } else if (ret === 'object') {
    if (item instanceof Error) ret = 'error';
    else if (SC.Object && item instanceof SC.Object) ret = 'instance';
    else ret = 'object';
  }
  
  return ret;
};

/**
  Returns YES if the passed value is null or undefined.  This avoids errors
  from JSLint complaining about use of ==, which can be technically
  confusing.

  @param {Object} obj Value to test
  @returns {Boolean}
*/
SC.none = function(obj) {
  return obj === null || obj === undefined;
};

/**
  Verifies that a value is either null or an empty string. Return false if
  the object is not a string.

  @param {Object} obj Value to test
  @returns {Boolean}
*/
SC.empty = function(obj) {
  return obj === null || obj === undefined || obj === '';
};

/**
  @function
  
  Returns YES if the passed object is an array or Array-like.

  SproutCore Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike SC.typeOf this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements SC.Array)

  @param {Object} obj The object to test
  @returns {Boolean}
*/
SC.isArray = function(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if (SC.Array && SC.Array.detect(obj)) { return true; }
  if ((obj.length !== undefined) && 'object'===typeof obj) { return true; }
  return false;
};

/**
  Forces the passed object to be part of an array.  If the object is already
  an array or array-like, returns the object.  Otherwise adds the object to
  an array.  If obj is null or undefined, returns an empty array.
  
  @param {Object} obj the object
  @returns {Array}
*/
SC.makeArray = function(obj) {
  if (SC.none(obj)) return [];
  return SC.isArray(obj) ? obj : [obj];
};

/**
 This will compare two javascript values of possibly different types.
 It will tell you which one is greater than the other by returning:

  - -1 if the first is smaller than the second,
  - 0 if both are equal,
  - 1 if the first is greater than the second.

 The order is calculated based on SC.ORDER_DEFINITION, if types are different.
 In case they have the same type an appropriate comparison for this type is made.

 @param {Object} v First value to compare
 @param {Object} w Second value to compare
 @returns {Number} -1 if v < w, 0 if v = w and 1 if v > w.
*/
SC.compare = function (v, w) {
  if (v === w) { return 0; }

  var type1 = SC.typeOf(v);
  var type2 = SC.typeOf(w);

  // If we haven't yet generated a reverse-mapping of SC.ORDER_DEFINITION,
  // do so now.
  var mapping = SC.ORDER_DEFINITION_MAPPING;
  if (!mapping) {
    var order = SC.ORDER_DEFINITION;
    mapping = SC.ORDER_DEFINITION_MAPPING = {};
    var idx, len;
    for (idx = 0, len = order.length; idx < len;  ++idx) {
      mapping[order[idx]] = idx;
    }

    // We no longer need SC.ORDER_DEFINITION.
    delete SC.ORDER_DEFINITION;
  }

  var type1Index = mapping[type1];
  var type2Index = mapping[type2];

  if (type1Index < type2Index) { return -1; }
  if (type1Index > type2Index) { return 1; }

  // types are equal - so we have to check values now
  switch (type1) {
    case 'boolean':
    case 'number':
      if (v < w) { return -1; }
      if (v > w) { return 1; }
      return 0;

    case 'string':
      var comp = v.localeCompare(w);
      if (comp < 0) { return -1; }
      if (comp > 0) { return 1; }
      return 0;

    case 'array':
      var vLen = v.length;
      var wLen = w.length;
      var l = Math.min(vLen, wLen);
      var r = 0;
      var i = 0;
      var thisFunc = arguments.callee;
      while (r === 0 && i < l) {
        r = thisFunc(v[i],w[i]);
        i++;
      }
      if (r !== 0) { return r; }

      // all elements are equal now
      // shorter array should be ordered first
      if (vLen < wLen) { return -1; }
      if (vLen > wLen) { return 1; }
      // arrays are equal now
      return 0;

    case 'instance':
      if (SC.Comparable && SC.Comparable.detect(v)) { 
        return v.compare(v, w); 
      }
      return 0;

    default:
      return 0;
  }
};

/**
  @private
  Used by SC.compare
*/
SC.ORDER_DEFINITION = SC.ENV.ORDER_DEFINITION || [
  'undefined',
  'null',
  'boolean',
  'number',
  'string',
  'array',
  'object',
  'instance',
  'function',
  'class'
];

/**
  Returns all of the keys defined on an object or hash. This is useful
  when inspecting objects for debugging.  On browsers that support it, this
  uses the native Object.keys implementation.

  @param {Object} obj
  @returns {Array} Array containing keys of obj
*/
SC.keys = Object.keys;

//@if (legacy)
if (!SC.keys) {
  SC.keys = function(obj) {
    var ret = [];
    for(var key in obj) {
      if (obj.hasOwnProperty(key)) { ret.push(key); }
    }
    return ret;
  };
}

/**
  Creates a new object using the passed object as its prototype.  On browsers
  that support it, this uses the built in Object.create method.  Else one is
  simulated for you.
  
  This method is a better choice thant Object.create() because it will make 
  sure that any property observers are setup as well.
  
  @param {Object} obj
    The object you want to have as the prototype.
    
  @returns {Object} the newly created object
*/
SC.create = Object.create;

//@if (legacy)
if (!SC.create) {
  var O_ctor = function() {}, 
      O_proto = O_ctor.prototype;

  SC.create = function(obj) {
    O_ctor.prototype = obj;
    obj = new O_ctor();
    O_ctor.prototype = O_proto;
    return obj;
  };
}
//@endif

/**
  Empty function.  Useful for some operations.

  @returns {Object}
*/
SC.K = function() { return this; };

// ..........................................................
// ERROR
// 

/**
  @class

  A subclass of the JavaScript Error object for use in SproutCore.
*/
SC.Error = function() {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  for (var p in tmp) {
    if (tmp.hasOwnProperty(p)) { this[p] = tmp[p]; }
  }
};

SC.Error.prototype = SC.create(Error.prototype);

// ..........................................................
// LOGGER
// 

/**
  Define an assertion that will throw an exception if the condition is not 
  met.  SproutCore build tools will remove any calls to sc_assert() when 
  doing a production build.
  
  ## Examples
  
      #js:
      
      // pass a simple Boolean value
      sc_assert('must pass a valid object', !!obj);

      // pass a function.  If the function returns false the assertion fails
      // any other return value (including void) will pass.
      sc_assert('a passed record must have a firstName', function() {
        if (obj instanceof SC.Record) {
          return !SC.empty(obj.firstName);
        }
      });
      
  @static
  @function
  @param {String} desc
    A description of the assertion.  This will become the text of the Error
    thrown if the assertion fails.
    
  @param {Boolean} test
    Must return true for the assertion to pass.  If you pass a function it
    will be executed.  If the function returns false an exception will be
    thrown.
*/
sc_assert = function sc_assert(desc, test) {
  if ('function' === typeof test) test = test()!==false;
  if (!test) throw new SC.Error("assertion failed: "+desc);
};   

/**
  @class

  Inside SproutCore-Runtime, simply uses the window.console object.
  Override this to provide more robust logging functionality.
*/
SC.Logger = window.console;

//if ('undefined' === typeof sc_require) sc_require = SC.K;
if ('undefined' === typeof require) require = SC.K;


