/*jshint newcap:false*/
/**
@module ember-metal
*/

var ArrayPrototype = Array.prototype;

// NOTE: There is a bug in jshint that doesn't recognize `Object()` without `new`
// as being ok unless both `newcap:false` and not `use strict`.
// https://github.com/jshint/jshint/issues/392

// Testing this is not ideal, but we want to use native functions
// if available, but not to use versions created by libraries like Prototype
var isNativeFunc = function(func) {
  // This should probably work in all browsers likely to have ES5 array methods
  return func && Function.prototype.toString.call(func).indexOf('[native code]') > -1;
};

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
var map = isNativeFunc(ArrayPrototype.map) ? ArrayPrototype.map : function(fun /*, thisp */) {
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
var forEach = isNativeFunc(ArrayPrototype.forEach) ? ArrayPrototype.forEach : function(fun /*, thisp */) {
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

var indexOf = isNativeFunc(ArrayPrototype.indexOf) ? ArrayPrototype.indexOf : function (obj, fromIndex) {
  if (fromIndex === null || fromIndex === undefined) { fromIndex = 0; }
  else if (fromIndex < 0) { fromIndex = Math.max(0, this.length + fromIndex); }
  for (var i = fromIndex, j = this.length; i < j; i++) {
    if (this[i] === obj) { return i; }
  }
  return -1;
};

var filter = isNativeFunc(ArrayPrototype.filter) ? ArrayPrototype.filter : function (fn, context) {
  var i,
  value,
  result = [],
  length = this.length;

  for (i = 0; i < length; i++) {
    if (this.hasOwnProperty(i)) {
      value = this[i];
      if (fn.call(context, value, i, this)) {
        result.push(value);
      }
    }
  }
  return result;
};


if (Ember.SHIM_ES5) {
  if (!ArrayPrototype.map) {
    ArrayPrototype.map = map;
  }

  if (!ArrayPrototype.forEach) {
    ArrayPrototype.forEach = forEach;
  }

  if (!ArrayPrototype.filter) {
    ArrayPrototype.filter = filter;
  }

  if (!ArrayPrototype.indexOf) {
    ArrayPrototype.indexOf = indexOf;
  }
}

/**
  Array polyfills to support ES5 features in older browsers.

  @namespace Ember
  @property ArrayPolyfills
*/
export {map, forEach, filter, indexOf};

