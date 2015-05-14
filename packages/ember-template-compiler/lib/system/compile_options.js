/**
@module ember
@submodule ember-template-compiler
*/

import Ember from "ember-metal/core";
import plugins from "ember-template-compiler/plugins";

/**
  @private
  @property compileOptions
*/
export default function(_options) {
  var disableComponentGeneration = true;
  if (Ember.FEATURES.isEnabled('ember-htmlbars-component-generation')) {
    disableComponentGeneration = false;
  }

  var options = _options || {};
  // When calling `Ember.Handlebars.compile()` a second argument of `true`
  // had a special meaning (long since lost), this just gaurds against
  // `options` being true, and causing an error during compilation.
  if (options === true) {
    options = {};
  }

  options.disableComponentGeneration = disableComponentGeneration;
  options.plugins = plugins;

  options.buildMeta = function buildMeta(program) {
    return {
      revision: 'Ember@VERSION_STRING_PLACEHOLDER',
      loc: program.loc,
      moduleName: options.moduleName
    };
  };

  return options;
}
