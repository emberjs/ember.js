declare module '@ember/enumerable/mutable' {
  import Enumerable from '@ember/enumerable';
  import Mixin from '@ember/object/mixin';
  /**
    @module ember
    */
  /**
      The methods in this mixin have been moved to MutableArray. This mixin has
      been intentionally preserved to avoid breaking MutableEnumerable.detect
      checks until the community migrates away from them.

      @class MutableEnumerable
      @namespace Ember
      @uses Enumerable
      @private
    */
  interface MutableEnumerable extends Enumerable {}
  const MutableEnumerable: Mixin;
  export default MutableEnumerable;
}
