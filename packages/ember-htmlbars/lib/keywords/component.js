export default {
  setupState(lastState, env, scope, params, hash) {
    let state = {
      componentPath: env.hooks.getValue(params[0]),
      componentNode: lastState && lastState.componentNode
    };

    return state;
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.componentNode = null;

    let componentPath = morph.state.componentPath;

    // If the value passed to the {{component}} helper is undefined or null,
    // don't create a new ComponentNode.
    if (componentPath === undefined || componentPath === null) {
      return;
    }

    env.hooks.component(morph, env, scope, componentPath, hash, template, visitor);
  }
};
