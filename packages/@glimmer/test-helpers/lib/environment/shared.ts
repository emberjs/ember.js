import { Dict, Option, Opaque } from '@glimmer/interfaces';
import { SerializedTemplateWithLazyBlock } from '@glimmer/wire-format';
import { precompile } from '@glimmer/compiler';
import { templateFactory, TemplateFactory } from '@glimmer/opcode-compiler';

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>; newAttrs: Attrs };

export function createTemplate<T = Opaque>(templateSource: string, meta?: T): TemplateFactory<T> {
  let wrapper: SerializedTemplateWithLazyBlock<T> = JSON.parse(
    precompile(templateSource, { meta })
  );
  return templateFactory<T>(wrapper);
}
