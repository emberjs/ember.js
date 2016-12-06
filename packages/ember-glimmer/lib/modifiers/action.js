import { uuid } from 'ember-utils';
import { assert, run, flaggedInstrument } from 'ember-metal';
import {
  isSimpleClick,
  ActionManager
} from 'ember-views';
import { INVOKE } from '../helpers/action';

const MODIFIERS = ['alt', 'shift', 'meta', 'ctrl'];
const POINTER_EVENT_TYPE_REGEX = /^click|mouse|touch/;

function isAllowedEvent(event, allowedKeys) {
  if (allowedKeys === null || typeof allowedKeys === 'undefined') {
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

  registerAction(actionState) {
    let { actionId } = actionState;
    let actions = ActionManager.registeredActions[actionId];

    if (!actions) {
      actions = ActionManager.registeredActions[actionId] = [];
    }

    actions.push(actionState);

    return actionId;
  },

  unregisterAction(actionState) {
    let { actionId } = actionState;
    let actions = ActionManager.registeredActions[actionId];

    if (!actions) {
      return;
    }

    let index = actions.indexOf(actionState);

    if (index !== -1) {
      actions.splice(index, 1);
    }

    if (actions.length === 0) {
      delete ActionManager.registeredActions[actionId];
    }
  }
};

export class ActionState {
  constructor(element, actionId, actionName, actionArgs, namedArgs, positionalArgs, dom) {
    this.element = element;
    this.actionId = actionId;
    this.actionName = actionName;
    this.actionArgs = actionArgs;
    this.namedArgs = namedArgs;
    this.positional = positionalArgs;
    this.dom = dom;
    this.eventName = this.getEventName();
  }

  getEventName() {
    return this.namedArgs.get('on').value() || 'click';
  }

  getActionArgs() {
    let result = new Array(this.actionArgs.length);

    for (let i = 0; i < this.actionArgs.length; i++) {
      result[i] = this.actionArgs[i].value();
    }

    return result;
  }

  handler(event) {
    let { actionName, namedArgs } = this;
    let bubbles = namedArgs.get('bubbles');
    let preventDefault = namedArgs.get('preventDefault');
    let allowedKeys = namedArgs.get('allowedKeys');
    let target = namedArgs.get('target').value();

    if (!isAllowedEvent(event, allowedKeys.value())) {
      return true;
    }

    if (preventDefault.value() !== false) {
      event.preventDefault();
    }

    if (bubbles.value() === false) {
      event.stopPropagation();
    }

    run(() => {
      let args = this.getActionArgs();
      let payload = {
        args,
        target
      };
      if (typeof actionName[INVOKE] === 'function') {
        flaggedInstrument('interaction.ember-action', payload, () => {
          actionName[INVOKE].apply(actionName, args);
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
  }

  destroy() {
    ActionHelper.unregisterAction(this);
  }
}

// implements ModifierManager<Action>
export default class ActionModifierManager {
  create(element, args, dynamicScope, dom) {
    let { named, positional } = args;
    let actionName;
    let actionNameRef;
    if (positional.length > 0) {
      actionNameRef = positional.at(0);

      if (actionNameRef[INVOKE]) {
        actionName = actionNameRef;
      } else {
        let actionLabel = actionNameRef._propertyKey;
        actionName = actionNameRef.value();

        assert(
          'You specified a quoteless path, `' + actionLabel + '`, to the ' +
            '{{action}} helper which did not resolve to an action name (a ' +
            'string). Perhaps you meant to use a quoted actionName? (e.g. ' +
            '{{action "' + actionLabel + '"}}).',
          typeof actionName === 'string' || typeof actionName === 'function'
        );
      }
    }

    let actionArgs = [];
    // The first argument is the action name.
    // Everything else is a param.
    for (let i = 1; i < positional.length; i++) {
      actionArgs.push(positional.at(i));
    }

    let actionId = uuid();
    return new ActionState(
      element,
      actionId,
      actionName,
      actionArgs,
      named,
      positional,
      dom
    );
  }

  install(actionState) {
    let { dom, element, actionId } = actionState;

    ActionHelper.registerAction(actionState);

    dom.setAttribute(element, 'data-ember-action', '');
    dom.setAttribute(element, `data-ember-action-${actionId}`, actionId);
  }

  update(actionState) {
    let { positional } = actionState;

    let actionNameRef = positional.at(0);

    if (!actionNameRef[INVOKE]) {
      actionState.actionName = actionNameRef.value();
    }
    actionState.eventName = actionState.getEventName();

    // Not sure if this is needed? If we mutate the actionState is that good enough?
    ActionHelper.unregisterAction(actionState);
    ActionHelper.registerAction(actionState);
  }

  getDestructor(modifier) {
    return modifier;
  }
}
