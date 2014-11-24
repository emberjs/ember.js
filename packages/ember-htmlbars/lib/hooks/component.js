import Ember from "ember-metal/core";
import streamifyArgs from "ember-htmlbars/system/streamify-arguments";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function component(morph, tagName, view, hash, options, env) {
  var params = [];
  var helper = lookupHelper(tagName, view, env);

  Ember.assert('You specified `' + tagName + '` in your template, but a component for `' + tagName + '` could not be found.', !!helper);

  streamifyArgs(view, params, hash, options, env, helper);
  return helper.helperFunction.call(view, params, hash, options, env);
}

