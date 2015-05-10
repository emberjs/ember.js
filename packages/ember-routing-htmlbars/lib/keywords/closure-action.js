import Stream from "ember-metal/streams/stream";
import { map } from "ember-metal/array";
import {
  read,
  readArray
} from "ember-metal/streams/utils";
import keys from 'ember-metal/keys';
import { symbol } from "ember-metal/utils";
import { get } from "ember-metal/property_get";

export const INVOKE = symbol("INVOKE");

export default function closureAction(morph, env, scope, params, hash, template, inverse, visitor) {
  return new Stream(function() {
    map.call(params, this.addDependency, this);
    map.call(keys(hash), (item) => {
      this.addDependency(item);
    });

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
        // on-change={{action 'setName'}}
        if (hash.target) {
          // on-change={{action 'setName' target=alternativeComponent}}
          target = read(hash.target);
        }
        if (target.actions) {
          action = target.actions[action];
        } else {
          action = target._actions[action];
        }
      }
    }

    if (hash.value) {
      // <button on-keypress={{action (mut name) value="which"}}
      // on-keypress is not even an Ember feature yet
      valuePath = read(hash.value);
    }

    return createClosureAction(target, action, valuePath, actionArguments);
  });
}

function createClosureAction(target, action, valuePath, actionArguments) {
  if (actionArguments.length > 0) {
    return function() {
      var args = actionArguments;
      if (arguments.length > 0) {
        args = actionArguments.concat(...arguments);
      }
      if (valuePath && args.length > 0) {
        args[0] = get(args[0], valuePath);
      }
      return action.apply(target, args);
    };
  } else {
    return function() {
      var args = arguments;
      if (valuePath && args.length > 0) {
        args = Array.prototype.slice.apply(args);
        args[0] = get(args[0], valuePath);
      }
      return action.apply(target, args);
    };
  }
}
