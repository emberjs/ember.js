export function merge(options, defaults) {
  for (var prop in defaults) {
    if (options.hasOwnProperty(prop)) { continue; }
    options[prop] = defaults[prop];
  }
  return options;
}

// IE8 does not have Object.create, so use a polyfill if needed.
// Polyfill based on Mozilla's (MDN)
export function createObject(obj) {
  if (typeof Object.create === 'function') {
    return Object.create(obj);
  } else {
    var Temp = function() {};
    Temp.prototype = obj;
    return new Temp();
  }
}

export function objectKeys(obj) {
  if (typeof Object.keys === 'function') {
    return Object.keys(obj);
  } else {
    return legacyKeys(obj);
  }
}

export function shallowCopy(obj) {
  return merge({}, obj);
}

function legacyKeys(obj) {
  var keys = [];

  for (var prop in obj)  {
    if (obj.hasOwnProperty(prop)) {
      keys.push(prop);
    }
  }

  return keys;
}

export function keySet(obj) {
  var set = {};

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      set[prop] = true;
    }
  }

  return set;
}

export function keyLength(obj) {
  var count = 0;

  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      count++;
    }
  }

  return count;
}
