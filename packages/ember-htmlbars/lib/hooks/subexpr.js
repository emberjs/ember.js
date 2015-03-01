/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function subexpr(env, view, path, params, hash) {
  var helper = lookupHelper(path, view, env);

  Ember.assert("A helper named '"+path+"' could not be found", helper);

  var options = {
    isInline: true
  };
  return helper.helperFunction.call(undefined, params, hash, options, env);
}

