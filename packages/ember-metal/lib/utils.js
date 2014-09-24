import Ember from "ember-metal/core";
import {
  defineProperty as o_defineProperty,
  canDefineNonEnumerableProperties,
  hasPropertyAccessors,
  create
} from "ember-metal/platform";

import {
  forEach
} from "ember-metal/array";

/**
@module ember-metal
*/

/**
  Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
  jQuery master. We'll just bootstrap our own uuid now.

  @private
  @return {Number} the uuid
*/
var _uuid = 0;

/**
  Generates a universally unique identifier. This method
  is used internally by Ember for assisting with
  the generation of GUID's and other unique identifiers
  such as `bind-attr` data attributes.

  @public
  @return {Number} [description]
 */
export function uuid() {
  return ++_uuid;
}

/**
  Prefix used for guids through out Ember.
  @private
  @property GUID_PREFIX
  @for Ember
  @type String
  @final
*/
var GUID_PREFIX = 'ember';

var o_create = create;
// Used for guid generation...
var numberCache  = [];
var stringCache  = {};

/**
  Strongly hint runtimes to intern the provided string.

  When do I need to use this function?

  For the most part, never. Pre-mature optimization is bad, and often the
  runtime does exactly what you need it to, and more often the trade-off isn't
  worth it.

  Why?

  Runtimes store strings in at least 2 different representations:
  Ropes and Symbols (interned strings). The Rope provides a memory efficient
  data-structure for strings created from concatenation or some other string
  manipulation like splitting.

  Unfortunately checking equality of different ropes can be quite costly as
  runtimes must resort to clever string comparison algorithims. These
  algorithims typically cost in proportion to the length of the string.
  Luckily, this is where the Symbols (interned strings) shine. As Symbols are
  unique by their string content, equality checks can be done by pointer
  comparision.

  How do I know if my string is a rope or symbol?

  Typically (warning general sweeping statement, but truthy in runtimes at
  present) static strings created as part of the JS source are interned.
  Strings often used for comparisions can be interned at runtime if some
  criteria are met.  One of these criteria can be the size of the entire rope.
  For example, in chrome 38 a rope longer then 12 characters will not
  intern, nor will segments of that rope.

  Some numbers: http://jsperf.com/eval-vs-keys/8

  Known Trick™

  @private
  @return {String} interned version of the provided string
*/
function intern(str) {
  var obj = {};
  obj[str] = 1;
  for (var key in obj) {
    if (key === str) return key;
  }
  return str;
}

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
var GUID_KEY = intern('__ember' + (+ new Date()));

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
export function generateGuid(obj, prefix) {
  if (!prefix) prefix = GUID_PREFIX;
  var ret = (prefix + uuid());
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
export function guidFor(obj) {

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
      if (!ret) ret = stringCache[obj] = 'st' + uuid();
      return ret;

    case 'boolean':
      return obj ? '(true)' : '(false)';

    default:
      if (obj[GUID_KEY]) return obj[GUID_KEY];
      if (obj === Object) return '(Object)';
      if (obj === Array)  return '(Array)';
      ret = GUID_PREFIX + uuid();

      if (obj[GUID_KEY] === null) {
        obj[GUID_KEY] = ret;
      } else {
        GUID_DESC.value = ret;
        o_defineProperty(obj, GUID_KEY, GUID_DESC);
      }
      return ret;
  }
}

// ..........................................................
// META
//

var META_DESC = {
  writable: true,
  configurable: false,
  enumerable: false,
  value: null
};

function Meta(obj) {
  this.descs = {};
  this.watching = {};
  this.cache = {};
  this.cacheMeta = {};
  this.source = obj;
}

Meta.prototype = {
  descs: null,
  deps: null,
  watching: null,
  listeners: null,
  cache: null,
  cacheMeta: null,
  source: null,
  mixins: null,
  bindings: null,
  chains: null,
  chainWatchers: null,
  values: null,
  proto: null
};

if (!canDefineNonEnumerableProperties) {
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

if (Ember.FEATURES.isEnabled('mandatory-setter')) {
  if (hasPropertyAccessors) {
    EMPTY_META.values = {};
  }
}

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
var agent = window.navigator.userAgent;

var mayNeedFix = agent.indexOf('iPhone') > -1 &&
  agent.indexOf('Version/8.0 Mobile') > -1 &&
  ({ '__proto__': []} instanceof Array);

function meta(obj, writable) {

  var ret = obj['__ember_meta__'];
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    if (canDefineNonEnumerableProperties) o_defineProperty(obj, '__ember_meta__', META_DESC);

    ret = new Meta(obj);

    if (Ember.FEATURES.isEnabled('mandatory-setter')) {
      if (hasPropertyAccessors) {
        ret.values = {};
      }
    }

    obj['__ember_meta__'] = ret;

    // make sure we don't accidentally try to create constructor like desc
    ret.descs.constructor = null;

  } else if (ret.source !== obj) {
    if (canDefineNonEnumerableProperties) o_defineProperty(obj, '__ember_meta__', META_DESC);

    var newRet;
    if (mayNeedFix) {
      newRet = { };
    } else {
      newRet = o_create(ret);

    }
    newRet.descs     = o_create(ret.descs);
    newRet.watching  = o_create(ret.watching);
    newRet.cache     = {};
    newRet.cacheMeta = {};
    newRet.source    = obj;

    if (Ember.FEATURES.isEnabled('mandatory-setter')) {
      if (hasPropertyAccessors) {
        newRet.values = o_create(ret.values);
      }
    }

    if (mayNeedFix) {
      newRet['__proto__'] = ret;
    }

    ret = newRet;

    obj['__ember_meta__'] = ret;
  }
  return ret;
}

export function getMeta(obj, property) {
  var _meta = meta(obj, false);
  return _meta[property];
}

export function setMeta(obj, property, value) {
  var _meta = meta(obj, true);
  _meta[property] = value;
  return value;
}

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
export function metaPath(obj, path, writable) {
  Ember.deprecate("Ember.metaPath is deprecated and will be removed from future releases.");
  var _meta = meta(obj, writable);
  var keyName, value;

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
}

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
export function wrap(func, superFunc) {
  function superWrapper() {
    var ret;
    var sup  = this && this.__nextSuper;
    var args = new Array(arguments.length);
    for (var i = 0, l = args.length; i < l; i++) {
      args[i] = arguments[i];
    }
    if(this) { this.__nextSuper = superFunc; }
    ret = apply(this, func, args);
    if(this) { this.__nextSuper = sup; }
    return ret;
  }

  superWrapper.wrappedFunction = func;
  superWrapper.wrappedFunction.__ember_arity__ = func.length;
  superWrapper.__ember_observes__ = func.__ember_observes__;
  superWrapper.__ember_observesBefore__ = func.__ember_observesBefore__;
  superWrapper.__ember_listens__ = func.__ember_listens__;

  return superWrapper;
}

var EmberArray;

/**
  Returns true if the passed object is an array or Array-like.

  Ember Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike `Ember.typeOf` this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements `Ember.Array`)

  ```javascript
  Ember.isArray();                                          // false
  Ember.isArray([]);                                        // true
  Ember.isArray(Ember.ArrayProxy.create({ content: [] }));  // true
  ```

  @method isArray
  @for Ember
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
*/
// ES6TODO: Move up to runtime? This is only use in ember-metal by concatenatedProperties
function isArray(obj) {
  var modulePath, type;

  if (typeof EmberArray === "undefined") {
    modulePath = 'ember-runtime/mixins/array';
    if (Ember.__loader.registry[modulePath]) {
      EmberArray = Ember.__loader.require(modulePath)['default'];
    }
  }

  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if (EmberArray && EmberArray.detect(obj)) { return true; }

  type = typeOf(obj);
  if ('array' === type) { return true; }
  if ((obj.length !== undefined) && 'object' === type) { return true; }
  return false;
}

/**
  Forces the passed object to be part of an array. If the object is already
  an array or array-like, returns the object. Otherwise adds the object to
  an array. If obj is `null` or `undefined`, returns an empty array.

  ```javascript
  Ember.makeArray();            // []
  Ember.makeArray(null);        // []
  Ember.makeArray(undefined);   // []
  Ember.makeArray('lindsay');   // ['lindsay']
  Ember.makeArray([1, 2, 42]);  // [1, 2, 42]

  var controller = Ember.ArrayProxy.create({ content: [] });

  Ember.makeArray(controller) === controller;  // true
  ```

  @method makeArray
  @for Ember
  @param {Object} obj the object
  @return {Array}
*/
export function makeArray(obj) {
  if (obj === null || obj === undefined) { return []; }
  return isArray(obj) ? obj : [obj];
}

/**
  Checks to see if the `methodName` exists on the `obj`.

  ```javascript
  var foo = { bar: Ember.K, baz: null };

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

  Ember.tryInvoke(d, 'getTime');              // 1363320000000
  Ember.tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
  Ember.tryInvoke(d, 'noSuchMethod', [2014]); // undefined
  ```

  @method tryInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @param {Array} [args] The arguments to pass to the method
  @return {*} the return value of the invoked method or undefined if it cannot be invoked
*/
export function tryInvoke(obj, methodName, args) {
  if (canInvoke(obj, methodName)) {
    return args ? applyStr(obj, methodName, args) : applyStr(obj, methodName);
  }
}

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
  Provides try/finally functionality, while working
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
  Provides try/catch/finally functionality, while working
  around Safari's double finally bug.

  ```javascript
  var tryable = function() {
    for (i = 0, l = listeners.length; i < l; i++) {
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
    for (i = 0, l = listeners.length; i < l; i++) {
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
forEach.call(t, function(name) {
  TYPE_MAP[ "[object " + name + "]" ] = name.toLowerCase();
});

var toString = Object.prototype.toString;

var EmberObject;

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
  Ember.typeOf([1, 2, 90]);             // 'array'
  Ember.typeOf(/abc/);                  // 'regexp'
  Ember.typeOf(new Date());             // 'date'
  Ember.typeOf(Ember.Object.extend());  // 'class'
  Ember.typeOf(Ember.Object.create());  // 'instance'
  Ember.typeOf(new Error('teamocil'));  // 'error'

  // 'normal' JavaScript object
  Ember.typeOf({ a: 'b' });             // 'object'
  ```

  @method typeOf
  @for Ember
  @param {Object} item the item to check
  @return {String} the type
*/
function typeOf(item) {
  var ret, modulePath;

  // ES6TODO: Depends on Ember.Object which is defined in runtime.
  if (typeof EmberObject === "undefined") {
    modulePath = 'ember-runtime/system/object';
    if (Ember.__loader.registry[modulePath]) {
      EmberObject = Ember.__loader.require(modulePath)['default'];
    }
  }

  ret = (item === null || item === undefined) ? String(item) : TYPE_MAP[toString.call(item)] || 'object';

  if (ret === 'function') {
    if (EmberObject && EmberObject.detect(item)) ret = 'class';
  } else if (ret === 'object') {
    if (item instanceof Error) ret = 'error';
    else if (EmberObject && item instanceof EmberObject) ret = 'instance';
    else if (item instanceof Date) ret = 'date';
  }

  return ret;
}

/**
  Convenience method to inspect an object. This method will attempt to
  convert the object into a useful string description.

  It is a pretty simple implementation. If you want something more robust,
  use something like JSDump: https://github.com/NV/jsDump

  @method inspect
  @for Ember
  @param {Object} obj The object you want to inspect.
  @return {String} A description of the object
  @since 1.4.0
*/
export function inspect(obj) {
  var type = typeOf(obj);
  if (type === 'array') {
    return '[' + obj + ']';
  }
  if (type !== 'object') {
    return obj + '';
  }

  var v;
  var ret = [];
  for(var key in obj) {
    if (obj.hasOwnProperty(key)) {
      v = obj[key];
      if (v === 'toString') { continue; } // ignore useless items
      if (typeOf(v) === 'function') { v = "function() { ... }"; }

      if (v && typeof v.toString !== 'function') {
        ret.push(key + ": " + toString.call(v));
      } else {
        ret.push(key + ": " + v);
      }
    }
  }
  return "{" + ret.join(", ") + "}";
}

// The following functions are intentionally minified to keep the functions
// below Chrome's function body size inlining limit of 600 chars.

export function apply(t /* target */, m /* method */, a /* args */) {
  var l = a && a.length;
  if (!a || !l) { return m.call(t); }
  switch (l) {
    case 1:  return m.call(t, a[0]);
    case 2:  return m.call(t, a[0], a[1]);
    case 3:  return m.call(t, a[0], a[1], a[2]);
    case 4:  return m.call(t, a[0], a[1], a[2], a[3]);
    case 5:  return m.call(t, a[0], a[1], a[2], a[3], a[4]);
    default: return m.apply(t, a);
  }
}

export function applyStr(t /* target */, m /* method */, a /* args */) {
  var l = a && a.length;
  if (!a || !l) { return t[m](); }
  switch (l) {
    case 1:  return t[m](a[0]);
    case 2:  return t[m](a[0], a[1]);
    case 3:  return t[m](a[0], a[1], a[2]);
    case 4:  return t[m](a[0], a[1], a[2], a[3]);
    case 5:  return t[m](a[0], a[1], a[2], a[3], a[4]);
    default: return t[m].apply(t, a);
  }
}

export {
  GUID_KEY,
  META_DESC,
  EMPTY_META,
  meta,
  typeOf,
  tryCatchFinally,
  isArray,
  canInvoke,
  tryFinally
};
