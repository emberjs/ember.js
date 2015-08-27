import Stream from 'ember-metal/streams/stream';
import {
  read,
  readArray,
  labelFor
} from 'ember-metal/streams/utils';
import { symbol } from 'ember-metal/utils';
import { get } from 'ember-metal/property_get';
import { labelForSubexpr } from 'ember-htmlbars/hooks/subexpr';
import EmberError from 'ember-metal/error';
import { flaggedInstrument } from 'ember-metal/instrumentation';

export const INVOKE = symbol('INVOKE');
export const ACTION = symbol('ACTION');

export default function closureAction(morph, env, scope, params, hash, template, inverse, visitor) {
  let s = new Stream(function() {
    var rawAction = params[0];
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
      target = read(scope.self);
      action = read(rawAction);
      if (typeof action === 'string') {
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

  closureAction = function(...passedArguments) {
    let args = actionArguments.concat(passedArguments);

    if (valuePath && args.length > 0) {
      args[0] = get(args[0], valuePath);
    }

    let payload = { target, args, label: labelFor(stream) };
    return flaggedInstrument('interaction.ember-action', payload, () => {
      return action.apply(target, args);
    });
  };

  closureAction[ACTION] = true;

  return closureAction;
}
