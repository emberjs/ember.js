/**
@module ember
*/

import { precompile as glimmerPrecompile, PrecompileOptions } from '@glimmer/compiler';
import { CompileOptions } from '../types';
import compileOptions from './compile-options';

/**
  Uses HTMLBars `compile` function to process a string into a compiled template string.
  The returned string must be passed through `Ember.HTMLBars.template`.

  This is not present in production builds.

  @private
  @method precompile
  @param {String} templateString This is the string to be compiled by HTMLBars.
*/
export default function precompile(templateString: string, _options: CompileOptions = {}): string {
  let options: PrecompileOptions = compileOptions(_options) as any;

  return glimmerPrecompile(templateString, options);
}
