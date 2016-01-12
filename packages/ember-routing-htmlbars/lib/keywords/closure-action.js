import { Stream } from 'ember-metal/streams/stream';
import {
  read,
  readArray
} from 'ember-metal/streams/utils';
import symbol from 'ember-metal/symbol';
import { get } from 'ember-metal/property_get';
import { labelForSubexpr } from 'ember-htmlbars/hooks/subexpr';
import EmberError from 'ember-metal/error';
import run from 'ember-metal/run_loop';

export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

export default function closureAction(morph, env, scope, params, hash, template, inverse, visitor) {
  let s = new Stream(function() {
    var rawAction = extractRawAction(params, scope);
    var actionArguments = readArray(params.slice(1, params.length));

    var target, action, valuePath;
    if (rawAction[INVOKE]) {
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
      } else if (actionType !== 'function') {
        throw new EmberError(`An action could not be made for \`${rawAction.label}\` in ${target}. Please confirm that you are using either a quoted action name (i.e. \`(action '${rawAction.label}')\`) or a function available in ${target}.`);
      }
    }

    if (hash.value) {
      // <button on-keypress={{action (mut name) value="which"}}
      // on-keypress is not even an Ember feature yet
      valuePath = read(hash.value);
    }

    return createClosureAction(target, action, valuePath, actionArguments);
  }, function() {
    return labelForSubexpr(params, hash, 'action');
  });

  params.forEach(s.addDependency, s);
  Object.keys(hash).forEach(item => s.addDependency(item));

  return s;
}


function extractRawAction(params, scope) {
  var [value] = params;
  if (value) {
    return value;
  }

  /* Emit a more descriptive error when `(action attrs.foo)` and `foo` is falsy
   *
   * If accessing properties of `attrs` could yield a stream (?), this might not
   * even be necessary
   */
  var target = read(scope.getSelf());
  throw new EmberError(`${target} is using action closure helper with an action of value \`${value}\`. If passing an action via \`attrs.someAction\`, confirm that \`someAction\` is either a string or a function.`);
}

function createClosureAction(target, action, valuePath, actionArguments) {
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

      return run.join(target, action, ...args);
    };
  } else {
    closureAction = function(...args) {
      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }

      return run.join(target, action, ...args);
    };
  }

  closureAction[ACTION] = true;

  return closureAction;
}
