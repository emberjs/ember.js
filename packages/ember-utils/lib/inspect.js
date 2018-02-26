const objectToString = Object.prototype.toString;
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
  if (obj === null) {
    return 'null';
  }
  if (obj === undefined) {
    return 'undefined';
  }
  if (Array.isArray(obj)) {
    return `[${obj}]`;
  }
  // for non objects
  let type = typeof obj;
  if (type !== 'object' && type !== 'symbol') {
    return `${obj}`;
  }
  // overridden toString
  if (typeof obj.toString === 'function' && obj.toString !== objectToString) {
    return obj.toString();
  }

  // Object.prototype.toString === {}.toString
  let v;
  let ret = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      v = obj[key];
      if (v === 'toString') { continue; } // ignore useless items
      if (typeof v === 'function') { v = 'function() { ... }'; }

      if (v && typeof v.toString !== 'function') {
        ret.push(`${key}: ${objectToString.call(v)}`);
      } else {
        ret.push(`${key}: ${v}`);
      }
    }
  }
  return `{${ret.join(', ')}}`;
}
