declare module '@ember/-internals/metal/lib/deprecate_property' {
  /**
    @module ember
    */
  import type { DeprecationOptions } from '@ember/debug';
  /**
      Used internally to allow changing properties in a backwards compatible way, and print a helpful
      deprecation warning.

      @method deprecateProperty
      @param {Object} object The object to add the deprecated property to.
      @param {String} deprecatedKey The property to add (and print deprecation warnings upon accessing).
      @param {String} newKey The property that will be aliased.
      @private
      @since 1.7.0
    */
  export function deprecateProperty(
    object: object,
    deprecatedKey: string,
    newKey: string,
    options?: DeprecationOptions
  ): void;
}
