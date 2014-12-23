/**
@module ember
@submodule ember-template-compiler
*/

import { compileSpec } from "htmlbars-compiler/compiler";
import compileOptions from "ember-template-compiler/system/compile_options";

/**
  Uses HTMLBars `compile` function to process a string into a compiled template string.
  The returned string must be passed through `Ember.HTMLBars.template`.

  This is not present in production builds.

  @private
  @method precompile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function(templateString) {
  return compileSpec(templateString, compileOptions);
}
