/**
@module ember
*/

import compileOptions from './compile-options';
import { precompile as glimmerPrecompile } from '@glimmer/compiler';

/**
  Uses HTMLBars `compile` function to process a string into a compiled template string.
  The returned string must be passed through `Ember.HTMLBars.template`.

  This is not present in production builds.

  @private
  @method precompile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function precompile(templateString, options) {
  return glimmerPrecompile(templateString, compileOptions(options));
}
