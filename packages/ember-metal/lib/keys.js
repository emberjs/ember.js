/**
  Returns all of the keys defined on an object or hash. This is useful
  when inspecting objects for debugging. On browsers that support it, this
  uses the native `Object.keys` implementation.

  @method keys
  @for Ember
  @param {Object} obj
  @return {Array} Array containing keys of obj
  @private
*/
var keys = Object.keys;

if (!keys) {
  // modified from
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
  keys = (function() {
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString');
    var dontEnums = [
      'toString',
      'toLocaleString',
      'valueOf',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'constructor'
    ];
    var dontEnumsLength = dontEnums.length;

    return function keys(obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [];
      var prop, i;

      for (prop in obj) {
        if (prop !== '_super' &&
          prop.lastIndexOf('__', 0) !== 0 &&
          hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

export default keys;
