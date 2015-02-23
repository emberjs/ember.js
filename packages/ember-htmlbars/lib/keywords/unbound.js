/**
@module ember
@submodule ember-htmlbars
*/

import { readArray } from "ember-metal/streams/utils";

export default function unbound(morph, env, scope, originalParams, hash, template, inverse) {
  var path = originalParams.shift();
  var params = readArray(originalParams);
  morph.state.unbound = true;

  if (params.length === 0) {
    env.hooks.range(morph, env, scope, path);
  } else if (template === null) {
    env.hooks.inline(morph, env, scope, path.key, params, hash);
  } else {
    env.hooks.block(morph, env, scope, path.key, params, hash, template, inverse);
  }

  return true;
}
