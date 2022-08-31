declare module '@ember/array/-private/mutable-enumerable' {
  import Mixin from '@ember/object/mixin';
  import Enumerable from '@ember/array/-private/enumerable';

  /**
   * This Mixin exists for historical purposes only, and so that someone walking
   * the types for Ember's arrays sees the same types as those which appear in
   * the runtime hierarchy.
   */
  interface MutableEnumerable extends Enumerable {}
  const MutableEnumerable: Mixin;
  export default MutableEnumerable;
}
