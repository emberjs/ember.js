/**
  Checks to see if the `methodName` exists on the `obj`.

  ```javascript
  let foo = { bar: function() { return 'bar'; }, baz: null };

  Ember.canInvoke(foo, 'bar'); // true
  Ember.canInvoke(foo, 'baz'); // false
  Ember.canInvoke(foo, 'bat'); // false
  ```

  @method canInvoke
  @for Ember
  @param {Object} obj The object to check for the method
  @param {String} methodName The method name to check for
  @return {Boolean}
  @private
*/
export function canInvoke(obj: any | null | undefined, methodName: string): obj is Function {
  return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
}

/**
  @module @ember/utils
*/
