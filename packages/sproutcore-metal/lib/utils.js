// ==========================================================================
// Project:  SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('./core');
require('./platform');
    
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

var o_defineProperty = SC.platform.defineProperty;
var o_create = SC.platform.create;

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
    o_defineProperty(obj, GUID_KEY, GUID_DESC);
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


// ..........................................................
// META
// 

var META_DESC = {
  writable:    true,
  confgurable: false,
  enumerable:  false,
  value: null
};

var META_KEY = SC.GUID_KEY+'_meta';

/**
  The key used to store meta information on object for property observing.

  @static
  @property
*/
SC.META_KEY = META_KEY;

// Placeholder for non-writable metas.
var EMPTY_META = {
  descs: {},
  watching: {}
}; 

if (Object.freeze) Object.freeze(EMPTY_META);

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
SC.meta = function meta(obj, writable) {
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

/**
  Wraps the passed function so that `this._super` will point to the superFunc
  when the function is invoked.  This is the primitive we use to implement
  calls to super.
  
  @param {Function} func
    The function to call
    
  @param {Function} superFunc
    The super function.
    
  @returns {Function} wrapped function.
*/
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
  if (obj==null) return [];
  return SC.isArray(obj) ? obj : [obj];
};


