/**
@module ember
@submodule ember-templates
*/

import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import RenderEnv from 'ember-htmlbars/system/render-env';
import { assert } from 'ember-metal/debug';
import { getOwner, setOwner } from 'container/owner';
import { isOutletStable } from './outlet';
import { childOutletState } from './render';

/**
  The `{{mount}}` helper lets you embed a routeless engine in a template.

  Mounting an engine will cause an instance to be booted and its `application`
  template to be rendered.

  For example, the following template mounts the `ember-chat` engine:

  ```handlebars
  {{! application.hbs }}
  {{mount "ember-chat"}}
  ```

  Currently, the engine name is the only argument that can be passed to
  `{{mount}}`.

  @method mount
  @for Ember.Templates.helpers
  @category ember-application-engines
  @public
*/
export default {
  setupState(prevState, env, scope, params /*, hash */) {
    let name = params[0];

    assert(
      'The first argument of {{mount}} must be an engine name, e.g. {{mount "chat-engine"}}.',
      params.length === 1
    );

    assert(
      'The first argument of {{mount}} must be quoted, e.g. {{mount "chat-engine"}}.',
      typeof name === 'string'
    );

    assert(
      'You used `{{mount \'' + name + '\'}}`, but the engine \'' + name + '\' can not be found.',
      env.owner.hasRegistration(`engine:${name}`)
    );

    let engineInstance = env.owner.buildChildEngineInstance(name);

    engineInstance.boot();

    let state = {
      parentView: env.view,
      manager: prevState.manager,
      controller: lookupEngineController(engineInstance),
      childOutletState: childOutletState(name, env)
    };

    setOwner(state, engineInstance);

    return state;
  },

  childEnv(state, env) {
    return buildEnvForEngine(getOwner(state), env);
  },

  isStable(lastState, nextState) {
    return isStable(lastState.childOutletState, nextState.childOutletState);
  },

  isEmpty(/* state */) {
    return false;
  },

  render(node, env, scope, params, hash, template, inverse, visitor) {
    let state = node.getState();

    let engineInstance = getOwner(state);

    let engineController = lookupEngineController(engineInstance);

    let engineTemplate = lookupEngineTemplate(engineInstance);

    let options = {
      layout: null,
      self: engineController
    };

    let engineEnv = buildEnvForEngine(engineInstance, env);

    let nodeManager = ViewNodeManager.create(node, engineEnv, hash, options, state.parentView, null, null, engineTemplate);

    state.manager = nodeManager;

    nodeManager.render(engineEnv, hash, visitor);
  }
};

function isStable(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  for (var outletName in a) {
    if (!isOutletStable(a[outletName], b[outletName])) {
      return false;
    }
  }
  return true;
}

function lookupEngineController(engineInstance) {
  return engineInstance.lookup('controller:application');
}

function lookupEngineView(engineInstance, ownerView) {
  let engineView = engineInstance.lookup('view:toplevel');

  if (engineView.ownerView !== ownerView) {
    engineView.ownerView = ownerView;
  }

  return engineView;
}

function lookupEngineTemplate(engineInstance) {
  let engineTemplate = engineInstance.lookup('template:application');

  if (engineTemplate && engineTemplate.raw) {
    engineTemplate = engineTemplate.raw;
  }

  return engineTemplate;
}

function buildEnvForEngine(engineInstance, parentEnv) {
  let engineView = lookupEngineView(engineInstance, parentEnv.view.ownerView);

  let engineTemplate = lookupEngineTemplate(engineInstance);

  let engineEnv = RenderEnv.build(engineView, engineTemplate.meta);

  return engineEnv;
}
