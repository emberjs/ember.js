import type { InternalOwner } from '@ember/-internals/owner';
import { ActionManager, isSimpleClick } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { flaggedInstrument } from '@ember/instrumentation';
import { join } from '@ember/runloop';
import { registerDestructor } from '@glimmer/destroyable';
import type { CapturedNamedArguments, CapturedPositionalArguments } from '@glimmer/interfaces';
import { isInvokableRef, updateRef, valueForRef } from '@glimmer/reference';
import { createUpdatableTag } from '@glimmer/validator';
import type { SimpleElement } from '@simple-dom/interface';

const MODIFIERS = ['alt', 'shift', 'meta', 'ctrl'];
const POINTER_EVENT_TYPE_REGEX = /^click|mouse|touch/;

function isAllowedEvent(event: Event, allowedKeys: any) {
  if (allowedKeys === null || allowedKeys === undefined) {
    if (POINTER_EVENT_TYPE_REGEX.test(event.type)) {
      return isSimpleClick(event);
    } else {
      allowedKeys = '';
    }
  }

  if (allowedKeys.indexOf('any') >= 0) {
    return true;
  }

  for (let i = 0; i < MODIFIERS.length; i++) {
    if ((event as any)[MODIFIERS[i] + 'Key'] && allowedKeys.indexOf(MODIFIERS[i]) === -1) {
      return false;
    }
  }

  return true;
}

export let ActionHelper = {
  // registeredActions is re-exported for compatibility with older plugins
  // that were using this undocumented API.
  registeredActions: ActionManager.registeredActions,

  registerAction(actionState: ActionState) {
    let { actionId } = actionState;

    ActionManager.registeredActions[actionId] = actionState;

    return actionId;
  },

  unregisterAction(actionState: ActionState) {
    let { actionId } = actionState;

    delete ActionManager.registeredActions[actionId];
  },
};

export class ActionState {
  public element: SimpleElement;
  public owner: InternalOwner;
  public actionId: number;
  public actionName: any;
  public actionArgs: any;
  public namedArgs: CapturedNamedArguments;
  public positional: CapturedPositionalArguments;
  public implicitTarget: any;
  public eventName: any;
  public tag = createUpdatableTag();

  constructor(
    element: SimpleElement,
    owner: InternalOwner,
    actionId: number,
    actionArgs: any[],
    namedArgs: CapturedNamedArguments,
    positionalArgs: CapturedPositionalArguments
  ) {
    this.element = element;
    this.owner = owner;
    this.actionId = actionId;
    this.actionArgs = actionArgs;
    this.namedArgs = namedArgs;
    this.positional = positionalArgs;
    this.eventName = this.getEventName();

    registerDestructor(this, () => ActionHelper.unregisterAction(this));
  }

  getEventName() {
    let { on } = this.namedArgs;

    return on !== undefined ? valueForRef(on) : 'click';
  }

  getActionArgs() {
    let result = new Array(this.actionArgs.length);

    for (let i = 0; i < this.actionArgs.length; i++) {
      result[i] = valueForRef(this.actionArgs[i]);
    }

    return result;
  }

  getTarget(): any {
    let { implicitTarget, namedArgs } = this;
    let { target } = namedArgs;

    return target !== undefined ? valueForRef(target) : valueForRef(implicitTarget);
  }

  handler(event: Event): boolean {
    let { actionName, namedArgs } = this;
    let { bubbles, preventDefault, allowedKeys } = namedArgs;

    let bubblesVal = bubbles !== undefined ? valueForRef(bubbles) : undefined;
    let preventDefaultVal = preventDefault !== undefined ? valueForRef(preventDefault) : undefined;
    let allowedKeysVal = allowedKeys !== undefined ? valueForRef(allowedKeys) : undefined;

    let target = this.getTarget();

    let shouldBubble = bubblesVal !== false;

    if (!isAllowedEvent(event, allowedKeysVal)) {
      return true;
    }

    if (preventDefaultVal !== false) {
      event.preventDefault();
    }

    if (!shouldBubble) {
      event.stopPropagation();
    }

    join(() => {
      let args = this.getActionArgs();
      let payload = {
        args,
        target,
        name: null,
      };
      if (isInvokableRef(actionName)) {
        flaggedInstrument('interaction.ember-action', payload, () => {
          updateRef(actionName, args[0]);
        });
        return;
      }
      if (typeof actionName === 'function') {
        flaggedInstrument('interaction.ember-action', payload, () => {
          actionName.apply(target, args);
        });
        return;
      }
      payload.name = actionName;
      if (target.send) {
        flaggedInstrument('interaction.ember-action', payload, () => {
          target.send.apply(target, [actionName, ...args]);
        });
      } else {
        assert(
          `The action '${actionName}' did not exist on ${target}`,
          typeof target[actionName] === 'function'
        );
        flaggedInstrument('interaction.ember-action', payload, () => {
          target[actionName].apply(target, args);
        });
      }
    });

    return shouldBubble;
  }
}
