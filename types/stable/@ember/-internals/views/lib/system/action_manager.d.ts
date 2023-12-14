declare module '@ember/-internals/views/lib/system/action_manager' {
  import type { ActionState } from '@ember/-internals/glimmer/lib/modifiers/action';
  /**
    @module ember
    */
  function ActionManager(): void;
  namespace ActionManager {
    var registeredActions: Record<string, ActionState>;
  }
  export default ActionManager;
}
