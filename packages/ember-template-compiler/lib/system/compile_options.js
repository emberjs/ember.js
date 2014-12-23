/**
@module ember
@submodule ember-template-compiler
*/

import Ember from "ember-metal/core";
import plugins from "ember-template-compiler/plugins";

var disableComponentGeneration = true;
if (Ember.FEATURES.isEnabled('ember-htmlbars-component-generation')) {
  disableComponentGeneration = false;
}

/**
  @private
  @property compileOptions
*/
export default {
  disableComponentGeneration: disableComponentGeneration,

  plugins: plugins
};
