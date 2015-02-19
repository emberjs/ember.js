/**
@module ember
@submodule ember-htmlbars
*/

import { readArray } from "ember-metal/streams/utils";

export default function unbound(morph, env, scope, originalParams, hash, template, inverse) {
  var path = originalParams.shift();
  var params = readArray(originalParams);

  if (params.length === 0) {
    return env.hooks.range(morph, env, path);
  } else if (template === null) {
    return env.hooks.inline(morph, env, scope, path.key, params, hash);
  } else {
    return env.hooks.block(morph, env, scope, path.key, params, hash, template, inverse);
  }
}
