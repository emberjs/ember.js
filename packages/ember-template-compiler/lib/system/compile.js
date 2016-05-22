/**
@module ember
@submodule ember-template-compiler
*/
import compiler from '../compiler';
import compileOptions from './compile-options';
import assign from 'ember-metal/assign';

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function(templateString, options) {
  let { compile } = compiler();
  return compile(templateString, assign({}, compileOptions(), options));
}
