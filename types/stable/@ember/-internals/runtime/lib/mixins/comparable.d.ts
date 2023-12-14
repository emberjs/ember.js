declare module '@ember/-internals/runtime/lib/mixins/comparable' {
  import Mixin from '@ember/object/mixin';
  /**
    @module ember
    */
  /**
      Implements some standard methods for comparing objects. Add this mixin to
      any class you create that can compare its instances.

      You should implement the `compare()` method.

      @class Comparable
      @namespace Ember
      @since Ember 0.9
      @private
    */
  interface Comparable {
    compare: ((a: unknown, b: unknown) => -1 | 0 | 1) | null;
  }
  const Comparable: Mixin;
  export default Comparable;
}
