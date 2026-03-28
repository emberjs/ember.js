/**
@module ember
*/
import { precompileJSON } from '@glimmer/compiler';
import type { SerializedTemplateWithLazyBlock, TemplateFactory } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';
import type { EmberPrecompileOptions } from 'ember-template-compiler';
import { compile as etcCompile, compileOptions } from 'ember-template-compiler';

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
  // In GXT mode, use GXT compilation via ember-template-compiler's compile
  // (which is aliased to the GXT compat version)
  if ((globalThis as any).__GXT_MODE__) {
    return etcCompile(templateSource, {
      moduleName: options.moduleName ?? options.meta?.moduleName ?? '(unknown template module)',
      strictMode: options.strictMode ?? false,
      ...options,
      scopeValues: Object.keys(scopeValues).length > 0 ? scopeValues : undefined,
    });
  }

  options.locals = options.locals ?? Object.keys(scopeValues ?? {});
  let [block, usedLocals] = precompileJSON(templateSource, compileOptions(options));
  let reifiedScope: Record<string, unknown> = {};
  for (let key of usedLocals) {
    reifiedScope[key] = scopeValues[key];
  }

  let templateBlock: SerializedTemplateWithLazyBlock = {
    block: JSON.stringify(block),
    moduleName: options.moduleName ?? options.meta?.moduleName ?? '(unknown template module)',
    scope: usedLocals.length > 0 ? () => reifiedScope : null,
    isStrictMode: options.strictMode ?? false,
  };

  return templateFactory(templateBlock);
}
