/**
@module ember
@submodule ember-htmlbars
*/

import Ember from 'ember-metal/core';
import { get } from 'ember-metal/property_get';
import ViewNodeManager from 'ember-htmlbars/node-managers/view-node-manager';
import topLevelViewTemplate from 'ember-htmlbars/templates/top-level-view';
topLevelViewTemplate.meta.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

export default {
  willRender(renderNode, env) {
    env.view.ownerView._outlets.push(renderNode);
  },

  setupState(state, env, scope, params, hash) {
    var outletState = env.outletState;
    var read = env.hooks.getValue;
    var outletName = read(params[0]) || 'main';
    var selectedOutletState = outletState[outletName];

    var toRender = selectedOutletState && selectedOutletState.render;
    if (toRender && !toRender.template && !toRender.ViewClass) {
      toRender.template = topLevelViewTemplate;
    }

    return { outletState: selectedOutletState, hasParentOutlet: env.hasParentOutlet };
  },

  childEnv(state, env) {
    return env.childWithOutletState(state.outletState && state.outletState.outlets, true);
  },

  isStable(lastState, nextState) {
    return isStable(lastState.outletState, nextState.outletState);
  },

  isEmpty(state) {
    return isEmpty(state.outletState);
  },

  render(renderNode, env, scope, params, hash, template, inverse, visitor) {
    var state = renderNode.state;
    var parentView = env.view;
    var outletState = state.outletState;
    var toRender = outletState.render;
    var namespace = env.container.lookup('application:main');
    var LOG_VIEW_LOOKUPS = get(namespace, 'LOG_VIEW_LOOKUPS');

    var ViewClass = outletState.render.ViewClass;

    if (!state.hasParentOutlet && !ViewClass) {
      ViewClass = env.container.lookupFactory('view:toplevel');
    }

    var options = {
      component: ViewClass,
      self: toRender.controller,
      createOptions: {
        controller: toRender.controller
      }
    };

    template = template || toRender.template && toRender.template.raw;

    if (LOG_VIEW_LOOKUPS && ViewClass) {
      Ember.Logger.info('Rendering ' + toRender.name + ' with ' + ViewClass, { fullName: 'view:' + toRender.name });
    }

    var nodeManager = ViewNodeManager.create(renderNode, env, {}, options, parentView, null, null, template);
    state.manager = nodeManager;

    nodeManager.render(env, hash, visitor);
  }
};

function isEmpty(outletState) {
  return !outletState || (!outletState.render.ViewClass && !outletState.render.template);
}

function isStable(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  a = a.render;
  b = b.render;
  for (var key in a) {
    if (a.hasOwnProperty(key)) {
      // name is only here for logging & debugging. If two different
      // names result in otherwise identical states, they're still
      // identical.
      if (a[key] !== b[key] && key !== 'name') {
        return false;
      }
    }
  }
  return true;
}
