const objectToString = Object.prototype.toString;

function isNone(obj) {
  return obj == null;
}

/*
 A `toString` util function that supports objects without a `toString`
 method, e.g. an object created with `Object.create(null)`.
*/
export default function toString(obj) {
  let type = typeof obj;
  if (type === "string") { return obj; }

  if (Array.isArray(obj)) {
    // Reimplement Array.prototype.join according to spec (22.1.3.13)
    // Changing ToString(element) with this safe version of ToString.
    let len = obj.length;
    let sep = ',';
    let r = '';

    for (let k = 0; k < len; k++) {
      if (k > 0) {
        r += ',';
      }

      if (!isNone(obj[k])) {
        r += toString(obj[k]);
      }
    }

    return r;
  } else if (obj != null && typeof obj.toString === 'function') {
    return obj.toString();
  } else {
    return objectToString.call(obj);
  }
}
