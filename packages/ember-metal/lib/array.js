/**
@module ember-metal
*/
import isNative from "lodash/internals/isNative";
import map from "lodash/collections/map";
import forEach from "lodash/collections/forEach";
import indexOf from "lodash/arrays/indexOf";
import filter from "lodash/collections/filter";

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

var map = defineNativeShim(ArrayPrototype.map, map);
var forEach = defineNativeShim(ArrayPrototype.forEach, forEach);
var indexOf = defineNativeShim(ArrayPrototype.indexOf, indexOf);
var lastIndexOf = defineNativeShim(ArrayPrototype.lastIndexOf, lastIndexOf);
var filter = defineNativeShim(ArrayPrototype.filter, filter);

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
