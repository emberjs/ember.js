export default {

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    env.hooks.component(morph, env, scope, '-text-area', hash, template, visitor);
  }
};
