/**
@module ember-metal
*/

var ArrayPrototype = Array.prototype;

// Testing this is not ideal, but we want to use native functions
// if available, but not to use versions created by libraries like Prototype
var isNativeFunc = function(func) {
  // This should probably work in all browsers likely to have ES5 array methods
  return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
};

var defineNativeShim = function(nativeFunc, shim) {
  if (isNativeFunc(nativeFunc)) {
    return nativeFunc;
  }
  return shim;
};

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
var map = defineNativeShim(ArrayPrototype.map, function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null || typeof fun !== "function") {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  var res = new Array(len);
  var thisp = arguments[1];

  for (var i = 0; i < len; i++) {
    if (i in t) {
      res[i] = fun.call(thisp, t[i], i, t);
    }
  }

  return res;
});

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
var forEach = defineNativeShim(ArrayPrototype.forEach, function(fun /*, thisp */) {
  //"use strict";

  if (this === void 0 || this === null || typeof fun !== "function") {
    throw new TypeError();
  }

  var t = Object(this);
  var len = t.length >>> 0;
  var thisp = arguments[1];

  for (var i = 0; i < len; i++) {
    if (i in t) {
      fun.call(thisp, t[i], i, t);
    }
  }
});

var indexOf = defineNativeShim(ArrayPrototype.indexOf, function (obj, fromIndex) {
  if (fromIndex === null || fromIndex === undefined) {
    fromIndex = 0;
  } else if (fromIndex < 0) {
    fromIndex = Math.max(0, this.length + fromIndex);
  }

  for (var i = fromIndex, j = this.length; i < j; i++) {
    if (this[i] === obj) {
      return i;
    }
  }
  return -1;
});

var lastIndexOf = defineNativeShim(ArrayPrototype.lastIndexOf, function(obj, fromIndex) {
  var len = this.length;
  var idx;

  if (fromIndex === undefined) {
    fromIndex = len-1;
  } else {
    fromIndex = (fromIndex < 0) ? Math.ceil(fromIndex) : Math.floor(fromIndex);
  }

  if (fromIndex < 0) {
    fromIndex += len;
  }

  for (idx = fromIndex; idx >= 0; idx--) {
    if (this[idx] === obj) {
      return idx;
    }
  }
  return -1;
});

var filter = defineNativeShim(ArrayPrototype.filter, function (fn, context) {
  var i, value;
  var result = [];
  var length = this.length;

  for (i = 0; i < length; i++) {
    if (this.hasOwnProperty(i)) {
      value = this[i];
      if (fn.call(context, value, i, this)) {
        result.push(value);
      }
    }
  }
  return result;
});

if (Ember.SHIM_ES5) {
  ArrayPrototype.map = ArrayPrototype.map || map;
  ArrayPrototype.forEach = ArrayPrototype.forEach || forEach;
  ArrayPrototype.filter = ArrayPrototype.filter || filter;
  ArrayPrototype.indexOf = ArrayPrototype.indexOf || indexOf;
  ArrayPrototype.lastIndexOf = ArrayPrototype.lastIndexOf || lastIndexOf;
}

/**
  Array polyfills to support ES5 features in older browsers.

  @namespace Ember
  @property ArrayPolyfills
*/
export {
  map,
  forEach,
  filter,
  indexOf,
  lastIndexOf
};
