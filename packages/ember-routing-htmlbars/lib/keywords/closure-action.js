import { Stream } from 'ember-htmlbars/streams/stream';
import {
  read,
  readArray,
  labelFor
} from 'ember-htmlbars/streams/utils';
import symbol from 'ember-metal/symbol';
import { get } from 'ember-metal/property_get';
import { labelForSubexpr } from 'ember-htmlbars/hooks/subexpr';
import EmberError from 'ember-metal/error';
import run from 'ember-metal/run_loop';
import { flaggedInstrument } from 'ember-metal/instrumentation';
import isNone from 'ember-metal/is_none';

export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

export default function closureAction(morph, env, scope, params, hash, template, inverse, visitor) {
  let s = new Stream(function() {
    let rawAction = params[0];
    let actionArguments = readArray(params.slice(1, params.length));

    let target, action, valuePath;

    if (isNone(rawAction)) {
      let label = labelForSubexpr(params, hash, 'action');
      throw new EmberError(`Action passed is null or undefined in ${label} from ${read(scope.getSelf())}.`);
    } else if (rawAction[INVOKE]) {
      // on-change={{action (mut name)}}
      target = rawAction;
      action = rawAction[INVOKE];
    } else {
      // on-change={{action setName}}
      // element-space actions look to "controller" then target. Here we only
      // look to "target".
      target = read(scope.getSelf());
      action = read(rawAction);
      let actionType = typeof action;

      if (actionType === 'string') {
        let actionName = action;
        action = null;
        // on-change={{action 'setName'}}
        if (hash.target) {
          // on-change={{action 'setName' target=alternativeComponent}}
          target = read(hash.target);
        }
        if (target.actions) {
          action = target.actions[actionName];
        }

        if (!action) {
          throw new EmberError(`An action named '${actionName}' was not found in ${target}.`);
        }
      } else if (action && typeof action[INVOKE] === 'function') {
        target = action;
        action = action[INVOKE];
      } else if (actionType !== 'function') {
        throw new EmberError(`An action could not be made for \`${rawAction.label}\` in ${target}. Please confirm that you are using either a quoted action name (i.e. \`(action '${rawAction.label}')\`) or a function available in ${target}.`);
      }
    }

    if (hash.value) {
      // <button on-keypress={{action (mut name) value="which"}}
      // on-keypress is not even an Ember feature yet
      valuePath = read(hash.value);
    }

    return createClosureAction(this, target, action, valuePath, actionArguments);
  }, function() {
    return labelForSubexpr(params, hash, 'action');
  });

  params.forEach(s.addDependency, s);
  Object.keys(hash).forEach(item => s.addDependency(item));

  return s;
}

function createClosureAction(stream, target, action, valuePath, actionArguments) {
  var closureAction;

  if (actionArguments.length > 0) {
    closureAction = function(...passedArguments) {
      var args = actionArguments;
      if (passedArguments.length > 0) {
        args = actionArguments.concat(passedArguments);
      }
      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      let payload = { target, args, label: labelFor(stream) };
      return flaggedInstrument('interaction.ember-action', payload, () => {
        return run.join(target, action, ...args);
      });
    };
  } else {
    closureAction = function(...args) {
      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      let payload = { target, args, label: labelFor(stream) };
      return flaggedInstrument('interaction.ember-action', payload, () => {
        return run.join(target, action, ...args);
      });
    };
  }

  closureAction[ACTION] = true;

  return closureAction;
}
