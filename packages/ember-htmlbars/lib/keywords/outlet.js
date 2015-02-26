/**
@module ember
@submodule ember-htmlbars
*/

import merge from "ember-metal/merge";
import ShadowRoot from "ember-htmlbars/system/shadow-root";

export default {
  willRender: function(renderNode, env) {
    env.view.ownerView._outlets.push(renderNode);
  },

  setupState: function(state, env, scope, params, hash) {
    var outletState = env.outletState;
    var read = env.hooks.getValue;

    var outletName = read(params[0]) || 'main';
    var selectedOutletState = outletState[outletName];

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

  render: function(morph, env, scope, params, hash, template, inverse, visitor) {
    var state = morph.state;
    var outletState = state.outletState;
    var toRender = outletState.render;

    var ViewClass = outletState.render.ViewClass;
    var parentView = env.view;
    var view;

    if (ViewClass) {
      view = ViewClass.create();
      if (parentView) { parentView.linkChild(view); }
      state.view = view;
    }

    var layoutMorph = layoutMorphFor(env, view, morph);
    var options = { renderNode: view && view.renderNode, view: view };
    state.shadowRoot = new ShadowRoot(layoutMorph, toRender.template, null, null);
    state.shadowRoot.render(env, toRender.controller || {}, options, visitor);

    // TODO: Do we need to copy lastResult?
  }
};

function layoutMorphFor(env, view, morph) {
  var layoutMorph = morph;
  if (view) {
    view.renderNode = morph;
    layoutMorph = env.renderer.contentMorphForView(view, morph);
  }
  return layoutMorph;
}

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
