export default {
  setupState(lastState, env, scope, params, hash) {
    return {
      componentPath: env.hooks.getValue(params[0]),
      componentNode: lastState && lastState.componentNode
    };
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    morph.state.componentNode = null;

    env.hooks.component(morph, env, scope, morph.state.componentPath, hash, template, visitor);
  }
};
