import { compile } from "htmlbars-compiler/compiler";
import template from "ember-htmlbars/system/template";

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method template
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function(templateString) {
  var templateSpec = compile(templateString);

  return template(templateSpec);
}
