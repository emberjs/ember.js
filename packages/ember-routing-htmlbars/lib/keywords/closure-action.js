import Stream from "ember-metal/streams/stream";
import { map } from "ember-metal/array";
import {
  read,
  readArray
} from "ember-metal/streams/utils";
import keys from 'ember-metal/keys';
import { symbol } from "ember-metal/utils";

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
    var firstArgumentOffset = 0;
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
        actionArguments.unshift(action);
        firstArgumentOffset++;
        if (hash.target) {
          // on-change={{action 'setName' target=alternativeComponent}}
          target = read(hash.target);
        }
        action = target.send;
      }
    }

    if (hash.value) {
      // <button on-keypress={{action (mut name) value="which"}}
      // on-keypress is not even an Ember feature yet
      valuePath = read(hash.value);
    }

    return createClosureAction(target, action, valuePath, firstArgumentOffset, actionArguments);
  });
}

function createClosureAction(target, action, valuePath, firstArgumentOffset, actionArguments) {
  if (actionArguments.length > 0) {
    return function() {
      var args = actionArguments;
      if (arguments.length > 0) {
        args = actionArguments.concat(Array.prototype.slice.apply(arguments));
      }
      if (valuePath && args[firstArgumentOffset]) {
        args[firstArgumentOffset] = Ember.get(args[firstArgumentOffset], valuePath);
      }
      return action.apply(target, args);
    };
  } else {
    return function() {
      var args = arguments;
      if (valuePath && args[firstArgumentOffset]) {
        args = Array.prototype.slice.apply(args);
        args[firstArgumentOffset] = Ember.get(args[firstArgumentOffset], valuePath);
      }
      return action.apply(target, args);
    };
  }
}
