declare module '@ember/-internals/metal/lib/property_set' {
  /**
     @module @ember/object
    */
  /**
      Sets the value of a property on an object, respecting computed properties
      and notifying observers and other listeners of the change.
      If the specified property is not defined on the object and the object
      implements the `setUnknownProperty` method, then instead of setting the
      value of the property on the object, its `setUnknownProperty` handler
      will be invoked with the two parameters `keyName` and `value`.

      ```javascript
      import { set } from '@ember/object';
      set(obj, "name", value);
      ```

      @method set
      @static
      @for @ember/object
      @param {Object} obj The object to modify.
      @param {String} keyName The property key to set
      @param {Object} value The value to set
      @return {Object} the passed value.
      @public
    */
  export function set<T>(obj: object, keyName: string, value: T, tolerant?: boolean): T;
  export function _setProp(obj: object, keyName: string, value: any): any;
  /**
      Error-tolerant form of `set`. Will not blow up if any part of the
      chain is `undefined`, `null`, or destroyed.

      This is primarily used when syncing bindings, which may try to update after
      an object has been destroyed.

      ```javascript
      import { trySet } from '@ember/object';

      let obj = { name: "Zoey" };
      trySet(obj, "contacts.twitter", "@emberjs");
      ```

      @method trySet
      @static
      @for @ember/object
      @param {Object} root The object to modify.
      @param {String} path The property path to set
      @param {Object} value The value to set
      @public
    */
  export function trySet<T>(root: object, path: string, value: T): T | undefined;
}
