declare module '@ember/-internals/runtime/lib/mixins/action_handler' {
  /**
    @module ember
    */
  import Mixin from '@ember/object/mixin';
  /**
      `Ember.ActionHandler` is available on some familiar classes including
      `Route`, `Component`, and `Controller`.
      (Internally the mixin is used by `Ember.CoreView`, `Ember.ControllerMixin`,
      and `Route` and available to the above classes through
      inheritance.)

      @class ActionHandler
      @namespace Ember
      @private
    */
  interface ActionHandler {
    actions?: Record<string, (...args: any[]) => unknown>;
    send(actionName: string, ...args: unknown[]): void;
  }
  const ActionHandler: Mixin;
  export default ActionHandler;
}
