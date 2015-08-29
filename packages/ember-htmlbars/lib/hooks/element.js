/**
@module ember
@submodule ember-htmlbars
*/

import { findHelper } from 'ember-htmlbars/system/lookup-helper';
import { handleRedirect } from 'htmlbars-runtime/hooks';
import { buildHelperStream } from 'ember-htmlbars/system/invoke-helper';

export default function emberElement(morph, env, scope, path, params, hash, visitor) {
  if (handleRedirect(morph, env, scope, path, params, hash, null, null, visitor)) {
    return;
  }

  var result;
  var helper = findHelper(path, scope.getSelf(), env);
  if (helper) {
    var helperStream = buildHelperStream(helper, params, hash, { element: morph.element }, env, scope, path);
    result = helperStream.value();
  } else {
    result = env.hooks.get(env, scope, path);
  }

  env.hooks.getValue(result);
}
