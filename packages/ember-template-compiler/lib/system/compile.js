/**
@module ember
@submodule ember-template-compiler
*/

import { compile } from "htmlbars-compiler/compiler";
import compileOptions from "ember-template-compiler/system/compile_options";
import template from "ember-template-compiler/system/template";

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function(templateString) {
  var templateSpec = compile(templateString, compileOptions());

  return template(templateSpec);
}
