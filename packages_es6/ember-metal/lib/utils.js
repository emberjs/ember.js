// require('ember-metal/core');
// require('ember-metal/platform');
// require('ember-metal/array');
// require('ember-metal/error');

import Ember from "ember-metal/core";
import {platform, create} from "ember-metal/platform";
import {forEach} from "ember-metal/array";

/**
@module ember-metal
*/

/**
  Prefix used for guids through out Ember.
  @private
*/
var GUID_PREFIX = 'ember';


var o_defineProperty = platform.defineProperty,
    o_create = create,
    // Used for guid generation...
    numberCache  = [],
    stringCache  = {},
    uuid = 0;

var MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER;

/**
  A unique key used to assign guids and other private metadata to objects.
  If you inspect an object in your browser debugger you will often see these.
  They can be safely ignored.

  On browsers that support it, these properties are added with enumeration
  disabled so they won't show up when you iterate over your properties.

  @private
  @property GUID_KEY
  @for Ember
  @type String
  @final
*/
var GUID_KEY = '__ember' + (+ new Date());

var GUID_DESC = {
  writable:    false,
  configurable: false,
  enumerable:  false,
  value: null
};

/**
  Generates a new guid, optionally saving the guid to the object that you
  pass in. You will rarely need to use this method. Instead you should
  call `Ember.guidFor(obj)`, which return an existing guid if available.

  @private
  @method generateGuid
  @for Ember
  @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
    be saved on the object and reused whenever you pass the same object
    again.

    If no object is passed, just generate a new guid.
  @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
    separate the guid into separate namespaces.
  @return {String} the guid
*/
function generateGuid(obj, prefix) {
  if (!prefix) prefix = GUID_PREFIX;
  var ret = (prefix + (uuid++));
  if (obj) {
    if (obj[GUID_KEY] === null) {
      obj[GUID_KEY] = ret;
    } else {
      GUID_DESC.value = ret;
      o_defineProperty(obj, GUID_KEY, GUID_DESC);
    }
  }
  return ret;
}

/**
  Returns a unique id for the object. If the object does not yet have a guid,
  one will be assigned to it. You can call this on any object,
  `Ember.Object`-based or not, but be aware that it will add a `_guid`
  property.

  You can also use this method on DOM Element objects.

  @private
  @method guidFor
  @for Ember
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
function guidFor(obj) {

  // special cases where we don't want to add a key to object
  if (obj === undefined) return "(undefined)";
  if (obj === null) return "(null)";

  var ret;
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
      ret = 'ember' + (uuid++);

      if (obj[GUID_KEY] === null) {
        obj[GUID_KEY] = ret;
      } else {
        GUID_DESC.value = ret;
        o_defineProperty(obj, GUID_KEY, GUID_DESC);
      }
      return ret;
  }
};

// ..........................................................
// META
//

var META_DESC = {
  writable:    true,
  configurable: false,
  enumerable:  false,
  value: null
};


/**
  The key used to store meta information on object for property observing.

  @property META_KEY
  @for Ember
  @private
  @final
  @type String
*/
var META_KEY = GUID_KEY+'_meta';

var isDefinePropertySimulated = platform.defineProperty.isSimulated;

function Meta(obj) {
  this.descs = {};
  this.watching = {};
  this.cache = {};
  this.source = obj;
}

Meta.prototype = {
  descs: null,
  deps: null,
  watching: null,
  listeners: null,
  cache: null,
  source: null,
  mixins: null,
  bindings: null,
  chains: null,
  chainWatchers: null,
  values: null,
  proto: null
};

if (isDefinePropertySimulated) {
  // on platforms that don't support enumerable false
  // make meta fail jQuery.isPlainObject() to hide from
  // jQuery.extend() by having a property that fails
  // hasOwnProperty check.
  Meta.prototype.__preventPlainObject__ = true;

  // Without non-enumerable properties, meta objects will be output in JSON
  // unless explicitly suppressed
  Meta.prototype.toJSON = function () { };
}

// Placeholder for non-writable metas.
var EMPTY_META = new Meta(null);

if (MANDATORY_SETTER) { EMPTY_META.values = {}; }

/**
  Retrieves the meta hash for an object. If `writable` is true ensures the
  hash is writable for this object as well.

  The meta object contains information about computed property descriptors as
  well as any watched properties and other information. You generally will
  not access this information directly but instead work with higher level
  methods that manipulate this hash indirectly.

  @method meta
  @for Ember
  @private

  @param {Object} obj The object to retrieve meta for
  @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
    the meta hash, allowing the method to avoid making an unnecessary copy.
  @return {Object} the meta hash for an object
*/
function meta(obj, writable) {

  var ret = obj[META_KEY];
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    if (!isDefinePropertySimulated) o_defineProperty(obj, META_KEY, META_DESC);

    ret = new Meta(obj);

    if (MANDATORY_SETTER) { ret.values = {}; }

    obj[META_KEY] = ret;

    // make sure we don't accidentally try to create constructor like desc
    ret.descs.constructor = null;

  } else if (ret.source !== obj) {
    if (!isDefinePropertySimulated) o_defineProperty(obj, META_KEY, META_DESC);

    ret = o_create(ret);
    ret.descs    = o_create(ret.descs);
    ret.watching = o_create(ret.watching);
    ret.cache    = {};
    ret.source   = obj;

    if (MANDATORY_SETTER) { ret.values = o_create(ret.values); }

    obj[META_KEY] = ret;
  }
  return ret;
};

function getMeta(obj, property) {
  var _meta = meta(obj, false);
  return _meta[property];
};

function setMeta(obj, property, value) {
  var _meta = meta(obj, true);
  _meta[property] = value;
  return value;
};

/**
  @deprecated
  @private

  In order to store defaults for a class, a prototype may need to create
  a default meta object, which will be inherited by any objects instantiated
  from the class's constructor.

  However, the properties of that meta object are only shallow-cloned,
  so if a property is a hash (like the event system's `listeners` hash),
  it will by default be shared across all instances of that class.

  This method allows extensions to deeply clone a series of nested hashes or
  other complex objects. For instance, the event system might pass
  `['listeners', 'foo:change', 'ember157']` to `prepareMetaPath`, which will
  walk down the keys provided.

  For each key, if the key does not exist, it is created. If it already
  exists and it was inherited from its constructor, the constructor's
  key is cloned.

  You can also pass false for `writable`, which will simply return
  undefined if `prepareMetaPath` discovers any part of the path that
  shared or undefined.

  @method metaPath
  @for Ember
  @param {Object} obj The object whose meta we are examining
  @param {Array} path An array of keys to walk down
  @param {Boolean} writable whether or not to create a new meta
    (or meta property) if one does not already exist or if it's
    shared with its constructor
*/
function metaPath(obj, path, writable) {
  Ember.deprecate("Ember.metaPath is deprecated and will be removed from future releases.");
  var _meta = meta(obj, writable), keyName, value;

  for (var i=0, l=path.length; i<l; i++) {
    keyName = path[i];
    value = _meta[keyName];

    if (!value) {
      if (!writable) { return undefined; }
      value = _meta[keyName] = { __ember_source__: obj };
    } else if (value.__ember_source__ !== obj) {
      if (!writable) { return undefined; }
      value = _meta[keyName] = o_create(value);
      value.__ember_source__ = obj;
    }

    _meta = value;
  }

  return value;
};

/**
  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked. This is the primitive we use to implement
  calls to super.

  @private
  @method wrap
  @for Ember
  @param {Function} func The function to call
  @param {Function} superFunc The super function.
  @return {Function} wrapped function.
*/
function wrap(func, superFunc) {
  function superWrapper() {
    var ret, sup = this.__nextSuper;
    this.__nextSuper = superFunc;
    ret = func.apply(this, arguments);
    this.__nextSuper = sup;
    return ret;
  }

  superWrapper.wrappedFunction = func;
  superWrapper.__ember_observes__ = func.__ember_observes__;
  superWrapper.__ember_observesBefore__ = func.__ember_observesBefore__;
  superWrapper.__ember_listens__ = func.__ember_listens__;

  return superWrapper;
};

/**
  Returns true if the passed object is an array or Array-like.

  Ember Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike `Ember.typeOf` this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements `Ember.Array`)

  ```javascript
  Ember.isArray();                                            // false
  Ember.isArray([]);                                          // true
  Ember.isArray( Ember.ArrayProxy.create({ content: [] }) );  // true
  ```

  @method isArray
  @for Ember
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
*/
// ES6TODO: Move up to runtime. This isn't used in ember-metal at all. Also depends on Ember.Array.
function isArray(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if (Ember.Array && Ember.Array.detect(obj)) { return true; }
  if ((obj.length !== undefined) && 'object'===typeof obj) { return true; }
  return false;
};

/**
  Forces the passed object to be part of an array. If the object is already
  an array or array-like, returns the object. Otherwise adds the object to
  an array. If obj is `null` or `undefined`, returns an empty array.

  ```javascript
  Ember.makeArray();                           // []
  Ember.makeArray(null);                       // []
  Ember.makeArray(undefined);                  // []
  Ember.makeArray('lindsay');                  // ['lindsay']
  Ember.makeArray([1,2,42]);                   // [1,2,42]

  var controller = Ember.ArrayProxy.create({ content: [] });
  Ember.makeArray(controller) === controller;  // true
  ```

  @method makeArray
  @for Ember
  @param {Object} obj the object
  @return {Array}
*/
function makeArray(obj) {
  if (obj === null || obj === undefined) { return []; }
  return isArray(obj) ? obj : [obj];
};

/**
  Checks to see if the `methodName` exists on the `obj`.

  ```javascript
  var foo = {bar: Ember.K, baz: null};
  Ember.canInvoke(foo, 'bar'); // true
  Ember.canInvoke(foo, 'baz'); // false
  Ember.canInvoke(foo, 'bat'); // false
  ```

  @method canInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @return {Boolean}
*/
function canInvoke(obj, methodName) {
  return !!(obj && typeof obj[methodName] === 'function');
}

/**
  Checks to see if the `methodName` exists on the `obj`,
  and if it does, invokes it with the arguments passed.

  ```javascript
  var d = new Date('03/15/2013');
  Ember.tryInvoke(d, 'getTime'); // 1363320000000
  Ember.tryInvoke(d, 'setFullYear', [2014]); // 1394856000000
  Ember.tryInvoke(d, 'noSuchMethod', [2014]); // undefined
  ```

  @method tryInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @param {Array} [args] The arguments to pass to the method
  @return {*} the return value of the invoked method or undefined if it cannot be invoked
*/
function tryInvoke(obj, methodName, args) {
  if (canInvoke(obj, methodName)) {
    return obj[methodName].apply(obj, args || []);
  }
};

// https://github.com/emberjs/ember.js/pull/1617
var needsFinallyFix = (function() {
  var count = 0;
  try{
    try { }
    finally {
      count++;
      throw new Error('needsFinallyFixTest');
    }
  } catch (e) {}

  return count !== 1;
})();

/**
  Provides try { } finally { } functionality, while working
  around Safari's double finally bug.

  ```javascript
  var tryable = function() {
    someResource.lock();
    runCallback(); // May throw error.
  };
  var finalizer = function() {
    someResource.unlock();
  };
  Ember.tryFinally(tryable, finalizer);
  ```

  @method tryFinally
  @for Ember
  @param {Function} tryable The function to run the try callback
  @param {Function} finalizer The function to run the finally callback
  @param {Object} [binding] The optional calling object. Defaults to 'this'
  @return {*} The return value is the that of the finalizer,
  unless that value is undefined, in which case it is the return value
  of the tryable
*/

var tryFinally;
if (needsFinallyFix) {
  tryFinally = function(tryable, finalizer, binding) {
    var result, finalResult, finalError;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } finally {
      try {
        finalResult = finalizer.call(binding);
      } catch (e) {
        finalError = e;
      }
    }

    if (finalError) { throw finalError; }

    return (finalResult === undefined) ? result : finalResult;
  };
} else {
  tryFinally = function(tryable, finalizer, binding) {
    var result, finalResult;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } finally {
      finalResult = finalizer.call(binding);
    }

    return (finalResult === undefined) ? result : finalResult;
  };
}

/**
  Provides try { } catch finally { } functionality, while working
  around Safari's double finally bug.

  ```javascript
  var tryable = function() {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      beforeValues[i] = listener.before(name, time(), payload);
    }

    return callback.call(binding);
  };

  var catchable = function(e) {
    payload = payload || {};
    payload.exception = e;
  };

  var finalizer = function() {
    for (i=0, l=listeners.length; i<l; i++) {
      listener = listeners[i];
      listener.after(name, time(), payload, beforeValues[i]);
    }
  };
  Ember.tryCatchFinally(tryable, catchable, finalizer);
  ```

  @method tryCatchFinally
  @for Ember
  @param {Function} tryable The function to run the try callback
  @param {Function} catchable The function to run the catchable callback
  @param {Function} finalizer The function to run the finally callback
  @param {Object} [binding] The optional calling object. Defaults to 'this'
  @return {*} The return value is the that of the finalizer,
  unless that value is undefined, in which case it is the return value
  of the tryable.
*/
var tryCatchFinally;
if (needsFinallyFix) {
  tryCatchFinally = function(tryable, catchable, finalizer, binding) {
    var result, finalResult, finalError;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } catch(error) {
      result = catchable.call(binding, error);
    } finally {
      try {
        finalResult = finalizer.call(binding);
      } catch (e) {
        finalError = e;
      }
    }

    if (finalError) { throw finalError; }

    return (finalResult === undefined) ? result : finalResult;
  };
} else {
  tryCatchFinally = function(tryable, catchable, finalizer, binding) {
    var result, finalResult;

    binding = binding || this;

    try {
      result = tryable.call(binding);
    } catch(error) {
      result = catchable.call(binding, error);
    } finally {
      finalResult = finalizer.call(binding);
    }

    return (finalResult === undefined) ? result : finalResult;
  };
}

// ........................................
// TYPING & ARRAY MESSAGING
//

var TYPE_MAP = {};
var t = "Boolean Number String Function Array Date RegExp Object".split(" ");
ArrayPolyfills.forEach.call(t, function(name) {
  TYPE_MAP[ "[object " + name + "]" ] = name.toLowerCase();
});

var toString = Object.prototype.toString;

/**
  Returns a consistent type for the passed item.

  Use this instead of the built-in `typeof` to get the type of an item.
  It will return the same result across all browsers and includes a bit
  more detail. Here is what will be returned:

      | Return Value  | Meaning                                              |
      |---------------|------------------------------------------------------|
      | 'string'      | String primitive or String object.                   |
      | 'number'      | Number primitive or Number object.                   |
      | 'boolean'     | Boolean primitive or Boolean object.                 |
      | 'null'        | Null value                                           |
      | 'undefined'   | Undefined value                                      |
      | 'function'    | A function                                           |
      | 'array'       | An instance of Array                                 |
      | 'regexp'      | An instance of RegExp                                |
      | 'date'        | An instance of Date                                  |
      | 'class'       | An Ember class (created using Ember.Object.extend()) |
      | 'instance'    | An Ember object instance                             |
      | 'error'       | An instance of the Error object                      |
      | 'object'      | A JavaScript object not inheriting from Ember.Object |

  Examples:

  ```javascript
  Ember.typeOf();                       // 'undefined'
  Ember.typeOf(null);                   // 'null'
  Ember.typeOf(undefined);              // 'undefined'
  Ember.typeOf('michael');              // 'string'
  Ember.typeOf(new String('michael'));  // 'string'
  Ember.typeOf(101);                    // 'number'
  Ember.typeOf(new Number(101));        // 'number'
  Ember.typeOf(true);                   // 'boolean'
  Ember.typeOf(new Boolean(true));      // 'boolean'
  Ember.typeOf(Ember.makeArray);        // 'function'
  Ember.typeOf([1,2,90]);               // 'array'
  Ember.typeOf(/abc/);                  // 'regexp'
  Ember.typeOf(new Date());             // 'date'
  Ember.typeOf(Ember.Object.extend());  // 'class'
  Ember.typeOf(Ember.Object.create());  // 'instance'
  Ember.typeOf(new Error('teamocil'));  // 'error'

  // "normal" JavaScript object
  Ember.typeOf({a: 'b'});              // 'object'
  ```

  @method typeOf
  @for Ember
  @param {Object} item the item to check
  @return {String} the type
*/
// ES6Todo: Depends on Ember.Object which is defined in runtime.
function typeOf(item) {
  var ret;

  ret = (item === null || item === undefined) ? String(item) : TYPE_MAP[toString.call(item)] || 'object';

  if (ret === 'function') {
    if (Ember.Object && Ember.Object.detect(item)) ret = 'class';
  } else if (ret === 'object') {
    if (item instanceof Error) ret = 'error';
    else if (Ember.Object && item instanceof Ember.Object) ret = 'instance';
    else if (item instanceof Date) ret = 'date';
  }

  return ret;
};

/**
  Convenience method to inspect an object. This method will attempt to
  convert the object into a useful string description.

  It is a pretty simple implementation. If you want something more robust,
  use something like JSDump: https://github.com/NV/jsDump

  @method inspect
  @for Ember
  @param {Object} obj The object you want to inspect.
  @return {String} A description of the object
*/
function inspect(obj) {
  var type = typeOf(obj);
  if (type === 'array') {
    return '[' + obj + ']';
  }
  if (type !== 'object') {
    return obj + '';
  }

  var v, ret = [];
  for(var key in obj) {
    if (obj.hasOwnProperty(key)) {
      v = obj[key];
      if (v === 'toString') { continue; } // ignore useless items
      if (typeOf(v) === 'function') { v = "function() { ... }"; }
      ret.push(key + ": " + v);
    }
  }
  return "{" + ret.join(", ") + "}";
};

export {generateGuid, GUID_KEY, GUID_PREFIX, guidFor, META_DESC, EMPTY_META, meta, getMeta, setMeta, metaPath, inspect, typeOf, tryCatchFinally, isArray, makeArray, canInvoke, tryInvoke, tryFinally, wrap};
