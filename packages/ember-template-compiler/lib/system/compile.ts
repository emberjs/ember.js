/**
@module ember
*/
import type { EmberPrecompileOptions } from '../types';
import precompile from './precompile';
import { withRuntimeKeywords } from './runtime-keywords';
import type { SerializedTemplateWithLazyBlock, TemplateFactory } from '@glimmer/interfaces';
import { RUNTIME_KEYWORD_LOCALS } from '@ember/template-compiler/-internal-primitives';
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
  if (!template) {
    throw new Error(
      'Cannot call `compile` with only the template compiler loaded. Please load `ember.debug.js` or `ember.prod.js` prior to calling `compile`.'
    );
  }

  return template(evaluate(precompile(templateString, withRuntimeKeywords(options))));
}

function evaluate(precompiled: string): SerializedTemplateWithLazyBlock {
  return new Function(...Object.keys(RUNTIME_KEYWORD_LOCALS), `return ${precompiled}`)(
    ...Object.values(RUNTIME_KEYWORD_LOCALS)
  );
}
