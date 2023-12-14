declare module '@ember/-internals/views/lib/mixins/class_names_support' {
  import Mixin from '@ember/object/mixin';
  /**
      @class ClassNamesSupport
      @namespace Ember
      @private
    */
  interface ClassNamesSupport {
    classNames: string[];
    classNameBindings: string[];
  }
  const ClassNamesSupport: Mixin;
  export default ClassNamesSupport;
}
