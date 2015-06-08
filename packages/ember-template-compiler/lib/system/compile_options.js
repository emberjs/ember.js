/**
@module ember
@submodule ember-template-compiler
*/

import Ember from "ember-metal/core";
import { assign } from "ember-metal/merge";
import defaultPlugins from "ember-template-compiler/plugins";

/**
  @private
  @property compileOptions
*/
export default function(_options) {
  var disableComponentGeneration = true;
  if (Ember.FEATURES.isEnabled('ember-htmlbars-component-generation')) {
    disableComponentGeneration = false;
  }

  let options;
  // When calling `Ember.Handlebars.compile()` a second argument of `true`
  // had a special meaning (long since lost), this just gaurds against
  // `options` being true, and causing an error during compilation.
  if (_options === true) {
    options = {};
  } else {
    options = assign({}, _options);
  }

  options.disableComponentGeneration = disableComponentGeneration;

  let plugins = {
    ast: defaultPlugins.ast.slice()
  };

  if (options.plugins && options.plugins.ast) {
    plugins.ast = plugins.ast.concat(options.plugins.ast);
  }
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
