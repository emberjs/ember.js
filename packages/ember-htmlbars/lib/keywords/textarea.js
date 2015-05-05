/**
@module ember
@submodule ember-htmlbars
*/

export default function textarea(morph, env, scope, originalParams, hash, template, inverse, visitor) {
  env.hooks.component(morph, env, scope, '-text-area', originalParams, hash, template, visitor);
  return true;
}
