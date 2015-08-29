export default function yieldKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
  let to = env.hooks.getValue(hash.to) || 'default';
  let block = scope.getBlock(to);

  if (block) {
    block.invoke(env, params, hash.self, morph, scope, visitor);
  }

  return true;
}
