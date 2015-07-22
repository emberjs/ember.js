export default function legacyYield(morph, env, scope, params, hash, template, inverse, visitor) {
  scope.blocks.default(env, params, undefined, morph, scope, visitor);
  return true;
}
