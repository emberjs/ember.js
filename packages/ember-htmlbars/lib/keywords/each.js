/**
@module ember
@submodule ember-htmlbars
*/

import getValue from "ember-htmlbars/hooks/get-value";
import ArrayController from "ember-runtime/controllers/array_controller";

export default function each(morph, env, scope, params, hash, template, inverse, visitor) {
  let firstParam = params[0] && getValue(params[0]);

  if (firstParam && firstParam instanceof ArrayController) {
    env.hooks.block(morph, env, scope, '-legacy-each-with-controller', params, hash, template, inverse, visitor);
    return true;
  }

  return false;
}
