const objectToString = Object.prototype.toString;

/*
 A `toString` util function that supports objects without a `toString`
 method, e.g. an object created with `Object.create(null)`.
*/
export default function toString(obj) {
  if (obj && obj.toString) {
    return obj.toString();
  } else {
    return objectToString.call(obj);
  }
}
