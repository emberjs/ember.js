/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core";
import { compile } from "htmlbars-compiler/compiler";
import template from "ember-htmlbars/system/template";

import transformEachInToHash from "ember-htmlbars/plugins/transform-each-in-to-hash";
import transformWithAsToHash from "ember-htmlbars/plugins/transform-with-as-to-hash";

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
    disableComponentGeneration: disableComponentGeneration,

    plugins: {
      ast: [
        transformEachInToHash,
        transformWithAsToHash
      ]
    }
  });

  return template(templateSpec);
}
