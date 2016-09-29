import { symbol } from 'ember-utils';
import { CachedReference } from '../utils/references';
import {
  Error as EmberError,
  run,
  get,
  flaggedInstrument,
  isNone
} from 'ember-metal';

export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

export class ClosureActionReference extends CachedReference {
  static create(args) {
    // TODO: Const reference optimization.
    return new ClosureActionReference(args);
  }

  constructor(args) {
    super();

    this.args = args;
    this.tag = args.tag;
  }

  compute() {
    let { named, positional } = this.args;
    let positionalValues = positional.value();

    let target = positionalValues[0];
    let rawActionRef = positional.at(1);
    let rawAction = positionalValues[1];

    // The first two argument slots are reserved.
    // pos[0] is the context (or `this`)
    // pos[1] is the action name or function
    // Anything else is an action argument.
    let actionArgs = positionalValues.slice(2);

    // on-change={{action setName}}
    // element-space actions look to "controller" then target. Here we only
    // look to "target".
    let actionType = typeof rawAction;
    let action = rawAction;

    if (rawActionRef[INVOKE]) {
      target = rawActionRef;
      action = rawActionRef[INVOKE];
    } else if (isNone(rawAction)) {
      throw new EmberError(`Action passed is null or undefined in (action) from ${target}.`);
    } else if (actionType === 'string') {
      // on-change={{action 'setName'}}
      let actionName = rawAction;

      action = null;

      if (named.has('target')) {
        // on-change={{action 'setName' target=alternativeComponent}}
        target = named.get('target').value();
      }

      if (target['actions']) {
        action = target.actions[actionName];
      }

      if (!action) {
        throw new EmberError(`An action named '${actionName}' was not found in ${target}`);
      }
    } else if (action && typeof action[INVOKE] === 'function') {
      target = action;
      action = action[INVOKE];
    } else if (actionType !== 'function') {
      // TODO: Is there a better way of doing this?
      let rawActionLabel = rawActionRef._propertyKey || rawAction;
      throw new EmberError(`An action could not be made for \`${rawActionLabel}\` in ${target}. Please confirm that you are using either a quoted action name (i.e. \`(action '${rawActionLabel}')\`) or a function available in ${target}.`);
    }

    let valuePath = named.get('value').value();

    return createClosureAction(target, action, valuePath, actionArgs);
  }
}

export default function(vm, args) {
  return ClosureActionReference.create(args);
}

export function createClosureAction(target, action, valuePath, actionArgs) {
  let closureAction;
  let actionArgLength = actionArgs.length;

  if (actionArgLength > 0) {
    closureAction = function(...passedArguments) {
      let args = new Array(actionArgLength + passedArguments.length);

      for (let i = 0; i < actionArgLength; i++) {
        args[i] = actionArgs[i];
      }

      for (let i = 0; i < passedArguments.length; i++) {
        args[i + actionArgLength] = passedArguments[i];
      }

      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      let payload = { target, args, label: 'glimmer-closure-action' };
      return flaggedInstrument('interaction.ember-action', payload, () => {
        return run.join(target, action, ...args);
      });
    };
  } else {
    closureAction = function(...args) {
      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      let payload = { target, args, label: 'glimmer-closure-action' };
      return flaggedInstrument('interaction.ember-action', payload, () => {
        return run.join(target, action, ...args);
      });
    };
  }

  closureAction[ACTION] = true;
  return closureAction;
}
