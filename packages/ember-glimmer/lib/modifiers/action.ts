import { assert } from 'ember-debug';
import { flaggedInstrument, run } from 'ember-metal';
import { uuid } from 'ember-utils';
import {
  ActionManager,
  isSimpleClick,
} from 'ember-views';
import { INVOKE } from '../helpers/action';

const MODIFIERS = ['alt', 'shift', 'meta', 'ctrl'];
const POINTER_EVENT_TYPE_REGEX = /^click|mouse|touch/;

function isAllowedEvent(event, allowedKeys) {
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

  registerAction(actionState) {
    let { actionId } = actionState;

    ActionManager.registeredActions[actionId] = actionState;

    return actionId;
  },

  unregisterAction(actionState) {
    let { actionId } = actionState;

    delete ActionManager.registeredActions[actionId];
  },
};

export class ActionState {
  public element: HTMLElement;
  public actionId: any;
  public actionName: any;
  public actionArgs: any;
  public namedArgs: any;
  public positional: any;
  public implicitTarget: any;
  public dom: any;
  public eventName: any;

  constructor(element, actionId, actionName, actionArgs, namedArgs, positionalArgs, implicitTarget, dom) {
    this.element = element;
    this.actionId = actionId;
    this.actionName = actionName;
    this.actionArgs = actionArgs;
    this.namedArgs = namedArgs;
    this.positional = positionalArgs;
    this.implicitTarget = implicitTarget;
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

  getTarget() {
    let { implicitTarget, namedArgs } = this;
    let target;

    if (namedArgs.has('target')) {
      target = namedArgs.get('target').value();
    } else {
      target = implicitTarget.value();
    }

    return target;
  }

  handler(event): boolean {
    let { actionName, namedArgs } = this;
    let bubbles = namedArgs.get('bubbles');
    let preventDefault = namedArgs.get('preventDefault');
    let allowedKeys = namedArgs.get('allowedKeys');
    let target = this.getTarget();

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
        target,
        name: null,
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
          typeof target[actionName] === 'function',
        );
        flaggedInstrument('interaction.ember-action', payload, () => {
          target[actionName].apply(target, args);
        });
      }
    });
    return false;
  }

  destroy() {
    ActionHelper.unregisterAction(this);
  }
}

// implements ModifierManager<Action>
export default class ActionModifierManager {
  create(element, args, _dynamicScope, dom) {
    let { named, positional } = args.capture();
    let implicitTarget;
    let actionName;
    let actionNameRef;
    if (positional.length > 1) {
      implicitTarget = positional.at(0);
      actionNameRef = positional.at(1);

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
          typeof actionName === 'string' || typeof actionName === 'function',
        );
      }
    }

    let actionArgs: any[] = [];
    // The first two arguments are (1) `this` and (2) the action name.
    // Everything else is a param.
    for (let i = 2; i < positional.length; i++) {
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
      implicitTarget,
      dom,
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
    let actionNameRef = positional.at(1);

    if (!actionNameRef[INVOKE]) {
      actionState.actionName = actionNameRef.value();
    }

    actionState.eventName = actionState.getEventName();
  }

  getDestructor(modifier) {
    return modifier;
  }
}
