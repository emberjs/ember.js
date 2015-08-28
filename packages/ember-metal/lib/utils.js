'no use strict';
// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed

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
  the generation of GUID's and other unique identifiers.

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
  runtimes must resort to clever string comparison algorithms. These
  algorithms typically cost in proportion to the length of the string.
  Luckily, this is where the Symbols (interned strings) shine. As Symbols are
  unique by their string content, equality checks can be done by pointer
  comparison.

  How do I know if my string is a rope or symbol?

  Typically (warning general sweeping statement, but truthy in runtimes at
  present) static strings created as part of the JS source are interned.
  Strings often used for comparisons can be interned at runtime if some
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
    if (key === str) {
      return key;
    }
  }
  return str;
}

export function symbol(debugName) {
  // TODO: Investigate using platform symbols, but we do not
  // want to require non-enumerability for this API, which
  // would introduce a large cost.

  return intern(debugName + ' [id=' + GUID_KEY + Math.floor(Math.random() * new Date()) + ']');
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

export var GUID_DESC = {
  writable:     true,
  configurable: true,
  enumerable:   false,
  value: null
};

var nullDescriptor = {
  configurable: true,
  writable: true,
  enumerable: false,
  value: null
};

export var GUID_KEY_PROPERTY = {
  name: GUID_KEY,
  descriptor: nullDescriptor
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
  if (!prefix) {
    prefix = GUID_PREFIX;
  }

  var ret = (prefix + uuid());
  if (obj) {
    if (obj[GUID_KEY] === null) {
      obj[GUID_KEY] = ret;
    } else {
      GUID_DESC.value = ret;
      if (obj.__defineNonEnumerable) {
        obj.__defineNonEnumerable(GUID_KEY_PROPERTY);
      } else {
        Object.defineProperty(obj, GUID_KEY, GUID_DESC);
      }
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
  if (obj && obj[GUID_KEY]) {
    return obj[GUID_KEY];
  }

  // special cases where we don't want to add a key to object
  if (obj === undefined) {
    return '(undefined)';
  }

  if (obj === null) {
    return '(null)';
  }

  var ret;
  var type = typeof obj;

  // Don't allow prototype changes to String etc. to change the guidFor
  switch (type) {
    case 'number':
      ret = numberCache[obj];

      if (!ret) {
        ret = numberCache[obj] = 'nu' + obj;
      }

      return ret;

    case 'string':
      ret = stringCache[obj];

      if (!ret) {
        ret = stringCache[obj] = 'st' + uuid();
      }

      return ret;

    case 'boolean':
      return obj ? '(true)' : '(false)';

    default:
      if (obj === Object) {
        return '(Object)';
      }

      if (obj === Array) {
        return '(Array)';
      }

      ret = GUID_PREFIX + uuid();

      if (obj[GUID_KEY] === null) {
        obj[GUID_KEY] = ret;
      } else {
        GUID_DESC.value = ret;

        if (obj.__defineNonEnumerable) {
          obj.__defineNonEnumerable(GUID_KEY_PROPERTY);
        } else {
          Object.defineProperty(obj, GUID_KEY, GUID_DESC);
        }
      }
      return ret;
  }
}


const checkHasSuper = (function () {
  let sourceAvailable = (function() {
    return this;
  }).toString().indexOf('return this;') > -1;

  if (sourceAvailable) {
    return function checkHasSuper(func) {
      return func.toString().indexOf('_super') > -1;
    };
  }

  return function checkHasSuper() {
    return true;
  };
}());

function ROOT() {}
ROOT.__hasSuper = false;

function hasSuper(func) {
  if (func.__hasSuper === undefined) {
    func.__hasSuper = checkHasSuper(func);
  }
  return func.__hasSuper;
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
  if (!hasSuper(func)) {
    return func;
  }
  // ensure an unwrapped super that calls _super is wrapped with a terminal _super
  if (!superFunc.wrappedFunction && hasSuper(superFunc)) {
    return _wrap(func, _wrap(superFunc, ROOT));
  }
  return _wrap(func, superFunc);
}

function _wrap(func, superFunc) {
  function superWrapper() {
    let orig = this._super;
    let length = arguments.length;
    let ret;
    this._super = superFunc;
    switch (length) {
      case 0:  ret = func.call(this); break;
      case 1:  ret = func.call(this, arguments[0]); break;
      case 2:  ret = func.call(this, arguments[0], arguments[1]); break;
      case 3:  ret = func.call(this, arguments[0], arguments[1], arguments[2]); break;
      case 4:  ret = func.call(this, arguments[0], arguments[1], arguments[2], arguments[3]); break;
      case 5:  ret = func.call(this, arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]); break;
      default:
        // v8 bug potentially incorrectly deopts this function: https://code.google.com/p/v8/issues/detail?id=3709
        // we may want to keep this around till this ages out on mobile
        let args = new Array(length);
        for (var x = 0; x < length; x++) {
          args[x] = arguments[x];
        }
        ret = func.apply(this, args);
        break;
    }
    this._super = orig;
    return ret;
  }

  superWrapper.wrappedFunction = func;
  superWrapper.__ember_observes__ = func.__ember_observes__;
  superWrapper.__ember_listens__ = func.__ember_listens__;

  return superWrapper;
}

/**
  Checks to see if the `methodName` exists on the `obj`.

  ```javascript
  var foo = { bar: function() { return 'bar'; }, baz: null };

  Ember.canInvoke(foo, 'bar'); // true
  Ember.canInvoke(foo, 'baz'); // false
  Ember.canInvoke(foo, 'bat'); // false
  ```

  @method canInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @return {Boolean}
  @private
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
  @public
*/
export function tryInvoke(obj, methodName, args) {
  if (canInvoke(obj, methodName)) {
    return args ? applyStr(obj, methodName, args) : applyStr(obj, methodName);
  }
}

// ........................................
// TYPING & ARRAY MESSAGING
//

var toString = Object.prototype.toString;

/**
  Forces the passed object to be part of an array. If the object is already
  an array, it will return the object. Otherwise, it will add the object to
  an array. If obj is `null` or `undefined`, it will return an empty array.

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
  @private
*/
export function makeArray(obj) {
  if (obj === null || obj === undefined) { return []; }
  return Array.isArray(obj) ? obj : [obj];
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
  @private
*/
export function inspect(obj) {
  if (obj === null) {
    return 'null';
  }
  if (obj === undefined) {
    return 'undefined';
  }
  if (Array.isArray(obj)) {
    return '[' + obj + ']';
  }
  // for non objects
  var type = typeof obj;
  if (type !== 'object' && type !== 'symbol') {
    return '' + obj;
  }
  // overridden toString
  if (typeof obj.toString === 'function' && obj.toString !== toString) {
    return obj.toString();
  }

  // Object.prototype.toString === {}.toString
  var v;
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      v = obj[key];
      if (v === 'toString') { continue; } // ignore useless items
      if (typeof v === 'function') { v = 'function() { ... }'; }

      if (v && typeof v.toString !== 'function') {
        ret.push(key + ': ' + toString.call(v));
      } else {
        ret.push(key + ': ' + v);
      }
    }
  }
  return '{' + ret.join(', ') + '}';
}

// The following functions are intentionally minified to keep the functions
// below Chrome's function body size inlining limit of 600 chars.
/**
  @param {Object} t target
  @param {Function} m method
  @param {Array} a args
  @private
*/
export function apply(t, m, a) {
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

/**
  @param {Object} t target
  @param {String} m method
  @param {Array} a args
  @private
*/
export function applyStr(t, m, a) {
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
  makeArray,
  canInvoke
};
