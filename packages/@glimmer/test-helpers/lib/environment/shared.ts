import { Dict, Option, SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { precompile, PrecompileOptions } from '@glimmer/compiler';
import { templateFactory, TemplateFactory } from '@glimmer/opcode-compiler';

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>; newAttrs: Attrs };

export function createTemplate<Locator>(
  templateSource: string,
  options?: PrecompileOptions
): TemplateFactory<Locator> {
  let wrapper: SerializedTemplateWithLazyBlock<Locator> = JSON.parse(
    precompile(templateSource, options)
  );
  return templateFactory<Locator>(wrapper);
}
