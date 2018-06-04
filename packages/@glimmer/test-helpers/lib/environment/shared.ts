import { Dict, Option, Opaque } from '@glimmer/interfaces';
import { SerializedTemplateWithLazyBlock } from '@glimmer/wire-format';
import { precompile, PrecompileOptions } from '@glimmer/compiler';
import { templateFactory, TemplateFactory } from '@glimmer/opcode-compiler';

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>; newAttrs: Attrs };

export function createTemplate(
  templateSource: string,
  options?: PrecompileOptions
): TemplateFactory<Opaque> {
  let wrapper: SerializedTemplateWithLazyBlock<Opaque> = JSON.parse(
    precompile(templateSource, options)
  );
  return templateFactory<Opaque>(wrapper);
}
