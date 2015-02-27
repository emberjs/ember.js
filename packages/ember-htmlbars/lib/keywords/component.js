export default {
  setupState: function(state, env, scope, params, hash) {
    state.lastComponentPath = state.componentPath;
    state.componentPath = env.hooks.getValue(params[0]);
  },

  isStable: function(state, env, scope, params, hash) {
    return state.componentPath === state.lastComponentPath;
  },

  render: function(morph, env, scope, params, hash, template, inverse, visitor) {
    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.componentNode = null;

    env.hooks.component(morph, env, scope, morph.state.componentPath, hash, template, visitor);
  }
};
