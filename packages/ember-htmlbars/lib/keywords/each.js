/**
@module ember
@submodule ember-htmlbars
*/

import ArrayController from 'ember-runtime/controllers/array_controller';

export default function each(morph, env, scope, params, hash, template, inverse, visitor) {
  let getValue = env.hooks.getValue;
  let firstParam = params[0] && getValue(params[0]);
  let keyword = hash['-legacy-keyword'] && getValue(hash['-legacy-keyword']);

  if (firstParam && firstParam instanceof ArrayController) {
    env.hooks.block(morph, env, scope, '-legacy-each-with-controller', params, hash, template, inverse, visitor);
    return true;
  }

  if (keyword) {
    env.hooks.block(morph, env, scope, '-legacy-each-with-keyword', params, hash, template, inverse, visitor);
    return true;
  }

  return false;
}
