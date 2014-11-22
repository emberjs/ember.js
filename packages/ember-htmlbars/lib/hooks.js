import Ember from "ember-metal/core";
import lookupHelper from "ember-htmlbars/system/lookup-helper";
import { sanitizeOptionsForHelper } from "ember-htmlbars/system/sanitize-for-helper";

function streamifyArgs(view, params, hash, options, env, helper) {
  sanitizeOptionsForHelper(options);
  helper.preprocessArguments(view, params, hash, options, env);

  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.paramTypes[i] === 'id') {
      params[i] = view.getStream(params[i]);
    }
  }

  // Convert hash ID values to streams
  var hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id' && key !== 'classBinding' && key !== 'class') {
      hash[key] = view.getStream(hash[key]);
    }
  }
}

export function content(morph, path, view, params, hash, options, env) {
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

export function component(morph, tagName, view, hash, options, env) {
  var params = [];
  var helper = lookupHelper(tagName, view, env);

  Ember.assert('You specified `' + tagName + '` in your template, but a component for `' + tagName + '` could not be found.', !!helper);

  streamifyArgs(view, params, hash, options, env, helper);
  return helper.helperFunction.call(view, params, hash, options, env);
}

export function element(element, path, view, params, hash, options, env) { //jshint ignore:line
  var helper = lookupHelper(path, view, env);

  if (helper) {
    streamifyArgs(view, params, hash, options, env, helper);
    return helper.helperFunction.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}

export function subexpr(path, view, params, hash, options, env) {
  var helper = lookupHelper(path, view, env);

  if (helper) {
    streamifyArgs(view, params, hash, options, env, helper);
    return helper.helperFunction.call(view, params, hash, options, env);
  } else {
    return view.getStream(path);
  }
}
