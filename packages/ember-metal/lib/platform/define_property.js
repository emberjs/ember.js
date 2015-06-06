/*globals Node */

/**
@class platform
@namespace Ember
@static
@private
*/

/**
  Set to true if the platform supports native getters and setters.

  @property hasPropertyAccessors
  @final
  @private
*/

/**
  Identical to `Object.defineProperty()`. Implements as much functionality
  as possible if not available natively.

  @method defineProperty
  @param {Object} obj The object to modify
  @param {String} keyName property name to modify
  @param {Object} desc descriptor hash
  @return {void}
  @public
*/
var defineProperty = (function checkCompliance(defineProperty) {
  if (!defineProperty) {
    return;
  }

  try {
    var a = 5;
    var obj = {};
    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: true,
      get() {
        return a;
      },
      set(v) {
        a = v;
      }
    });
    if (obj.a !== 5) {
      return;
    }

    obj.a = 10;
    if (a !== 10) {
      return;
    }

    // check non-enumerability
    defineProperty(obj, 'a', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: true
    });
    for (var key in obj) {
      if (key === 'a') {
        return;
      }
    }

    // Detects a bug in Android <3.2 where you cannot redefine a property using
    // Object.defineProperty once accessors have already been set.
    if (obj.a !== true) {
      return;
    }

    // Detects a bug in Android <3 where redefining a property without a value changes the value
    // Object.defineProperty once accessors have already been set.
    defineProperty(obj, 'a', {
      enumerable: false
    });
    if (obj.a !== true) {
      return;
    }

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
  defineProperty = function definePropertyPolyfill(obj, keyName, desc) {
    if (!desc.get) { obj[keyName] = desc.value; }
  };
}

var hasPropertyAccessors = hasES5CompliantDefineProperty;
var canDefineNonEnumerableProperties = hasES5CompliantDefineProperty;

export {
  hasES5CompliantDefineProperty,
  defineProperty,
  hasPropertyAccessors,
  canDefineNonEnumerableProperties
};
