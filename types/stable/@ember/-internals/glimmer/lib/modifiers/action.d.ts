declare module '@ember/-internals/glimmer/lib/modifiers/action' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { CapturedNamedArguments, CapturedPositionalArguments } from '@glimmer/interfaces';
  import type { UpdatableTag } from '@glimmer/validator';
  import type { SimpleElement } from '@simple-dom/interface';
  export let ActionHelper: {
    registeredActions: Record<string, ActionState>;
    registerAction(actionState: ActionState): number;
    unregisterAction(actionState: ActionState): void;
  };
  export class ActionState {
    element: SimpleElement;
    owner: InternalOwner;
    actionId: number;
    actionName: any;
    actionArgs: any;
    namedArgs: CapturedNamedArguments;
    positional: CapturedPositionalArguments;
    implicitTarget: any;
    eventName: any;
    tag: UpdatableTag;
    constructor(
      element: SimpleElement,
      owner: InternalOwner,
      actionId: number,
      actionArgs: any[],
      namedArgs: CapturedNamedArguments,
      positionalArgs: CapturedPositionalArguments
    );
    getEventName(): unknown;
    getActionArgs(): any[];
    getTarget(): any;
    handler(event: Event): boolean;
  }
  const _default: {};
  export default _default;
}
