import { canDefineNonEnumerableProperties } from 'ember-metal/platform';

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

if (!keys || !canDefineNonEnumerableProperties) {
  var byPrototypePropertyName = Object.create(null);

  var prototypeProperties = [
    '_super',
    'constructor',
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'valueOf',
    'toLocaleString',
    'toString'
  ];

  for(var i =0; i< prototypeProperties.length; i++) {
    byPrototypePropertyName[prototypeProperties[i]] = true;
  }

  var pushPropertyName = function(obj, array, key) {
    if (byPrototypePropertyName[key] === true) {
      return;
    }

    // Prevents browsers that don't respect non-enumerability from
    // copying internal Ember properties
    if (key.substring(0, 2) === '__') {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return;
    }

    array.push(key);
  };

  keys = function keys(obj) {
    var ret = [];
    var key;

    for (key in obj) {
      pushPropertyName(obj, ret, key);
    }

    // IE8 doesn't enumerate property that named the same as prototype properties.
    for (var i = 0, l = prototypeProperties.length; i < l; i++) {
      key = prototypeProperties[i];
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        ret.push(key);
      }
    }

    return ret;
  };
}

export default keys;
