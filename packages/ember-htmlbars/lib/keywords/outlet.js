/**
@module ember
@submodule ember-htmlbars
*/

import { validateChildMorphs } from "htmlbars-runtime";
import merge from "ember-metal/merge";
import { componentClassSymbol, componentLayoutSymbol } from "ember-htmlbars/hooks/component";

export default function outlet(morph, env, scope, params, hash, template, inverse, visitor) {
  var outletState = env.outletState;
  env.view.ownerView._outlets.push(morph);

  var read = env.hooks.getValue;
  var outletName = read(params[0]) || 'main';
  var selectedOutletState = outletState[outletName];

  var newEnv = createOrUpdateChildEnv(morph, env, selectedOutletState);

  var lastOutletState = morph.state.lastOutletState;
  morph.state.lastOutletState = selectedOutletState;

  if (morph.lastResult && isStable(lastOutletState, selectedOutletState)) {
    return validateChildMorphs(morph, visitor);
  }

  if (!selectedOutletState) { return; }

  var ViewClass = selectedOutletState.render.ViewClass;
  var viewTemplate = selectedOutletState.render.template;

  if (ViewClass || viewTemplate) {
    var attrs = {};
    attrs[componentClassSymbol] = ViewClass;
    attrs[componentLayoutSymbol] = viewTemplate;

    env.hooks.component(morph, newEnv, null, null, attrs, null, visitor);
  }
}

function createOrUpdateChildEnv(morph, env, outletState) {
  var newEnv = morph.state.childEnv;

  if (!newEnv) {
    newEnv = merge({}, env);
    morph.state.childEnv = newEnv;
  }

  newEnv.outletState = outletState && outletState.outlets;

  return newEnv;
}

function isStable(lastOutletState, newOutletState) {
  var last = lastOutletState.render;
  var next = newOutletState.render;

  return last.ViewClass === next.ViewClass && last.template === next.template;
}
