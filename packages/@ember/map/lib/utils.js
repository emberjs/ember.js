import { MAP, ORDERED_SET } from '@ember/deprecated-features';

let copyNull, copyMap;

if (MAP || ORDERED_SET) {
  copyNull = function copyNull(obj) {
    let output = Object.create(null);

    for (let prop in obj) {
      // hasOwnPropery is not needed because obj is Object.create(null);
      output[prop] = obj[prop];
    }

    return output;
  };

  copyMap = function copyMap(original, newObject) {
    let keys = original._keys.copy();
    let values = copyNull(original._values);

    newObject._keys = keys;
    newObject._values = values;
    newObject.size = original.size;

    return newObject;
  };
}

export { copyMap, copyNull };
