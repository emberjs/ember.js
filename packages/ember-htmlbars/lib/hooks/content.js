import streamifyArgs from "ember-htmlbars/system/streamify-arguments";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function content(morph, path, view, params, hash, options, env) {
  var helper = lookupHelper(path, view, env);
  if (!helper) {
    helper = lookupHelper('bindHelper', view, env);
    // Modify params to include the first word
    params.unshift(path);
    options.paramTypes = ['id'];
  }

  streamifyArgs(view, params, hash, options, env, helper);
  return helper.helperFunction.call(view, params, hash, options, env);
}

