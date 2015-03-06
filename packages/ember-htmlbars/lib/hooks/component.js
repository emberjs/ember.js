/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

export default function component(env, morph, view, tagName, attrs, template) {
  var helper = lookupHelper(tagName, view, env);

  Ember.assert('You specified `' + tagName + '` in your template, but a component for `' + tagName + '` could not be found.', !!helper);

  return helper.helperFunction.call(undefined, [], attrs, { morph: morph, template: template }, env);
}

