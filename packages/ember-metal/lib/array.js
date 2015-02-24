import isNative from "lodash/lang/isNative";
import __map__ from "lodash/collection/map";
import __forEach__ from "lodash/collection/forEach";
import __filter__ from "lodash/collection/filter";
import __indexOf__ from "lodash/array/indexOf";
import __lastIndexOf__ from "lodash/array/lastIndexOf";

/**
@module ember-metal
*/

var ArrayPrototype = Array.prototype;

var defineNativeShim = function(nativeFunc, shim) {
  if (isNative(nativeFunc)) {
    return nativeFunc;
  }

  return shim;
};

var map = defineNativeShim(ArrayPrototype.map, function(fun) {
  if (this === void 0 || this === null || typeof fun !== "function") {
    throw new TypeError();
  }

  return __map__(fun);
});

var forEach = defineNativeShim(ArrayPrototype.forEach, function(fun) {
  if (this === void 0 || this === null || typeof fun !== "function") {
    throw new TypeError();
  }

  return __forEach__(fun);
});

var indexOf = defineNativeShim(ArrayPrototype.indexOf, __indexOf__);
var lastIndexOf = defineNativeShim(ArrayPrototype.lastIndexOf, __lastIndexOf__);
var filter = defineNativeShim(ArrayPrototype.filter, __filter__);

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
