/*globals Node */

/**
@module ember-metal
*/
var defineProperty = (function checkCompliance(defineProperty) {
  if (!defineProperty) return;
  try {
    var a = 5;
    var obj = {};
    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: true,
      get: function () {
        return a;
      },
      set: function (v) {
        a = v;
      }
    });
    if (obj.a !== 5) return;
    obj.a = 10;
    if (a !== 10) return;

    // check non-enumerability
    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: true
    });
    for (var key in obj) {
      if (key === 'a') return;
    }

    // Detects a bug in Android <3.2 where you cannot redefine a property using
    // Object.defineProperty once accessors have already been set.
    if (obj.a !== true) return;

    // defineProperty is compliant
    return defineProperty;
  } catch (e) {
    // IE8 defines Object.defineProperty but calling it on an Object throws
    return;
  }
})(Object.defineProperty);

var hasES5CompliantDefineProperty = !!defineProperty;

if (hasES5CompliantDefineProperty && typeof document !== 'undefined') {
  // This is for Safari 5.0, which supports Object.defineProperty, but not
  // on DOM nodes.
  var canDefinePropertyOnDOM = (function() {
    try {
      defineProperty(document.createElement('div'), 'definePropertyOnDOM', {});
      return true;
    } catch(e) { }

    return false;
  })();

  if (!canDefinePropertyOnDOM) {
    defineProperty = function(obj, keyName, desc) {
      var isNode;

      if (typeof Node === "object") {
        isNode = obj instanceof Node;
      } else {
        isNode = typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName === "string";
      }

      if (isNode) {
        // TODO: Should we have a warning here?
        return (obj[keyName] = desc.value);
      } else {
        return Object.defineProperty(obj, keyName, desc);
      }
    };
  }
}

if (!hasES5CompliantDefineProperty) {
  defineProperty = function defineProperty(obj, keyName, desc) {
    if (!desc.get) { obj[keyName] = desc.value; }
  };
}

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!Object.defineProperties) {
  Object.defineProperties = function defineProperties(object, properties) {
    for (var property in properties) {
      if (properties.hasOwnProperty(property) && property !== "__proto__") {
        defineProperty(object, property, properties[property]);
      }
    }
    return object;
  };
}

/**
  Identical to `Object.create()`. Implements if not available natively.

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
  var supportsProto = !({'__proto__':null} instanceof Object);
  // the following produces false positives
  // in Opera Mini => not a reliable check
  // Object.prototype.__proto__ === null
  if (supportsProto || typeof document === 'undefined') {
    createEmpty = function () {
      return { "__proto__": null };
    };
  } else {
    // In old IE __proto__ can't be used to manually set `null`, nor does
    // any other method exist to make an object that inherits from nothing,
    // aside from Object.prototype itself. Instead, create a new global
    // object and *steal* its Object.prototype and strip it bare. This is
    // used as the prototype to create nullary objects.
    createEmpty = function () {
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
      createEmpty = function () {
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
      Object.defineProperties(object, properties);
    }

    return object;
  };
} else {
  create = Object.create;
}

var hasPropertyAccessors = hasES5CompliantDefineProperty;
var canDefineNonEnumerableProperties = hasES5CompliantDefineProperty;

/**
@class platform
@namespace Ember
*/

/**
  Platform specific methods and feature detectors needed by the framework.

  @class platform
  @namespace Ember
  @static
*/
// TODO remove this
var platform = {};

/**
  Identical to `Object.defineProperty()`. Implements as much functionality
  as possible if not available natively.

  @method defineProperty
  @param {Object} obj The object to modify
  @param {String} keyName property name to modify
  @param {Object} desc descriptor hash
  @return {void}
*/
platform.defineProperty = defineProperty;

/**
  Set to true if the platform supports native getters and setters.

  @property hasPropertyAccessors
  @final
*/
platform.hasPropertyAccessors = hasPropertyAccessors;

export {
  create,
  defineProperty,
  hasPropertyAccessors,
  canDefineNonEnumerableProperties,
  platform
};

