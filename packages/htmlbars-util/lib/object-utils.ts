/*globals console*/

import assert from "./assert";

export function merge(options, defaults) {
  for (var prop in defaults) {
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

function ALWAYS_PASSES() { return true; }

function type(debugName, _typeDef) {
  let typeDef = merge(_typeDef, {
    debugName: debugName,
    default: undefined,
    check: ALWAYS_PASSES,
    required: false
  });

  let check = typeDef.check;
  if (typeof check === 'string') {
    typeDef.check = function(val) { return typeof val === check; };
  }

  let typeFunc = function(overriddenDefault) {
    return merge({ default: overriddenDefault }, typeDef);
  };

  merge(typeFunc, typeDef);
  return typeFunc;
}

const DEFAULT_FUNCTION = function() {};

export const REQUIRED = type('REQUIRED', {}, (val, presence) => !!presence);
export const ANY = type('ANY', { default: undefined });
export const STRING = type('STRING', { default: '', check: 'string' });
export const BOOLEAN = type('BOOLEAN', { default: false, check: 'boolean' });
export const OBJECT = type('OBJECT', { default: null, check: 'object' });
export const NUMBER = type('NUMBER', { default: 0, check: 'number' });
export const FUNCTION = type('FUNCTION', { default: DEFAULT_FUNCTION, check: 'function' });
export const ARRAY = type('ARRAY', { default: null, check: val => Array.isArray(val) });

let alreadyWarned = false;
export function debugStruct(shape) {
  if (typeof console !== 'undefined' && !alreadyWarned) {
    alreadyWarned = true;
    console.log("Do not leave debugStruct around when not developing HTMLBars");
  }

  let keys = Object.keys(shape);

  return function(options) {
    Object.keys(options).forEach(field => {
      assert(field in shape, `${field} passed for struct, but it was not in the keys: ${keys.join(', ')}`);
    });

    keys.forEach(field => {
      let type = shape[field];

      if (options[field] !== undefined) {
        assert(type.check(options[field]), `${field} failed the ${type.debugName} type check; val=${options[field]}`);
        this[field] = options[field];
      } else {
        assert(!type.required, `${field} was required, but not provided`);
        this[field] = shape[field].default;
      }
    });
    Object.seal(this);
  };
}

export function prodStruct(shape) {
  let keys = Object.keys(shape);
  let len = keys.length;

  return function(options) {
    for (let i = 0; i < len; i++) {
      let key = keys[i];
      let val = options[key];
      this[key] = val === undefined ? shape[key].default : val;
    }
  };
}

export { debugStruct as struct };
