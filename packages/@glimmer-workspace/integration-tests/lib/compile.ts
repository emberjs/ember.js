import type {
  Nullable,
  SerializedTemplateWithLazyBlock,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import type { PrecompileOptions } from '@glimmer/syntax';
import { precompileJSON } from '@glimmer/compiler';
import { templateFactory } from '@glimmer/opcode-compiler';

// TODO: This fundamentally has little to do with testing and
// most tests should just use a more generic preprocess, extracted
// out of the test environment.
export function preprocess(templateSource: string, options?: PrecompileOptions): Template {
  return createTemplate(templateSource, options)({});
}

let templateId = 0;

export function createTemplate(
  templateSource: Nullable<string>,
  options: PrecompileOptions = {},
  scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  options.locals = options.locals ?? Object.keys(scopeValues ?? {});
  let [block, usedLocals] = precompileJSON(templateSource, options);
  let reifiedScopeValues = usedLocals.map((key) => scopeValues[key]);

  let templateBlock: SerializedTemplateWithLazyBlock = {
    id: String(templateId++),
    block: JSON.stringify(block),
    moduleName: options.meta?.moduleName ?? '(unknown template module)',
    scope: reifiedScopeValues.length > 0 ? () => reifiedScopeValues : null,
    isStrictMode: options.strictMode ?? false,
  };

  return templateFactory(templateBlock);
}
