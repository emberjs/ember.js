/**
@module ember
@submodule ember-htmlbars
*/

import shouldDisplay from "ember-views/streams/should_display";

export default function ifKeyword(morph, env, scope, params, hash, template, inverse) {
  params[0] = shouldDisplay(params[0]);
  return true;
}
