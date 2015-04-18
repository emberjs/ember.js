export default function legacyYield(morph, env, scope, params, hash, template, inverse, visitor) {
  if (scope.block.arity === 0) {
    scope.block(env, [], params[0], morph, scope, visitor);
  } else {
    scope.block(env, params, undefined, morph, scope, visitor);
  }

  return true;
}
