/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function subexpr(path, view, params, hash, options, env) {
  var helper = lookupHelper(path, view, env);

  if (helper) {
    return helper.helperFunction.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}

