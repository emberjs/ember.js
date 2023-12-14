declare module '@ember/-internals/views/lib/mixins/view_state_support' {
  /**
    @module ember
    */
  import Mixin from '@ember/object/mixin';
  import type states from '@ember/-internals/views/lib/views/states';
  interface ViewStateSupport {
    /** @internal */
    _transitionTo(state: keyof typeof states): void;
  }
  const ViewStateSupport: Mixin;
  export default ViewStateSupport;
}
