declare module '@ember/-internals/metal/lib/properties' {
  /**
    @module @ember/object
    */
  import type { Meta } from '@ember/-internals/meta';
  import type { ExtendedMethodDecorator } from '@ember/-internals/metal/lib/decorator';
  /**
      NOTE: This is a low-level method used by other parts of the API. You almost
      never want to call this method directly. Instead you should use
      `mixin()` to define new properties.

      Defines a property on an object. This method works much like the ES5
      `Object.defineProperty()` method except that it can also accept computed
      properties and other special descriptors.

      Normally this method takes only three parameters. However if you pass an
      instance of `Descriptor` as the third param then you can pass an
      optional value as the fourth parameter. This is often more efficient than
      creating new descriptor hashes for each property.

      ## Examples

      ```javascript
      import { defineProperty, computed } from '@ember/object';

      // ES5 compatible mode
      defineProperty(contact, 'firstName', {
        writable: true,
        configurable: false,
        enumerable: true,
        value: 'Charles'
      });

      // define a simple property
      defineProperty(contact, 'lastName', undefined, 'Jolley');

      // define a computed property
      defineProperty(contact, 'fullName', computed('firstName', 'lastName', function() {
        return this.firstName+' '+this.lastName;
      }));
      ```

      @public
      @method defineProperty
      @static
      @for @ember/object
      @param {Object} obj the object to define this property on. This may be a prototype.
      @param {String} keyName the name of the property
      @param {Descriptor} [desc] an instance of `Descriptor` (typically a
        computed property) or an ES5 descriptor.
        You must provide this or `data` but not both.
      @param {*} [data] something other than a descriptor, that will
        become the explicit value of this property.
    */
  export function defineProperty(
    obj: object,
    keyName: string,
    desc?: ExtendedMethodDecorator | PropertyDescriptor | undefined | null,
    data?: any | undefined | null,
    _meta?: Meta
  ): void;
  export function defineDecorator(
    obj: object,
    keyName: string,
    desc: ExtendedMethodDecorator,
    meta: Meta
  ): ExtendedMethodDecorator;
  export function defineValue(
    obj: object,
    keyName: string,
    value: unknown,
    wasDescriptor: boolean,
    enumerable?: boolean
  ): unknown;
}
