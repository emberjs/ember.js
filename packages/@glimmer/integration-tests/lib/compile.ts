import { precompile as rawPrecompile } from '@glimmer/compiler';
import { SerializedTemplateWithLazyBlock, Template, TemplateFactory } from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';
import { PrecompileOptions } from '@glimmer/syntax';

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

export function syntaxErrorFor(
  message: string,
  code: string,
  moduleName: string,
  line: number,
  column: number
): Error {
  let quotedCode = code ? `\n\n|\n|  ${code.split('\n').join('\n|  ')}\n|\n\n` : '';

  return new Error(
    `Syntax Error: ${message}: ${quotedCode}(error occurred in '${moduleName}' @ line ${line} : column ${column})`
  );
}
