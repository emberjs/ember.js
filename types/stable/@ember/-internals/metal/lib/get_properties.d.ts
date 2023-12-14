declare module '@ember/-internals/metal/lib/get_properties' {
  /**
     @module @ember/object
    */
  /**
      To get multiple properties at once, call `getProperties`
      with an object followed by a list of strings or an array:

      ```javascript
      import { getProperties } from '@ember/object';

      getProperties(record, 'firstName', 'lastName', 'zipCode');
      // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
      ```

      is equivalent to:

      ```javascript
      import { getProperties } from '@ember/object';

      getProperties(record, ['firstName', 'lastName', 'zipCode']);
      // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
      ```

      @method getProperties
      @static
      @for @ember/object
      @param {Object} obj
      @param {String...|Array} list of keys to get
      @return {Object}
      @public
    */
  function getProperties<T, K extends keyof T>(obj: T, list: K[]): Pick<T, K>;
  function getProperties<T, K extends keyof T>(obj: T, ...list: K[]): Pick<T, K>;
  function getProperties<K extends string>(obj: unknown, list: K[]): Record<K, unknown>;
  function getProperties<K extends string>(obj: unknown, ...list: K[]): Record<K, unknown>;
  export default getProperties;
}
