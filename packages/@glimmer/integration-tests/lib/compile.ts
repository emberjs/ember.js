import { precompile as rawPrecompile, PrecompileOptions } from '@glimmer/compiler';
import { SerializedTemplateWithLazyBlock, Template, TemplateFactory } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';

// TODO: This fundamentally has little to do with testing and
// most tests should just use a more generic preprocess, extracted
// out of the test environment.
export function preprocess(templateSource: string, options?: PrecompileOptions): Template {
  return createTemplate(templateSource, options)({});
}

export function createTemplate(
  templateSource: string,
  options?: PrecompileOptions
): TemplateFactory {
  let wrapper: SerializedTemplateWithLazyBlock = JSON.parse(rawPrecompile(templateSource, options));

  return templateFactory(wrapper);
}
