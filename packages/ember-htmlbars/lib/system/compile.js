import Ember from "ember-metal/core";
import { compile } from "htmlbars-compiler/compiler";
import template from "ember-htmlbars/system/template";

var disableComponentGeneration = true;
if (Ember.FEATURES.isEnabled('ember-htmlbars-component-generation')) {
  disableComponentGeneration = false;
}

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method template
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function(templateString) {
  var templateSpec = compile(templateString, {
    disableComponentGeneration: disableComponentGeneration
  });

  return template(templateSpec);
}
