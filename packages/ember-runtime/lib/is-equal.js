/**
  Compares two objects, returning true if they are logically equal. This is
  a deeper comparison than a simple triple equal. For sets it will compare the
  internal objects. For any other object that implements `isEqual()` it will
  respect that method.

  ```javascript
  Ember.isEqual('hello', 'hello');                   // true
  Ember.isEqual(1, 2);                               // false
  Ember.isEqual([4, 2], [4, 2]);                     // false
  Ember.isEqual({ isEqual() { return true;} }, null) // true
  ```

  @method isEqual
  @for Ember
  @param {Object} a first object to compare
  @param {Object} b second object to compare
  @return {Boolean}
  @public
*/
export default function isEqual(a, b) {
  if (a && typeof a.isEqual === 'function') {
    return a.isEqual(b);
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  return a === b;
}
