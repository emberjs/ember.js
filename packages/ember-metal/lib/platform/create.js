// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
//
"REMOVE_USE_STRICT: true";

import defineProperties from 'ember-metal/platform/define_properties';

/**
@class platform
@namespace Ember
@static
*/

/**
  Identical to `Object.create()`. Implements if not available natively.

  @since 1.8.0
  @method create
  @for Ember
*/
var create;
// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
if (!(Object.create && !Object.create(null).hasOwnProperty)) {
  /* jshint scripturl:true, proto:true */
  // Contributed by Brandon Benvie, October, 2012
  var createEmpty;
  var supportsProto = !({ '__proto__': null } instanceof Object);
  // the following produces false positives
  // in Opera Mini => not a reliable check
  // Object.prototype.__proto__ === null
  if (supportsProto || typeof document === 'undefined') {
    createEmpty = function() {
      return { "__proto__": null };
    };
  } else {
    // In old IE __proto__ can't be used to manually set `null`, nor does
    // any other method exist to make an object that inherits from nothing,
    // aside from Object.prototype itself. Instead, create a new global
    // object and *steal* its Object.prototype and strip it bare. This is
    // used as the prototype to create nullary objects.
    createEmpty = function() {
      var iframe = document.createElement('iframe');
      var parent = document.body || document.documentElement;
      iframe.style.display = 'none';
      parent.appendChild(iframe);
      iframe.src = 'javascript:';
      var empty = iframe.contentWindow.Object.prototype;
      parent.removeChild(iframe);
      iframe = null;
      delete empty.constructor;
      delete empty.hasOwnProperty;
      delete empty.propertyIsEnumerable;
      delete empty.isPrototypeOf;
      delete empty.toLocaleString;
      delete empty.toString;
      delete empty.valueOf;

      function Empty() {}
      Empty.prototype = empty;
      // short-circuit future calls
      createEmpty = function() {
        return new Empty();
      };
      return new Empty();
    };
  }

  create = Object.create = function create(prototype, properties) {

    var object;
    function Type() {}  // An empty constructor.

    if (prototype === null) {
      object = createEmpty();
    } else {
      if (typeof prototype !== "object" && typeof prototype !== "function") {
        // In the native implementation `parent` can be `null`
        // OR *any* `instanceof Object`  (Object|Function|Array|RegExp|etc)
        // Use `typeof` tho, b/c in old IE, DOM elements are not `instanceof Object`
        // like they are in modern browsers. Using `Object.create` on DOM elements
        // is...err...probably inappropriate, but the native version allows for it.
        throw new TypeError("Object prototype may only be an Object or null"); // same msg as Chrome
      }

      Type.prototype = prototype;

      object = new Type();
    }

    if (properties !== undefined) {
      defineProperties(object, properties);
    }

    return object;
  };
} else {
  create = Object.create;
}

export default create;
