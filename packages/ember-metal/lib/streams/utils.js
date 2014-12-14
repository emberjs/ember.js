export function isStream(object) {
  return object && object.isStream;
}

export function subscribe(object, callback, context) {
  if (object && object.isStream) {
    object.subscribe(callback, context);
  }
}

export function unsubscribe(object, callback, context) {
  if (object && object.isStream) {
    object.unsubscribe(callback, context);
  }
}

export function read(object) {
  if (object && object.isStream) {
    return object.value();
  } else {
    return object;
  }
}

export function readArray(array) {
  var length = array.length;
  var ret = new Array(length);
  for (var i = 0; i < length; i++) {
    ret[i] = read(array[i]);
  }
  return ret;
}

export function readHash(object) {
  var ret = {};
  for (var key in object) {
    ret[key] = read(object[key]);
  }
  return ret;
}

/**
 * @function scanArray
 * @param array Array array given to a handlebars helper
 * @return Boolean whether the array contains a stream/bound value
*/
export function scanArray(array) {
  var length = array.length;
  var containsStream = false;

  for (var i = 0; i < length; i++){
    if (isStream(array[i])) {
      containsStream = true;
      break;
    }
  }

  return containsStream;
}

/**
 * @function scanHash
 * @param Object hash "hash" argument given to a handlebars helper
 * @return Boolean whether the object contains a stream/bound value
*/
export function scanHash(hash) {
  var containsStream = false;

  for (var prop in hash) {
    if (isStream(hash[prop])) {
      containsStream = true;
      break;
    }
  }

  return containsStream;
}
