declare module '@ember/-internals/runtime/lib/mixins/target_action_support' {
  /**
    @module ember
    */
  import Mixin from '@ember/object/mixin';
  /**
    `Ember.TargetActionSupport` is a mixin that can be included in a class
    to add a `triggerAction` method with semantics similar to the Handlebars
    `{{action}}` helper. In normal Ember usage, the `{{action}}` helper is
    usually the best choice. This mixin is most often useful when you are
    doing more complex event handling in Components.

    @class TargetActionSupport
    @namespace Ember
    @extends Mixin
    @private
    */
  interface TargetActionSupport {
    target: unknown;
    action: string | null;
    actionContext: unknown;
    actionContextObject: unknown;
    triggerAction(opts?: object): unknown;
    /** @internal */
    _target?: unknown;
  }
  const TargetActionSupport: Mixin;
  export default TargetActionSupport;
}
