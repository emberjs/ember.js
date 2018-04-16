const objectToString = Object.prototype.toString;

function isNone(obj: any | null | undefined): obj is null | undefined {
  return obj === null || obj === undefined;
}

/*
 A `toString` util function that supports objects without a `toString`
 method, e.g. an object created with `Object.create(null)`.
*/
export default function toString(obj: any | undefined | null): string {
  if (typeof obj === 'string') {
    return obj;
  }
  if (null === obj) return 'null';
  if (undefined === obj) return 'undefined';

  if (Array.isArray(obj)) {
    // Reimplement Array.prototype.join according to spec (22.1.3.13)
    // Changing ToString(element) with this safe version of ToString.
    let r = '';

    for (let k = 0; k < obj.length; k++) {
      if (k > 0) {
        r += ',';
      }

      if (!isNone(obj[k])) {
        r += toString(obj[k]);
      }
    }

    return r;
  }
  if (typeof obj.toString === 'function') {
    return obj.toString();
  }
  return objectToString.call(obj);
}
