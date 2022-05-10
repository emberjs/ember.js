/**
@module ember
*/
import require, { has } from 'require';
import type { EmberPrecompileOptions } from '../types';
import precompile from './precompile';
import type { SerializedTemplateWithLazyBlock, TemplateFactory } from '@glimmer/interfaces';
import type { templateFactory } from '@glimmer/opcode-compiler';

let template: typeof templateFactory;

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
  if (!template && has('@ember/-internals/glimmer')) {
    template = require('@ember/-internals/glimmer').template;
  }

  if (!template) {
    throw new Error(
      'Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.'
    );
  }

  return template(evaluate(precompile(templateString, options)));
}

function evaluate(precompiled: string): SerializedTemplateWithLazyBlock {
  return new Function(`return ${precompiled}`)();
}
