import type { ActionState } from '@ember/-internals/glimmer/lib/modifiers/action';

/**
@module ember
*/

export default function ActionManager() {}

/**
  Global action id hash.

  @private
  @property registeredActions
  @type Object
*/
ActionManager.registeredActions = {} as Record<string, ActionState>;
