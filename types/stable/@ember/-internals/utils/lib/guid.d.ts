declare module '@ember/-internals/utils/lib/guid' {
  /**
     Generates a universally unique identifier. This method
     is used internally by Ember for assisting with
     the generation of GUID's and other unique identifiers.

     @public
     @return {Number} [description]
     */
  export function uuid(): number;
  /**
      A unique key used to assign guids and other private metadata to objects.
      If you inspect an object in your browser debugger you will often see these.
      They can be safely ignored.

      On browsers that support it, these properties are added with enumeration
      disabled so they won't show up when you iterate over your properties.

      @private
      @property GUID_KEY
      @for Ember
      @type String
      @final
    */
  export const GUID_KEY: `__ember${number}`;
  /**
      Generates a new guid, optionally saving the guid to the object that you
      pass in. You will rarely need to use this method. Instead you should
      call `guidFor(obj)`, which return an existing guid if available.

      @private
      @method generateGuid
      @static
      @for @ember/object/internals
      @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
        be saved on the object and reused whenever you pass the same object
        again.

        If no object is passed, just generate a new guid.
      @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
        separate the guid into separate namespaces.
      @return {String} the guid
    */
  export function generateGuid(obj: object, prefix?: string): String;
  /**
      Returns a unique id for the object. If the object does not yet have a guid,
      one will be assigned to it. You can call this on any object,
      `EmberObject`-based or not.

      You can also use this method on DOM Element objects.

      @public
      @static
      @method guidFor
      @for @ember/object/internals
      @param {Object} obj any object, string, number, Element, or primitive
      @return {String} the unique guid for this instance.
    */
  export function guidFor(value: any | null | undefined): string;
}
