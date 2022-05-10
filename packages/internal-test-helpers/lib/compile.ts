/**
@module ember
*/
import { precompileJSON } from '@glimmer/compiler';
import type { SerializedTemplateWithLazyBlock, TemplateFactory } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';
import type { EmberPrecompileOptions } from 'ember-template-compiler';
import { compileOptions } from 'ember-template-compiler';

/**
  Uses HTMLBars `compile` function to process a string into a compiled template.

  This is not present in production builds.

  @private
  @method compile
  @param {String} templateString This is the string to be compiled by HTMLBars.
  @param {Object} options This is an options hash to augment the compiler options.
*/
export default function compile(
  templateSource: string,
  options: Partial<EmberPrecompileOptions> = {},
  scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  options.locals = options.locals ?? Object.keys(scopeValues ?? {});
  let [block, usedLocals] = precompileJSON(templateSource, compileOptions(options));
  let reifiedScopeValues = usedLocals.map((key) => scopeValues[key]);

  let templateBlock: SerializedTemplateWithLazyBlock = {
    block: JSON.stringify(block),
    moduleName: options.moduleName ?? options.meta?.moduleName ?? '(unknown template module)',
    scope: reifiedScopeValues.length > 0 ? () => reifiedScopeValues : null,
    isStrictMode: options.strictMode ?? false,
  };

  return templateFactory(templateBlock);
}
