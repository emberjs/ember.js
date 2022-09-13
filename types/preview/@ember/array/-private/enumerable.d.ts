declare module '@ember/array/-private/enumerable' {
  import Mixin from '@ember/object/mixin';

  /**
   * The methods in this mixin have been moved to `MutableArray`. This mixin has
   * been intentionally preserved to avoid breaking `Enumerable.detect` checks
   * until the community migrates away from them.
   */
  interface Enumerable {}

  const Enumerable: Mixin;
  export default Enumerable;
}
