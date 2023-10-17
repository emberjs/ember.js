/**
@module ember
*/

import type { EmberPrecompileOptions } from '../types';
import precompile from './precompile';
import type { SerializedTemplateWithLazyBlock, TemplateFactory } from '@glimmer/interfaces';
import { template } from '@ember/-internals/glimmer';

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.
  This is not present in production builds.
  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function compile(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): TemplateFactory {
  return template(evaluate(precompile(templateString, options)));
}

function evaluate(precompiled: string): SerializedTemplateWithLazyBlock {
  return new Function(`return ${precompiled}`)();
}
