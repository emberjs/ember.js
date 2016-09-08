/**
@module ember
@submodule ember-template-compiler
*/
import require, { has } from 'require';
import precompile from './precompile';
let template;

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function compile(templateString, options) {
  if (!template && has('ember-glimmer')) {
    template = require('ember-glimmer').template;
  }

  if (!template) {
    throw new Error('Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.');
  }

  let precompiledTemplateString = precompile(templateString, options);
  let templateJS = new Function(`return ${precompiledTemplateString}`)();
  return template(templateJS);
}
