import EnumerableUtils from "ember-metal/enumerable_utils";
import {create} from "ember-metal/platform";

/**
  Returns all of the keys defined on an object or hash. This is useful
  when inspecting objects for debugging. On browsers that support it, this
  uses the native `Object.keys` implementation.

  @method keys
  @for Ember
  @param {Object} obj
  @return {Array} Array containing keys of obj
*/
var keys = Object.keys;
if (!keys || create.isSimulated) {
  var prototypeProperties = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'valueOf',
    'toLocaleString',
    'toString'
  ],
  pushPropertyName = function(obj, array, key) {
    // Prevents browsers that don't respect non-enumerability from
    // copying internal Ember properties
    if (key.substring(0,2) === '__') return;
    if (key === '_super') return;
    if (EnumerableUtils.indexOf(array, key) >= 0) return;
    if (typeof obj.hasOwnProperty === 'function' && !obj.hasOwnProperty(key)) return;

    array.push(key);
  };

  keys = function keys(obj) {
    var ret = [], key;
    for (key in obj) {
      pushPropertyName(obj, ret, key);
    }

    // IE8 doesn't enumerate property that named the same as prototype properties.
    for (var i = 0, l = prototypeProperties.length; i < l; i++) {
      key = prototypeProperties[i];

      pushPropertyName(obj, ret, key);
    }

    return ret;
  };
}

export default keys;
