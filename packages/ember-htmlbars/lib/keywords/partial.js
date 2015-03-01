/**
@module ember
@submodule ember-htmlbars
*/

import lookupPartial from "ember-views/system/lookup_partial";
import { internal } from "htmlbars-runtime";

export default function partialKeyword(morph, env, scope, params, hash, template, inverse, visitor) {
  var found = lookupPartial(env, env.hooks.getValue(params[0])).raw;

  internal.hostBlock(morph, env, scope, found, null, null, visitor, function(options) {
    options.templates.template.yield();
  });

  return true;
}
