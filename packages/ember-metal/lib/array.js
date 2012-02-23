/*jshint newcap:true*/

// From: https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/map
var arrayMap = Array.prototype.map || function(fun /*, thisp */) {
  "use strict";

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
var arrayForEach = Array.prototype.forEach || function(fun /*, thisp */) {
  "use strict";

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

var arrayIndexOf = Array.prototype.indexOf || function (obj, fromIndex) {
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
  }
}


if (Ember.SHIM_ES5) {
  if (!Array.prototype.map) {
    Array.prototype.map = arrayMap;
  }

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = arrayForEach;
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = arrayIndexOf;
  }
}
