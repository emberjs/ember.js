import { CachedReference, ACTION, INVOKE } from '../utils/references';
import { NULL_REFERENCE, UNDEFINED_REFERENCE } from 'glimmer-runtime';
import EmberError from 'ember-metal/error';
import run from 'ember-metal/run_loop';
import { get } from 'ember-metal/property_get';
import { flaggedInstrument } from 'ember-metal/instrumentation';

export class ClosureActionReference extends CachedReference {
  static create(args) {
    // TODO: Const reference optimization.
    return new ClosureActionReference(args);
  }

  constructor(args) {
    super();

    this[ACTION] = true;
    this.args = args;
    this.tag = args.tag;
  }

  compute() {
    let { named, positional } = this.args;
    let positionalValues = positional.value();

    let target = positionalValues[0];
    let actionRef = positional.at(1);
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

    // TODO: can we just replace this with isMut/UPDATE altogether
    // since INVOKE is not really public API anyway?
    if (typeof actionRef[INVOKE] === 'function') {
      // on-keypress={{action (mut name) value="which"}}
      target = actionRef;
      action = actionRef[INVOKE];
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
      // FIXME: Is there a better way of doing this?
      let rawActionLabel = actionRef._propertyKey || rawAction;
      throw new EmberError(`An action could not be made for \`${rawActionLabel}\` in ${target}. Please confirm that you are using either a quoted action name (i.e. \`(action '${rawActionLabel}')\`) or a function available in ${target}.`);
    }

    let valuePath = named.has('value') ? named.get('value').value() : undefined;

    return createClosureAction(target, action, valuePath, actionArgs);
  }
}

export default {
  isInternalHelper: true,

  toReference(args) {
    let rawActionRef = args.positional.at(1);

    if (rawActionRef === UNDEFINED_REFERENCE && rawActionRef === NULL_REFERENCE) {
      throw new EmberError(`Action passed is null or undefined in (action) from ${args.positional.at(0).value()}.`);
    }

    return ClosureActionReference.create(args);
  }
};

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

  return closureAction;
}
