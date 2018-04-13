export function copyNull(obj) {
  let output = Object.create(null);

  for (let prop in obj) {
    // hasOwnPropery is not needed because obj is Object.create(null);
    output[prop] = obj[prop];
  }

  return output;
}

export function copyMap(original, newObject) {
  let keys = original._keys.copy();
  let values = copyNull(original._values);

  newObject._keys = keys;
  newObject._values = values;
  newObject.size = original.size;

  return newObject;
}
