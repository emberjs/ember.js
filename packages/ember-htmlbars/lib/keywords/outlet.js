/**
@module ember
@submodule ember-htmlbars
*/

import merge from "ember-metal/merge";
import { componentClassSymbol, componentLayoutSymbol } from "ember-htmlbars/hooks/component";

export default {
  willRender: function(renderNode, env) {
    env.view.ownerView._outlets.push(renderNode);
  },

  setupState: function(state, env, scope, params, hash) {
    var outletState = env.outletState;
    var read = env.hooks.getValue;

    var outletName = read(params[0]) || 'main';
    var selectedOutletState = outletState[outletName];

    state.lastOutletState = state.selectedOutletState;
    state.selectedOutletState = selectedOutletState;

    createOrUpdateChildEnv(state, env, selectedOutletState);
  },

  isStable: function(state, env, scope, params, hash) {
    return isStable(state.lastOutletState, state.selectedOutletState);
  },

  isEmpty: function(state) {
    return isEmpty(state.selectedOutletState);
  },

  render: function(morph, env, scope, params, hash, template, inverse, visitor) {
    var selectedOutletState = morph.state.selectedOutletState;

    var ViewClass = selectedOutletState.render.ViewClass;
    var viewTemplate = selectedOutletState.render.template;

    var attrs = {};
    attrs[componentClassSymbol] = ViewClass;
    attrs[componentLayoutSymbol] = viewTemplate;

    env.hooks.component(morph, morph.state.childEnv, null, null, attrs, null, visitor);
  }
};

function isEmpty(outletState) {
  return !outletState || (!outletState.render.ViewClass && !outletState.render.template);
}

function createOrUpdateChildEnv(state, env, outletState) {
  var newEnv = state.childEnv;

  if (!newEnv) {
    newEnv = merge({}, env);
    state.childEnv = newEnv;
  }

  newEnv.outletState = outletState && outletState.outlets;
}

function isStable(lastOutletState, newOutletState) {
  var last = lastOutletState.render;
  var next = newOutletState.render;

  return last.ViewClass === next.ViewClass && last.template === next.template;
}
