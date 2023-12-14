import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';

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
  let obj = Object.create(null);
  obj[str] = 1;
  for (let key in obj) {
    if (key === str) {
      return key;
    }
  }
  return str;
}

/**
  Returns whether Type(value) is Object.

  Useful for checking whether a value is a valid WeakMap key.

  Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
        https://tc39.github.io/ecma262/#sec-weakmap.prototype.set

  @private
  @function isObject
*/
function isObject(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}

/**
 @module @ember/object
*/
/**
 @private
 @return {Number} the uuid
 */
let _uuid = 0;
/**
 Generates a universally unique identifier. This method
 is used internally by Ember for assisting with
 the generation of GUID's and other unique identifiers.

 @public
 @return {Number} [description]
 */
function uuid() {
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
const GUID_PREFIX = 'ember';
// Used for guid generation...
const OBJECT_GUIDS = new WeakMap();
const NON_OBJECT_GUIDS = new Map();
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
const GUID_KEY = intern(`__ember${Date.now()}`);
/**
  Generates a new guid, optionally saving the guid to the object that you
  pass in. You will rarely need to use this method. Instead you should
  call `guidFor(obj)`, which return an existing guid if available.

  @private
  @method generateGuid
  @static
  @for @ember/object/internals
  @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
    be saved on the object and reused whenever you pass the same object
    again.

    If no object is passed, just generate a new guid.
  @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
    separate the guid into separate namespaces.
  @return {String} the guid
*/
function generateGuid(obj, prefix = GUID_PREFIX) {
  let guid = prefix + uuid().toString();
  if (isObject(obj)) {
    OBJECT_GUIDS.set(obj, guid);
  }
  return guid;
}
/**
  Returns a unique id for the object. If the object does not yet have a guid,
  one will be assigned to it. You can call this on any object,
  `EmberObject`-based or not.

  You can also use this method on DOM Element objects.

  @public
  @static
  @method guidFor
  @for @ember/object/internals
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
function guidFor(value) {
  let guid;
  if (isObject(value)) {
    guid = OBJECT_GUIDS.get(value);
    if (guid === undefined) {
      guid = `${GUID_PREFIX}${uuid()}`;
      OBJECT_GUIDS.set(value, guid);
    }
  } else {
    guid = NON_OBJECT_GUIDS.get(value);
    if (guid === undefined) {
      let type = typeof value;
      if (type === 'string') {
        guid = `st${uuid()}`;
      } else if (type === 'number') {
        guid = `nu${uuid()}`;
      } else if (type === 'symbol') {
        guid = `sy${uuid()}`;
      } else {
        guid = `(${value})`;
      }
      NON_OBJECT_GUIDS.set(value, guid);
    }
  }
  return guid;
}

const GENERATED_SYMBOLS = [];
function isInternalSymbol(possibleSymbol) {
  return GENERATED_SYMBOLS.indexOf(possibleSymbol) !== -1;
}
// Some legacy symbols still need to be enumerable for a variety of reasons.
// This code exists for that, and as a fallback in IE11. In general, prefer
// `symbol` below when creating a new symbol.
function enumerableSymbol(debugName) {
  // TODO: Investigate using platform symbols, but we do not
  // want to require non-enumerability for this API, which
  // would introduce a large cost.
  let id = GUID_KEY + Math.floor(Math.random() * Date.now()).toString();
  let symbol = intern(`__${debugName}${id}__`);
  if (DEBUG) {
    GENERATED_SYMBOLS.push(symbol);
  }
  return symbol;
}
const symbol = Symbol;

// the delete is meant to hint at runtimes that this object should remain in
// dictionary mode. This is clearly a runtime specific hack, but currently it
// appears worthwhile in some usecases. Please note, these deletes do increase
// the cost of creation dramatically over a plain Object.create. And as this
// only makes sense for long-lived dictionaries that aren't instantiated often.
function makeDictionary(parent) {
  let dict = Object.create(parent);
  dict['_dict'] = null;
  delete dict['_dict'];
  return dict;
}

let getDebugName;
if (DEBUG) {
  let getFunctionName = fn => {
    let functionName = fn.name;
    if (functionName === undefined) {
      let match = Function.prototype.toString.call(fn).match(/function (\w+)\s*\(/);
      functionName = match && match[1] || '';
    }
    return functionName.replace(/^bound /, '');
  };
  let getObjectName = obj => {
    let name;
    let className;
    if (obj.constructor && obj.constructor !== Object) {
      className = getFunctionName(obj.constructor);
    }
    if ('toString' in obj && obj.toString !== Object.prototype.toString && obj.toString !== Function.prototype.toString) {
      name = obj.toString();
    }
    // If the class has a decent looking name, and the `toString` is one of the
    // default Ember toStrings, replace the constructor portion of the toString
    // with the class name. We check the length of the class name to prevent doing
    // this when the value is minified.
    if (name && name.match(/<.*:ember\d+>/) && className && className[0] !== '_' && className.length > 2 && className !== 'Class') {
      return name.replace(/<.*:/, `<${className}:`);
    }
    return name || className;
  };
  let getPrimitiveName = value => {
    return String(value);
  };
  getDebugName = value => {
    if (typeof value === 'function') {
      return getFunctionName(value) || `(unknown function)`;
    } else if (typeof value === 'object' && value !== null) {
      return getObjectName(value) || `(unknown object)`;
    } else {
      return getPrimitiveName(value);
    }
  };
}
var getDebugName$1 = getDebugName;

const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
const fnToString = Function.prototype.toString;
const checkHasSuper = (() => {
  let sourceAvailable = fnToString.call(function () {
    return this;
  }).indexOf('return this') > -1;
  if (sourceAvailable) {
    return function checkHasSuper(func) {
      return HAS_SUPER_PATTERN.test(fnToString.call(func));
    };
  }
  return function checkHasSuper() {
    return true;
  };
})();
const HAS_SUPER_MAP = new WeakMap();
const ROOT = Object.freeze(function () {});
HAS_SUPER_MAP.set(ROOT, false);
function hasSuper(func) {
  let hasSuper = HAS_SUPER_MAP.get(func);
  if (hasSuper === undefined) {
    hasSuper = checkHasSuper(func);
    HAS_SUPER_MAP.set(func, hasSuper);
  }
  return hasSuper;
}
class ObserverListenerMeta {
  constructor() {
    this.listeners = undefined;
    this.observers = undefined;
  }
}
const OBSERVERS_LISTENERS_MAP = new WeakMap();
function createObserverListenerMetaFor(fn) {
  let meta = OBSERVERS_LISTENERS_MAP.get(fn);
  if (meta === undefined) {
    meta = new ObserverListenerMeta();
    OBSERVERS_LISTENERS_MAP.set(fn, meta);
  }
  return meta;
}
function observerListenerMetaFor(fn) {
  return OBSERVERS_LISTENERS_MAP.get(fn);
}
function setObservers(func, observers) {
  let meta = createObserverListenerMetaFor(func);
  meta.observers = observers;
}
function setListeners(func, listeners) {
  let meta = createObserverListenerMetaFor(func);
  meta.listeners = listeners;
}
const IS_WRAPPED_FUNCTION_SET = new WeakSet();
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
  if (!hasSuper(func)) {
    return func;
  }
  // ensure an unwrapped super that calls _super is wrapped with a terminal _super
  if (!IS_WRAPPED_FUNCTION_SET.has(superFunc) && hasSuper(superFunc)) {
    return _wrap(func, _wrap(superFunc, ROOT));
  }
  return _wrap(func, superFunc);
}
function _wrap(func, superFunc) {
  function superWrapper() {
    let orig = this._super;
    this._super = superFunc;
    let ret = func.apply(this, arguments);
    this._super = orig;
    return ret;
  }
  IS_WRAPPED_FUNCTION_SET.add(superWrapper);
  let meta = OBSERVERS_LISTENERS_MAP.get(func);
  if (meta !== undefined) {
    OBSERVERS_LISTENERS_MAP.set(superWrapper, meta);
  }
  return superWrapper;
}

function lookupDescriptor(obj, keyName) {
  let current = obj;
  do {
    let descriptor = Object.getOwnPropertyDescriptor(current, keyName);
    if (descriptor !== undefined) {
      return descriptor;
    }
    current = Object.getPrototypeOf(current);
  } while (current !== null);
  return null;
}

/**
  Checks to see if the `methodName` exists on the `obj`.

  ```javascript
  let foo = { bar: function() { return 'bar'; }, baz: null };

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
  return obj != null && typeof obj[methodName] === 'function';
}
/**
  @module @ember/utils
*/

const NAMES = new WeakMap();
function setName(obj, name) {
  if (isObject(obj)) NAMES.set(obj, name);
}
function getName(obj) {
  return NAMES.get(obj);
}

const objectToString = Object.prototype.toString;
function isNone(obj) {
  return obj === null || obj === undefined;
}
/*
 A `toString` util function that supports objects without a `toString`
 method, e.g. an object created with `Object.create(null)`.
*/
function toString(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  if (null === obj) return 'null';
  if (undefined === obj) return 'undefined';
  if (Array.isArray(obj)) {
    // Reimplement Array.prototype.join according to spec (22.1.3.13)
    // Changing ToString(element) with this safe version of ToString.
    let r = '';
    for (let k = 0; k < obj.length; k++) {
      if (k > 0) {
        r += ',';
      }
      if (!isNone(obj[k])) {
        r += toString(obj[k]);
      }
    }
    return r;
  }
  if (typeof obj.toString === 'function') {
    return obj.toString();
  }
  return objectToString.call(obj);
}

const PROXIES = new WeakSet();
function isProxy(value) {
  if (isObject(value)) {
    return PROXIES.has(value);
  }
  return false;
}
function setProxy(object) {
  if (isObject(object)) {
    PROXIES.add(object);
  }
}

class Cache {
  constructor(limit, func, store = new Map()) {
    this.limit = limit;
    this.func = func;
    this.store = store;
    this.size = 0;
    this.misses = 0;
    this.hits = 0;
  }
  get(key) {
    if (this.store.has(key)) {
      this.hits++;
      // SAFETY: we know the value is present because `.has(key)` was `true`.
      return this.store.get(key);
    } else {
      this.misses++;
      return this.set(key, this.func(key));
    }
  }
  set(key, value) {
    if (this.limit > this.size) {
      this.size++;
      this.store.set(key, value);
    }
    return value;
  }
  purge() {
    this.store.clear();
    this.size = 0;
    this.hits = 0;
    this.misses = 0;
  }
}

let setupMandatorySetter;
let teardownMandatorySetter;
let setWithMandatorySetter;
function isElementKey(key) {
  return typeof key === 'number' ? isPositiveInt(key) : isStringInt(key);
}
function isStringInt(str) {
  let num = parseInt(str, 10);
  return isPositiveInt(num) && str === String(num);
}
function isPositiveInt(num) {
  return num >= 0 && num % 1 === 0;
}
if (DEBUG) {
  let SEEN_TAGS = new WeakSet();
  let MANDATORY_SETTERS = new WeakMap();
  let propertyIsEnumerable = function (obj, key) {
    return Object.prototype.propertyIsEnumerable.call(obj, key);
  };
  setupMandatorySetter = function (tag, obj, keyName) {
    if (SEEN_TAGS.has(tag)) {
      return;
    }
    SEEN_TAGS.add(tag);
    if (Array.isArray(obj) && isElementKey(keyName)) {
      return;
    }
    let desc = lookupDescriptor(obj, keyName) || {};
    if (desc.get || desc.set) {
      // if it has a getter or setter, we can't install the mandatory setter.
      // native setters are allowed, we have to assume that they will resolve
      // to tracked properties.
      return;
    }
    if (desc && (!desc.configurable || !desc.writable)) {
      // if it isn't writable anyways, so we shouldn't provide the setter.
      // if it isn't configurable, we can't overwrite it anyways.
      return;
    }
    let setters = MANDATORY_SETTERS.get(obj);
    if (setters === undefined) {
      setters = {};
      MANDATORY_SETTERS.set(obj, setters);
    }
    desc.hadOwnProperty = Object.hasOwnProperty.call(obj, keyName);
    setters[keyName] = desc;
    Object.defineProperty(obj, keyName, {
      configurable: true,
      enumerable: propertyIsEnumerable(obj, keyName),
      get() {
        if (desc.get) {
          return desc.get.call(this);
        } else {
          return desc.value;
        }
      },
      set(value) {
        assert(`You attempted to update ${this}.${String(keyName)} to "${String(value)}", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as \`@tracked\`, or use \`@ember/object#set\` to do this.`);
      }
    });
  };
  teardownMandatorySetter = function (obj, keyName) {
    let setters = MANDATORY_SETTERS.get(obj);
    if (setters !== undefined && setters[keyName] !== undefined) {
      Object.defineProperty(obj, keyName, setters[keyName]);
      delete setters[keyName];
    }
  };
  setWithMandatorySetter = function (obj, keyName, value) {
    let setters = MANDATORY_SETTERS.get(obj);
    if (setters !== undefined && setters[keyName] !== undefined) {
      let setter = setters[keyName];
      if (setter.set) {
        setter.set.call(obj, value);
      } else {
        setter.value = value;
        // If the object didn't have own property before, it would have changed
        // the enumerability after setting the value the first time.
        if (!setter.hadOwnProperty) {
          let desc = lookupDescriptor(obj, keyName);
          desc.enumerable = true;
          Object.defineProperty(obj, keyName, desc);
        }
      }
    } else {
      obj[keyName] = value;
    }
  };
}

export { Cache, GUID_KEY, ROOT, canInvoke, checkHasSuper, makeDictionary as dictionary, enumerableSymbol, generateGuid, getDebugName$1 as getDebugName, getName, guidFor, intern, isInternalSymbol, isObject, isProxy, lookupDescriptor, observerListenerMetaFor, setListeners, setName, setObservers, setProxy, setWithMandatorySetter, setupMandatorySetter, symbol, teardownMandatorySetter, toString, uuid, wrap };
