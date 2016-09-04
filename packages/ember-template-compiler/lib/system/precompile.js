/**
@module ember
@submodule ember-template-compiler
*/

import compileOptions from './compile-options';
import require, { has } from 'require';

let compileSpec;

/**
  Uses HTMLBars `compile` function to process a string into a compiled template string.
  The returned string must be passed through `Ember.HTMLBars.template`.

  This is not present in production builds.

  @private
  @method precompile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function precompile(templateString, options) {
  if (!compileSpec && has('glimmer-compiler')) {
    compileSpec = require('glimmer-compiler').compileSpec;
  }

  if (!compileSpec) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  return JSON.stringify(compileSpec(templateString, compileOptions(options)));
}
