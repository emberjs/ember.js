import { assert } from '@ember/debug';
const {
  toString: objectToString
} = Object.prototype;
const {
  toString: functionToString
} = Function.prototype;
const {
  isArray
} = Array;
const {
  keys: objectKeys
} = Object;
const {
  stringify
} = JSON;
const LIST_LIMIT = 100;
const DEPTH_LIMIT = 4;
const SAFE_KEY = /^[\w$]+$/;
/**
 @module @ember/debug
*/
/**
  Convenience method to inspect an object. This method will attempt to
  convert the object into a useful string description.

  It is a pretty simple implementation. If you want something more robust,
  use something like JSDump: https://github.com/NV/jsDump

  @method inspect
  @static
  @param {Object} obj The object you want to inspect.
  @return {String} A description of the object
  @since 1.4.0
  @private
*/
export default function inspect(obj) {
  // detect Node util.inspect call inspect(depth: number, opts: object)
  if (typeof obj === 'number' && arguments.length === 2) {
    return this;
  }
  return inspectValue(obj, 0);
}
function inspectValue(value, depth, seen) {
  let valueIsArray = false;
  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    case 'object':
      if (value === null) return 'null';
      if (isArray(value)) {
        valueIsArray = true;
        break;
      }
      // is toString Object.prototype.toString or undefined then traverse
      if (value.toString === objectToString || value.toString === undefined) {
        break;
      }
      // custom toString
      return value.toString();
    case 'function':
      return value.toString === functionToString ? value.name ? `[Function:${value.name}]` : `[Function]` : value.toString();
    case 'string':
      return stringify(value);
    case 'symbol':
    case 'boolean':
    case 'number':
    default:
      return value.toString();
  }
  if (seen === undefined) {
    seen = new WeakSet();
  } else {
    if (seen.has(value)) return `[Circular]`;
  }
  seen.add(value);
  return valueIsArray ? inspectArray(value, depth + 1, seen) : inspectObject(value, depth + 1, seen);
}
function inspectKey(key) {
  return SAFE_KEY.test(key) ? key : stringify(key);
}
function inspectObject(obj, depth, seen) {
  if (depth > DEPTH_LIMIT) {
    return '[Object]';
  }
  let s = '{';
  let keys = objectKeys(obj);
  for (let i = 0; i < keys.length; i++) {
    s += i === 0 ? ' ' : ', ';
    if (i >= LIST_LIMIT) {
      s += `... ${keys.length - LIST_LIMIT} more keys`;
      break;
    }
    let key = keys[i];
    assert('has key', key); // Looping over array
    s += `${inspectKey(String(key))}: ${inspectValue(obj[key], depth, seen)}`;
  }
  s += ' }';
  return s;
}
function inspectArray(arr, depth, seen) {
  if (depth > DEPTH_LIMIT) {
    return '[Array]';
  }
  let s = '[';
  for (let i = 0; i < arr.length; i++) {
    s += i === 0 ? ' ' : ', ';
    if (i >= LIST_LIMIT) {
      s += `... ${arr.length - LIST_LIMIT} more items`;
      break;
    }
    s += inspectValue(arr[i], depth, seen);
  }
  s += ' ]';
  return s;
}