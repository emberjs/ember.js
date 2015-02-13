/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function subexpr(morph, env, scope, helperName, params, hash) {
  var helper = lookupHelper(helperName, scope.self, env);

  Ember.assert("A helper named '"+helperName+"' could not be found", helper);

  var options = {
    isInline: true
  };

  return helper.helperFunction.call(undefined, params, hash, options, env);
}

