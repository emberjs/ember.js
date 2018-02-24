/**
@module ember
*/

import compileOptions from './compile-options';
import require, { has } from 'require';

let glimmerPrecompile;

/**
  Uses HTMLBars `compile` function to process a string into a compiled template string.
  The returned string must be passed through `Ember.HTMLBars.template`.

  This is not present in production builds.

  @private
  @method precompile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function precompile(templateString, options) {
  if (!glimmerPrecompile && has('@glimmer/compiler')) {
    glimmerPrecompile = require('@glimmer/compiler').precompile;
  }

  if (!glimmerPrecompile) {
    throw new Error('Cannot call `compile` without the template compiler loaded. Please load `ember-template-compiler.js` prior to calling `compile`.');
  }

  return glimmerPrecompile(templateString, compileOptions(options));
}
