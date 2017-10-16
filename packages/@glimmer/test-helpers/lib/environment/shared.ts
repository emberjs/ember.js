import { Dict, Option } from "@glimmer/interfaces";
import { ParsedLayout } from "@glimmer/opcode-compiler";
import { SerializedTemplateWithLazyBlock, SerializedTemplateBlock, TemplateMeta } from "@glimmer/wire-format";
import { precompile } from "@glimmer/compiler";

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>, newAttrs: Attrs };

export function createTemplate(templateSource: string, meta: TemplateMeta = {}): ParsedLayout {
  let wrapper: SerializedTemplateWithLazyBlock<TemplateMeta> = JSON.parse(precompile(templateSource, { meta }));
  let block: SerializedTemplateBlock = JSON.parse(wrapper.block);

  return { block, referrer: meta };
}
