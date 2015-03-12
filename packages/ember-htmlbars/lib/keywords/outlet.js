/**
@module ember
@submodule ember-htmlbars
*/

import merge from "ember-metal/merge";
import ComponentNode from "ember-htmlbars/system/component-node";

import topLevelViewTemplate from "ember-htmlbars/templates/top-level-view";
topLevelViewTemplate.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

export default {
  willRender: function(renderNode, env) {
    env.view.ownerView._outlets.push(renderNode);
  },

  setupState: function(state, env, scope, params, hash) {
    var outletState = env.outletState;
    var read = env.hooks.getValue;

    var outletName = read(params[0]) || 'main';
    var selectedOutletState = outletState[outletName];

    var toRender = selectedOutletState && selectedOutletState.render;
    if (toRender && !toRender.template && !toRender.ViewClass) {
      toRender.template = topLevelViewTemplate;
    }

    state.lastOutletState = state.outletState;
    state.outletState = selectedOutletState;
  },

  updateEnv: function(state, env) {
    var outletState = state.outletState;
    var newEnv = merge({ outletState: null }, env);

    newEnv.outletState = outletState && outletState.outlets;
    return newEnv;
  },

  isStable: function(state, env, scope, params, hash) {
    return isStable(state.lastOutletState, state.outletState);
  },

  isEmpty: function(state) {
    return isEmpty(state.outletState);
  },

  rerender: function(morph, env, scope, params, hash, template, inverse, visitor) {
    var newEnv = env;
    if (morph.state.view) {
      newEnv = merge({}, env);
      newEnv.view = morph.state.view;
    }
  },

  render: function(renderNode, env, scope, params, hash, template, inverse, visitor) {
    var state = renderNode.state;
    var parentView = state.parentView;
    var outletState = state.outletState;
    var toRender = outletState.render;

    var ViewClass = outletState.render.ViewClass;

    var options = {
      component: ViewClass,
      layout: toRender.template,
      self: toRender.controller
    };

    var componentNode = ComponentNode.create(renderNode, env, {}, options, parentView, null, null, template);
    state.componentNode = componentNode;

    componentNode.render(env, hash, visitor);
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
