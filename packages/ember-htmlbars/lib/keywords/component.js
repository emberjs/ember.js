import { assign } from "ember-metal/merge";

export default {
  setupState(lastState, env, scope, params, hash) {
    let componentPath = env.hooks.getValue(params[0]);
    return assign({}, lastState, { componentPath, isComponentHelper: true });
  },

  render(morph, ...rest) {
    if (morph.state.manager) {
      morph.state.manager.destroy();
    }

    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.manager = null;

    render(morph, ...rest);
  },

  rerender: render
};

function render(morph, env, scope, params, hash, template, inverse, visitor) {
  let componentPath = morph.state.componentPath;

  // If the value passed to the {{component}} helper is undefined or null,
  // don't create a new ComponentNode.
  if (componentPath === undefined || componentPath === null) {
    return;
  }

  env.hooks.component(morph, env, scope, componentPath, params, hash, { default: template, inverse }, visitor);
}
