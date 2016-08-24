import { assert } from 'ember-metal/debug';
import { uuid } from 'ember-metal/utils';
import { labelFor, read } from 'ember-htmlbars/streams/utils';
import run from 'ember-metal/run_loop';
import { readUnwrappedModel } from 'ember-htmlbars/streams/utils';
import { isSimpleClick } from 'ember-views/system/utils';
import ActionManager from 'ember-views/system/action_manager';
import { flaggedInstrument } from 'ember-metal/instrumentation';

export default {
  setupState(state, env, scope, params, hash) {
    let getStream = env.hooks.get;
    let read = env.hooks.getValue;

    let actionName = read(params[0]);
    let actionLabel = labelFor(params[0]);

    assert(
      'You specified a quoteless path, `' + actionLabel + '`, to the ' +
      '{{action}} helper which did not resolve to an action name (a ' +
      'string). Perhaps you meant to use a quoted actionName? (e.g. ' +
      '{{action "' + actionLabel + '"}}).',
      typeof actionName === 'string' || typeof actionName === 'function'
    );

    let actionArgs = [];
    for (let i = 1; i < params.length; i++) {
      actionArgs.push(readUnwrappedModel(params[i]));
    }

    let target;
    if (hash.target) {
      if (typeof hash.target === 'string') {
        target = read(getStream(env, scope, hash.target));
      } else {
        target = read(hash.target);
      }
    } else {
      target = read(scope.getLocal('controller')) || read(scope.getSelf());
    }

    return { actionName, actionArgs, target };
  },

  isStable(state, env, scope, params, hash) {
    return true;
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    let actionId = env.dom.getAttribute(node.element, 'data-ember-action') || uuid();

    ActionHelper.registerAction({
      actionId,
      node: node,
      eventName: hash.on || 'click',
      bubbles: hash.bubbles,
      preventDefault: hash.preventDefault,
      allowedKeys: hash.allowedKeys
    });

    node.cleanup = () => ActionHelper.unregisterAction(actionId);

    env.dom.setAttribute(node.element, 'data-ember-action', actionId);
  }
};

export let ActionHelper = {};

// registeredActions is re-exported for compatibility with older plugins
// that were using this undocumented API.
ActionHelper.registeredActions = ActionManager.registeredActions;

ActionHelper.registerAction = function({ actionId, node, eventName, preventDefault, bubbles, allowedKeys }) {
  let actions = ActionManager.registeredActions[actionId];

  if (!actions) {
    actions = ActionManager.registeredActions[actionId] = [];
  }

  actions.push({
    eventName,
    handler(event) {
      if (!isAllowedEvent(event, read(allowedKeys))) {
        return true;
      }

      if (read(preventDefault) !== false) {
        event.preventDefault();
      }

      if (read(bubbles) === false) {
        event.stopPropagation();
      }

      let { target, actionName, actionArgs } = node.getState();

      run(function runRegisteredAction() {
        let payload = {
          target,
          args: actionArgs
        };
        if (typeof actionName === 'function') {
          flaggedInstrument('interaction.ember-action', payload, () => {
            actionName.apply(target, actionArgs);
          });
          return;
        }
        payload.name = actionName;
        if (target.send) {
          flaggedInstrument('interaction.ember-action', payload, () => {
            target.send.apply(target, [actionName, ...actionArgs]);
          });
        } else {
          assert(
            'The action \'' + actionName + '\' did not exist on ' + target,
            typeof target[actionName] === 'function'
          );
          flaggedInstrument('interaction.ember-action', payload, () => {
            target[actionName].apply(target, actionArgs);
          });
        }
      });
    }
  });

  return actionId;
};

ActionHelper.unregisterAction = (actionId) => delete ActionManager.registeredActions[actionId];

const MODIFIERS = ['alt', 'shift', 'meta', 'ctrl'];
const POINTER_EVENT_TYPE_REGEX = /^click|mouse|touch/;

function isAllowedEvent(event, allowedKeys) {
  if (typeof allowedKeys === 'undefined') {
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
