/**
@module ember
@submodule ember-htmlbars
*/

export default function each(morph, env, scope, params, hash, template, inverse, visitor) {
  let getValue = env.hooks.getValue;
  let keyword = hash['-legacy-keyword'] && getValue(hash['-legacy-keyword']);

  /* START: Support of legacy ArrayController. TODO: Remove after 1st 2.0 TLS release */
  let firstParam = params[0] && getValue(params[0]);
  if (firstParam && firstParam._isArrayController) {
    env.hooks.block(morph, env, scope, '-legacy-each-with-controller', params, hash, template, inverse, visitor);
    return true;
  }
  /* END: Support of legacy ArrayController */

  if (keyword) {
    env.hooks.block(morph, env, scope, '-legacy-each-with-keyword', params, hash, template, inverse, visitor);
    return true;
  }

  return false;
}
