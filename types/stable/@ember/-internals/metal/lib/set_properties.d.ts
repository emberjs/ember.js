declare module '@ember/-internals/metal/lib/set_properties' {
  /**
     @module @ember/object
    */
  /**
      Set a list of properties on an object. These properties are set inside
      a single `beginPropertyChanges` and `endPropertyChanges` batch, so
      observers will be buffered.

      ```javascript
      import EmberObject from '@ember/object';
      let anObject = EmberObject.create();

      anObject.setProperties({
        firstName: 'Stanley',
        lastName: 'Stuart',
        age: 21
      });
      ```

      @method setProperties
      @static
      @for @ember/object
      @param obj
      @param {Object} properties
      @return properties
      @public
    */
  function setProperties<T, K extends keyof T>(obj: T, properties: Pick<T, K>): Pick<T, K>;
  function setProperties<T extends Record<string, unknown>>(obj: object, properties: T): T;
  export default setProperties;
}
