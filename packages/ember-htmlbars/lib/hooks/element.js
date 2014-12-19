/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function element(env, domElement, view, path, params, hash) { //jshint ignore:line
  var helper = lookupHelper(path, view, env);

  if (helper) {
    var options = {
      element: domElement
    };
    return helper.helperFunction.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}

