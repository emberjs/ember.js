// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
    
// ..........................................................
// GUIDS
// 

// Used for guid generation...
var GUID_KEY = '__ember'+ (+ new Date());
var uuid, numberCache, stringCache;

uuid         = 0;
numberCache  = [];
stringCache  = {};

var GUID_DESC = {
  configurable: true,
  writable: true,
  enumerable: false
};

var o_defineProperty = Ember.platform.defineProperty;
var o_create = Ember.platform.create;

/**
  @private
  @static
  @type String
  @constant

  A unique key used to assign guids and other private metadata to objects.
  If you inspect an object in your browser debugger you will often see these.
  They can be safely ignored.

  On browsers that support it, these properties are added with enumeration 
  disabled so they won't show up when you iterate over your properties.
*/
Ember.GUID_KEY = GUID_KEY;

/**
  @private

  Generates a new guid, optionally saving the guid to the object that you
  pass in.  You will rarely need to use this method.  Instead you should
  call Ember.guidFor(obj), which return an existing guid if available.

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
Ember.generateGuid = function(obj, prefix) {
  if (!prefix) prefix = 'ember';
  var ret = (prefix + (uuid++));
  if (obj) {
    GUID_DESC.value = ret;
    o_defineProperty(obj, GUID_KEY, GUID_DESC);
    GUID_DESC.value = null;
  }

  return ret ;
};

/**
  @private

  Returns a unique id for the object.  If the object does not yet have
  a guid, one will be assigned to it.  You can call this on any object,
  Ember.Object-based or not, but be aware that it will add a _guid property.

  You can also use this method on DOM Element objects.

  @method
  @param obj {Object} any object, string, number, Element, or primitive
  @returns {String} the unique guid for this instance.
*/
Ember.guidFor = function(obj) {

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
      return Ember.generateGuid(obj, 'ember');
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

var META_KEY = Ember.GUID_KEY+'_meta';

/**
  The key used to store meta information on object for property observing.

  @static
  @property
*/
Ember.META_KEY = META_KEY;

// Placeholder for non-writable metas.
var EMPTY_META = {
  descs: {},
  watching: {}
}; 

if (Object.freeze) Object.freeze(EMPTY_META);

/**
  @private
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
Ember.meta = function meta(obj, writable) {
  
  ember_assert("You must pass an object to Ember.meta. This was probably called from Ember internals, so you probably called a Ember method with undefined that was expecting an object", obj != undefined);

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
    
    // make sure we don't accidentally try to create constructor like desc
    ret.descs.constructor = null;
    
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

Ember.getMeta = function getMeta(obj, property) {
  var meta = Ember.meta(obj, false);
  return meta[property];
};

Ember.setMeta = function setMeta(obj, property, value) {
  var meta = Ember.meta(obj, true);
  meta[property] = value;
  return value;
};

/**
  @private

  In order to store defaults for a class, a prototype may need to create
  a default meta object, which will be inherited by any objects instantiated
  from the class's constructor.

  However, the properties of that meta object are only shallow-cloned,
  so if a property is a hash (like the event system's `listeners` hash),
  it will by default be shared across all instances of that class.

  This method allows extensions to deeply clone a series of nested hashes or
  other complex objects. For instance, the event system might pass
  ['listeners', 'foo:change', 'ember157'] to `prepareMetaPath`, which will
  walk down the keys provided.

  For each key, if the key does not exist, it is created. If it already
  exists and it was inherited from its constructor, the constructor's
  key is cloned.

  You can also pass false for `writable`, which will simply return
  undefined if `prepareMetaPath` discovers any part of the path that
  shared or undefined.

  @param {Object} obj The object whose meta we are examining
  @param {Array} path An array of keys to walk down
  @param {Boolean} writable whether or not to create a new meta
    (or meta property) if one does not already exist or if it's
    shared with its constructor
*/
Ember.metaPath = function(obj, path, writable) {
  var meta = Ember.meta(obj, writable), keyName, value;

  for (var i=0, l=path.length; i<l; i++) {
    keyName = path[i];
    value = meta[keyName];

    if (!value) {
      if (!writable) { return undefined; }
      value = meta[keyName] = { __ember_source__: obj };
    } else if (value.__ember_source__ !== obj) {
      if (!writable) { return undefined; }
      value = meta[keyName] = o_create(value);
      value.__ember_source__ = obj;
    }

    meta = value;
  }

  return value;
};

/**
  @private

  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked.  This is the primitive we use to implement
  calls to super.
  
  @param {Function} func
    The function to call
    
  @param {Function} superFunc
    The super function.
    
  @returns {Function} wrapped function.
*/
Ember.wrap = function(func, superFunc) {
  
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

/**
  @function
  
  Returns YES if the passed object is an array or Array-like.

  Ember Array Protocol:

    - the object has an objectAt property
    - the object is a native Array
    - the object is an Object, and has a length property

  Unlike Ember.typeOf this method returns true even if the passed object is
  not formally array but appears to be array-like (i.e. implements Ember.Array)

  @param {Object} obj The object to test
  @returns {Boolean}
*/
Ember.isArray = function(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray && Array.isArray(obj)) { return true; }
  if (Ember.Array && Ember.Array.detect(obj)) { return true; }
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
Ember.makeArray = function(obj) {
  if (obj==null) return [];
  return Ember.isArray(obj) ? obj : [obj];
};


