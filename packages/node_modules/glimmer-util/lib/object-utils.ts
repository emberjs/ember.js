/*globals console*/

export function merge(options, defaults) {
  for (let prop in defaults) {
    if (options.hasOwnProperty(prop)) { continue; }
    options[prop] = defaults[prop];
  }
  return options;
}

export function assign<T, U>(obj: T, assignments: U): T & U;
export function assign<T, U, V>(obj: T, a: U, b: V): T & U & V;
export function assign<T, U, V, W>(obj: T, a: U, b: V, c: W): T & U & V & W;

export function assign(obj, ...assignments) {
  return assignments.reduce((obj, extensions) => {
    Object.keys(extensions).forEach(key => obj[key] = extensions[key]);
    return obj;
  }, obj);
}

export function shallowCopy(obj) {
  return merge({}, obj);
}

export function keySet(obj) {
  let set = {};

  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      set[prop] = true;
    }
  }

  return set;
}

export function keyLength(obj) {
  let count = 0;

  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      count++;
    }
  }

  return count;
}