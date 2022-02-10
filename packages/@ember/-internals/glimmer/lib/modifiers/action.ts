import { Owner } from '@ember/-internals/owner';
import { uuid } from '@ember/-internals/utils';
import { ActionManager, EventDispatcher, isSimpleClick } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { flaggedInstrument } from '@ember/instrumentation';
import { join } from '@ember/runloop';
import { registerDestructor } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import {
  CapturedArguments,
  CapturedNamedArguments,
  CapturedPositionalArguments,
  InternalModifierManager,
} from '@glimmer/interfaces';
import { setInternalModifierManager } from '@glimmer/manager';
import { isInvokableRef, updateRef, valueForRef } from '@glimmer/reference';
import { createUpdatableTag, UpdatableTag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';

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
    if (event[MODIFIERS[i] + 'Key'] && allowedKeys.indexOf(MODIFIERS[i]) === -1) {
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
  public owner: Owner;
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
    owner: Owner,
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

class ActionModifierManager implements InternalModifierManager<ActionState, object> {
  create(
    owner: Owner,
    element: SimpleElement,
    _state: object,
    { named, positional }: CapturedArguments
  ): ActionState {
    let actionArgs: any[] = [];
    // The first two arguments are (1) `this` and (2) the action name.
    // Everything else is a param.
    for (let i = 2; i < positional.length; i++) {
      actionArgs.push(positional[i]);
    }

    let actionId = uuid();

    return new ActionState(element, owner, actionId, actionArgs, named, positional);
  }

  getDebugName(): string {
    return 'action';
  }

  install(actionState: ActionState): void {
    let { element, actionId, positional } = actionState;

    let actionName;
    let actionNameRef: any;
    let implicitTarget;

    if (positional.length > 1) {
      implicitTarget = positional[0];
      actionNameRef = positional[1];

      if (isInvokableRef(actionNameRef)) {
        actionName = actionNameRef;
      } else {
        actionName = valueForRef(actionNameRef);

        if (DEBUG) {
          let actionPath = actionNameRef.debugLabel;
          let actionPathParts = actionPath.split('.');
          let actionLabel = actionPathParts[actionPathParts.length - 1];

          assert(
            'You specified a quoteless path, `' +
              actionPath +
              '`, to the ' +
              '{{action}} helper which did not resolve to an action name (a ' +
              'string). Perhaps you meant to use a quoted actionName? (e.g. ' +
              '{{action "' +
              actionLabel +
              '"}}).',
            typeof actionName === 'string' || typeof actionName === 'function'
          );
        }
      }
    }

    actionState.actionName = actionName;
    actionState.implicitTarget = implicitTarget;

    this.ensureEventSetup(actionState);
    ActionHelper.registerAction(actionState);

    element.setAttribute('data-ember-action', '');
    element.setAttribute(`data-ember-action-${actionId}`, String(actionId));
  }

  update(actionState: ActionState): void {
    let { positional } = actionState;
    let actionNameRef = positional[1];
    assert('Expected at least one positional arg', actionNameRef);

    if (!isInvokableRef(actionNameRef)) {
      actionState.actionName = valueForRef(actionNameRef);
    }

    let newEventName = actionState.getEventName();
    if (newEventName !== actionState.eventName) {
      this.ensureEventSetup(actionState);
      actionState.eventName = actionState.getEventName();
    }
  }

  ensureEventSetup(actionState: ActionState): void {
    let dispatcher = actionState.owner.lookup('event_dispatcher:main');
    assert('Expected dispatcher to be an EventDispatcher', dispatcher instanceof EventDispatcher);
    dispatcher?.setupHandlerForEmberEvent(actionState.eventName);
  }

  getTag(actionState: ActionState): UpdatableTag {
    return actionState.tag;
  }

  getDestroyable(actionState: ActionState): object {
    return actionState;
  }
}

const ACTION_MODIFIER_MANAGER = new ActionModifierManager();

export default setInternalModifierManager(ACTION_MODIFIER_MANAGER, {});
