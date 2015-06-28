var toString = Object.prototype.toString;

export default function inspect(obj) {
  if (obj === null) {
    return 'null';
  }
  if (obj === undefined) {
    return 'undefined';
  }
  if (Array.isArray(obj)) {
    return '[' + obj + ']';
  }
  // for non objects
  var type = typeof obj;
  if (type !== 'object' && type !== 'symbol') {
    return ''+obj;
  }
  // overridden toString
  if (typeof obj.toString === 'function' && obj.toString !== toString) {
    return obj.toString();
  }

  // Object.prototype.toString === {}.toString
  var v;
  var ret = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      v = obj[key];
      if (v === 'toString') { continue; } // ignore useless items
      if (typeof v === 'function') { v = 'function() { ... }'; }

      if (v && typeof v.toString !== 'function') {
        ret.push(key + ': ' + toString.call(v));
      } else {
        ret.push(key + ': ' + v);
      }
    }
  }
  return '{' + ret.join(', ') + '}';
}

