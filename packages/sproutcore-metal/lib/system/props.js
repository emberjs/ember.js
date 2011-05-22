// ==========================================================================
// Project:   SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */



var Descriptor, meta, get, set, defineProperty, defineComputedProperty, defineMethod;

// ..........................................................
// PLATFORM SUPPORT
// 

var USE_ACCESSORS = (SC.ENV.USE_ACCESSORS !== false) && Object.defineProperty;
SC.USES_ACCESSORS = USE_ACCESSORS;

var guidFor = SC.guidFor;
var a_slice = Array.prototype.slice;

// Determine if we use accessors
var o_defineProperty, o_create, MUST_USE_GETTER, MUST_USE_SETTER;

o_defineProperty = Object.defineProperty;
o_create         = Object.create;

//@if (legacy)
if (!o_defineProperty) {
  o_defineProperty = function(obj, key, desc) { obj[key] = desc.value; };
}

if (!o_create) {
  var O_ctor = function() {}, 
      O_proto = O_ctor.prototype;

  o_create = function(obj) {
    O_ctor.prototype = obj;
    obj = new O_ctor();
    O_ctor.prototype = O_proto;
    return obj;
  };
}

MUST_USE_GETTER = function() {
  sc_assert('Must use SC.get() to access this property', false);
};

MUST_USE_SETTER = function() {
  sc_assert('Must use SC.set() to access this property', false);
};

//@endif

// ..........................................................
// META - this is where we store extra info about the object.
// 

var META_DESC = {
  writable:    true,
  confgurable: false,
  enumerable:  false,
  value: null
};

var META_KEY = SC.GUID_KEY+'_meta';

// Placeholder for non-writable metas.
var EMPTY_META = {
  descs: {}
}; 
if (Object.freeze) Object.freeze(EMPTY_META);

meta = function(obj, writable) {
  var ret = obj[META_KEY];
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    o_defineProperty(obj, META_KEY, META_DESC);
    ret = obj[META_KEY] = {
      descs: {},
      watching: {},
      values: {},
      lastSetValues: {},
      cache:  {},
      source: obj
    };
    
  } else if (ret.source !== obj) {
    ret = obj[META_KEY] = o_create(ret);
    ret.descs    = o_create(ret.descs);
    ret.values   = o_create(ret.values);
    ret.watching = o_create(ret.watching);
    ret.lastSetValues = {};
    ret.cache    = {};
    ret.source   = obj;
  }
  return ret;
};

/**
  @function
  
  Retrieves the meta hash for an object.  If 'writable' is true ensures the
  hash is writable for this object as well.
  
  The meta object contains information about computed property descriptors as
  well as any watched properties and other information.  You generally will
  not access this information directly but instead work with higher level 
  methods that manipulate this has indirectly.

  @param {Object} obj
    The object to retrieve meta for
    
  @param {Boolean} writable
    Pass false if you do not intend to modify the meta hash, allowing the 
    method to avoid making an unnecessary copy.
    
  @returns {Hash}
*/
SC.meta = meta;

// ..........................................................
// GET AND SET
// 
// If we are on a platform that supports accessors we can get use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

get = function get(obj, keyName) {
  if (keyName === undefined && 'string' === typeof obj) {
    keyName = obj;
    obj = SC;
  }
  
  if (!obj) return undefined;
  var ret = obj[keyName];
  if (ret===undefined && 'function'===typeof obj.unknownProperty) {
    ret = obj.unknownProperty(keyName);
  }
  return ret;
};

set = function set(obj, keyName, value) {
  if (('object'===typeof obj) && !(keyName in obj)) {
    if ('function' === typeof obj.setUnknownProperty) {
      obj.setUnknownProperty(keyName, value);
    } else if ('function' === typeof obj.unknownProperty) {
      value = obj.unknownProperty(keyName, value);
    } else obj[keyName] = value;
  } else {
    obj[keyName] = value;
  }
  return value;
};

if (!USE_ACCESSORS) {

  var o_get = get, o_set = set;
  
  get = function(obj, keyName) {
    if (!obj) return undefined;
    var desc = meta(obj, false).descs[keyName];
    if (desc) return desc.get(obj, keyName);
    else return o_get(obj, keyName);
  };

  set = function(obj, keyName, value) {
    var desc = meta(obj, false).descs[keyName];
    if (desc) value = desc.set(obj, keyName, value);
    else value = o_set(obj, keyName, value);
    return value;
  };

}

/**
  @function
  
  Gets the value of a property on an object.  If the property is computed,
  the function will be invoked.  If the property is not defined but the 
  object implements the unknownProperty() method then that will be invoked.
  
  If you plan to run on IE8 and older browsers then you should use this 
  method anytime you want to retrieve a property on an object that you don't
  know for sure is private.  (My convention only properties beginning with 
  an underscore '_' are considered private.)
  
  On all newer browsers, you only need to use this method to retrieve 
  properties if the property might not be defined on the object and you want
  to respect the unknownProperty() handler.  Otherwise you can ignore this
  method.
  
  Note that if the obj itself is null, this method will simply return 
  undefined.
  
  @param {Object} obj
    The object to retrieve from.
    
  @param {String} keyName
    The property key to retrieve
    
  @returns {Object} the property value or null.
*/
SC.get = get;

/**
  @function 
  
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change.  If the 
  property is not defined but the object implements the unknownProperty()
  method then that will be invoked as well.
  
  If you plan to run on IE8 and older browsers then you should use this 
  method anytime you want to set a property on an object that you don't
  know for sure is private.  (My convention only properties beginning with 
  an underscore '_' are considered private.)
  
  On all newer browsers, you only need to use this method to set 
  properties if the property might not be defined on the object and you want
  to respect the unknownProperty() handler.  Otherwise you can ignore this
  method.
  
  @param {Object} obj
    The object to modify.
    
  @param {String} keyName
    The property key to set
    
  @param {Object} value
    The value to set
    
  @returns {Object} the passed value.
*/
SC.set = set;

// ..........................................................
// DEPENDENT KEYS
// 

// data structure:
//  meta.deps = { 
//   'depKey': { 
//     'keyName': count,
//     __scproto__: SRC_OBJ [to detect clones]
//     },
//   __scproto__: SRC_OBJ
//  }

function uniqDeps(obj, depKey) {
  var m = meta(obj), deps, ret;
  deps = m.deps;
  if (!deps) {
    deps = m.deps = { __scproto__: obj };
  } else if (deps.__scproto__ !== obj) {
    deps = m.deps = o_create(deps);
    deps.__scproto__ = obj;
  }
  
  ret = deps[depKey];
  if (!ret) {
    ret = deps[depKey] = { __scproto__: obj };
  } else if (ret.__scproto__ !== obj) {
    ret = deps[depKey] = o_create(ret);
    ret.__scproto__ = obj;
  }
  
  return ret;
}

function addDependentKey(obj, keyName, depKey) {
  var deps = uniqDeps(obj, depKey);
  deps[keyName] = (deps[keyName] || 0) + 1;
  SC.watch(obj, depKey);
}

function removeDependentKey(obj, keyName, depKey) {
  var deps = uniqDeps(obj, depKey);
  deps[keyName] = (deps[keyName] || 0) - 1;
  SC.unwatch(obj, depKey);
}


var DEP_SKIP = { __scproto__: true }; // skip some keys and toString
function iterDeps(methodName, obj, depKey, seen) {
  
  var guid = guidFor(obj);
  if (!seen[guid]) seen[guid] = {};
  if (seen[guid][depKey]) return ;
  seen[guid][depKey] = true;
  
  var deps = meta(obj, false).deps, method = SC[methodName];
  deps = deps && deps[depKey];
  if (deps) {
    for(var key in deps) {
      if (DEP_SKIP[key]) continue;
      method(obj, key);
    }
  }
}

var WILL_SEEN, DID_SEEN;

// called whenever a property is about to change to clear the cache of any dependent keys (and notify those properties of changes, etc...)
function dependentKeysWillChange(obj, depKey) {
  var seen = WILL_SEEN, top = !seen;
  if (top) seen = WILL_SEEN = {};
  iterDeps('propertyWillChange', obj, depKey, seen);
  if (top) WILL_SEEN = null;
}

// called whenever a property has just changed to update dependent keys
function dependentKeysDidChange(obj, depKey) {
  var seen = DID_SEEN, top = !seen;
  if (top) seen = DID_SEEN = {};
  iterDeps('propertyDidChange', obj, depKey, seen);
  if (top) DID_SEEN = null;
}

// ..........................................................
// SIMPLE PROPERTY HANDLER
// 

SC.Descriptor = Descriptor = function() {};

// Normal unwatched property.
var SIMPLE_DESC = {
  writable: true,
  configurable: true,
  enumerable: true,
  value: null
};

var SIMPLE_PROPERTY = new Descriptor();
SC.SIMPLE_PROPERTY = SIMPLE_PROPERTY;

SIMPLE_PROPERTY.val = SIMPLE_PROPERTY.get = function(obj, keyName) {
  return obj[keyName];
};
  
SIMPLE_PROPERTY.set = function(obj, keyName, value) {
  obj[keyName] = value;
  return value;
};
  
SIMPLE_PROPERTY.defineProperty = function(obj, keyName, value) {
  SIMPLE_DESC.value = value;
  o_defineProperty(obj, keyName, SIMPLE_DESC); // don't use getter/setter
  SIMPLE_DESC.value = null;
};
  
SIMPLE_PROPERTY.undefineProperty = function(obj, keyName) {
  return obj[keyName]; // just return the current value for later use
};

// ..........................................................
// WATCHED PROPERTY
// 

var WATCHED_DESC = {
  configurable: true,
  enumerable: true,
  get: MUST_USE_GETTER,
  set: MUST_USE_SETTER
};

function w_get(obj, keyName) {
  var m = meta(obj, false);
  return (m.source===obj) && m.values[keyName];
}

function w_set(obj, keyName, value) {
  var m = meta(obj), watching;
  
  watching = m.watching[keyName]>0 && value!==m.values[keyName];  
  if (watching) SC.propertyWillChange(obj, keyName);
  m.values[keyName] = value;
  if (watching) SC.propertyDidChange(obj, keyName);
  return value;
}

var WATCHED_GETTERS = {};
function mkWatchedGetter(keyName) {
  var ret = WATCHED_GETTERS[keyName];
  if (!ret) {
    ret = WATCHED_GETTERS[keyName] = function() { 
      return w_get(this, keyName); 
    };
  }
  return ret;
}

var WATCHED_SETTERS = {};
function mkWatchedSetter(keyName) {
  var ret = WATCHED_SETTERS[keyName];
  if (!ret) {
    ret = WATCHED_SETTERS[keyName] = function(value) {
      return w_set(this, keyName, value);
    };
  }
  return ret;
}

var WATCHED_PROPERTY = new Descriptor();

WATCHED_PROPERTY.val = WATCHED_PROPERTY.get = w_get ;
  
WATCHED_PROPERTY.set = w_set;
  
WATCHED_PROPERTY.defineProperty = function(obj, keyName, value) {
  WATCHED_DESC.get = mkWatchedGetter(keyName);
  WATCHED_DESC.set = mkWatchedSetter(keyName);
  o_defineProperty(obj, keyName, WATCHED_DESC);
  WATCHED_DESC.get = WATCHED_DESC.set = null;
  if (value !== undefined) meta(obj).values[keyName] = value;
};
  
WATCHED_PROPERTY.undefineProperty = function(obj, keyName) {
  var ret = meta(obj).values[keyName];
  delete meta(obj).values[keyName];
  return ret;
};
  
WATCHED_PROPERTY.unwatchedProperty = SIMPLE_PROPERTY;
SIMPLE_PROPERTY.watchedProperty    = WATCHED_PROPERTY;

// throw exception if accessed w/o SC.get/SC.set
if (!USE_ACCESSORS) {
  WATCHED_PROPERTY.defineProperty = function(obj, keyName, value) {
    o_defineProperty(obj, keyName, WATCHED_DESC);
    if (value !== undefined) meta(obj).values[keyName] = value;
  };
}

// ..........................................................
// COMPUTED PROPERTY
//

function ComputedProperty(func, opts) {
  this.func = func;
  this._cacheable = opts && opts.cacheable;
  this._dependentKeys = opts && opts.dependentKeys;
}

ComputedProperty.prototype = new Descriptor();

var CP_DESC = {
  configurable: true,
  enumerable:   true,
  get: MUST_USE_GETTER, // for when use_accessors is false.
  set: MUST_USE_SETTER  // for when use_accessors is false
};

function mkCpGetter(keyName, desc) {
  var cacheable = desc._cacheable, 
      func     = desc.func;
      
  if (cacheable) {
    return function() {
      var ret, cache = meta(this).cache;
      if (keyName in cache) return cache[keyName];
      ret = cache[keyName] = func.call(this, keyName);
      return ret ;
    };
  } else {
    return function() {
      return func.call(this, keyName);
    };
  }
}

function mkCpSetter(keyName, desc) {
  var cacheable = desc._cacheable,
      func      = desc.func;
      
  return function(value) {
    var m = meta(this, cacheable),
        watched = (m.source===this) && m.watching[keyName]>0,
        ret, oldSuspended, lastSetValues;

    oldSuspended = desc._suspended;
    desc._suspended = this;

    watched = watched && m.lastSetValues[keyName]!==guidFor(value);
    if (watched) {
      m.lastSetValues[keyName] = guidFor(value);
      SC.propertyWillChange(this, keyName);
    }
    
    if (cacheable) delete m.cache[keyName];
    ret = func.call(this, keyName, value);
    if (cacheable) m.cache[keyName] = ret;
    if (watched) SC.propertyDidChange(this, keyName);
    desc._suspended = oldSuspended;
    return ret;
  };
}

var Cp = ComputedProperty.prototype;

Cp.cacheable = function(aFlag) {
  this._cacheable = aFlag!==false;
  return this;
};

Cp.property = function() {
  this._dependentKeys = a_slice.call(arguments);
  return this;
};

Cp.defineProperty = function(obj, keyName, value) {
  CP_DESC.get = mkCpGetter(keyName, this);
  CP_DESC.set = mkCpSetter(keyName, this);
  o_defineProperty(obj, keyName, CP_DESC);
  CP_DESC.get = CP_DESC.set = null;
  
  var keys = this._dependentKeys, 
      len  = keys ? keys.length : 0;
  for(var idx=0;idx<len;idx++) addDependentKey(obj, keyName, keys[idx]);
};

Cp.undefineProperty = function(obj, keyName) {
  var keys = this._dependentKeys, 
      len  = keys ? keys.length : 0;
  for(var idx=0;idx<len;idx++) removeDependentKey(obj, keyName, keys[idx]);

  if (this._cacheable) delete meta(obj).cache[keyName];
  
  return null; // no value to restore
};

Cp.didChange = function(obj, keyName) {
  if (this._cacheable && (this._suspended !== obj)) {
    delete meta(obj).cache[keyName];
  }
};

Cp.val = function(obj, keyName) {
  return undefined; 
};

Cp.get = function(obj, keyName) {
  return this.func.call(obj, keyName);
};

Cp.set = function(obj, keyName, value) {
  return this.func.call(obj, keyName, value);
};

//@if (legacy)
if (!USE_ACCESSORS) {
  Cp.defineProperty = function(obj, keyName) {
    // throw exception if not using SC.get() and SC.set() when supported
    o_defineProperty(obj, keyName, CP_DESC);
  };
}
//@endif

// ..........................................................
// DEFINING PROPERTIES API
// 

function hasDesc(descs, keyName) {
  if (keyName === 'toString') return 'function' !== typeof descs.toString;
  else return !!descs[keyName];
}

SC.defineProperty = function(obj, keyName, desc, val) {
  var m        = meta(obj), 
      descs    = m.descs, 
      watching = m.watching[keyName]>0;

  if (!desc || desc===SIMPLE_PROPERTY) {
    desc = watching ? WATCHED_PROPERTY : SIMPLE_PROPERTY;
  }

  if (val === undefined) {
    val = hasDesc(descs,keyName) ? descs[keyName].undefineProperty(obj, keyName) : obj[keyName];
  } else if (hasDesc(descs, keyName)) {
    descs[keyName].undefineProperty(obj, keyName);
  }
  
  descs[keyName] = desc;
  desc.defineProperty(obj, keyName, val, watching);
  
  return this;
};

var GUID_KEY = SC.GUID_KEY;

SC.create = function(obj, props) {
  var ret = o_create(obj, props);
  if (GUID_KEY in ret) SC.generateGuid(ret, 'sc');
  SC.rewatch(ret); // setup watch chains if needed.
  return ret;
};

SC.create.primitive = o_create; 

/**
  Returns a computed property you can use when defining a computed property.
  You can also invoke some helper methods to define cachability and 
  dependencies.
*/
SC.computed = function(func) {
  return new ComputedProperty(func);
};

// ..........................................................
// PATHS
// 

function normalizePath(path) {
  sc_assert('must pass non-empty string to normalizePath()', !SC.empty(path));
  if (path==='*') return path; //special case...
  var first = path[0];
  if(first==='.') return 'this'+path;
  if (first==='*' && path[1]!=='.') return 'this.'+path.slice(1);
  return path;
}

// assumes normalized input; no *, normalized path, always a target...
function getPath(target, path) {
  var len = path.length, idx, next, key;
  
  idx = path.indexOf('*');
  if (idx>0 && path[idx-1]!=='.') {
    return getPath(getPath(target, path.slice(0, idx)), path.slice(idx+1));
  }

  idx = 0;
  while(target && idx<len) {
    next = path.indexOf('.', idx);
    if (next<0) next = len;
    key = path.slice(idx, next);
    target = key==='*' ? target : get(target, key);
    idx = next+1;
  }
  return target ;
}

var TUPLE_RET = [];
var IS_GLOBAL = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]/;
var IS_GLOBAL_SET = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]?/;
var HAS_THIS  = /^this[\.\*]/;
var FIRST_KEY = /^([^\.\*]+)/;
var IS_PATH = /[\.\*]/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

// returns true if the passed path is just a keyName
function isKeyName(path) {
  return path==='*' || !IS_PATH.test(path);
}

// assumes path is already normalized
function normalizeTuple(target, path) {
  var hasThis  = HAS_THIS.test(path),
      isGlobal = !hasThis && IS_GLOBAL.test(path),
      key;

  if (!target || isGlobal) target = window;
  if (hasThis) path = path.slice(5);
  
  var idx = path.indexOf('*');
  if (idx>0 && path[idx-1]!=='.') {
    
    // should not do lookup on a prototype object because the object isn't
    // really live yet.
    if (target && meta(target,false).proto!==target) {
      target = getPath(target, path.slice(0, idx));
    } else {
      target = null;
    }
    path   = path.slice(idx+1);

  } else if (target === window) {
    key = firstKey(path);
    target = get(target, key);
    path   = path.slice(key.length+1);
  }

  // must return some kind of path to be valid else other things will break.
  if (!path || path.length===0) throw new Error('Invalid Path');
  
  TUPLE_RET[0] = target;
  TUPLE_RET[1] = path;
  return TUPLE_RET;
}

/**
  @method
  
  Normalizes a path to support older-style property paths beginning with . or
  *
  
  @param {String} path path to normalize
  @returns {String} normalized path  
*/
SC.normalizePath = normalizePath;

/**
  Normalizes a target/path pair to reflect that actual target/path that should
  be observed, etc.  This takes into account passing in global property 
  paths (i.e. a path beginning with a captial letter not defined on the 
  target) and * separators.
  
  @param {Object} target
    The current target.  May be null.
    
  @param {String} path
    A path on the target or a global property path.
    
  @returns {Array} a temporary array with the normalized target/path pair.
*/
SC.normalizeTuple = function(target, path) {
  return normalizeTuple(target, normalizePath(path));
};

SC.getPath = function(root, path) {
  var hasThis, isGlobal;
  
  if (!path && 'string'===typeof root) {
    path = root;
    root = null;
  }

  // detect complicated paths and normalize them
  path = normalizePath(path);
  hasThis  = HAS_THIS.test(path);
  isGlobal = !hasThis && IS_GLOBAL.test(path);
  if (!root || hasThis || isGlobal || path.indexOf('*')>0) {
    var tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
  } 
  
  return getPath(root, path);
};

SC.setPath = function(root, path, value) {
  var keyName;
  
  if (arguments.length===2 && 'string' === typeof root) {
    value = path;
    path = root;
    root = null;
  }
  
  path = normalizePath(path);
  if (path.indexOf('*')>0) {
    var tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
  }

  if (path.indexOf('.') > 0) {
    keyName = path.slice(path.lastIndexOf('.')+1);
    path    = path.slice(0, path.length-(keyName.length+1));
    if (!HAS_THIS.test(path) && IS_GLOBAL_SET.test(path) && path.indexOf('.')<0) {
      root = window[path]; // special case only works during set...
    } else if (path !== 'this') {
      root = SC.getPath(root, path);
    }

  } else {
    if (IS_GLOBAL_SET.test(path)) throw new Error('Invalid Path');
    keyName = path;
  }
  
  if (!keyName || keyName.length===0 || keyName==='*') {
    throw new Error('Invalid Path');
  }
  
  return SC.set(root, keyName, value);
};

// ..........................................................
// CHAIN
// 

function addChainWatcher(obj, keyName, node) {
  if (!obj || ('object' !== typeof obj)) return; // nothing to do
  var m = meta(obj);
  var nodes = m.chainWatchers;
  if (!nodes || nodes.__scproto__ !== obj) {
    nodes = m.chainWatchers = { __scproto__: obj };
  }
  
  if (!nodes[keyName]) nodes[keyName] = {};
  nodes[keyName][guidFor(node)] = node;
  SC.watch(obj, keyName);
}

function removeChainWatcher(obj, keyName, node) {
  if (!obj || ('object' !== typeof obj)) return; // nothing to do
  var m = meta(obj, false);
  var nodes = m.chainWatchers;
  if (!nodes || nodes.__scproto__ !== obj) return; //nothing to do
  if (nodes[keyName]) delete nodes[keyName][guidFor(node)];
  SC.unwatch(obj, keyName);
}

var pendingQueue = [];

// attempts to add the pendingQueue chains again.  If some of them end up
// back in the queue and reschedule is true, schedules a timeout to try 
// again.
function flushPendingChains(reschedule) {
  if (pendingQueue.length===0) return ; // nothing to do
  
  var queue = pendingQueue;
  pendingQueue = [];
  
  queue.forEach(function(q) { q[0].add(q[1]); });
  if (reschedule!==false && pendingQueue.length>0) {
    setTimeout(flushPendingChains, 1);
  }
}

function isProto(pvalue) {
  return meta(pvalue, false).proto === pvalue;
}

// A ChainNode watches a single key on an object.  If you provide a starting
// value for the key then the node won't actually watch it.  For a root node 
// pass null for parent and key and object for value.
var ChainNode = function(parent, key, value, separator) {
  var obj;
  
  this._parent = parent;
  this._key    = key;
  this._watching = value===undefined;
  this._value  = value || (parent._value && !isProto(parent._value) && get(parent._value, key));
  this._separator = separator || '.';
  this._paths = {};

  if (this._watching) {
    this._object = parent._value;
    if (this._object) addChainWatcher(this._object, this._key, this);
  }
};


var Wp = ChainNode.prototype;

Wp.destroy = function() {
  if (this._watching) {
    var obj = this._object;
    if (obj) removeChainWatcher(obj, this._key, this);
    this._watching = false; // so future calls do nothing
  }
};

// copies a top level object only
Wp.copy = function(obj) {
  var ret = new ChainNode(null, null, obj, this._separator);
  var paths = this._paths, path;
  for(path in paths) {
    if (!(paths[path] > 0)) continue; // this check will also catch non-number vals.
    ret.add(path);
  }
  return ret;
};

// called on the root node of a chain to setup watchers on the specified 
// path.
Wp.add = function(path) {
  var obj, tuple, key, src, separator, paths;
  
  paths = this._paths;
  paths[path] = (paths[path] || 0) + 1 ;
  
  obj = this._value;
  tuple = normalizeTuple(obj, path);
  if (tuple[0] && (tuple[0] === obj)) {
    path = tuple[1];
    key  = firstKey(path);
    path = path.slice(key.length+1);

  // static path does not exist yet.  put into a queue and try to connect
  // later.
  } else if (!tuple[0]) {
    pendingQueue.push([this, path]);
    return;
    
  } else {
    src  = tuple[0];
    key  = path.slice(0, 0-(tuple[1].length+1));
    separator = path.slice(key.length, key.length+1);
    path = tuple[1];
  }
  
  this.chain(key, path, src, separator);
};

// called on the root node of a chain to teardown watcher on the specified
// path
Wp.remove = function(path) {
  var obj, tuple, key, src, paths;

  paths = this._paths;
  if (paths[path] > 0) paths[path]--;

  obj = this._value;
  tuple = normalizeTuple(obj, path);
  if (tuple[0] === obj) {
    path = tuple[1];
    key  = firstKey(path);
    path = path.slice(key.length+1);
    
  } else {
    src  = tuple[0];
    key  = path.slice(0, 0-(tuple[1].length+1));
    path = tuple[1];
  }
  
  this.unchain(key, path);
};

Wp.count = 0;

Wp.chain = function(key, path, src, separator) {
  var chains = this._chains, node;
  if (!chains) chains = this._chains = {};

  node = chains[key];
  if (!node) node = chains[key] = new ChainNode(this, key, src, separator);
  node.count++; // count chains...

  // chain rest of path if there is one
  if (path && path.length>0) {
    key = firstKey(path);
    path = path.slice(key.length+1);
    node.chain(key, path); // NOTE: no src means it will observe changes...
  }
};

Wp.unchain = function(key, path) {
  var chains = this._chains, node = chains[key];

  // unchain rest of path first...
  if (path && path.length>1) {
    key  = firstKey(path);
    path = path.slice(key.length+1);
    node.unchain(key, path);
  }

  // delete node if needed.
  node.count--;
  if (node.count<=0) {
    delete chains[node._key];
    node.destroy();
  }
  
};

Wp.willChange = function() {
  var chains = this._chains;
  if (chains) {
    for(var key in chains) {
      if (!chains.hasOwnProperty(key)) continue;
      chains[key].willChange();
    }
  }
  
  if (this._parent) this._parent.chainWillChange(this, this._key, 1);
};

Wp.chainWillChange = function(chain, path, depth) {
  if (this._key) path = this._key+this._separator+path;
  
  if (this._parent) {
    this._parent.chainWillChange(this, path, depth+1);
  } else {
    if (depth>1) SC.propertyWillChange(this._value, path);
    path = 'this.'+path;
    if (this._paths[path]>0) SC.propertyWillChange(this._value, path);
  }
};

Wp.chainDidChange = function(chain, path, depth) {
  if (this._key) path = this._key+this._separator+path;
  if (this._parent) {
    this._parent.chainDidChange(this, path, depth+1);
  } else {
    if (depth>1) SC.propertyDidChange(this._value, path);
    path = 'this.'+path;
    if (this._paths[path]>0) SC.propertyDidChange(this._value, path);
  }
};

Wp.didChange = function() {
  // update my own value first.
  if (this._watching) {
    var obj = this._parent._value;
    if (obj !== this._object) {
      removeChainWatcher(this._object, this._key, this);
      this._object = obj;
      addChainWatcher(obj, this._key, this);
    }
    this._value  = obj && !isProto(obj) ? get(obj, this._key) : undefined;
  }
  
  // then notify chains...
  var chains = this._chains;
  if (chains) {
    for(var key in chains) {
      if (!chains.hasOwnProperty(key)) continue;
      chains[key].didChange();
    }
  }

  // and finally tell parent about my path changing...
  if (this._parent) this._parent.chainDidChange(this, this._key, 1);
};

// get the chains for the current object.  If the current object has 
// chains inherited from the proto they will be cloned and reconfigured for
// the current object.
function chainsFor(obj) {
  var m   = meta(obj), ret = m.chains;
  if (!ret) {
    ret = m.chains = new ChainNode(null, null, obj);
  } else if (ret._value !== obj) {
    ret = m.chains = ret.copy(obj);
  }
  return ret ;
}



function notifyChains(obj, keyName, methodName) {
  var m = meta(obj, false);
  var nodes = m.chainWatchers;
  if (!nodes || nodes.__scproto__ !== obj) return; // nothing to do

  nodes = nodes[keyName];
  if (!nodes) return;
  
  for(var key in nodes) {
    if (!nodes.hasOwnProperty(key)) continue;
    nodes[key][methodName](obj, keyName);
  }
}

function chainsWillChange(obj, keyName) {
  notifyChains(obj, keyName, 'willChange');
}

function chainsDidChange(obj, keyName) {
  notifyChains(obj, keyName, 'didChange');
}

// ..........................................................
// WATCH
// 

/**
  Starts watching a property on an object.  Whenever the property changes,
  invokes SC.propertyWillChange and SC.propertyDidChange.  This is the 
  primitive used by observers and dependent keys; usually you will never call
  this method directly but instead use higher level methods like
  SC.addObserver().
*/
SC.watch = function(obj, keyName) {

  // can't watch length on Array - it is special...
  if (keyName === 'length' && SC.typeOf(obj)==='array') return this;
  
  var m = meta(obj), watching = m.watching, desc;
  keyName = normalizePath(keyName);

  // activate watching first time
  if (!watching[keyName]) {
    watching[keyName] = 1;
    if (isKeyName(keyName)) {
      desc = m.descs[keyName];
      desc = desc ? desc.watchedProperty : WATCHED_PROPERTY;
      if (desc) SC.defineProperty(obj, keyName, desc);
    } else {
      chainsFor(obj).add(keyName);
    }

  }  else {
    watching[keyName] = (watching[keyName]||0)+1;
  }
  return this;
};

SC.watch.flushPending = flushPendingChains;

SC.unwatch = function(obj, keyName) {
  // can't watch length on Array - it is special...
  if (keyName === 'length' && SC.typeOf(obj)==='array') return this;

  var watching = meta(obj).watching, desc, descs;
  keyName = normalizePath(keyName);
  if (watching[keyName] === 1) {
    watching[keyName] = 0;
    if (isKeyName(keyName)) {
      desc = meta(obj).descs[keyName];
      desc = desc ? desc.unwatchedProperty : SIMPLE_PROPERTY;
      if (desc) SC.defineProperty(obj, keyName, desc);
    } else {
      chainsFor(obj).remove(keyName);
    }

  } else if (watching[keyName]>1) {
    watching[keyName]--;
  }
  
  return this;
};

/**
  Call on an object when you first beget it from another object.  This will
  setup any chained watchers on the object instance as needed.  This method is
  safe to call multiple times.
*/
SC.rewatch = function(obj) {
  var m = meta(obj, false), chains = m.chains, bindings = m.bindings, key, b;

  // make sure the object has its own guid.
  if (GUID_KEY in obj && !obj.hasOwnProperty(GUID_KEY)) {
    SC.generateGuid(obj, 'sc');
  }  

  // make sure any chained watchers update.
  if (chains && chains._value !== obj) chainsFor(obj);

  // if the object has bindings then sync them..
  if (bindings && m.proto!==obj) {
    for (key in bindings) {
      b = !DEP_SKIP[key] && obj[key];
      if (b && b instanceof SC.Binding) b.fromDidChange(obj);
    }
  }

  return this;
};

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.
  
  @param {Object} obj  the object to destroy
  @returns {void}
*/
SC.destroy = function(obj) {
  if (obj[META_KEY]) obj[META_KEY] = null; 
};

// ..........................................................
// EVENTS
// 

function objectFor(m, obj, writable) {
  var len = arguments.length, idx, keyName, ret;
  
  for(idx=3; idx<len; idx++) {
    keyName = arguments[idx];
    ret = m[keyName];
    if (writable) {
      if (!ret) {
        ret = m[keyName] = { __scproto__: obj };
      } else if (ret.__scproto__ !== obj) {
        ret = m[keyName] = o_create(ret);
        ret.__scproto__ = obj;
      }
    } else if (!ret || (ret.__scproto__ !== obj)) {
      return undefined;
    }
    
    m = ret;
  }
  
  return ret;
}

function listenerSetFor(obj, eventName, target, writable) {
  return objectFor(meta(obj, writable), obj, writable, 'listeners', eventName, target);
}

var EV_SKIP = { __scproto__: true };

function invokeEvents(targets, params) {
  var tguid, mguid, methods, info, method, target;
  for(tguid in targets) {
    if (EV_SKIP[tguid]) continue;
    methods = targets[tguid];
    
    for(mguid in methods) {
      if (EV_SKIP[mguid] || !(info=methods[mguid])) continue;
      method = info.method;
      target = info.target;
      if (!target) target = params[0];  // object
      if ('string' === typeof method) method = target[method];
      if (info.xform) info.xform(target, method, params);
      else method.apply(target, params);
    }
  }
}

function addListener(obj, eventName, target, method, xform) {
  if (!method && 'function'===typeof target) {
    method = target;
    target = null;
  }

  var set  = listenerSetFor(obj, eventName, target, true), 
      guid = guidFor(method), ret;

  if (!set[guid]) {
    set[guid] = { target: target, method: method, xform: xform };
  } else {
    set[guid].xform = xform; // used by observers etc to map params
  }
  
  if (obj && 'function'===typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
  
  return ret; // return true if this is the first listener.
}

function removeListener(obj, eventName, target, method) {
  if (!method && 'function'===typeof target) {
    method = target;
    target = null;
  }
  
  var set = listenerSetFor(obj, eventName, target, true),
      guid = guidFor(method);
      
  // can't delete since it might be inherited
  if (set && set[guid]) set[guid] = null; 

  if (obj && 'function'===typeof obj.didRemoveListener) {
    obj.didRemoveListener(eventName, target, method);
  }
}

// returns a list of currently watched events
function watchedEvents(obj) {
  var listeners = meta(obj, false).listeners, ret =[];
  if (listeners) {
    for(var eventName in listeners) {
      if (!EV_SKIP[eventName] && listeners[eventName]) ret.push(eventName);
    }
  }
  return ret;
}

function sendEvent(obj, eventName) {
  
  // first give object a change to handle it
  if (obj && 'function' === typeof obj.sendEvent) {
    obj.sendEvent.apply(obj, a_slice.call(arguments, 1));
  }
  
  var set = meta(obj, false).listeners;
  if (set && (set = set[eventName])) {
    invokeEvents(set, arguments);
    return true;
  }
  
  return false;
}

function hasListeners(obj, eventName) {
  var targets = meta(obj, false).listeners;
  if (targets) targets = targets[eventName];
  if (!targets) return false;
  
  var tguid, mguid, methods;
  for(tguid in targets) {
    if (EV_SKIP[tguid] || !targets[tguid]) continue;
    methods = targets[tguid];
    for(mguid in methods) {
      if (EV_SKIP[mguid] || !methods[mguid]) continue;
      return true; // stop as soon as we find a valid listener
    }
  }
  
  // no listeners!  might as well clean this up so it is faster later.
  var set = objectFor(meta(obj, true), obj, true, 'listeners');
  set[eventName] = null;
  
  return false;
}

function listenersFor(obj, eventName) {
  var targets = meta(obj, false).listeners, 
      ret = [];
      
  if (targets) targets = targets[eventName];
  if (!targets) return ret;
  
  var tguid, mguid, methods, info;
  for(tguid in targets) {
    if (EV_SKIP[tguid] || !targets[tguid]) continue;
    methods = targets[tguid];
    for(mguid in methods) {
      if (EV_SKIP[mguid] || !methods[mguid]) continue;
      info = methods[mguid];
      ret.push([info.target, info.method]);
    }
  }
  
  return ret;
}

SC.addListener = addListener;
SC.removeListener = removeListener;
SC.sendEvent = sendEvent;
SC.hasListeners = hasListeners;
SC.watchedEvents = watchedEvents;
SC.listenersFor = listenersFor;

// ..........................................................
// OBSERVERS
// 

var AFTER_OBSERVERS = ':change';
var BEFORE_OBSERVERS = ':before';

var suspended = 0;

var queue = [], queueSet = {};
function notifyObservers(obj, eventName) {
  if (suspended) {
    
    // if suspended add to the queue to send event later - but only send 
    // event once.
    var guid = guidFor(obj);
    if (!queueSet[guid]) queueSet[guid] = {};
    if (!queueSet[guid][eventName]) {
      queueSet[guid][eventName] = true;
      queue.push([obj, eventName]);
    }

  } else {
    SC.sendEvent(obj, eventName);
  }
}

function flushObserverQueue() {
  if (!queue || queue.length===0) return ;
  var q = queue;
  queue = []; queueSet = {};
  q.forEach(function(x){ SC.sendEvent(x[0], x[1]); });
}

SC.beginPropertyChanges = function() {
  suspended++;
  return this;
};

SC.endPropertyChanges = function() {
  suspended--;
  if (suspended<=0) flushObserverQueue();
};

function changeEvent(keyName) {
  return keyName+AFTER_OBSERVERS;
}

function beforeEvent(keyName) {
  return keyName+BEFORE_OBSERVERS;
}

function changeKey(eventName) {
  return eventName.slice(0, -7);
}

function beforeKey(eventName) {
  return eventName.slice(0, -7);
}

function xformChange(target, method, params) {
  var obj = params[0], keyName = changeKey(params[1]), val;
  if (method.length>2) val = SC.getPath(obj, keyName);
  method.call(target, obj, keyName, val);
}

function xformBefore(target, method, params) {
  var obj = params[0], keyName = beforeKey(params[1]), val;
  if (method.length>2) val = SC.getPath(obj, keyName);
  method.call(target, obj, keyName, val);
}

SC.addObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.addListener(obj, changeEvent(path), target, method, xformChange);
  SC.watch(obj, path);
  return this;
};

SC.observersFor = function(obj, path) {
  return SC.listenersFor(obj, changeEvent(path));
};

SC.removeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.unwatch(obj, path);
  SC.removeListener(obj, changeEvent(path), target, method);
  return this;
};

SC.addBeforeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.addListener(obj, beforeEvent(path), target, method, xformBefore);
  SC.watch(obj, path);
  return this;
};

SC.beforeObserversFor = function(obj, path) {
  return SC.listenersFor(obj, beforeEvent(path));
};

SC.removeBeforeObserver = function(obj, path, target, method) {
  path = normalizePath(path);
  SC.unwatch(obj, path);
  SC.removeListener(obj, beforeEvent(path), target, method);
  return this;
};

// ..........................................................
// returns a wrapped method with a _super.
// 

SC.wrap = function(func, superFunc) {
  
  function K() {}
  
  var newFunc = function() {
    var ret, sup = this._super;
    this._super = superFunc || K;
    ret = func.apply(this, arguments);
    this._super = sup;
    return ret;
  };
  
  newFunc.base = func;
  return newFunc;
};

// ..........................................................
// PROPERTY CHANGES
// 


SC.propertyWillChange = function(obj, keyName) {
  var m = meta(obj, false), proto = m.proto, desc = m.descs[keyName];
  if (proto === obj) return ;
  if (desc && desc.willChange) desc.willChange(obj, keyName);
  dependentKeysWillChange(obj, keyName);
  chainsWillChange(obj, keyName);
  notifyObservers(obj, beforeEvent(keyName));
};

SC.propertyDidChange = function(obj, keyName) {
  var m = meta(obj, false), proto = m.proto, desc = m.descs[keyName];
  if (proto === obj) return ;
  if (desc && desc.didChange) desc.didChange(obj, keyName);
  dependentKeysDidChange(obj, keyName);
  chainsDidChange(obj, keyName);
  notifyObservers(obj, changeEvent(keyName));
};

// ..........................................................
// ENHANCE PROTOTYPES
// 

if (SC.ENV.ENHANCE_PROTOTYPES !== false) {
  Function.prototype.property = function() {
    var ret = SC.computed(this);
    return ret.property.apply(ret, arguments);
  };
}


