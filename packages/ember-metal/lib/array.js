/*jshint newcap:false*/

// NOTE: There is a bug in jshint that doesn't recognize `Object()` without `new`
// as being ok unless both `newcap:false` and not `use strict`.
// https://github.com/jshint/jshint/issues/392

// Testing this is not ideal, but we want ArrayUtils to use native functions
// if available, but not to use versions created by libraries like Prototype
/** @private */
var isNativeFunc = function(func) {
  // This should probably work in all browsers likely to have ES5 array methods
  return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
};

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
/** @private */
var arrayMap = isNativeFunc(Array.prototype.map) ? Array.prototype.map : function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null) {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") {
    throw new TypeError();
  }

  var res = new Array(len);
  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) {
      res[i] = fun.call(thisp, t[i], i, t);
    }
  }

  return res;
};

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
/** @private */
var arrayForEach = isNativeFunc(Array.prototype.forEach) ? Array.prototype.forEach : function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null) {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  if (typeof fun !== "function") {
    throw new TypeError();
  }

  var thisp = arguments[1];
  for (var i = 0; i < len; i++) {
    if (i in t) {
      fun.call(thisp, t[i], i, t);
    }
  }
};

/** @private */
var arrayIndexOf = isNativeFunc(Array.prototype.indexOf) ? Array.prototype.indexOf : function (obj, fromIndex) {
  if (fromIndex === null || fromIndex === undefined) { fromIndex = 0; }
  else if (fromIndex < 0) { fromIndex = Math.max(0, this.length + fromIndex); }
  for (var i = fromIndex, j = this.length; i < j; i++) {
    if (this[i] === obj) { return i; }
  }
  return -1;
};


Ember.ArrayUtils = {
  map: function(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    return obj.map ? obj.map.apply(obj, args) : arrayMap.apply(obj, args);
  },

  forEach: function(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    return obj.forEach ? obj.forEach.apply(obj, args) : arrayForEach.apply(obj, args);
  },

  indexOf: function(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    return obj.indexOf ? obj.indexOf.apply(obj, args) : arrayIndexOf.apply(obj, args);
  },

  indexesOf: function(obj) {
    var args = Array.prototype.slice.call(arguments, 1);
    return args[0] === undefined ? [] : Ember.ArrayUtils.map(args[0], function(item) {
      return Ember.ArrayUtils.indexOf(obj, item);
    });
  },

  removeObject: function(array, item) {
    var index = this.indexOf(array, item);
    if (index !== -1) { array.splice(index, 1); }
  }
};


if (Ember.SHIM_ES5) {
  if (!Array.prototype.map) {
    /** @private */
    Array.prototype.map = arrayMap;
  }

  if (!Array.prototype.forEach) {
    /** @private */
    Array.prototype.forEach = arrayForEach;
  }

  if (!Array.prototype.indexOf) {
    /** @private */
    Array.prototype.indexOf = arrayIndexOf;
  }
}
