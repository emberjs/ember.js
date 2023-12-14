declare module '@ember/-internals/views/lib/mixins/action_support' {
  import Mixin from '@ember/object/mixin';
  /**
     @class ActionSupport
     @namespace Ember
     @private
    */
  interface ActionSupport {
    send(actionName: string, ...args: unknown[]): void;
  }
  const ActionSupport: Mixin;
  export default ActionSupport;
}
